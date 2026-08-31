import type { Metadata } from 'next';
import Link from 'next/link';
import { getVehicles, deleteVehicle } from '@/app/actions/vehicles';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteEntityButton } from '@/components/ui/delete-entity-button';

export const metadata: Metadata = { title: 'Veículos — CaçambaFlow' };

export default async function VeiculosPage() {
  const vehicles = await getVehicles();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Veículos</h1>
          <p className="text-muted text-sm">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <Link id="btn-novo-veiculo" href="/veiculos/novo" className="btn btn--primary">
          + Novo Veículo
        </Link>
      </div>

      <DataTable
        id="table-veiculos"
        data={vehicles as Record<string, unknown>[]}
        emptyMessage="Nenhum veículo cadastrado ainda."
        columns={[
          {
            key: 'plate',
            label: 'Placa',
            render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{val as string}</span>,
          },
          { key: 'brand', label: 'Marca' },
          { key: 'model', label: 'Modelo' },
          { key: 'color', label: 'Cor' },
          { key: 'year', label: 'Ano' },
          { key: 'vehicle_type', label: 'Tipo' },
          {
            key: 'capacity',
            label: 'Capacidade',
            render: (val) => val ? `${val} t` : '—',
          },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
        ]}
        actions={(row) => (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link
              href={`/veiculos/${row.id}`}
              className="btn btn--secondary btn--sm"
              id={`btn-edit-vehicle-${row.id}`}
            >
              Detalhes
            </Link>
            <DeleteEntityButton
              id={row.id as string}
              confirmMessage={`Excluir o veículo ${row.plate}? Essa ação não pode ser desfeita.`}
              action={deleteVehicle}
            />
          </div>
        )}
      />
    </div>
  );
}
