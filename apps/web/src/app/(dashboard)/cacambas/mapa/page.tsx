import type { Metadata } from 'next';
import Link from 'next/link';
import { getDeliveredAssets } from '@/app/actions/assets';
import { AssetsMapView } from '@/components/assets/assets-map-view';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Mapa de Caçambas — CaçambaFlow' };

export default async function CacambasMapaPage() {
  const assets = await getDeliveredAssets();

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/cacambas" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Caçambas
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mapa de Caçambas Entregues</h1>
        <p className="text-muted text-sm">{assets.length} caçamba(s) em campo agora. Clique numa linha da tabela pra localizar no mapa.</p>
      </div>

      <AssetsMapView assets={serializeFirestoreData(assets) as any} />
    </div>
  );
}
