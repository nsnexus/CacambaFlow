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
  assignedJobsCount?: number;
  isEmRota?: boolean;
};

type FleetAsset = {
  id: string;
  identifier: string;
  asset_types?: { name: string } | null;
  customer?: { name: string } | null;
  address?: { street?: string; number?: string; city?: string; state?: string; latitude?: number; longitude?: number } | null;
  delivered_at?: string | null;
  expected_return_date?: string | null;
};

const containerStyle = { width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' };

// Círculo colorido (online/offline) com um caminhão desenhado por cima — o
// label do Marker fica centralizado sobre o icon, então dá pra combinar os
// dois sem precisar desenhar um SVG de caminhão do zero.
function driverIcon(isOnline: boolean) {
  const color = isOnline ? '#22C55E' : '#F59E0B';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="#fff" stroke-width="3" />
    </svg>
  `;
  return {
    url: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svg) : ''}`,
    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(28, 28) : undefined,
    anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(14, 14) : undefined,
  };
}

// Pin da caçamba (mesmo visual usado em asset-map.tsx) — cor diferente da do
// motorista pra distinguir de longe no mapa combinado.
function assetIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 28 34">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 20 14 20s14-10 14-20c0-7.7-6.3-14-14-14z" fill="#3B82F6" stroke="#fff" stroke-width="2"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svg) : ''}`,
    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(24, 30) : undefined,
    anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(12, 30) : undefined,
  };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

export function FleetMap({ telemetry, assets = [] }: { telemetry: TelemetryPoint[]; assets?: FleetAsset[] }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });
  const [activeDriver, setActiveDriver] = useState<number | null>(null);
  const [activeAsset, setActiveAsset] = useState<string | null>(null);

  const points = telemetry.filter((t) => t.location?.latitude && t.location?.longitude);
  const assetPoints = assets.filter((a) => a.address?.latitude && a.address?.longitude);

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
            icon={driverIcon(isOnline)}
            label={{ text: '🚚', fontSize: '14px' }}
            zIndex={999}
            onClick={() => setActiveDriver(idx)}
          >
            {activeDriver === idx && (
              <InfoWindowF onCloseClick={() => setActiveDriver(null)}>
                <div style={{ fontSize: '0.8125rem', color: '#111' }}>
                  <strong>{t.driver.profiles.name}</strong>
                  <br />
                  {isOnline ? 'Online' : `Há ${diffMin} min`}
                  <br />
                  {t.location.speed ? `${(t.location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                  {typeof t.assignedJobsCount === 'number' && (
                    <>
                      <br />
                      {t.isEmRota ? '🟠 Em rota de entrega — ' : ''}
                      {t.assignedJobsCount} atendimento{t.assignedJobsCount === 1 ? '' : 's'} atribuído{t.assignedJobsCount === 1 ? '' : 's'}
                    </>
                  )}
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}

      {assetPoints.map((a) => (
        <MarkerF
          key={a.id}
          position={{ lat: a.address!.latitude!, lng: a.address!.longitude! }}
          icon={assetIcon()}
          title={a.identifier}
          onClick={() => setActiveAsset(a.id)}
        >
          {activeAsset === a.id && (
            <InfoWindowF onCloseClick={() => setActiveAsset(null)}>
              <div style={{ fontSize: '0.8125rem', color: '#111' }}>
                <strong>{a.identifier}</strong> {a.asset_types ? `— ${a.asset_types.name}` : ''}
                <br />
                {a.customer?.name}
                <br />
                {a.address?.street}, {a.address?.number ?? 'S/N'} — {a.address?.city}/{a.address?.state}
                <br />
                Entregue em: {formatDate(a.delivered_at)}
                <br />
                Previsão de coleta: {formatDate(a.expected_return_date)}
              </div>
            </InfoWindowF>
          )}
        </MarkerF>
      ))}
    </GoogleMap>
  );
}
