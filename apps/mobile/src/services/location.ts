import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { outbox } from '@cacambaflow/sync-engine';
import { supabase } from '../lib/supabase';

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return; // Ninguém logado

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, id')
        .eq('auth_user_id', userData.user.id)
        .single();
      
      if (!profile) return;

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!driver) return;

      // Pega apenas a coordenada mais recente do lote
      const loc = locations[locations.length - 1];

      // Salva no Outbox (mesmo sem internet, o sync-engine cuidará do envio depois)
      await outbox.enqueueEvent(
        profile.tenant_id,
        'mobile-device-id', // idealmente pega via expo-application ou similar
        'location',
        driver.id, // aggregate_id
        'LOCATION_BATCH',
        {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          device_timestamp: new Date(loc.timestamp).toISOString(),
        }
      );
    } catch (err) {
      console.warn('[LocationTask] Erro ao gravar evento na outbox:', err);
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
        notificationTitle: "CaçambaFlow Ativo",
        notificationBody: "Rastreando rota do atendimento atual.",
        notificationColor: "#F97316",
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
