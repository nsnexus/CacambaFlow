import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetById } from '@/app/actions/assets';
import { StatusBadge } from '@/components/ui/status-badge';
import { AssetStatusSelect } from '@/components/assets/asset-status-select';

export const metadata: Metadata = { title: 'Caçamba — CaçambaFlow' };

export default async function CacambaDetailPage({ params }: { params: { id: string } }) {
  let asset;
  try {
    asset = await getAssetById(params.id);
  } catch {
    notFound();
  }

  const assetType = asset?.asset_types as { name: string; volume_m3: number } | null;
  const address = asset?.addresses as { name: string; city: string; state: string } | null;

  return (
    <div>
      <Link href="/cacambas" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{asset?.identifier}</h1>
            <p className="text-muted text-sm">{assetType ? `${assetType.name} — ${assetType.volume_m3}m³` : 'Tipo não definido'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={asset?.status ?? 'DISPONIVEL'} />
            <AssetStatusSelect assetId={params.id} status={(asset?.status as any) ?? 'DISPONIVEL'} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <div><p className="label">Cor</p><p>{asset?.color ?? '—'}</p></div>
          <div>
            <p className="label">Localização Atual</p>
            <p>{address ? `${address.name} — ${address.city}/${address.state}` : 'Pátio'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
