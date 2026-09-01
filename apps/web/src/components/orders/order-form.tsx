'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createOrder, type OrderFormState } from '@/app/actions/orders';
import { getActiveRentalsForCustomer, getAvailableAssetsForDate } from '@/app/actions/assets';
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

type AvailableAsset = {
  id: string;
  identifier: string | null;
  asset_types: { name?: string; volume_m3?: number } | null;
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

type JobRow = {
  id: number;
  scheduledDate: string;
  returnDate: string;
  assetId: string;
  availableAssets: AvailableAsset[];
  loadingAssets: boolean;
  loadError: boolean;
};

export function OrderForm({
  customers,
  addresses,
}: {
  customers: Customer[],
  addresses: Address[],
}) {
  const [state, action] = useFormState<OrderFormState, FormData>(createOrder, {});
  const [quickMode, setQuickMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [checkingRentals, setCheckingRentals] = useState(false);

  // Lista dinâmica de atendimentos dentro do formulário
  const [jobs, setJobs] = useState<JobRow[]>([
    { id: 1, scheduledDate: '', returnDate: '', assetId: '', availableAssets: [], loadingAssets: false, loadError: false },
  ]);

  // Busca as caçambas específicas realmente livres pra janela [entrega,
  // recolhimento] daquela linha assim que as duas datas estiverem
  // preenchidas — se o pedido é pra amanhã, só mostra as que estarão livres
  // amanhã (considerando locações em andamento e reservas de outros pedidos).
  function refreshAvailableAssets(jobId: number, scheduledDate: string, returnDate: string) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, loadingAssets: !!(scheduledDate && returnDate), loadError: false } : j)));

    if (!scheduledDate || !returnDate) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, availableAssets: [], assetId: '', loadingAssets: false, loadError: false } : j)));
      return;
    }

    getAvailableAssetsForDate(scheduledDate, returnDate)
      .then((assets) => {
        setJobs((prev) => prev.map((j) => {
          if (j.id !== jobId) return j;
          // Mantém a escolha atual se ela ainda estiver na lista de disponíveis
          const stillAvailable = j.assetId && assets.some((a: any) => a.id === j.assetId);
          return {
            ...j,
            availableAssets: assets as AvailableAsset[],
            assetId: stillAvailable ? j.assetId : '',
            loadingAssets: false,
            loadError: false,
          };
        }));
      })
      .catch((error) => {
        // Não mascara como "nenhuma disponível" — isso já confundiu um
        // admin achando que não tinha caçamba livre quando na real a busca
        // tinha quebrado (ex: erro de serialização no servidor).
        console.error('[OrderForm] falha ao verificar caçambas disponíveis:', error);
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, availableAssets: [], loadingAssets: false, loadError: true } : j)));
      });
  }

  function updateJobDate(jobId: number, field: 'scheduledDate' | 'returnDate', value: string) {
    setJobs((prev) => {
      const next = prev.map((j) => (j.id === jobId ? { ...j, [field]: value } : j));
      const updated = next.find((j) => j.id === jobId)!;
      refreshAvailableAssets(jobId, updated.scheduledDate, updated.returnDate);
      return next;
    });
  }

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
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>1. Cliente e Local da Obra</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={quickMode} onChange={(e) => setQuickMode(e.target.checked)} />
            Pedido rápido (cliente avulso)
          </label>
        </div>

        {quickMode ? (
          <>
            <input type="hidden" name="customer_id" value="" />
            <input type="hidden" name="address_id" value="" />
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              Pra cliente que não volta (não precisa cadastrar antes) — só preenche o básico aqui e o pedido já sai. Um cadastro simples desse cliente e obra é criado por baixo, caso precise consultar depois.
            </p>
            <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="form-group">
                <label className="label">Nome do Cliente *</label>
                <input name="quick_customer_name" type="text" className="input" required placeholder="Nome ou razão social" />
                {state.errors?.quick_customer_name && <p className="form-error">{state.errors.quick_customer_name[0]}</p>}
              </div>
              <div className="form-group">
                <label className="label">Telefone</label>
                <input name="quick_customer_phone" type="tel" className="input" placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Endereço da Obra *</label>
                <input name="quick_address_street" type="text" className="input" required placeholder="Rua / Avenida" />
                {state.errors?.quick_address_street && <p className="form-error">{state.errors.quick_address_street[0]}</p>}
              </div>
              <div className="form-group">
                <label className="label">Número</label>
                <input name="quick_address_number" type="text" className="input" placeholder="S/N" />
              </div>
              <div className="form-group">
                <label className="label">Bairro</label>
                <input name="quick_address_district" type="text" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Cidade *</label>
                <input name="quick_address_city" type="text" className="input" required />
                {state.errors?.quick_address_city && <p className="form-error">{state.errors.quick_address_city[0]}</p>}
              </div>
              <div className="form-group">
                <label className="label">UF *</label>
                <input name="quick_address_state" type="text" className="input" maxLength={2} required placeholder="SP" style={{ textTransform: 'uppercase' }} />
                {state.errors?.quick_address_state && <p className="form-error">{state.errors.quick_address_state[0]}</p>}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Obs. de Acesso</label>
                <input name="quick_address_access_notes" type="text" className="input" placeholder="Referência, restrição de acesso etc." />
              </div>
            </div>
          </>
        ) : (
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
        )}

        {!quickMode && checkingRentals && (
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-3)' }}>Verificando caçambas do cliente...</p>
        )}
        {!quickMode && !checkingRentals && activeRentals.length > 0 && (
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
            onClick={() => setJobs([...jobs, { id: Date.now(), scheduledDate: '', returnDate: '', assetId: '', availableAssets: [], loadingAssets: false, loadError: false }])}
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
                <input
                  name={`jobs[${index}][scheduled_date]`}
                  type="date"
                  className="input"
                  required
                  value={job.scheduledDate}
                  onChange={(e) => updateJobDate(job.id, 'scheduledDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Data Prevista do Recolhimento *</label>
                <input
                  name={`jobs[${index}][expected_return_date]`}
                  type="date"
                  className="input"
                  required
                  value={job.returnDate}
                  onChange={(e) => updateJobDate(job.id, 'returnDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Caçamba *</label>
                <select
                  name={`jobs[${index}][expected_asset_id]`}
                  className="input"
                  required
                  disabled={!job.scheduledDate || !job.returnDate}
                  value={job.assetId}
                  onChange={(e) => setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, assetId: e.target.value } : j)))}
                >
                  <option value="">
                    {!job.scheduledDate || !job.returnDate
                      ? 'Preencha as datas primeiro...'
                      : job.loadingAssets
                        ? 'Verificando disponibilidade...'
                        : job.loadError
                          ? 'Erro ao verificar disponibilidade'
                          : job.availableAssets.length === 0
                            ? 'Nenhuma caçamba livre nessas datas'
                            : 'Selecione a caçamba...'}
                  </option>
                  {job.availableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.identifier}{a.asset_types?.name ? ` — ${a.asset_types.name}${a.asset_types.volume_m3 ? ` (${a.asset_types.volume_m3}m³)` : ''}` : ''}
                    </option>
                  ))}
                </select>
                {job.scheduledDate && job.returnDate && !job.loadingAssets && job.loadError && (
                  <p className="form-error">
                    Não consegui verificar a disponibilidade agora (erro no servidor). Tente trocar a data de novo — se persistir, avise o suporte.
                  </p>
                )}
                {job.scheduledDate && job.returnDate && !job.loadingAssets && !job.loadError && job.availableAssets.length === 0 && (
                  <p className="form-error">Nenhuma caçamba está livre nesse período — tente outras datas.</p>
                )}
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
