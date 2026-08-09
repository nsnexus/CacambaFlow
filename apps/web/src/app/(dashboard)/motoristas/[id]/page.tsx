import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDriverById } from '@/app/actions/drivers';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DriverStatusToggle } from '@/components/drivers/driver-status-toggle';

export const metadata: Metadata = { title: 'Motorista — CaçambaFlow' };

export default async function MotoristaDetailPage({ params }: { params: { id: string } }) {
  let driver;
  try {
    driver = await getDriverById(params.id);
  } catch {
    notFound();
  }

  const profile = (driver?.profiles ?? {}) as Record<string, any>;
  const recentJobs = (driver?.recentJobs ?? []) as Record<string, unknown>[];

  const expiredWarning = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return { label: 'Vencida', color: 'var(--color-danger)' };
    if (diffDays < 30) return { label: `Vence em ${diffDays}d`, color: 'var(--color-warning)' };
    return { label: d.toLocaleDateString('pt-BR'), color: 'var(--color-text)' };
  };

  const cnhStatus = driver?.license_expires_at ? expiredWarning(driver.license_expires_at) : null;

  return (
    <div>
      <Link href="/motoristas" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile?.name ?? 'Motorista'}</h1>
            <p className="text-muted text-sm">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={driver?.status ?? 'ATIVO'} />
            <DriverStatusToggle driverId={params.id} status={(driver?.status as 'ATIVO' | 'INATIVO') ?? 'ATIVO'} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {profile?.phone && (
            <div><p className="label">Telefone</p><p>{profile.phone}</p></div>
          )}
          <div><p className="label">CNH</p><p>{driver?.license_number}</p></div>
          <div><p className="label">Categoria</p><p>{driver?.license_category}</p></div>
          {cnhStatus && (
            <div>
              <p className="label">Validade da CNH</p>
              <p style={{ color: cnhStatus.color, fontWeight: 500 }}>{cnhStatus.label}</p>
            </div>
          )}
          <div>
            <p className="label">Rastreamento</p>
            <p style={{ color: driver?.tracking_enabled ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {driver?.tracking_enabled ? '✓ Ativo' : '✗ Inativo'}
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Últimos Atendimentos</h2>
      <DataTable
        id="table-driver-jobs"
        data={recentJobs}
        emptyMessage="Nenhum atendimento registrado para este motorista ainda."
        columns={[
          { key: 'job_number', label: 'Nº' },
          { key: 'job_type', label: 'Tipo' },
          { key: 'scheduled_date', label: 'Data', render: (val) => val ? new Date(val as string).toLocaleDateString('pt-BR') : '—' },
          { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val as string} /> },
        ]}
      />
    </div>
  );
}
