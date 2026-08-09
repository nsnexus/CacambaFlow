import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { theme } from '../constants/theme';

type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  vehicle_type: string;
};

export default function VehicleSelectScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [currentVehicleId, setCurrentVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      if (!profileSnap.exists()) return;
      const tenantId = profileSnap.data().tenant_id;

      // O filtro de tenant_id é obrigatório na própria query (não basta a
      // regra de segurança checar isso "por trás" — o Firestore nega
      // consultas em lista sem o mesmo campo filtrado explicitamente).
      const driversSnap = await getDocs(query(
        collection(db, 'drivers'),
        where('profile_id', '==', user.uid),
        where('tenant_id', '==', tenantId)
      ));
      if (driversSnap.empty) return;
      const driverDoc = driversSnap.docs[0];
      setDriverId(driverDoc.id);
      setCurrentVehicleId(driverDoc.data().current_vehicle_id ?? null);

      const vehiclesSnap = await getDocs(query(
        collection(db, 'vehicles'),
        where('tenant_id', '==', tenantId),
        where('status', '==', 'ATIVO')
      ));
      setVehicles(vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    } catch (error: any) {
      Alert.alert('Erro ao carregar veículos', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSelect(vehicleId: string) {
    if (!driverId) return;
    setSaving(vehicleId);
    try {
      await updateDoc(doc(db, 'drivers', driverId), { current_vehicle_id: vehicleId });
      setCurrentVehicleId(vehicleId);
      router.back();
    } catch (error: any) {
      Alert.alert('Erro ao selecionar veículo', error.message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhum veículo disponível. Fale com o administrador.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = item.id === currentVehicleId;
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(item.id)}
              disabled={saving !== null}
            >
              <View>
                <Text style={styles.plate}>{item.plate}</Text>
                <Text style={styles.model}>{item.brand} {item.model} · {item.vehicle_type}</Text>
              </View>
              {saving === item.id ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : isSelected ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  list: {
    padding: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
  },
  plate: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  model: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
});
