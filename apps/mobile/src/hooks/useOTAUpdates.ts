import { useEffect } from 'react';
import * as Updates from 'expo-updates';

// Checa por atualização OTA (EAS Update) assim que o app abre. Se tiver uma
// nova versão publicada (só JS/assets — mudança nativa ainda exige gerar um
// APK novo), baixa e recarrega o app na hora, sem o motorista precisar
// reinstalar nada. Em dev/Expo Go o expo-updates fica desabilitado, então
// não faz nada nesses casos.
export function useOTAUpdates() {
  useEffect(() => {
    if (!Updates.isEnabled) return;

    async function checkAndApply() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Sem internet ou falha na checagem — segue com a versão já instalada.
      }
    }

    checkAndApply();
  }, []);
}
