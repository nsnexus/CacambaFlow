'use client';

import dynamic from 'next/dynamic';

export const AssetMapLoader = dynamic(() => import('./asset-map').then((mod) => mod.AssetMap), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
      Carregando mapa...
    </div>
  ),
});
