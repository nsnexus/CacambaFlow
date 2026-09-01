import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Pencil, Smartphone } from 'lucide-react';
import { getDrivers, deleteDriver } from '@/app/actions/drivers';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteEntityButton } from '@/components/ui/delete-entity-button';
import { IconLinkButton } from '@/components/ui/icon-link-button';
import { getMobileAppDownloadUrl } from '@/app/actions/mobile-app-settings';

export const metadata: Metadata = { title: 'Motoristas — CaçambaFlow' };

export default async function MotoristasPage() {
  const [drivers, appDownloadUrl] = await Promise.all([
    getDrivers(),
    getMobileAppDownloadUrl(),
  ]);

  const expiredWarning = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return { label: 'Vencida', color: 'var(--color-danger)' };
    if (diffDays < 30) return { label: `Vence em ${diffDays}d`, color: 'var(--color-warning)' };
    return { label: d.toLocaleDateString('pt-BR'), color: 'var(--color-text)' };
  };

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Motoristas</h1>
          <p className="text-muted text-sm">{drivers.length} motorista(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          {appDownloadUrl ? (
            <Link
              id="btn-baixar-app-motorista"
              href={appDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
            >
              <Smartphone size={16} /> Baixar App (Android)
            </Link>
          ) : (
            <Link id="btn-baixar-app-motorista" href="/configuracoes/app-motorista" className="btn btn--secondary">
              <Smartphone size={16} /> Configurar App do Motorista
            </Link>
          )}
          <Link id="btn-novo-motorista" href="/motoristas/novo" className="btn btn--primary">
            + Novo Motorista
          </Link>
        </div>
      </div>

      <DataTable
        id="table-motoristas"
        data={drivers as Record<string, unknown>[]}
        emptyMessage="Nenhum motorista cadastrado ainda. Clique em 'Novo Motorista' para começar."
        columns={[
          {
            key: 'profiles',
            label: 'Nome',
            render: (val) => {
              const p = val as { name: string; phone: string } | null;
              return (
                <div>
                  <div style={{ fontWeight: 500 }}>{p?.name ?? '—'}</div>
                  <div className="text-xs text-muted">{p?.phone ?? ''}</div>
                </div>
              );
            },
          },
          { key: 'license_number', label: 'CNH' },
          { key: 'license_category', label: 'Categoria' },
          {
            key: 'license_expires_at',
            label: 'Validade CNH',
            render: (val) => {
              const { label, color } = expiredWarning(val as string);
              return <span style={{ color, fontWeight: 500 }}>{label}</span>;
            },
          },
          {
            key: 'tracking_enabled',
            label: 'Rastreamento',
            render: (val) => (
              <span style={{ color: val ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {val ? '✓ Ativo' : '✗ Inativo'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
        ]}
        actions={(row) => (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <IconLinkButton href={`/motoristas/${row.id}`} icon={Eye} label="Ver detalhes" id={`btn-detail-driver-${row.id}`} />
            <IconLinkButton href={`/motoristas/${row.id}/editar`} icon={Pencil} label="Editar" />
            <DeleteEntityButton
              id={row.id as string}
              confirmMessage={`Excluir o motorista ${(row.profiles as any)?.name ?? ''}? Isso remove ele da frota (o login/conta não é apagado). Essa ação não pode ser desfeita.`}
              action={deleteDriver}
            />
          </div>
        )}
      />
    </div>
  );
}
