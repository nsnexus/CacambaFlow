import { Linking, Platform } from 'react-native';

const FALLBACK_URL = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

/**
 * Coordenada (0, 0) não é uma localização real — é o que sobra quando um
 * endereço nunca foi geocodificado e o campo ficou com valor padrão em vez
 * de null. Mandar isso pro Maps resulta em "não foi possível traçar rota".
 */
function hasValidCoords(latitude?: number | null, longitude?: number | null): latitude is number {
  return (
    latitude != null && longitude != null && !(latitude === 0 && longitude === 0)
  );
}

/**
 * Abre o app de navegação do dispositivo com destino no endereço informado.
 * Usa coordenadas quando elas são válidas (mais preciso); cai pro endereço em
 * texto quando não há coordenada geocodificada — mais confiável do que mandar
 * uma coordenada zerada/inválida pro Maps.
 * No Android, o esquema "geo:" aciona o seletor nativo entre todos os apps
 * de mapa instalados (Google Maps, Waze, etc.) — não fica preso a um só.
 */
export async function openNavigationApp(
  destination: { latitude?: number | null; longitude?: number | null; address: string },
  label: string
) {
  const encodedLabel = encodeURIComponent(label);
  const useCoords = hasValidCoords(destination.latitude, destination.longitude);
  const query = useCoords
    ? `${destination.latitude},${destination.longitude}`
    : encodeURIComponent(destination.address);
  // Com coordenada válida, centraliza o mapa nela; sem coordenada, "geo:0,0"
  // deixa o Maps geocodificar o endereço em texto do "q=" sozinho.
  const geoOrigin = useCoords ? query : '0,0';

  const url = Platform.select({
    android: `geo:${geoOrigin}?q=${query}(${encodedLabel})`,
    ios: `maps:0,0?q=${encodedLabel}@${query}`,
    default: FALLBACK_URL(query),
  });

  try {
    const canOpen = url ? await Linking.canOpenURL(url) : false;
    await Linking.openURL(canOpen && url ? url : FALLBACK_URL(query));
  } catch {
    await Linking.openURL(FALLBACK_URL(query));
  }
}
