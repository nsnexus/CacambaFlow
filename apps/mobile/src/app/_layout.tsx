import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { theme } from '../constants/theme';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Monitora o estado de autenticação para redirecionar entre Login e App
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!session && !inAuthGroup) {
        // Sem sessão e tentando acessar área logada -> manda pro login
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        // Com sessão mas na tela de login -> manda pro app principal
        router.replace('/(tabs)');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
