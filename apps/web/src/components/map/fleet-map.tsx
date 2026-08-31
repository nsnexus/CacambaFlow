'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';

export type TelemetryPoint = {
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

export type FleetAsset = {
  id: string;
  identifier: string;
  asset_types?: { name: string } | null;
  customer?: { name: string } | null;
  address?: { street?: string; number?: string; city?: string; state?: string; latitude?: number; longitude?: number } | null;
  delivered_at?: string | null;
  expected_return_date?: string | null;
};

const containerStyle = { width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' };
const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 }; // fallback: São Paulo

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

// Ícone de caçamba (skip/dumpster) de verdade — corpo trapezoidal mais largo
// em cima, aba na borda e nervuras verticais, nas cores da marca. Nada de pin
// genérico ou balde.
function assetIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="30" viewBox="0 0 32 30">
      <path d="M4 8 L28 8 L24 26 L8 26 Z" fill="#F97316" stroke="#fff" stroke-width="2"/>
      <rect x="2" y="5" width="28" height="4" rx="1" fill="#C2410C" stroke="#fff" stroke-width="1.5"/>
      <line x1="10" y1="9" x2="9" y2="25" stroke="#C2410C" stroke-width="1.5"/>
      <line x1="16" y1="9" x2="16" y2="25" stroke="#C2410C" stroke-width="1.5"/>
      <line x1="22" y1="9" x2="23" y2="25" stroke="#C2410C" stroke-width="1.5"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svg) : ''}`,
    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(32, 30) : undefined,
    anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(16, 26) : undefined,
  };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

export function FleetMap({
  telemetry,
  assets = [],
  selectedDriverIdx = null,
  selectedAssetId = null,
}: {
  telemetry: TelemetryPoint[];
  assets?: FleetAsset[];
  selectedDriverIdx?: number | null;
  selectedAssetId?: string | null;
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeDriver, setActiveDriver] = useState<number | null>(null);
  const [activeAsset, setActiveAsset] = useState<string | null>(null);

  const points = telemetry.filter((t) => t.location?.latitude && t.location?.longitude);
  const assetPoints = assets.filter((a) => a.address?.latitude && a.address?.longitude);

  // Centro só é calculado UMA VEZ (lazy initializer do useState) — se
  // recalculássemos a cada render, o Centro de Controle "puxava" o mapa de
  // volta pro motorista a cada atualização automática (10s), atrapalhando
  // quem tava navegando/olhando outra parte do mapa. Pan/zoom manual do
  // usuário fica intocado depois disso; só muda via seleção explícita
  // (sidebar), tratada abaixo com panTo imperativo.
  const [initialCenter] = useState(() => {
    if (points[0]) return { lat: points[0].location.latitude, lng: points[0].location.longitude };
    if (assetPoints[0]?.address) return { lat: assetPoints[0].address.latitude!, lng: assetPoints[0].address.longitude! };
    return DEFAULT_CENTER;
  });

  // Seleção explícita (clique na lista lateral) pan+zoom pro motorista.
  useEffect(() => {
    if (selectedDriverIdx == null || !mapRef.current) return;
    const t = points[selectedDriverIdx];
    if (!t) return;
    mapRef.current.panTo({ lat: t.location.latitude, lng: t.location.longitude });
    mapRef.current.setZoom(15);
    setActiveDriver(selectedDriverIdx);
  }, [selectedDriverIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seleção explícita (clique na lista lateral) pan+zoom pra caçamba.
  useEffect(() => {
    if (!selectedAssetId || !mapRef.current) return;
    const a = assetPoints.find((p) => p.id === selectedAssetId);
    if (!a?.address?.latitude || !a?.address?.longitude) return;
    mapRef.current.panTo({ lat: a.address.latitude, lng: a.address.longitude });
    mapRef.current.setZoom(16);
    setActiveAsset(selectedAssetId);
  }, [selectedAssetId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      center={initialCenter}
      zoom={points.length || assetPoints.length ? 12 : 4}
      onLoad={(map) => { mapRef.current = map; }}
      options={{ streetViewControl: false, mapTypeControl: true, fullscreenControl: false }}
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
            onMouseOver={() => setActiveDriver(idx)}
            onMouseOut={() => setActiveDriver(null)}
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
          onMouseOver={() => setActiveAsset(a.id)}
          onMouseOut={() => setActiveAsset(null)}
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
