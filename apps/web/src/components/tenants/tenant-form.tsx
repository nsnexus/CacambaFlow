'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createTenant, type TenantFormState } from '@/app/actions/tenants';
import Link from 'next/link';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-empresa" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Criando...' : 'Criar Empresa'}
    </button>
  );
}

export function TenantForm() {
  const [state, action] = useFormState<TenantFormState, FormData>(createTenant, {});

  if (state.success) {
    return (
      <div>
        <div
          role="alert"
          id="tenant-success-banner"
          style={{
            background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Empresa &quot;{state.success.tenantName}&quot; criada com sucesso!
          </p>
          <p className="text-sm" style={{ marginBottom: 'var(--space-1)' }}>
            Repasse este acesso pro administrador dessa empresa (não existe envio automático de e-mail ainda):
          </p>
          <p className="text-sm"><strong>E-mail:</strong> {state.success.adminEmail}</p>
          <p className="text-sm">
            <strong>Senha temporária:</strong>{' '}
            <span style={{ fontFamily: 'monospace', background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              {state.success.tempPassword}
            </span>
          </p>
        </div>
        <Link href="/empresas" className="btn btn--secondary btn--lg">Voltar para Empresas</Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate>
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

      <div className="form-section">
        <h2 className="form-section__title">Dados da Empresa</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="tenant-name">Nome da empresa *</label>
            <input id="tenant-name" name="name" type="text" className="input" required placeholder="Caçambas Silva LTDA" />
            {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="tenant-document">CNPJ</label>
            <input id="tenant-document" name="document" type="text" className="input" placeholder="00.000.000/0001-00" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Administrador da Empresa</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="tenant-admin-name">Nome *</label>
            <input id="tenant-admin-name" name="admin_name" type="text" className="input" required placeholder="Maria Silva" />
            {state.errors?.admin_name && <p className="form-error">{state.errors.admin_name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="tenant-admin-email">E-mail (acesso ao painel) *</label>
            <input id="tenant-admin-email" name="admin_email" type="email" className="input" required placeholder="maria@empresa.com" />
            {state.errors?.admin_email && <p className="form-error">{state.errors.admin_email[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Plano & Cobrança da Plataforma (SaaS)</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="tenant-monthly-fee">Valor da Mensalidade (R$) *</label>
            <input
              id="tenant-monthly-fee"
              name="monthly_fee"
              type="number"
              step="0.01"
              min="0"
              className="input"
              defaultValue="250.00"
              placeholder="250.00"
            />
            {state.errors?.monthly_fee && <p className="form-error">{state.errors.monthly_fee[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-due-day">Dia do Vencimento Mensal *</label>
            <input
              id="tenant-due-day"
              name="billing_due_day"
              type="number"
              min="1"
              max="31"
              className="input"
              defaultValue="10"
              placeholder="10"
            />
            {state.errors?.billing_due_day && <p className="form-error">{state.errors.billing_due_day[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-first-due-date">Data do Primeiro Vencimento</label>
            <input
              id="tenant-first-due-date"
              name="first_due_date"
              type="date"
              className="input"
            />
            <span className="text-muted text-xs">Opcional. Se vazio, calcula automaticamente com base no dia informado.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton />
        <Link href="/empresas" className="btn btn--secondary btn--lg">Cancelar</Link>
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
      `}</style>
    </form>
  );
}
