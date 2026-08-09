'use client';

import dynamic from 'next/dynamic';

export const FleetMapLoader = dynamic(() => import('./fleet-map').then((mod) => mod.FleetMap), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
      Carregando mapa...
    </div>
  ),
});
