'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';

export type DeliveredAsset = {
  id: string;
  identifier: string;
  color?: string | null;
  delivered_at?: string | null;
  expected_return_date?: string | null;
  asset_types?: { name: string; volume_m3: number } | null;
  customer?: { name: string } | null;
  address?: { name: string; street: string; number?: string; city: string; state: string; latitude?: number; longitude?: number } | null;
};

const containerStyle = { width: '100%', height: '100%' };

// Mesmo formato de "pin" gota que era feito com L.divIcon no Leaflet (círculo
// com uma ponta), como SVG embutido.
function pinIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 20 14 20s14-10 14-20c0-7.7-6.3-14-14-14z" fill="#F97316" stroke="#fff" stroke-width="2"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svg) : ''}`,
    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(28, 34) : undefined,
    anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(14, 34) : undefined,
  };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

export function AssetMap({ assets, selectedId, onSelect }: { assets: DeliveredAsset[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const points = assets.filter((a) => a.address?.latitude && a.address?.longitude);

  const first = points[0];
  const center = first
    ? { lat: first.address!.latitude!, lng: first.address!.longitude! }
    : { lat: -23.5505, lng: -46.6333 };

  // Equivalente ao FlyToSelected do Leaflet: quando o pai muda `selectedId`
  // (ex.: clique numa lista ao lado), centraliza o mapa nesse ponto e abre o
  // InfoWindow dele.
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const asset = points.find((a) => a.id === selectedId);
    if (!asset?.address?.latitude || !asset?.address?.longitude) return;
    mapRef.current.panTo({ lat: asset.address.latitude, lng: asset.address.longitude });
    mapRef.current.setZoom(16);
    setActiveId(selectedId);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      onLoad={(map) => { mapRef.current = map; }}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {points.map((a) => (
        <MarkerF
          key={a.id}
          position={{ lat: a.address!.latitude!, lng: a.address!.longitude! }}
          icon={pinIcon()}
          title={`${a.identifier}${a.customer?.name ? ' — ' + a.customer.name : ''}`}
          onClick={() => {
            onSelect(a.id);
            setActiveId(a.id);
          }}
        >
          {activeId === a.id && (
            <InfoWindowF onCloseClick={() => setActiveId(null)}>
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
