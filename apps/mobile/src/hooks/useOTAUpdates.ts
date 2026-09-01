import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Marca que acabou de aplicar uma atualização — lida no próximo mount (já
// depois do reload) pra avisar o motorista que rolou algo, já que o reload
// em si não dá tempo de mostrar mensagem nenhuma.
const NOTICE_KEY = 'ota_update_applied_notice';

// Checa por atualização OTA (EAS Update) assim que o app abre. Se tiver uma
// nova versão publicada (só JS/assets — mudança nativa ainda exige gerar um
// APK novo), baixa e recarrega o app na hora, sem o motorista precisar
// reinstalar nada. Em dev/Expo Go o expo-updates fica desabilitado, então
// não faz nada nesses casos.
export function useOTAUpdates() {
  useEffect(() => {
    if (!Updates.isEnabled) return;

    async function notifyIfJustUpdated() {
      try {
        const pending = await AsyncStorage.getItem(NOTICE_KEY);
        if (pending) {
          await AsyncStorage.removeItem(NOTICE_KEY);
          Alert.alert('App atualizado', 'Baixamos e aplicamos a versão mais recente automaticamente.');
        }
      } catch {
        // não é crítico — só um aviso, segue sem ele se falhar.
      }
    }

    async function checkAndApply() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await AsyncStorage.setItem(NOTICE_KEY, '1');
          await Updates.reloadAsync();
        }
      } catch {
        // Sem internet ou falha na checagem — segue com a versão já instalada.
      }
    }

    notifyIfJustUpdated();
    checkAndApply();
  }, []);
}
