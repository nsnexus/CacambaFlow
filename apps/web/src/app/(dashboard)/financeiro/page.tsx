import type { Metadata } from 'next';
import { getInvoices, getUnbilledOrders } from '@/app/actions/billing';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FaturarBtn } from '@/components/billing/faturar-btn';
import { PagarBtn } from '@/components/billing/pagar-btn';

export const metadata: Metadata = { title: 'Financeiro — CaçambaFlow' };

export default async function FinanceiroPage() {
  const [invoices, unbilled] = await Promise.all([
    getInvoices(),
    getUnbilledOrders()
  ]);

  // Resumo financeiro rápido
  const totalAberto = invoices.filter((i: any) => i.status === 'PENDENTE' || i.status === 'ATRASADO').reduce((acc, curr: any) => acc + Number(curr.amount), 0);
  const totalFaturar = unbilled.reduce((acc, curr: any) => acc + Number(curr.price), 0);
  const totalRecebido = invoices.filter((i: any) => i.status === 'PAGO').reduce((acc, curr: any) => acc + Number(curr.amount), 0);

  // "Faturado" = toda fatura emitida, independente de já ter sido paga ou
  // não (diferente de "Recebido", que é só o que já entrou de fato).
  const totalFaturado = invoices.reduce((acc, curr: any) => acc + Number(curr.amount), 0);

  const now = new Date();
  const faturadoMes = invoices
    .filter((i: any) => {
      const createdAt = i.created_at?.toDate ? i.created_at.toDate() : i.created_at ? new Date(i.created_at) : null;
      return createdAt && createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    })
    .reduce((acc, curr: any) => acc + Number(curr.amount), 0);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Painel Financeiro</h1>
        <p className="text-muted text-sm">Controle de faturamento e contas a receber.</p>
      </div>

      {/* Cards de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Total Faturado</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {totalFaturado.toFixed(2)}</p>
          <p className="text-xs text-muted">{invoices.length} fatura(s) emitida(s) no total</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Faturado Este Mês</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {faturadoMes.toFixed(2)}</p>
          <p className="text-xs text-muted">{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Pedidos a Faturar</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {totalFaturar.toFixed(2)}</p>
          <p className="text-xs text-muted">{unbilled.length} pedido(s) concluído(s)</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Contas a Receber (Em Aberto)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {totalAberto.toFixed(2)}</p>
          <p className="text-xs text-muted">{invoices.filter((i: any) => i.status === 'PENDENTE').length} boleto(s) pendente(s)</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Recebido</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {totalRecebido.toFixed(2)}</p>
        </div>
      </div>

      {/* Seção 1: Ordens aguardando faturamento */}
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Pedidos Aguardando Faturamento</h2>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <DataTable
          id="table-unbilled"
          data={unbilled as unknown as Record<string, unknown>[]}
          emptyMessage="Não há pedidos concluídos aguardando faturamento."
          columns={[
            { key: 'order_number', label: 'Nº Pedido' },
            { 
              key: 'customers', 
              label: 'Cliente',
              render: (val) => (val as any)?.name
            },
            { 
              key: 'price', 
              label: 'Valor a Faturar',
              render: (val) => `R$ ${Number(val).toFixed(2)}`
            }
          ]}
          actions={(row) => (
            <FaturarBtn 
              orderId={row.id as string} 
              customerId={(row.customers as any).id} 
              amount={Number(row.price)} 
            />
          )}
        />
      </div>

      {/* Seção 2: Faturas / Contas a Receber */}
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Contas a Receber (Faturas)</h2>
      <DataTable
        id="table-invoices"
        data={invoices as unknown as Record<string, unknown>[]}
        emptyMessage="Nenhuma fatura gerada."
        columns={[
          { key: 'invoice_number', label: 'Nº Fatura', render: (val) => <span style={{ fontFamily: 'monospace' }}>{val as string}</span> },
          { key: 'customers', label: 'Cliente', render: (val) => (val as any)?.name },
          { key: 'due_date', label: 'Vencimento', render: (val) => new Date(val as string).toLocaleDateString('pt-BR') },
          { key: 'amount', label: 'Valor', render: (val) => `R$ ${Number(val).toFixed(2)}` },
          { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val as string} /> },
        ]}
        actions={(row) => (
          row.status === 'PENDENTE' || row.status === 'ATRASADO' ? (
            <PagarBtn invoiceId={row.id as string} />
          ) : null
        )}
      />
    </div>
  );
}
