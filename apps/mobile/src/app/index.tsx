import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Image } from 'react-native';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

export default function InitialScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo-mark.png')} style={styles.logoIcon} resizeMode="contain" />
      <Text style={styles.logoText}>CaçambaFlow</Text>
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
  logoIcon: {
    width: 96,
    height: 96,
    marginBottom: theme.spacing.sm,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
