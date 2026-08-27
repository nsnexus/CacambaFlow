import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { orderBy, where } from 'firebase/firestore';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';
import { getCurrentDriver, fetchDriverJobs, TERMINAL_STATUSES, type JobCardData } from '../../services/jobs';
import { buildMapHtml, updateDriverPositionScript } from '../../services/mapHtml';

const STATUS_COLOR: Partial<Record<JobStatus, string>> = {
  ATRIBUIDO: theme.colors.info,
  EM_ROTA: theme.colors.warning,
  NO_LOCAL: theme.colors.primary,
  EM_EXECUCAO: theme.colors.primaryDark,
};

export default function MapScreen() {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [driverPoint, setDriverPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

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

  // Chave estável dos pontos de destino: só reconstrói o HTML (e recarrega o
  // WebView) quando o CONJUNTO de atendimentos muda de verdade — não a cada
  // atualização de GPS do motorista, que é bem mais frequente. A posição do
  // motorista é atualizada depois via injectJavaScript (updateDriverPositionScript),
  // sem recarregar mapa/tiles/Leaflet do zero.
  const jobPointsKey = useMemo(() => jobPoints.map((p) => `${p.id}:${p.latitude},${p.longitude}`).join('|'), [jobPoints]);
  const html = useMemo(() => buildMapHtml(null, jobPoints), [jobPointsKey]);
  // Memoiza o objeto de `source` também — `source={{ html }}` inline criaria um
  // objeto novo (referência diferente) a cada render mesmo com o mesmo html,
  // e o WebView recarrega comparando por referência.
  const webviewSource = useMemo(() => ({ html }), [html]);

  useEffect(() => {
    setMapReady(false);
  }, [html]);

  useEffect(() => {
    if (mapReady && driverPoint) {
      webviewRef.current?.injectJavaScript(updateDriverPositionScript(driverPoint.latitude, driverPoint.longitude));
    }
  }, [mapReady, driverPoint]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={webviewSource}
        style={styles.webview}
        onLoadEnd={() => setMapReady(true)}
      />

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
