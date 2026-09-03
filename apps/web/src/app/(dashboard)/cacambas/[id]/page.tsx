import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getAssetById, getCustomersWithAddresses } from '@/app/actions/assets';
import { StatusBadge } from '@/components/ui/status-badge';
import { AssetStatusSelect } from '@/components/assets/asset-status-select';
import { DeliverAssetForm } from '@/components/assets/deliver-asset-form';
import { ReturnAssetBtn } from '@/components/assets/return-asset-btn';
import { serializeFirestoreData } from '@/lib/firebase/serialize';
import { IconLinkButton } from '@/components/ui/icon-link-button';

export const metadata: Metadata = { title: 'Caçamba — CaçambaFlow' };

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

export default async function CacambaDetailPage({ params }: { params: { id: string } }) {
  let asset;
  try {
    asset = await getAssetById(params.id);
  } catch {
    notFound();
  }

  const assetType = asset?.asset_types as { name: string; volume_m3: number } | null;
  const address = asset?.addresses as { name: string; city: string; state: string } | null;
  const status = (asset?.status as string) ?? 'DISPONIVEL';

  return (
    <div>
      <Link href="/cacambas" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{asset?.identifier}</h1>
            <p className="text-muted text-sm">{assetType ? `${assetType.name} — ${assetType.volume_m3}m³` : 'Tipo não definido'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <AssetStatusSelect assetId={params.id} status={status as any} />
            <IconLinkButton href={`/cacambas/${params.id}/editar`} icon={Pencil} label="Editar" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <div><p className="label">Cor</p><p>{asset?.color ?? '—'}</p></div>
          <div>
            <p className="label">Localização Atual</p>
            <p>{address ? `${address.name} — ${address.city}/${address.state}` : status === 'EM_TRANSPORTE' ? 'Em trânsito (voltando pro depósito)' : 'Pátio'}</p>
          </div>
          {status === 'LOCADA' && (
            <>
              <div><p className="label">Entregue em</p><p>{formatDate(asset?.delivered_at)}</p></div>
              <div><p className="label">Previsão de coleta</p><p>{formatDate(asset?.expected_return_date)}</p></div>
            </>
          )}
        </div>

        {status === 'LOCADA' && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <ReturnAssetBtn assetId={params.id} />
          </div>
        )}
      </div>

      {status === 'DISPONIVEL' && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Registrar Entrega</h2>
          <DeliverAssetForm assetId={params.id} customers={serializeFirestoreData(await getCustomersWithAddresses()) as any} />
        </div>
      )}
    </div>
  );
}
