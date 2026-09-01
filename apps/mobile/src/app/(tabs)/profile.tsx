import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { auth, db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { theme } from '../../constants/theme';
import { stopLocationTracking } from '../../services/location';

// Diagnóstico de atualização — mostra qual pacote OTA (expo-updates) está
// rodando de verdade, pra não ter dúvida se um APK antigo (sem a
// configuração de auto-atualização) tá instalado ou se a última atualização
// pegou. Se sumir/mudar depois de fechar e abrir o app, é sinal de que
// atualizou; se ficar sempre "não configurado", o APK instalado é anterior à
// função de auto-atualização e precisa reinstalar uma vez.
function otaDiagnosticLabel(): string {
  if (!Updates.isEnabled) return 'OTA: não configurado (build antigo ou modo dev)';
  const shortId = Updates.updateId ? Updates.updateId.slice(0, 8) : 'embutido';
  return `OTA: ${Updates.channel ?? '—'} · ${shortId}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name?: string; full_name?: string; email: string } | null>(null);
  const [currentVehicle, setCurrentVehicle] = useState<{ plate: string } | null>(null);

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    if (!profileSnap.exists()) return;
    const profileData = profileSnap.data() as any;
    setProfile(profileData);

    const tenantId = profileData.tenant_id;
    const driversSnap = await getDocs(query(
      collection(db, 'drivers'),
      where('profile_id', '==', user.uid),
      where('tenant_id', '==', tenantId)
    ));
    if (driversSnap.empty) return;
    const driverData = driversSnap.docs[0].data();

    if (driverData.current_vehicle_id) {
      const vehicleSnap = await getDoc(doc(db, 'vehicles', driverData.current_vehicle_id));
      if (vehicleSnap.exists()) {
        setCurrentVehicle({ plate: (vehicleSnap.data() as any).plate });
      }
    } else {
      setCurrentVehicle(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleLogout() {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await stopLocationTracking();
            await signOut(auth);
            // app/index.tsx só escuta onAuthStateChanged enquanto está montado
            // (mesmo motivo comentado em login.tsx) — como já navegamos pra
            // longe dele faz tempo, o redirecionamento precisa ser explícito aqui.
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name || profile?.full_name ? (profile.name || profile.full_name)!.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name || profile?.full_name || 'Carregando...'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/vehicle-select')}>
          <Text style={styles.menuItemText}>Meu Veículo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text style={styles.menuItemValue}>{currentVehicle?.plate ?? 'Nenhum selecionado'}</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Ajuda e Suporte</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versão 1.0.0 (Beta)</Text>
      <Text style={styles.version}>{otaDiagnosticLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarText: {
    fontSize: 32,
    color: theme.colors.text,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  menu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  menuItemArrow: {
    color: theme.colors.textMuted,
    fontSize: 18,
  },
  menuItemValue: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xl,
    fontSize: 12,
  },
});
