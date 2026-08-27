import { Tabs } from 'expo-router';
import { theme } from '../../constants/theme';
import { Text } from 'react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startLocationTracking, promptLocationIssue } from '../../services/location';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Captura localização assim que o motorista abre o app logado, para o
    // painel administrativo já ter a posição sincronizada mesmo sem atendimento em rota.
    startLocationTracking().catch((e) => {
      console.warn('[TabsLayout] rastreamento não iniciado ao abrir o app:', e.message);
      promptLocationIssue(e);
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Minha Rota',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🚚</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗂️</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
