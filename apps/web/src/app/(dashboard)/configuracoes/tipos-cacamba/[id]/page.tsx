import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetTypeById } from '@/app/actions/assets';
import { AssetTypeForm } from '@/components/assets/asset-type-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Tipo de Caçamba — CaçambaFlow' };

export default async function EditarTipoCacambaPage({ params }: { params: { id: string } }) {
  let assetType;
  try {
    assetType = await getAssetTypeById(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href="/configuracoes/tipos-cacamba" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Editar Tipo de Caçamba</h1>

      <div className="card">
        <AssetTypeForm assetType={serializeFirestoreData(assetType) as any} />
      </div>
    </div>
  );
}
