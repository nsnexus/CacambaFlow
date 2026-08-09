import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderById } from '@/app/actions/orders';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/data-table';

export const metadata: Metadata = { title: 'Detalhes do Pedido — CaçambaFlow' };

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  let order;
  try {
    order = await getOrderById(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href="/pedidos" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace' }}>{order.order_number}</h1>
          <p className="text-muted text-sm">
            Criado em {order.created_at?.toDate ? order.created_at.toDate().toLocaleDateString('pt-BR') : '—'}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Cliente e Local</h2>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <p className="text-muted text-sm">Cliente</p>
            <p style={{ fontWeight: 500 }}>
              {order.customers.name}
              {order.customers.document && <span className="text-muted"> ({order.customers.document})</span>}
            </p>
          </div>
          <div>
            <p className="text-muted text-sm">Endereço da Obra</p>
            <p>{order.addresses.street}, {order.addresses.number} — {order.addresses.district}</p>
            <p>{order.addresses.city}/{order.addresses.state}</p>
            {order.addresses.access_notes && (
              <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Obs de acesso: {order.addresses.access_notes}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Financeiro</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <p className="text-muted text-sm">Valor</p>
              <p style={{ fontWeight: 600 }}>{order.price ? `R$ ${Number(order.price).toFixed(2)}` : '—'}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Pagamento</p>
              <p>{order.payment_method || '—'}</p>
            </div>
          </div>
          {order.notes && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p className="text-muted text-sm">Observações</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Atendimentos do Pedido</h2>
      
      <DataTable
        id="table-jobs"
        data={order.jobs as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'job_number',
            label: 'Nº Atendimento',
            render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{val as string}</span>,
          },
          { key: 'job_type', label: 'Serviço' },
          {
            key: 'scheduled_date',
            label: 'Agendamento',
            render: (val) => new Date(val as string).toLocaleDateString('pt-BR'),
          },
          {
            key: 'asset_types',
            label: 'Tamanho',
            render: (val) => (val as any)?.name ?? 'Qualquer',
          },
          {
            key: 'drivers',
            label: 'Motorista',
            render: (val) => (val as any)?.profiles?.name ?? <span className="text-muted text-xs">Não atribuído</span>,
          },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
        ]}
      />
    </div>
  );
}
