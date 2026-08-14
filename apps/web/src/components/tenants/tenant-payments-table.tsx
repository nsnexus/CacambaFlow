'use client';

import { useState, useTransition } from 'react';
import {
  recordTenantPayment,
  generateTenantPayment,
  deleteTenantPayment,
} from '@/app/actions/tenants';
import { StatusBadge } from '@/components/ui/status-badge';
import { CheckCircle, Plus, Trash2, Loader2, DollarSign, Calendar, CreditCard } from 'lucide-react';

export interface TenantPaymentItem {
  id: string;
  tenant_id: string;
  reference_month: string;
  amount: number;
  due_date: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  paid_at: string | null;
  payment_method: string | null;
  notes?: string;
  created_at: string | null;
}

interface TenantPaymentsTableProps {
  tenantId: string;
  tenantName: string;
  defaultMonthlyFee: number;
  defaultDueDay: number;
  payments: TenantPaymentItem[];
}

export function TenantPaymentsTable({
  tenantId,
  tenantName,
  defaultMonthlyFee,
  defaultDueDay,
  payments,
}: TenantPaymentsTableProps) {
  const [isPending, startTransition] = useTransition();

  // Estados dos modais
  const [payModalItem, setPayModalItem] = useState<TenantPaymentItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Campos do modal de baixa/pagamento
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'OUTRO'>('PIX');
  const [payNotes, setPayNotes] = useState('');

  // Campos do modal de nova cobrança
  const [newRefMonth, setNewRefMonth] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return `${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;
  });
  const [newAmount, setNewAmount] = useState(defaultMonthlyFee || 250);
  const [newDueDate, setNewDueDate] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const day = Math.min(defaultDueDay || 10, 28);
    return new Date(next.getFullYear(), next.getMonth(), day).toISOString().slice(0, 10);
  });
  const [newNotes, setNewNotes] = useState('Mensalidade CaçambaFlow');

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalItem) return;

    startTransition(async () => {
      try {
        await recordTenantPayment(payModalItem.id, tenantId, {
          paid_at: payDate,
          payment_method: payMethod,
          notes: payNotes,
        });
        setPayModalItem(null);
        setPayNotes('');
      } catch (err: any) {
        alert('Erro ao registrar pagamento: ' + (err.message || 'Falha'));
      }
    });
  };

  const handleGeneratePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await generateTenantPayment(tenantId, {
          reference_month: newRefMonth,
          amount: Number(newAmount),
          due_date: newDueDate,
          notes: newNotes,
        });
        setShowNewModal(false);
      } catch (err: any) {
        alert('Erro ao gerar cobrança: ' + (err.message || 'Falha'));
      }
    });
  };

  const handleDelete = (paymentId: string, refMonth: string) => {
    if (confirm(`Deseja realmente remover o registro de mensalidade (${refMonth})?`)) {
      startTransition(async () => {
        try {
          await deleteTenantPayment(paymentId, tenantId);
        } catch (err: any) {
          alert('Erro ao excluir: ' + (err.message || 'Falha'));
        }
      });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Histórico de Mensalidades & Pagamentos</h2>
          <p className="text-muted text-xs">
            Mensalidade atual: <strong>{formatCurrency(defaultMonthlyFee)}</strong> (Vencimento todo dia {defaultDueDay})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="btn btn--primary btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} />
          <span>+ Gerar Mensalidade</span>
        </button>
      </div>

      {/* Tabela de Pagamentos */}
      {payments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <DollarSign size={28} style={{ opacity: 0.5, marginBottom: 'var(--space-2)' }} />
          <p>Nenhuma mensalidade ou fatura lançada ainda para esta empresa.</p>
        </div>
      ) : (
        <div className="table-container" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data Pagamento</th>
                <th>Método</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const isPaid = p.status === 'PAGO';
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.reference_month}</td>
                    <td>{p.due_date ? new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>{p.paid_at ? new Date(p.paid_at + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td>
                      {p.payment_method ? (
                        <span className="badge badge--concluido" style={{ fontSize: '0.75rem' }}>
                          {p.payment_method}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-muted text-xs" style={{ maxWidth: 200 }}>
                      {p.notes || '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalItem(p);
                              setPayDate(new Date().toISOString().slice(0, 10));
                            }}
                            className="btn btn--primary btn--sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Dar Baixa / Registrar Pagamento"
                          >
                            <CheckCircle size={12} />
                            <span>Dar Baixa</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.reference_month)}
                          disabled={isPending}
                          className="btn btn--secondary btn--sm"
                          style={{ padding: '4px 6px', color: 'var(--color-danger)' }}
                          title="Excluir Lançamento"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Registrar Pagamento / Dar Baixa */}
      {payModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Registrar Pagamento de Mensalidade
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              Empresa: <strong>{tenantName}</strong> · Ref: <strong>{payModalItem.reference_month}</strong> (
              {formatCurrency(payModalItem.amount)})
            </p>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Data do Pagamento *</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Forma de Pagamento *</label>
                <select
                  className="input"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                >
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="label">Observações (Opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Comprovante enviado no WhatsApp"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setPayModalItem(null)}
                  className="btn btn--secondary"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                  <span>Confirmar Pagamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Nova Mensalidade / Cobrança */}
      {showNewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Gerar Nova Mensalidade
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              Empresa: <strong>{tenantName}</strong>
            </p>

            <form onSubmit={handleGeneratePayment}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="label">Mês de Referência *</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Ex: 09/2026"
                  value={newRefMonth}
                  onChange={(e) => setNewRefMonth(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="label">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="label">Data de Vencimento *</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="label">Observação</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Mensalidade regular"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn btn--secondary"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  <span>Criar Mensalidade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
