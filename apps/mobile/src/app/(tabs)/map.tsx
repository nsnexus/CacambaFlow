import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { orderBy, where } from 'firebase/firestore';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';
import { getCurrentDriver, fetchDriverJobs, TERMINAL_STATUSES, type JobCardData } from '../../services/jobs';

const STATUS_COLOR: Partial<Record<JobStatus, string>> = {
  ATRIBUIDO: theme.colors.info,
  EM_ROTA: theme.colors.warning,
  NO_LOCAL: theme.colors.primary,
  EM_EXECUCAO: theme.colors.primaryDark,
};

function buildMapHtml(
  driverPoint: { latitude: number; longitude: number } | null,
  jobPoints: { id: string; label: string; color: string; latitude: number; longitude: number }[]
) {
  const center = driverPoint ?? jobPoints[0] ?? { latitude: -23.5505, longitude: -46.6333 };

  const jobMarkers = jobPoints
    .map(
      (p) => `
        L.circleMarker([${p.latitude}, ${p.longitude}], {
          radius: 9, color: '#fff', weight: 2, fillColor: '${p.color}', fillOpacity: 1
        }).addTo(map).bindPopup(${JSON.stringify(p.label)});
      `
    )
    .join('\n');

  const driverMarker = driverPoint
    ? `
      L.circleMarker([${driverPoint.latitude}, ${driverPoint.longitude}], {
        radius: 10, color: '#fff', weight: 3, fillColor: '#3B82F6', fillOpacity: 1
      }).addTo(map).bindPopup('Você está aqui');
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${theme.colors.background}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${center.latitude}, ${center.longitude}], ${driverPoint || jobPoints.length ? 13 : 4});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    ${driverMarker}
    ${jobMarkers}
  </script>
</body>
</html>
  `;
}

export default function MapScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [driverPoint, setDriverPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const driver = await getCurrentDriver();
      if (!driver) {
        Alert.alert('Atenção', 'Seu usuário não está vinculado a um perfil de motorista.');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const jobsList = await fetchDriverJobs(driver.driverId, driver.tenantId, [
        where('scheduled_date', '==', today),
        orderBy('sequence_number', 'asc'),
      ]);
      setJobs(jobsList.filter((job) => !TERMINAL_STATUSES.includes(job.status)));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setDriverPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (error: any) {
      Alert.alert('Erro ao carregar mapa', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const jobPoints = useMemo(
    () =>
      jobs
        .filter((j) => j.orders.addresses.latitude != null && j.orders.addresses.longitude != null)
        .map((j) => ({
          id: j.id,
          label: `${j.job_number} - ${j.orders.customers.name}`,
          color: STATUS_COLOR[j.status] ?? theme.colors.textMuted,
          latitude: j.orders.addresses.latitude as number,
          longitude: j.orders.addresses.longitude as number,
        })),
    [jobs]
  );

  const html = useMemo(() => buildMapHtml(driverPoint, jobPoints), [driverPoint, jobPoints]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />

      {jobPoints.length === 0 && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Nenhum endereço com localização cadastrada para hoje.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={load}>
        <Text style={styles.refreshButtonText}>🔄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlay: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  overlayText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
  },
  refreshButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshButtonText: {
    fontSize: 18,
  },
});
