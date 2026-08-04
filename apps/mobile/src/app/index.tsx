import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

export default function InitialScreen() {
  const router = useRouter();

  useEffect(() => {
    // Verifica a sessão atual ao iniciar o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>🪣 CaçambaFlow</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
