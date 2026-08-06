import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
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

      const driversQuery = query(collection(db, 'drivers'), where('profile_id', '==', user.uid));
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
 * Solicita permissões e inicia o rastreamento em foreground e background.
 * Chamado quando a jornada de trabalho do motorista é iniciada.
 */
export async function startLocationTracking() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Permissão de localização em primeiro plano foi negada.');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Permissão de localização em segundo plano (com tela desligada) foi negada.');
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
