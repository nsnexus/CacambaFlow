import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { theme } from '../../constants/theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<{ name?: string; full_name?: string; email: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const user = auth.currentUser;
      if (!user) return;

      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as any);
      }
    }
    loadProfile();
  }, []);

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
            await signOut(auth);
            // O onAuthStateChanged em app/index.tsx cuida do redirecionamento
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
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Configurações</Text>
          <Text style={styles.menuItemArrow}>›</Text>
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
