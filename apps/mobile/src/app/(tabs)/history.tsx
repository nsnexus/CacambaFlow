import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { limit, orderBy, where } from 'firebase/firestore';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';
import { getCurrentDriver, fetchDriverJobs, TERMINAL_STATUSES, type JobCardData } from '../../services/jobs';

const HISTORY_LIMIT = 50;

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async function fetchJobs() {
    try {
      const driver = await getCurrentDriver();
      if (!driver) {
        Alert.alert('Atenção', 'Seu usuário não está vinculado a um perfil de motorista.');
        return;
      }

      const jobsList = await fetchDriverJobs(driver.driverId, driver.tenantId, [
        orderBy('scheduled_date', 'desc'),
        limit(HISTORY_LIMIT),
      ]);

      // Só corridas já encerradas entram no histórico; as ativas ficam em "Minha Rota".
      setJobs(jobsList.filter((job) => TERMINAL_STATUSES.includes(job.status)));
    } catch (error: any) {
      Alert.alert('Erro ao carregar histórico', error.message);
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
    switch (status) {
      case 'CONCLUIDO': return theme.colors.success;
      case 'FALHADO': return theme.colors.danger;
      case 'CANCELADO': return theme.colors.textMuted;
      default: return theme.colors.textMuted;
    }
  };

  const renderItem = ({ item }: { item: JobCardData }) => (
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

      <Text style={styles.dateText}>{formatDate(item.scheduled_date)}</Text>
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

  return (
    <View style={styles.container}>
      {jobs.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={styles.emptyTitle}>Nenhuma corrida no histórico</Text>
          <Text style={styles.emptySub}>As corridas concluídas, falhadas ou canceladas aparecem aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.md,
  },
});
