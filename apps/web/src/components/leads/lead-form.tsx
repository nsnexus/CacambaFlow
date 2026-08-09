'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createLeadRequest, type LeadFormState } from '@/app/actions/leads';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-orcamento" type="submit" className="btn btn--primary btn--lg w-full" disabled={pending} aria-disabled={pending}>
      {pending ? 'Enviando...' : 'Solicitar orçamento'}
    </button>
  );
}

export function LeadForm() {
  const [state, action] = useFormState<LeadFormState, FormData>(createLeadRequest, {});

  if (state.success) {
    return (
      <div id="lead-form-success" role="status" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>✅</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Solicitação enviada!</h2>
        <p className="text-muted text-sm">
          Recebemos os seus dados. Nosso time entra em contato em breve pra apresentar o CaçambaFlow e montar o orçamento.
        </p>
      </div>
    );
  }

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
        <h2 className="form-section__title">Sobre a empresa</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="lead-company">Nome da empresa *</label>
            <input id="lead-company" name="company_name" type="text" className="input" required placeholder="Locadora Exemplo Ltda" />
            {state.errors?.company_name && <p className="form-error">{state.errors.company_name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-cnpj">CNPJ *</label>
            <input id="lead-cnpj" name="cnpj" type="text" className="input" required placeholder="00.000.000/0001-00" />
            {state.errors?.cnpj && <p className="form-error">{state.errors.cnpj[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-city">Cidade *</label>
            <input id="lead-city" name="city" type="text" className="input" required placeholder="São Paulo" />
            {state.errors?.city && <p className="form-error">{state.errors.city[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-state">Estado *</label>
            <input id="lead-state" name="state" type="text" maxLength={2} className="input" required placeholder="SP" style={{ textTransform: 'uppercase' }} />
            {state.errors?.state && <p className="form-error">{state.errors.state[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Responsável pelo contato</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="lead-responsible">Nome completo *</label>
            <input id="lead-responsible" name="responsible_name" type="text" className="input" required placeholder="Maria da Silva" />
            {state.errors?.responsible_name && <p className="form-error">{state.errors.responsible_name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-phone">Telefone *</label>
            <input id="lead-phone" name="contact_phone" type="tel" className="input" required placeholder="(11) 99999-9999" />
            {state.errors?.contact_phone && <p className="form-error">{state.errors.contact_phone[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-email">E-mail *</label>
            <input id="lead-email" name="contact_email" type="email" className="input" required placeholder="maria@empresa.com" />
            {state.errors?.contact_email && <p className="form-error">{state.errors.contact_email[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Uso do sistema</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="lead-office-users">Qtd. de usuários no escritório *</label>
            <input id="lead-office-users" name="office_users_count" type="number" min={1} className="input" required placeholder="3" />
            {state.errors?.office_users_count && <p className="form-error">{state.errors.office_users_count[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-driver-users">Qtd. de motoristas no app *</label>
            <input id="lead-driver-users" name="driver_users_count" type="number" min={1} className="input" required placeholder="8" />
            {state.errors?.driver_users_count && <p className="form-error">{state.errors.driver_users_count[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lead-tracking">Precisa de rastreamento de motorista? *</label>
            <select id="lead-tracking" name="needs_tracking" className="input" required defaultValue="SIM">
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
            {state.errors?.needs_tracking && <p className="form-error">{state.errors.needs_tracking[0]}</p>}
          </div>
        </div>
      </div>

      <SubmitButton />

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
      `}</style>
    </form>
  );
}
