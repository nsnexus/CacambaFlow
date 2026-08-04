import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';
import type { JobStatus } from '@cacambaflow/types';

type JobCardData = {
  id: string;
  job_number: string;
  job_type: string;
  status: JobStatus;
  scheduled_date: string;
  orders: {
    customers: { name: string };
    addresses: { street: string; number: string; district: string; city: string };
  };
};

export default function HomeScreen() {
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs() {
    try {
      // 1. Pegar perfil logado para achar driver_id correspondente
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', userData.user.id).single();
      if (!profile) return;

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).single();
      if (!driver) {
        Alert.alert('Atenção', 'Seu usuário não está vinculado a um perfil de motorista.');
        return;
      }

      // 2. Buscar serviços do dia atribuídos a ele
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, job_number, job_type, status, scheduled_date,
          orders (
            customers ( name ),
            addresses ( street, number, district, city )
          )
        `)
        .eq('assigned_driver_id', driver.id)
        .eq('scheduled_date', today)
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      setJobs(data as any);
    } catch (error: any) {
      Alert.alert('Erro ao carregar rota', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

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

  const renderItem = ({ item }: { item: JobCardData }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.jobNumber}>{item.job_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
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
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Sua rota está vazia</Text>
          <Text style={styles.emptySub}>Nenhum serviço atribuído para hoje.</Text>
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
