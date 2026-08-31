import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetById, getAssetTypes } from '@/app/actions/assets';
import { AssetForm } from '@/components/assets/asset-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Caçamba — CaçambaFlow' };

export default async function EditarCacambaPage({ params }: { params: { id: string } }) {
  let asset;
  try {
    asset = await getAssetById(params.id);
  } catch {
    notFound();
  }
  const assetTypes = await getAssetTypes();

  return (
    <div>
      <Link href={`/cacambas/${params.id}`} className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Editar Caçamba</h1>

      <div className="card">
        <AssetForm assetTypes={serializeFirestoreData(assetTypes) as any} asset={serializeFirestoreData(asset) as any} />
      </div>
    </div>
  );
}
