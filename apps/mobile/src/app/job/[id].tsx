import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../../lib/firebase';
import { captureEvidence } from '../../services/camera';
import { startLocationTracking, stopLocationTracking, promptLocationIssue } from '../../services/location';
import { openNavigationApp } from '../../services/navigation';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';

const JOB_TYPES_NEED_ASSET = ['ENTREGA', 'TROCA'];

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
};

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

  const jobRef = orderId && id ? doc(db, 'orders', orderId, 'jobs', id) : null;

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

      const orderSnap = await getDoc(doc(db, 'orders', orderId));
      if (orderSnap.exists()) {
        const o = orderSnap.data();
        customerId = o.customer_id || null;
        addressId = o.address_id || null;
        if (o.customer_id) {
          const custSnap = await getDoc(doc(db, 'customers', o.customer_id));
          if (custSnap.exists()) {
            customerName = custSnap.data().name || '';
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
      });

      // where('tenant_id', ...) obrigatório: as regras do Firestore exigem
      // que o mesmo campo usado em isSameTenant() esteja filtrado na query,
      // senão a lista inteira é negada.
      const evSnap = await getDocs(query(
        collection(db, 'evidences'),
        where('job_id', '==', id),
        where('tenant_id', '==', jobData.tenant_id)
      ));
      setEvidenceCount(evSnap.size);
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
      const url = await captureEvidence(id, orderId, 'FOTO_LOCAL');
      if (url) {
        setEvidenceCount((c) => c + 1);
        Alert.alert('Evidência salva', 'Foto enviada com sucesso.');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.jobNumber}>{job.job_number}</Text>
        <Text style={styles.jobType}>{job.job_type}</Text>
        <Text style={styles.statusLabel}>Status atual: {job.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cliente</Text>
        <Text style={styles.text}>👤 {job.customerName}</Text>
        <Text style={styles.text}>📍 {job.address}</Text>
        <Text style={styles.textMuted}>{job.city}</Text>
        {job.accessNotes ? <Text style={styles.textMuted}>Obs. de acesso: {job.accessNotes}</Text> : null}

        {job.addressLatitude != null && job.addressLongitude != null && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openNavigationApp(job.addressLatitude!, job.addressLongitude!, job.customerName)}
          >
            <Text style={styles.navigateButtonText}>🧭 Navegar até o local</Text>
          </TouchableOpacity>
        )}
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
          {step && (
            <TouchableOpacity
              style={[styles.button, updating && styles.buttonDisabled]}
              onPress={() => advanceStatus(step.next)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.buttonText}>{step.label}</Text>
              )}
            </TouchableOpacity>
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
