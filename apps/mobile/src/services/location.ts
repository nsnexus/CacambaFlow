import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking, Platform } from 'react-native';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const LOCATION_TASK_NAME = 'background-location-task';

// Define a tarefa que rodará em background quando a tela do app estiver apagada
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTask] Erro na tarefa em background:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    try {
      const user = auth.currentUser;
      if (!user) return; // Ninguém logado

      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      if (!profileSnap.exists()) return;
      const tenantId = profileSnap.data().tenant_id;
      if (!tenantId) return;

      // O filtro de tenant_id precisa estar na própria query: as regras do
      // Firestore checam isSameTenant(resource.data), e consultas em lista
      // só passam quando o campo usado na regra também está filtrado na
      // query (senão o Firestore nega a lista inteira por segurança).
      const driversQuery = query(
        collection(db, 'drivers'),
        where('profile_id', '==', user.uid),
        where('tenant_id', '==', tenantId)
      );
      const driversSnap = await getDocs(driversQuery);
      if (driversSnap.empty) return;
      const driverId = driversSnap.docs[0].id;

      // Pega apenas a coordenada mais recente do lote
      const loc = locations[locations.length - 1];

      // Envio direto e online. A fila offline (Outbox) é da Fase 5, ainda não implementada.
      await addDoc(collection(db, 'driver_locations'), {
        tenant_id: tenantId,
        driver_id: driverId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        device_timestamp: new Date(loc.timestamp).toISOString(),
        server_timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[LocationTask] Erro ao gravar localização:', err);
    }
  }
});

/**
 * Erro de rastreamento com o motivo tipado, pra quem chamar decidir qual tela
 * de configuração do Android abrir (permissão do app vs GPS do sistema).
 */
export class LocationTrackingError extends Error {
  constructor(
    message: string,
    public reason: 'permission_denied' | 'services_disabled'
  ) {
    super(message);
    this.name = 'LocationTrackingError';
  }
}

/**
 * Solicita permissões e inicia o rastreamento em foreground e background.
 * Chamado quando a jornada de trabalho do motorista é iniciada.
 */
export async function startLocationTracking() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new LocationTrackingError('Permissão de localização em primeiro plano foi negada.', 'permission_denied');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new LocationTrackingError(
      'Permissão de localização em segundo plano (com tela desligada) foi negada.',
      'permission_denied'
    );
  }

  // Permissão concedida não significa GPS ligado — checa o serviço de
  // localização do aparelho separado, senão o rastreamento fica "ativo" só
  // que sem nenhuma coordenada chegando.
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationTrackingError('O GPS do aparelho está desligado.', 'services_disabled');
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Balanceado para poupar bateria
      timeInterval: 30000, // Pelo menos a cada 30 segundos
      distanceInterval: 50, // Ou a cada 50 metros percorridos
      showsBackgroundLocationIndicator: true, // Bolinha azul no topo (iOS) ou Notificação (Android)
      foregroundService: {
        notificationTitle: 'CaçambaFlow Ativo',
        notificationBody: 'Rastreando rota do atendimento atual.',
        notificationColor: '#F97316',
      },
    });
  }
}

/**
 * Para o rastreamento de localização.
 * Chamado quando a jornada termina ou no encerramento do app.
 */
export async function stopLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/**
 * Mostra um alerta explicando o que falta liberar, com um botão que já leva
 * o motorista direto pra tela certa: configurações do app (permissão) ou
 * configurações de localização do sistema (GPS desligado).
 */
export function promptLocationIssue(error: unknown) {
  const reason = error instanceof LocationTrackingError ? error.reason : 'permission_denied';

  if (reason === 'services_disabled') {
    Alert.alert(
      'GPS desligado',
      'O CaçambaFlow precisa do GPS ligado pra sincronizar sua rota com o painel administrativo.',
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Ativar GPS',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
    return;
  }

  Alert.alert(
    'Localização necessária',
    'O CaçambaFlow precisa da sua localização liberada (inclusive em segundo plano) pra sincronizar sua rota com o painel administrativo. Sem isso o app não funciona corretamente.',
    [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
    ]
  );
}
