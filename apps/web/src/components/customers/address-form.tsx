'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createAddress, updateAddress, type CustomerFormState } from '@/app/actions/customers';
import { AddressSearch, type AddressSearchResult } from './address-search';
import Link from 'next/link';

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-endereco" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Obra'}
    </button>
  );
}

const emptyFields = {
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: '',
  longitude: '',
};

type Address = {
  id: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  access_notes?: string;
  contact_name?: string;
  contact_phone?: string;
};

export function AddressForm({ customerId, address }: { customerId: string; address?: Address }) {
  const isEdit = !!address;
  const formAction = isEdit ? updateAddress.bind(null, customerId, address.id) : createAddress;
  const [state, action] = useFormState<CustomerFormState, FormData>(formAction, {});
  const [fields, setFields] = useState(
    address
      ? {
          street: address.street ?? '',
          number: address.number ?? '',
          district: address.district ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          postal_code: address.postal_code ?? '',
          latitude: address.latitude != null ? String(address.latitude) : '',
          longitude: address.longitude != null ? String(address.longitude) : '',
        }
      : emptyFields
  );

  function handlePick(r: AddressSearchResult) {
    setFields({
      street: r.street,
      number: r.number,
      district: r.district,
      city: r.city,
      state: r.state,
      postal_code: r.postal_code,
      latitude: String(r.latitude),
      longitude: String(r.longitude),
    });
  }

  function setField(key: keyof typeof emptyFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setFields(f => ({ ...f, [key]: e.target.value }));
  }

  return (
    <form action={action} noValidate>
      <input type="hidden" name="customer_id" value={customerId} />

      {state.message && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-6)',
          fontSize: '0.875rem',
        }}>
          {state.message}
        </div>
      )}

      {isEdit && (!address?.latitude || !address?.longitude) && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
          fontSize: '0.875rem',
        }}>
          ⚠️ Esse endereço não tem coordenadas cadastradas — a caçamba entregue aqui não aparece no Mapa de Caçambas. Busque o endereço abaixo pra preencher a localização.
        </div>
      )}

      <div className="form-section">
        <h2 className="form-section__title">Buscar Endereço</h2>
        <AddressSearch onSelect={handlePick} />
        <p className="text-muted text-xs">
          Escolha um resultado da busca pra preencher os campos abaixo automaticamente (inclusive as coordenadas do mapa), ou preencha tudo na mão.
        </p>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Obra</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="address-name">Nome da obra *</label>
            <input id="address-name" name="name" type="text" className="input" required placeholder="Obra Rua das Flores" defaultValue={address?.name} />
            {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-postal-code">CEP</label>
            <input id="address-postal-code" name="postal_code" type="text" className="input" placeholder="00000-000" value={fields.postal_code} onChange={setField('postal_code')} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Endereço</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="address-street">Logradouro *</label>
            <input id="address-street" name="street" type="text" className="input" required placeholder="Rua das Flores" value={fields.street} onChange={setField('street')} />
            {state.errors?.street && <p className="form-error">{state.errors.street[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-number">Número</label>
            <input id="address-number" name="number" type="text" className="input" placeholder="123" value={fields.number} onChange={setField('number')} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-complement">Complemento</label>
            <input id="address-complement" name="complement" type="text" className="input" placeholder="Fundos, apto 2..." defaultValue={address?.complement} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-district">Bairro</label>
            <input id="address-district" name="district" type="text" className="input" placeholder="Centro" value={fields.district} onChange={setField('district')} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-city">Cidade *</label>
            <input id="address-city" name="city" type="text" className="input" required placeholder="São Paulo" value={fields.city} onChange={setField('city')} />
            {state.errors?.city && <p className="form-error">{state.errors.city[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-state">UF *</label>
            <input id="address-state" name="state" type="text" className="input" required maxLength={2} placeholder="SP" style={{ textTransform: 'uppercase' }} value={fields.state} onChange={setField('state')} />
            {state.errors?.state && <p className="form-error">{state.errors.state[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Coordenadas (para aparecer no mapa)</h2>
        <p className="text-muted text-xs" style={{ marginBottom: 'var(--space-3)' }}>
          Preenchido automaticamente ao escolher um resultado da busca acima. Se preferir preencher na mão, abra o endereço no{' '}
          <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Google Maps</a>
          , clique com o botão direito no ponto exato e copie os dois números que aparecem.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="address-latitude">Latitude</label>
            <input id="address-latitude" name="latitude" type="text" inputMode="decimal" className="input" placeholder="-23.5505" value={fields.latitude} onChange={setField('latitude')} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-longitude">Longitude</label>
            <input id="address-longitude" name="longitude" type="text" inputMode="decimal" className="input" placeholder="-46.6333" value={fields.longitude} onChange={setField('longitude')} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Acesso e Contato Local</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="address-contact-name">Nome do contato</label>
            <input id="address-contact-name" name="contact_name" type="text" className="input" placeholder="João (encarregado)" defaultValue={address?.contact_name} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="address-contact-phone">Telefone do contato</label>
            <input id="address-contact-phone" name="contact_phone" type="tel" className="input" placeholder="(11) 99999-9999" defaultValue={address?.contact_phone} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label" htmlFor="address-access-notes">Restrições de acesso</label>
            <textarea id="address-access-notes" name="access_notes" className="input" rows={3} placeholder="Ex: rua estreita, caminhão grande não entra, portão dos fundos..." defaultValue={address?.access_notes} />
          </div>
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton isEdit={isEdit} />
        <Link href={`/clientes/${customerId}`} className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>

      <style>{`
        .form-section { margin-bottom: var(--space-6); }
        .form-section__title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-2);
          margin-bottom: var(--space-4);
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: var(--space-4);
        }
        textarea.input { resize: vertical; font-family: inherit; }
      `}</style>
    </form>
  );
}
