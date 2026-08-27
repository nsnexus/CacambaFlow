'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createOrder, type OrderFormState } from '@/app/actions/orders';
import { getActiveRentalsForCustomer } from '@/app/actions/assets';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type ActiveRental = {
  id: string;
  identifier: string | null;
  asset_types: { name?: string } | null;
  address: { name?: string; street?: string; number?: string } | null;
  delivered_at: string | null;
  expected_return_date: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-pedido" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Salvando...' : 'Finalizar Pedido'}
    </button>
  );
}

// Interfaces simplificadas para os dados baseados em fetch
interface Customer { id: string; name: string; document: string }
interface Address { id: string; name: string; street: string; number: string; city: string }
interface AssetType { id: string; name: string; volume_m3: number }

export function OrderForm({ 
  customers, 
  addresses, 
  assetTypes 
}: { 
  customers: Customer[], 
  addresses: Address[], 
  assetTypes: AssetType[] 
}) {
  const [state, action] = useFormState<OrderFormState, FormData>(createOrder, {});
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [checkingRentals, setCheckingRentals] = useState(false);

  // Lista dinâmica de atendimentos dentro do formulário
  const [jobs, setJobs] = useState([{ id: 1 }]);

  const filteredAddresses = addresses.filter(a => (a as any).customer_id === selectedCustomer);

  // Avisa (sem bloquear) quando o cliente selecionado já tem caçamba(s)
  // alugada(s) — pode ser troca, caçamba extra etc., a decisão é de quem
  // está lançando o pedido.
  useEffect(() => {
    if (!selectedCustomer) {
      setActiveRentals([]);
      return;
    }
    let cancelled = false;
    setCheckingRentals(true);
    getActiveRentalsForCustomer(selectedCustomer)
      .then((rentals) => {
        if (!cancelled) setActiveRentals(rentals as ActiveRental[]);
      })
      .catch(() => {
        if (!cancelled) setActiveRentals([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingRentals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomer]);

  return (
    <form action={action} noValidate>
      {state.message && (
        <div role="alert" className="form-error-banner" style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {state.message}
        </div>
      )}

      {/* --- Seção 1: Cliente e Local --- */}
      <div className="form-section" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          1. Cliente e Local da Obra
        </h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="form-group">
            <label className="label">Cliente *</label>
            <select name="customer_id" className="input" required value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">Selecione o cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.document ? `(${c.document})` : ''}</option>
              ))}
            </select>
            {state.errors?.customer_id && <p className="form-error">{state.errors.customer_id[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label">Endereço da Obra *</label>
            <select name="address_id" className="input" required disabled={!selectedCustomer}>
              <option value="">Selecione a obra...</option>
              {filteredAddresses.map(a => (
                <option key={a.id} value={a.id}>{a.name} - {a.street}, {a.number}</option>
              ))}
            </select>
            {state.errors?.address_id && <p className="form-error">{state.errors.address_id[0]}</p>}
          </div>
        </div>

        {checkingRentals && (
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-3)' }}>Verificando caçambas do cliente...</p>
        )}
        {!checkingRentals && activeRentals.length > 0 && (
          <div
            role="status"
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--color-warning-bg, #FEF3C7)',
              border: '1px solid var(--color-warning, #F59E0B)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}
          >
            <strong>⚠️ Este cliente já tem {activeRentals.length > 1 ? `${activeRentals.length} caçambas alugadas` : 'uma caçamba alugada'}:</strong>
            <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
              {activeRentals.map((rental) => (
                <li key={rental.id}>
                  {rental.identifier ? `Caçamba ${rental.identifier}` : 'Caçamba'}
                  {rental.asset_types?.name ? ` (${rental.asset_types.name})` : ''}
                  {rental.address ? ` — ${rental.address.name ?? ''} ${rental.address.street ?? ''}, ${rental.address.number ?? ''}`.trim() : ''}
                  {rental.expected_return_date ? ` — recolhimento previsto ${rental.expected_return_date}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- Seção 2: Atendimentos --- */}
      <div className="form-section" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>2. Atendimentos (Serviços)</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setJobs([...jobs, { id: Date.now() }])}
          >
            + Adicionar Serviço
          </button>
        </div>

        {jobs.map((job, index) => (
          <div key={job.id} style={{ background: 'var(--color-surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', position: 'relative' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
              Entrega — o recolhimento é agendado automaticamente na data prevista abaixo
            </p>
            <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="form-group">
                <label className="label">Data Prevista da Entrega *</label>
                <input name={`jobs[${index}][scheduled_date]`} type="date" className="input" required />
              </div>
              <div className="form-group">
                <label className="label">Data Prevista do Recolhimento *</label>
                <input name={`jobs[${index}][expected_return_date]`} type="date" className="input" required />
              </div>
              <div className="form-group">
                <label className="label">Tamanho da Caçamba</label>
                <select name={`jobs[${index}][expected_asset_type_id]`} className="input">
                  <option value="">Qualquer tamanho...</option>
                  {assetTypes.map(at => (
                    <option key={at.id} value={at.id}>{at.name} ({at.volume_m3}m³)</option>
                  ))}
                </select>
              </div>
            </div>
            {jobs.length > 1 && (
              <button 
                type="button" 
                onClick={() => setJobs(jobs.filter(j => j.id !== job.id))}
                style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                X Remover
              </button>
            )}
            <input type="hidden" name={`jobs[${index}][priority]`} value={1} />
          </div>
        ))}
        {state.errors?.jobs && <p className="form-error">{state.errors.jobs[0]}</p>}
      </div>

      {/* --- Seção 3: Financeiro e Obs --- */}
      <div className="form-section" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          3. Financeiro e Observações
        </h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="form-group">
            <label className="label">Valor Cobrado (R$)</label>
            <input name="price" type="number" step="0.01" className="input" placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="label">Forma de Pagamento</label>
            <select name="payment_method" className="input">
              <option value="">Selecione...</option>
              <option value="PIX">PIX</option>
              <option value="BOLETO">Boleto</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Observações Internas</label>
            <textarea name="notes" className="input" rows={3} placeholder="Notas visíveis apenas no painel..." />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <SubmitButton />
        <Link href="/pedidos" className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>
    </form>
  );
}
