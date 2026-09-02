import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { orderBy, where } from 'firebase/firestore';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';
import { getCurrentDriver, fetchDriverJobs, TERMINAL_STATUSES, type JobCardData } from '../../services/jobs';

// Quantos dias pra frente de "próximas demandas" mostrar — assim o
// motorista já sabe o que vem por aí (ex: entrega de amanhã) sem esperar o
// dia virar pra descobrir na hora.
const UPCOMING_DAYS_AHEAD = 7;

type Section = { title: string; data: JobCardData[] };

export default function HomeScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async function fetchJobs() {
    try {
      const driver = await getCurrentDriver();
      if (!driver) {
        Alert.alert('Atenção', 'Seu usuário não está vinculado a um perfil de motorista.');
        return;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const limitDate = new Date(now);
      limitDate.setDate(limitDate.getDate() + UPCOMING_DAYS_AHEAD);
      const limitDateStr = limitDate.toISOString().split('T')[0];

      const [overdueJobsRaw, todayJobs, upcomingJobsRaw] = await Promise.all([
        // Atendimento cujo dia já passou e ainda não foi concluído/falhado —
        // sem isso ele simplesmente sumia do app quando o dia virava (não
        // aparece em "Hoje" porque a data não bate mais, nem no Histórico
        // porque nunca foi finalizado). Fica esquecido pro sempre.
        fetchDriverJobs(driver.driverId, driver.tenantId, [
          where('scheduled_date', '<', today),
          orderBy('scheduled_date', 'asc'),
          orderBy('sequence_number', 'asc'),
        ]),
        fetchDriverJobs(driver.driverId, driver.tenantId, [
          where('scheduled_date', '==', today),
          orderBy('sequence_number', 'asc'),
        ]),
        fetchDriverJobs(driver.driverId, driver.tenantId, [
          where('scheduled_date', '>', today),
          where('scheduled_date', '<=', limitDateStr),
          orderBy('scheduled_date', 'asc'),
          orderBy('sequence_number', 'asc'),
        ]),
      ]);

      // Corridas já concluídas/falhadas/canceladas saem daqui e vão para o Histórico.
      const overdueActive = overdueJobsRaw.filter((job) => !TERMINAL_STATUSES.includes(job.status));
      const todayActive = todayJobs.filter((job) => !TERMINAL_STATUSES.includes(job.status));
      const upcomingActive = upcomingJobsRaw.filter((job) => !TERMINAL_STATUSES.includes(job.status));

      const nextSections: Section[] = [];
      if (overdueActive.length > 0) nextSections.push({ title: 'Atrasados', data: overdueActive });
      if (todayActive.length > 0) nextSections.push({ title: 'Hoje', data: todayActive });
      if (upcomingActive.length > 0) nextSections.push({ title: 'Próximos Dias', data: upcomingActive });
      setSections(nextSections);
    } catch (error: any) {
      Alert.alert('Erro ao carregar rota', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
      case 'ATRIBUIDO': return theme.colors.info;
      case 'EM_ROTA': return theme.colors.warning;
      case 'NO_LOCAL': return theme.colors.primary;
      case 'EM_EXECUCAO': return theme.colors.primaryDark;
      case 'CONCLUIDO_LOCAL':
      case 'CONCLUIDO': return theme.colors.success;
      case 'FALHADO': return theme.colors.danger;
      default: return theme.colors.textMuted;
    }
  };

  // Data por extenso curta (ex: "seg., 02/09") só nas seções que não são
  // "Hoje" — dentro de "Hoje" já é óbvio que é hoje, não precisa repetir.
  function formatScheduledDate(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${weekday}, ${day}`;
  }

  const renderItem = ({ item, section }: { item: JobCardData; section: Section }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: item.id, orderId: item.order_id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobNumber}>{item.job_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.original_scheduled_date && item.original_scheduled_date !== item.scheduled_date ? (
        // Já foi empurrado de um dia atrasado pra hoje (ver migrateOverdueJobs
        // no painel web) — mostra sempre esse aviso, mesmo dentro de "Hoje",
        // pra não passar despercebido que já era pra ter sido feito antes.
        <Text style={[styles.scheduledDate, styles.scheduledDateOverdue]}>
          ⚠️ Atrasado — previsto pra {formatScheduledDate(item.original_scheduled_date)}
        </Text>
      ) : section.title !== 'Hoje' ? (
        <Text style={styles.scheduledDate}>📅 {formatScheduledDate(item.scheduled_date)}</Text>
      ) : null}

      <Text style={styles.jobType}>{item.job_type}</Text>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>👤 {item.orders.customers.name}</Text>
        <Text style={styles.addressText}>
          📍 {item.orders.addresses.street}, {item.orders.addresses.number} - {item.orders.addresses.district}
        </Text>
        <Text style={styles.cityText}>{item.orders.addresses.city}</Text>
      </View>
    </TouchableOpacity>
  );

  const isEmpty = sections.length === 0;

  return (
    <View style={styles.container}>
      {isEmpty && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Sua rota está vazia</Text>
          <Text style={styles.emptySub}>Nenhum serviço atribuído pra hoje nem pros próximos dias.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, section.title === 'Atrasados' && styles.sectionHeaderOverdue]}>
              {section.title === 'Atrasados' ? `⚠️ ${section.title}` : section.title}
            </Text>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderOverdue: {
    color: theme.colors.danger,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  jobNumber: {
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scheduledDate: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  scheduledDateOverdue: {
    color: theme.colors.danger,
  },
  jobType: {
    color: theme.colors.primaryLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  customerInfo: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  customerName: {
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  addressText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
  cityText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginLeft: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  emptySub: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
