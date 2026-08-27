/**
 * Distância em linha reta entre duas coordenadas, em metros (fórmula de
 * Haversine). Usado pra liberar "Cheguei ao local" só quando o motorista
 * está de fato perto do endereço do atendimento.
 */
export function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // raio médio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Coordenada (0, 0) não é uma localização real — é o que sobra quando um
 * endereço nunca foi geocodificado e o campo ficou com valor padrão em vez
 * de null. Mesma checagem usada em services/navigation.ts.
 */
export function hasValidCoords(latitude?: number | null, longitude?: number | null): latitude is number {
  return latitude != null && longitude != null && !(latitude === 0 && longitude === 0);
}
