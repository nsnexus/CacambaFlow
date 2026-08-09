'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const icon = L.divIcon({
  className: 'asset-marker',
  html: `<div style="
    width: 20px; height: 20px; border-radius: 50% 50% 50% 0;
    background: #F97316; border: 2px solid #fff; transform: rotate(-45deg);
    box-shadow: 0 0 8px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
});

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

function FlyToSelected({ assets, selectedId }: { assets: DeliveredAsset[]; selectedId: string | null }) {
  const map = useMap();
  const markerRefs = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!selectedId) return;
    const asset = assets.find(a => a.id === selectedId);
    if (!asset?.address?.latitude || !asset?.address?.longitude) return;
    map.flyTo([asset.address.latitude, asset.address.longitude], 16, { duration: 0.6 });
    markerRefs.current[selectedId]?.openPopup();
  }, [selectedId, assets, map]);

  return null;
}

export function AssetMap({ assets, selectedId, onSelect }: { assets: DeliveredAsset[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const points = assets.filter(a => a.address?.latitude && a.address?.longitude);

  const first = points[0];
  const center: [number, number] = first
    ? [first.address!.latitude!, first.address!.longitude!]
    : [-23.5505, -46.6333];

  return (
    <MapContainer center={center} zoom={points.length ? 12 : 4} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected assets={assets} selectedId={selectedId} />

      {points.map((a) => (
        <Marker
          key={a.id}
          position={[a.address!.latitude!, a.address!.longitude!]}
          icon={icon}
          eventHandlers={{ click: () => onSelect(a.id) }}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            <strong>{a.identifier}</strong>
            <br />
            {a.customer?.name}
            <br />
            Entregue: {formatDate(a.delivered_at)}
          </Tooltip>
          <Popup>
            <strong>{a.identifier}</strong> {a.asset_types ? `— ${a.asset_types.name}` : ''}
            <br />
            {a.customer?.name}
            <br />
            {a.address?.street}, {a.address?.number ?? 'S/N'} — {a.address?.city}/{a.address?.state}
            <br />
            Entregue em: {formatDate(a.delivered_at)}
            <br />
            Previsão de coleta: {formatDate(a.expected_return_date)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
