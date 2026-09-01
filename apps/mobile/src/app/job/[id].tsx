import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { db } from '../../lib/firebase';
import { captureEvidence } from '../../services/camera';
import { getPendingEvidenceCountForJob } from '../../services/evidenceQueue';
import { startLocationTracking, stopLocationTracking, promptLocationIssue } from '../../services/location';
import { openNavigationApp } from '../../services/navigation';
import { buildMapHtml, updateDriverPositionScript } from '../../services/mapHtml';
import { distanceInMeters, hasValidCoords } from '../../services/geo';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';

const JOB_TYPES_NEED_ASSET = ['ENTREGA', 'TROCA'];

// Raio de tolerância pra liberar "Cheguei ao local" — GPS de celular tem erro
// de uns 10-30m mesmo parado, então 100m evita falso negativo sem deixar
// confirmar de longe demais.
const ARRIVAL_RADIUS_METERS = 100;

type JobDetail = {
  id: string;
  job_number: string;
  job_type: string;
  status: JobStatus;
  customerName: string;
  address: string;
  city: string;
  accessNotes: string | null;
  assignedAssetId: string | null;
  customerId: string | null;
  addressId: string | null;
  tenantId: string | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
  expectedReturnDate: string | null;
  customerPhone: string | null;
  customerContactName: string | null;
};

// Telefone pode estar salvo só com DDD (11 dígitos) — o WhatsApp Web/app
// precisa do código do país (Brasil = 55) na frente pra abrir a conversa.
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) return digits;
  return `55${digits}`;
}

const NEXT_STEP: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  ATRIBUIDO: { label: 'Iniciar rota', next: 'EM_ROTA' },
  EM_ROTA: { label: 'Cheguei ao local', next: 'NO_LOCAL' },
  NO_LOCAL: { label: 'Iniciar serviço', next: 'EM_EXECUCAO' },
  EM_EXECUCAO: { label: 'Concluir atendimento', next: 'CONCLUIDO' },
};

const ACTIVE_STATUSES: JobStatus[] = ['ATRIBUIDO', 'EM_ROTA', 'NO_LOCAL', 'EM_EXECUCAO'];

