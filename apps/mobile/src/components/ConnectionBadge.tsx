import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../constants/theme';

/**
 * Indicador de conexão fixo no topo do app (header das tabs). Mostra
 * Online/Offline em tempo real via NetInfo — importante porque o app
 * mobile precisa funcionar (ou pelo menos avisar) sem internet em campo.
 */
export function ConnectionBadge() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable pode vir null enquanto o NetInfo ainda não checou
      // de verdade — trata como online nesse caso pra não piscar "offline"
      // falso logo na abertura do app.
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: isOnline ? theme.colors.success : theme.colors.danger }]} />
      <Text style={[styles.label, { color: isOnline ? theme.colors.success : theme.colors.danger }]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
