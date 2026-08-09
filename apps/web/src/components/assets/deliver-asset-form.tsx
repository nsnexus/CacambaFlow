'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { deliverAsset, type DeliverAssetFormState } from '@/app/actions/assets';

type Address = { id: string; name: string; street: string; number?: string; city: string; state: string };
type Customer = { id: string; name: string; addresses: Address[] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-entrega" type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Salvando...' : 'Registrar Entrega'}
    </button>
  );
}

export function DeliverAssetForm({ assetId, customers }: { assetId: string; customers: Customer[] }) {
  const action = deliverAsset.bind(null, assetId);
  const [state, formAction] = useFormState<DeliverAssetFormState, FormData>(action, {});
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const addresses = customers.find(c => c.id === selectedCustomer)?.addresses ?? [];
  const today = new Date().toISOString().split('T')[0];

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-4)',
          fontSize: '0.875rem',
        }}>
          {state.message}
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label className="label" htmlFor="deliver-customer">Cliente *</label>
          <select id="deliver-customer" name="customer_id" className="input" required value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
            <option value="">Selecione...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {state.errors?.customer_id && <p className="form-error">{state.errors.customer_id[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="deliver-address">Obra *</label>
          <select id="deliver-address" name="address_id" className="input" required disabled={!selectedCustomer}>
            <option value="">Selecione...</option>
            {addresses.map(a => <option key={a.id} value={a.id}>{a.name} — {a.street}, {a.number ?? 'S/N'}</option>)}
          </select>
          {state.errors?.address_id && <p className="form-error">{state.errors.address_id[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="deliver-date">Data de entrega *</label>
          <input id="deliver-date" name="delivered_at" type="date" className="input" required defaultValue={today} />
          {state.errors?.delivered_at && <p className="form-error">{state.errors.delivered_at[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="deliver-return-date">Previsão de coleta</label>
          <input id="deliver-return-date" name="expected_return_date" type="date" className="input" />
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <SubmitButton />
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: var(--space-4);
        }
      `}</style>
    </form>
  );
}
