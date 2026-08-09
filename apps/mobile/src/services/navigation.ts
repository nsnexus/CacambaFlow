import { Linking, Platform } from 'react-native';

const FALLBACK_URL = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/**
 * Abre o app de navegação do dispositivo com destino nas coordenadas dadas.
 * No Android, o esquema "geo:" aciona o seletor nativo entre todos os apps
 * de mapa instalados (Google Maps, Waze, etc.) — não fica preso a um só.
 */
export async function openNavigationApp(latitude: number, longitude: number, label: string) {
  const encodedLabel = encodeURIComponent(label);

  const url = Platform.select({
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    ios: `maps:0,0?q=${encodedLabel}@${latitude},${longitude}`,
    default: FALLBACK_URL(latitude, longitude),
  });

  try {
    const canOpen = url ? await Linking.canOpenURL(url) : false;
    await Linking.openURL(canOpen && url ? url : FALLBACK_URL(latitude, longitude));
  } catch {
    await Linking.openURL(FALLBACK_URL(latitude, longitude));
  }
}
