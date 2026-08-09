import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVehicleById } from '@/app/actions/vehicles';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { VehicleStatusSelect } from '@/components/vehicles/vehicle-status-select';

export const metadata: Metadata = { title: 'Veículo — CaçambaFlow' };

export default async function VeiculoDetailPage({ params }: { params: { id: string } }) {
  let vehicle;
  try {
    vehicle = await getVehicleById(params.id);
  } catch {
    notFound();
  }

  const recentJobs = (vehicle?.recentJobs ?? []) as Record<string, unknown>[];

  return (
    <div>
      <Link href="/veiculos" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace' }}>{vehicle?.plate}</h1>
            <p className="text-muted text-sm">{vehicle?.brand} {vehicle?.model} {vehicle?.year ? `— ${vehicle.year}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={vehicle?.status ?? 'ATIVO'} />
            <VehicleStatusSelect vehicleId={params.id} status={(vehicle?.status as 'ATIVO' | 'MANUTENCAO' | 'INATIVO') ?? 'ATIVO'} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <div><p className="label">Tipo</p><p>{vehicle?.vehicle_type}</p></div>
          <div><p className="label">Cor</p><p>{vehicle?.color ?? '—'}</p></div>
          <div><p className="label">Capacidade</p><p>{vehicle?.capacity ? `${vehicle.capacity} t` : '—'}</p></div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Últimos Atendimentos</h2>
      <DataTable
        id="table-vehicle-jobs"
        data={recentJobs}
        emptyMessage="Nenhum atendimento registrado para este veículo ainda."
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
