'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createCustomer, type CustomerFormState } from '@/app/actions/customers';
import Link from 'next/link';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      id="btn-submit-cliente"
      type="submit"
      className="btn btn--primary btn--lg"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Salvando...' : 'Salvar Cliente'}
    </button>
  );
}

export function CustomerForm() {
  const [state, action] = useFormState<CustomerFormState, FormData>(createCustomer, {});

  return (
    <form action={action} noValidate>
      {state.message && (
        <div
          id="form-error-message"
          role="alert"
          style={{
            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.875rem',
          }}
        >
          {state.message}
        </div>
      )}

      <div className="form-section">
        <h2 className="form-section__title">Dados do Cliente</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="customer-person-type">Tipo *</label>
            <select id="customer-person-type" name="person_type" className="input" required defaultValue="PF">
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
            {state.errors?.person_type && <p className="form-error">{state.errors.person_type[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="customer-name">Nome *</label>
            <input id="customer-name" name="name" type="text" className="input" required placeholder="João da Silva" />
            {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="customer-document">CPF / CNPJ</label>
            <input id="customer-document" name="document" type="text" className="input" placeholder="000.000.000-00" />
            {state.errors?.document && <p className="form-error">{state.errors.document[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Contato</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="customer-phone">Telefone</label>
            <input id="customer-phone" name="phone" type="tel" className="input" placeholder="(11) 99999-9999" />
            {state.errors?.phone && <p className="form-error">{state.errors.phone[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="customer-whatsapp">WhatsApp</label>
            <input id="customer-whatsapp" name="whatsapp" type="tel" className="input" placeholder="(11) 99999-9999" />
            {state.errors?.whatsapp && <p className="form-error">{state.errors.whatsapp[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="customer-email">E-mail</label>
            <input id="customer-email" name="email" type="email" className="input" placeholder="joao@empresa.com" />
            {state.errors?.email && <p className="form-error">{state.errors.email[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Observações</h2>
        <div className="form-group">
          <label className="label" htmlFor="customer-notes">Notas</label>
          <textarea id="customer-notes" name="notes" className="input" rows={3} placeholder="Observações sobre o cliente" />
          {state.errors?.notes && <p className="form-error">{state.errors.notes[0]}</p>}
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton />
        <Link href="/clientes" className="btn btn--secondary btn--lg">Cancelar</Link>
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
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }
        textarea.input { resize: vertical; font-family: inherit; }
      `}</style>
    </form>
  );
}
