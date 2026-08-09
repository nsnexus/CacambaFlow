import type { Metadata } from 'next';
import Link from 'next/link';
import { getAssetTypes } from '@/app/actions/assets';
import { AssetForm } from '@/components/assets/asset-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Nova Caçamba — CaçambaFlow' };

export default async function NovaCacambaPage() {
  const assetTypes = await getAssetTypes();

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/cacambas" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Caçambas
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nova Caçamba</h1>
        <p className="text-muted text-sm">Cadastre um novo ativo (caçamba) para locação.</p>
      </div>

      <div className="card">
        <AssetForm assetTypes={serializeFirestoreData(assetTypes) as any} />
      </div>
    </div>
  );
}