export default function JobDetailScreen() {
  const { id, orderId } = useLocalSearchParams<{ id: string; orderId: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [showFailureForm, setShowFailureForm] = useState(false);
  const [failureNote, setFailureNote] = useState('');
  const [driverPosition, setDriverPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const jobRef = orderId && id ? doc(db, 'orders', orderId, 'jobs', id) : null;

  // Endereço em texto, mesma string usada na navegação externa — reaproveitada
  // aqui também pra geocodificar quando não tem coordenada salva no cadastro.
  const fullAddressText = job ? (job.city ? `${job.address}, ${job.city}` : job.address) : '';

  const [geocodedCoords, setGeocodedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Muito endereço fica salvo sem coordenada (ou com 0,0) — sem isso, o mapa
  // não aparece e o gate de chegada não tem como calcular distância (ficava
  // liberando "Cheguei ao local" de qualquer jeito). Geocodifica o MESMO
  // texto que já mandamos pro Maps, garantindo que a coordenada usada aqui
  // bate com o endereço mostrado, em vez de depender só do cadastro.
  useEffect(() => {
    setGeocodedCoords(null);
    if (!job || hasValidCoords(job.addressLatitude, job.addressLongitude) || !fullAddressText) return;

    let cancelled = false;
    Location.geocodeAsync(fullAddressText)
      .then((results) => {
        if (cancelled || results.length === 0) return;
        setGeocodedCoords({ latitude: results[0].latitude, longitude: results[0].longitude });
      })
      .catch((e) => {
        console.warn('[Job] não foi possível geocodificar o endereço:', e);
      });

    return () => {
      cancelled = true;
    };
  }, [job?.id, job?.addressLatitude, job?.addressLongitude, fullAddressText]);

  const destinationCoords = useMemo(() => {
    if (job && hasValidCoords(job.addressLatitude, job.addressLongitude)) {
      return { latitude: job.addressLatitude!, longitude: job.addressLongitude! };
    }
    return geocodedCoords;
  }, [job?.addressLatitude, job?.addressLongitude, geocodedCoords]);

  const destinationHasCoords = !!destinationCoords;
  const showRouteMap = job?.status === 'EM_ROTA' && destinationHasCoords;

  const distanceToDestination = useMemo(() => {
    if (!driverPosition || !destinationCoords) return null;
    return distanceInMeters(driverPosition.latitude, driverPosition.longitude, destinationCoords.latitude, destinationCoords.longitude);
  }, [driverPosition, destinationCoords]);

  // Enquanto o atendimento está "Em rota" e o endereço tem coordenada válida,
  // observa a posição do motorista em tempo real (tela aberta) só pra calcular
  // a distância e desenhar o pontinho no mapa — separado do rastreamento em
  // background que já sincroniza com o painel administrativo.
  useEffect(() => {
    if (!showRouteMap) {
      setDriverPosition(null);
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (!cancelled) setDriverPosition({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        );
      } catch (e) {
        console.warn('[Job] não foi possível observar a posição pro cálculo de distância:', e);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [showRouteMap]);

  const routeMapHtml = useMemo(() => {
    if (!job || !destinationCoords) return null;
    return buildMapHtml(
      null,
      [{ id: job.id, label: job.customerName, color: theme.colors.primary, latitude: destinationCoords.latitude, longitude: destinationCoords.longitude }],
      undefined,
      { drawRouteFromDriver: true }
    );
  }, [job?.id, destinationCoords]);
  const routeMapSource = useMemo(() => (routeMapHtml ? { html: routeMapHtml } : null), [routeMapHtml]);

  useEffect(() => {
    setMapReady(false);
  }, [routeMapHtml]);

  useEffect(() => {
    if (mapReady && driverPosition) {
      webviewRef.current?.injectJavaScript(updateDriverPositionScript(driverPosition.latitude, driverPosition.longitude));
    }
  }, [mapReady, driverPosition]);

  const load = useCallback(async () => {
    if (!orderId || !id) return;
    try {
      const jobSnap = await getDoc(doc(db, 'orders', orderId, 'jobs', id));
      if (!jobSnap.exists()) {
        Alert.alert('Erro', 'Atendimento não encontrado.');
        router.back();
        return;
      }
      const jobData = jobSnap.data();

      let customerName = '';
      let address = '';
      let city = '';
      let accessNotes: string | null = null;
      let customerId: string | null = null;
      let addressId: string | null = null;
      let addressLatitude: number | null = null;
      let addressLongitude: number | null = null;
      // Prioriza o contato da obra (quem está no local) sobre o telefone
      // geral do cliente — é quem o motorista realmente precisa achar lá.
      let customerPhone: string | null = null;
      let customerContactName: string | null = null;

      const orderSnap = await getDoc(doc(db, 'orders', orderId));
      if (orderSnap.exists()) {
        const o = orderSnap.data();
        customerId = o.customer_id || null;
        addressId = o.address_id || null;
        if (o.customer_id) {
          const custSnap = await getDoc(doc(db, 'customers', o.customer_id));
          if (custSnap.exists()) {
            const cust = custSnap.data();
            customerName = cust.name || '';
            customerPhone = cust.phone || cust.whatsapp || null;
          }
          if (o.address_id) {
            const addrSnap = await getDoc(doc(db, `customers/${o.customer_id}/addresses`, o.address_id));
            if (addrSnap.exists()) {
              const a = addrSnap.data();
              address = `${a.street}, ${a.number} - ${a.district}`;
              city = a.city;
              accessNotes = a.access_notes || null;
              addressLatitude = a.latitude ?? null;
              addressLongitude = a.longitude ?? null;
              if (a.contact_phone) {
                customerPhone = a.contact_phone;
                customerContactName = a.contact_name || null;
              }
            }
          }
        }
      }

      setJob({
        id: jobSnap.id,
        job_number: jobData.job_number,
        job_type: jobData.job_type,
        status: jobData.status,
        customerName,
        address,
        city,
        accessNotes,
        assignedAssetId: jobData.assigned_asset_id || null,
        customerId,
        addressId,
        tenantId: jobData.tenant_id || null,
        addressLatitude,
        addressLongitude,
        expectedReturnDate: jobData.expected_return_date || null,
        customerPhone,
        customerContactName,
      });

      // where('tenant_id', ...) obrigatório: as regras do Firestore exigem
      // que o mesmo campo usado em isSameTenant() esteja filtrado na query,
      // senão a lista inteira é negada.
      const evSnap = await getDocs(query(
        collection(db, 'evidences'),
        where('job_id', '==', id),
        where('tenant_id', '==', jobData.tenant_id)
      ));
      // Soma também as evidências ainda na fila local (capturadas offline,
      // aguardando subir) — senão o motorista fica bloqueado de concluir o
      // atendimento por causa de uma foto que ele JÁ tirou, só que sem rede.
      const pendingCount = await getPendingEvidenceCountForJob(id);
      setEvidenceCount(evSnap.size + pendingCount);
    } catch (error: any) {
      Alert.alert('Erro ao carregar atendimento', error.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function advanceStatus(next: JobStatus) {
    if (!jobRef || !job) return;

    if (next === 'CONCLUIDO' && evidenceCount === 0) {
      Alert.alert('Evidência obrigatória', 'Capture ao menos uma foto antes de concluir o atendimento.');
      return;
    }

    setUpdating(true);
    try {
      // Pulo rápido: motorista já chegou perto do endereço (ver arrivalGateActive
      // mais abaixo) e foi direto pra "Concluir atendimento" num clique só. Ainda
      // assim grava "Cheguei ao local" e "Iniciar serviço" no meio do caminho,
      // pro painel administrativo manter o histórico de status.
      if (job.status === 'EM_ROTA' && next === 'CONCLUIDO') {
        await updateDoc(jobRef, { status: 'NO_LOCAL', updated_at: new Date().toISOString() });
        await updateDoc(jobRef, { status: 'EM_EXECUCAO', updated_at: new Date().toISOString() });
      }

      await updateDoc(jobRef, { status: next, updated_at: new Date().toISOString() });
      setJob({ ...job, status: next });

      if (next === 'EM_ROTA') {
        startLocationTracking().catch((e) => {
          console.warn('[Job] rastreamento não iniciado:', e.message);
          promptLocationIssue(e);
        });
      }
      if (next === 'CONCLUIDO') {
        stopLocationTracking().catch(() => {});

        if (JOB_TYPES_NEED_ASSET.includes(job.job_type) && job.assignedAssetId && job.customerId && job.addressId) {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await updateDoc(doc(db, 'assets', job.assignedAssetId), {
              status: 'LOCADA',
              customer_id: job.customerId,
              address_id: job.addressId,
              delivered_at: new Date().toISOString().split('T')[0],
              expected_return_date: job.expectedReturnDate ?? null,
              delivery_latitude: loc.coords.latitude,
              delivery_longitude: loc.coords.longitude,
            });
          } catch (e: any) {
            console.warn('[Job] não foi possível registrar a localização da caçamba:', e.message);
            Alert.alert(
              'Caçamba não localizada no mapa',
              'O atendimento foi concluído, mas não consegui capturar sua localização pra atualizar a caçamba no mapa. Você pode registrar manualmente pelo painel web depois.'
            );
          }
        } else if (job.job_type === 'COLETA' && job.customerId && job.addressId && job.tenantId) {
          try {
            // Coleta não tem asset pré-vinculado (é atribuído por endereço/cliente
            // no momento do despacho) — localiza a caçamba LOCADA nesse endereço.
            const assetsSnap = await getDocs(query(
              collection(db, 'assets'),
              where('tenant_id', '==', job.tenantId),
              where('customer_id', '==', job.customerId),
              where('address_id', '==', job.addressId),
              where('status', '==', 'LOCADA'),
              limit(1)
            ));

            if (!assetsSnap.empty) {
              await updateDoc(assetsSnap.docs[0].ref, {
                status: 'DISPONIVEL',
                customer_id: null,
                address_id: null,
                delivered_at: null,
                expected_return_date: null,
                delivery_latitude: null,
                delivery_longitude: null,
              });
            } else {
              Alert.alert(
                'Caçamba não encontrada',
                'O atendimento foi concluído, mas não encontrei uma caçamba locada nesse endereço pra liberar. Verifique manualmente pelo painel web.'
              );
            }
          } catch (e: any) {
            console.warn('[Job] não foi possível liberar a caçamba:', e.message);
            Alert.alert(
              'Caçamba não liberada',
              'O atendimento foi concluído, mas não consegui atualizar a caçamba pra "Disponível". Verifique manualmente pelo painel web.'
            );
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Erro ao atualizar status', error.message);
    } finally {
      setUpdating(false);
    }
  }

  async function confirmFailure() {
    if (!jobRef || !job) return;
    if (!failureNote.trim()) {
      Alert.alert('Atenção', 'Descreva o motivo da falha antes de confirmar.');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(jobRef, {
        status: 'FALHADO',
        updated_at: new Date().toISOString(),
        failure_note: failureNote.trim(),
      });
      setJob({ ...job, status: 'FALHADO' });
      setShowFailureForm(false);
      stopLocationTracking().catch(() => {});
    } catch (error: any) {
      Alert.alert('Erro ao registrar falha', error.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleCapture() {
    if (!orderId || !id) return;
    setCapturing(true);
    try {
      const captured = await captureEvidence(id, orderId, 'FOTO_LOCAL');
      if (captured) {
        setEvidenceCount((c) => c + 1);
        // Pode já ter subido ou só ter ficado na fila (sem rede) — em
        // ambos os casos a foto está salva e conta pra liberar a conclusão.
        Alert.alert('Evidência salva', 'Foto salva. Envia automaticamente assim que tiver conexão.');
      }
    } catch (error: any) {
      Alert.alert('Erro ao capturar evidência', error.message);
    } finally {
      setCapturing(false);
    }
  }

  if (loading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const step = NEXT_STEP[job.status];
  const isActive = ACTIVE_STATUSES.includes(job.status);

  // Só existe "chegada" pra travar quando o endereço tem coordenada de verdade
  // (ver hasValidCoords) — sem isso, segue o fluxo manual normal de sempre.
  const arrivalGateActive = job.status === 'EM_ROTA' && destinationHasCoords;
  const arrived = !arrivalGateActive || (distanceToDestination != null && distanceToDestination <= ARRIVAL_RADIUS_METERS);

  // Perto do endereço, pula "Cheguei ao local" e "Iniciar serviço" — vai
  // direto pro clique único de "Concluir atendimento" (advanceStatus grava os
  // status intermediários por trás, ver acima).
  const primaryStep = arrivalGateActive && arrived ? { label: 'Concluir atendimento', next: 'CONCLUIDO' as JobStatus } : step;
  const primaryDisabled = updating || (arrivalGateActive && !arrived);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.jobNumber}>{job.job_number}</Text>
        <Text style={styles.jobType}>{job.job_type}</Text>
        <Text style={styles.statusLabel}>Status atual: {job.status}</Text>
      </View>

      {showRouteMap && routeMapSource && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rota até o local</Text>
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={routeMapSource}
            style={styles.routeMap}
            onLoadEnd={() => setMapReady(true)}
          />
          <Text style={styles.textMuted}>
            {distanceToDestination != null
              ? `Você está a ${Math.round(distanceToDestination)}m do local.`
              : 'Aguardando localização pra calcular a distância...'}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cliente</Text>
        <Text style={styles.text}>👤 {job.customerName}</Text>
        <Text style={styles.text}>📍 {job.address}</Text>
        <Text style={styles.textMuted}>{job.city}</Text>
        {job.accessNotes ? <Text style={styles.textMuted}>Obs. de acesso: {job.accessNotes}</Text> : null}

        {job.customerPhone ? (
          <>
            <Text style={styles.text}>
              📞 {job.customerContactName ? `${job.customerContactName} — ` : ''}{job.customerPhone}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.navigateButton, { flex: 1 }]}
                onPress={() => Linking.openURL(`tel:${job.customerPhone!.replace(/\D/g, '')}`)}
              >
                <Text style={styles.navigateButtonText}>📞 Ligar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navigateButton, { flex: 1 }]}
                onPress={() => Linking.openURL(`https://wa.me/${toWhatsAppNumber(job.customerPhone!)}`)}
              >
                <Text style={styles.navigateButtonText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {job.address ? (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              openNavigationApp(
                {
                  latitude: destinationCoords?.latitude ?? job.addressLatitude,
                  longitude: destinationCoords?.longitude ?? job.addressLongitude,
                  address: fullAddressText,
                },
                job.customerName
              )
            }
          >
            <Text style={styles.navigateButtonText}>🧭 Navegar até o local</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Evidências ({evidenceCount})</Text>
        <TouchableOpacity
          style={[styles.secondaryButton, capturing && styles.buttonDisabled]}
          onPress={handleCapture}
          disabled={capturing || !isActive}
        >
          {capturing ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>📷 Capturar foto</Text>
          )}
        </TouchableOpacity>
      </View>

      {isActive && (
        <View style={styles.card}>
          {primaryStep && (
            <TouchableOpacity
              style={[styles.button, primaryDisabled && styles.buttonDisabled]}
              onPress={() => advanceStatus(primaryStep.next)}
              disabled={primaryDisabled}
            >
              {updating ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.buttonText}>{primaryStep.label}</Text>
              )}
            </TouchableOpacity>
          )}
          {arrivalGateActive && !arrived && (
            <Text style={styles.arrivalHint}>
              {distanceToDestination != null
                ? `Você está a ${Math.round(distanceToDestination)}m do local — precisa chegar a ${ARRIVAL_RADIUS_METERS}m pra concluir.`
                : 'Aguardando localização pra liberar a conclusão...'}
            </Text>
          )}

          {!showFailureForm ? (
            <TouchableOpacity style={styles.dangerLink} onPress={() => setShowFailureForm(true)}>
              <Text style={styles.dangerLinkText}>Reportar falha no atendimento</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.failureForm}>
              <Text style={styles.label}>Motivo da falha</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Descreva o que aconteceu"
                placeholderTextColor={theme.colors.textMuted}
                value={failureNote}
                onChangeText={setFailureNote}
                multiline
              />
              <View style={styles.failureFormActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowFailureForm(false)}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton, updating && styles.buttonDisabled]}
                  onPress={confirmFailure}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>Confirmar falha</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  jobNumber: {
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  jobType: {
    color: theme.colors.primaryLight,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: theme.spacing.xs,
  },
  statusLabel: {
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  text: {
    color: theme.colors.text,
    marginBottom: 2,
  },
  textMuted: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  navigateButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceHighlight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  navigateButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  routeMap: {
    height: 220,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  arrivalHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
    flex: 1,
  },
  dangerLink: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  dangerLinkText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
  failureForm: {
    marginTop: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  failureFormActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
