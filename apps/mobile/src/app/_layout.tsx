import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { useOTAUpdates } from '../hooks/useOTAUpdates';

export default function RootLayout() {
  useOTAUpdates();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="job/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            title: 'Atendimento',
            headerRight: () => <ConnectionBadge />,
          }}
        />
        <Stack.Screen
          name="vehicle-select"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            title: 'Selecionar Veículo',
            headerRight: () => <ConnectionBadge />,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
