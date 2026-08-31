'use server';

// Busca de endereço via Google Geocoding API — roda no servidor de propósito
// (a chave GOOGLE_MAPS_API_KEY nunca pode chegar ao navegador do usuário).
// Cobertura de rua no Brasil é bem melhor que o Nominatim/OpenStreetMap
// usado antes, principalmente em cidade pequena/média.

export type GeocodeResult = {
  displayName: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
};

function component(components: GoogleAddressComponent[], type: string, useShort = false): string {
  const found = components.find((c) => c.types.includes(type));
  if (!found) return '';
  return useShort ? found.short_name : found.long_name;
}

function parseResult(r: GoogleGeocodeResult): GeocodeResult {
  const c = r.address_components;
  return {
    displayName: r.formatted_address,
    street: component(c, 'route'),
    number: component(c, 'street_number'),
    district: component(c, 'sublocality_level_1') || component(c, 'sublocality') || component(c, 'neighborhood'),
    city: component(c, 'administrative_area_level_2') || component(c, 'locality'),
    state: component(c, 'administrative_area_level_1', true),
    postal_code: component(c, 'postal_code'),
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
  };
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('[geocodeAddress] GOOGLE_MAPS_API_KEY não configurada');
    return [];
  }
  if (!query.trim()) return [];

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=br&language=pt-BR&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.results)) return [];
    return data.results.map(parseResult);
  } catch (e) {
    console.error('[geocodeAddress] falha ao consultar Google Geocoding:', e);
    return [];
  }
}
