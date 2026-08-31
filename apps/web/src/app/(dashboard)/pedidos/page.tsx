import type { Metadata } from 'next';
import Link from 'next/link';
import { getOrders } from '@/app/actions/orders';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteOrderButton } from '@/components/orders/delete-order-button';

export const metadata: Metadata = { title: 'Pedidos — CaçambaFlow' };

export default async function PedidosPage() {
  const orders = await getOrders();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pedidos</h1>
          <p className="text-muted text-sm">{orders.length} pedido(s) recente(s)</p>
        </div>
        <Link id="btn-novo-pedido" href="/pedidos/novo" className="btn btn--primary">
          + Novo Pedido
        </Link>
      </div>

      <DataTable
        id="table-pedidos"
        data={orders as Record<string, unknown>[]}
        emptyMessage="Nenhum pedido cadastrado ainda."
        columns={[
          {
            key: 'order_number',
            label: 'Número',
            render: (val) => (
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{val as string}</span>
            ),
          },
          {
            key: 'customers',
            label: 'Cliente',
            render: (val) => {
              const c = val as { name: string } | null;
              return c?.name ?? '—';
            },
          },
          {
            key: 'scheduled_date',
            label: 'Data Base',
            render: (val) => new Date(val as string).toLocaleDateString('pt-BR'),
          },
          {
            key: 'addresses',
            label: 'Endereço',
            render: (val) => {
              const a = val as { street: string; number: string; district: string } | null;
              return a ? `${a.street}, ${a.number} — ${a.district}` : '—';
            },
          },
          {
            key: 'jobs',
            label: 'Atendimentos',
            render: (val) => {
              const jobs = val as { job_type: string }[];
              return (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {jobs.map((j, i) => (
                    <span key={i} className="text-xs" style={{ background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                      {j.job_type}
                    </span>
                  ))}
                </div>
              );
            },
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
              href={`/pedidos/${row.id}`}
              className="btn btn--secondary btn--sm"
              id={`btn-detail-order-${row.id}`}
            >
              Ver
            </Link>
            <DeleteOrderButton orderId={row.id as string} orderNumber={row.order_number as string} />
          </div>
        )}
      />
    </div>
  );
}
