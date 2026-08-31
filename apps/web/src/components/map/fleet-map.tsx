'use client';

import { useState } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';

type TelemetryPoint = {
  id?: string;
  driver: { profiles: { name: string } };
  location: {
    latitude: number;
    longitude: number;
    speed?: number | null;
    device_timestamp: string;
  };
};

const containerStyle = { width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' };

// Ícone circular colorido (mesmo visual do dot que era feito com L.divIcon no
// Leaflet) — SVG embutido como data URI, sem precisar de asset externo.
function buildIcon(isOnline: boolean) {
  const color = isOnline ? '#22C55E' : '#F59E0B';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <circle cx="12" cy="12" r="9" fill="${color}" stroke="#fff" stroke-width="3" />
    </svg>
  `;
  return {
    url: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svg) : ''}`,
    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(24, 24) : undefined,
    anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(12, 12) : undefined,
  };
}

export function FleetMap({ telemetry }: { telemetry: TelemetryPoint[] }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const points = telemetry.filter((t) => t.location?.latitude && t.location?.longitude);

  const first = points[0];
  const center = first
    ? { lat: first.location.latitude, lng: first.location.longitude }
    : { lat: -23.5505, lng: -46.6333 }; // fallback: São Paulo

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
        Carregando mapa...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={points.length ? 12 : 4}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {points.map((t, idx) => {
        const diffMin = Math.floor((Date.now() - new Date(t.location.device_timestamp).getTime()) / 60000);
        const isOnline = diffMin < 10;

        return (
          <MarkerF
            key={t.id ?? idx}
            position={{ lat: t.location.latitude, lng: t.location.longitude }}
            icon={buildIcon(isOnline)}
            onClick={() => setActiveIdx(idx)}
          >
            {activeIdx === idx && (
              <InfoWindowF onCloseClick={() => setActiveIdx(null)}>
                <div style={{ fontSize: '0.8125rem', color: '#111' }}>
                  <strong>{t.driver.profiles.name}</strong>
                  <br />
                  {isOnline ? 'Online' : `Há ${diffMin} min`}
                  <br />
                  {t.location.speed ? `${(t.location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}
    </GoogleMap>
  );
}
