'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createVehicle, type VehicleFormState } from '@/app/actions/vehicles';
import Link from 'next/link';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-veiculo" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar Veículo'}
    </button>
  );
}

export function VehicleForm() {
  const [state, action] = useFormState<VehicleFormState, FormData>(createVehicle, {});

  return (
    <form action={action} noValidate>
      {state.message && (
        <div id="form-vehicle-error" role="alert" style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: 'var(--color-danger)', marginBottom: 'var(--space-6)', fontSize: '0.875rem' }}>
          {state.message}
        </div>
      )}

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-plate">Placa *</label>
          <input id="vehicle-plate" name="plate" type="text" className="input" required placeholder="ABC1D23" style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }} />
          {state.errors?.plate && <p className="form-error">{state.errors.plate[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-brand">Marca *</label>
          <input id="vehicle-brand" name="brand" type="text" className="input" required placeholder="Ex: Mercedes-Benz" />
          {state.errors?.brand && <p className="form-error">{state.errors.brand[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-model">Modelo *</label>
          <input id="vehicle-model" name="model" type="text" className="input" required placeholder="Ex: Atego 1719" />
          {state.errors?.model && <p className="form-error">{state.errors.model[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-color">Cor</label>
          <input id="vehicle-color" name="color" type="text" className="input" placeholder="Ex: Branco" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-year">Ano</label>
          <input id="vehicle-year" name="year" type="number" className="input" min="1990" max="2027" placeholder="2022" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-type">Tipo</label>
          <select id="vehicle-type" name="vehicle_type" className="input">
            <option value="CAMINHÃO">Caminhão</option>
            <option value="CAMINHONETE">Caminhonete</option>
            <option value="TRUCK">Truck</option>
            <option value="CARRETA">Carreta</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label" htmlFor="vehicle-capacity">Capacidade (toneladas)</label>
          <input id="vehicle-capacity" name="capacity" type="number" step="0.5" className="input" placeholder="3.5" />
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton />
        <Link href="/veiculos" className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>
    </form>
  );
}
