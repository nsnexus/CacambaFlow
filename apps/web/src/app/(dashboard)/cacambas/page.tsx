import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

export const metadata: Metadata = { title: 'Caçambas — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

// TODO: Migrar para Firestore
async function getAssets() {
  const { tenantId } = await requireUserAndTenant();
  const snapshot = await adminDb.collection('assets')
    .where('tenant_id', '==', tenantId)
    .orderBy('created_at', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export default async function CacambasPage() {
  const assets = await getAssets();

  const disponíveis = assets.filter((a) => a.status === 'DISPONIVEL').length;
  const locadas = assets.filter((a) => a.status === 'LOCADA').length;
  const manutencao = assets.filter((a) => a.status === 'MANUTENCAO').length;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Caçambas</h1>
          <p className="text-muted text-sm">{assets.length} ativo(s) no total</p>
        </div>
        <Link id="btn-nova-cacamba" href="/cacambas/nova" className="btn btn--primary">
          + Nova Caçamba
        </Link>
      </div>

      {/* Resumo rápido */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { id: 'stat-disponivel', label: 'Disponíveis', value: disponíveis, color: 'var(--color-success)' },
          { id: 'stat-locada', label: 'Locadas', value: locadas, color: 'var(--color-info)' },
          { id: 'stat-manutencao', label: 'Manutenção', value: manutencao, color: 'var(--color-warning)' },
        ].map((s) => (
          <div
            key={s.id}
            id={s.id}
            style={{
              background: 'var(--color-surface)',
              border: `1px solid var(--color-border)`,
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <DataTable
        id="table-cacambas"
        data={assets as unknown as Record<string, unknown>[]}
        emptyMessage="Nenhuma caçamba cadastrada ainda."
        columns={[
          {
            key: 'identifier',
            label: 'Número',
            render: (val) => (
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                {val as string}
              </span>
            ),
          },
          {
            key: 'asset_types',
            label: 'Tipo / Capacidade',
            render: (val) => {
              const t = val as { name: string; volume_m3: number } | null;
              return t ? `${t.name} — ${t.volume_m3}m³` : '—';
            },
          },
          { key: 'color', label: 'Cor' },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
          {
            key: 'addresses',
            label: 'Localização',
            render: (val) => {
              const a = val as { name: string; city: string; state: string } | null;
              return a ? `${a.name} — ${a.city}/${a.state}` : 'Pátio';
            },
          },
        ]}
        actions={(row) => (
          <Link
            href={`/cacambas/${row.id}`}
            className="btn btn--secondary btn--sm"
            id={`btn-detail-asset-${row.id}`}
          >
            Detalhes
          </Link>
        )}
      />
    </div>
  );
}
