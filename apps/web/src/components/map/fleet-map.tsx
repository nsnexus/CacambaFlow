'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function buildIcon(isOnline: boolean) {
  const color = isOnline ? '#22C55E' : '#F59E0B';
  return L.divIcon({
    className: 'fleet-marker',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: ${color}; border: 3px solid #fff;
      box-shadow: 0 0 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

export function FleetMap({ telemetry }: { telemetry: TelemetryPoint[] }) {
  const points = telemetry.filter((t) => t.location?.latitude && t.location?.longitude);

  const first = points[0];
  const center: [number, number] = first
    ? [first.location.latitude, first.location.longitude]
    : [-23.5505, -46.6333]; // fallback: São Paulo

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 12 : 4}
      style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((t, idx) => {
        const diffMin = Math.floor((Date.now() - new Date(t.location.device_timestamp).getTime()) / 60000);
        const isOnline = diffMin < 10;

        return (
          <Marker
            key={t.id ?? idx}
            position={[t.location.latitude, t.location.longitude]}
            icon={buildIcon(isOnline)}
          >
            <Popup>
              <strong>{t.driver.profiles.name}</strong>
              <br />
              {isOnline ? 'Online' : `Há ${diffMin} min`}
              <br />
              {t.location.speed ? `${(t.location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
