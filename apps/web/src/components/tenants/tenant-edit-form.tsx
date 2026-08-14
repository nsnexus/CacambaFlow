'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateTenant, type UpdateTenantFormState } from '@/app/actions/tenants';
import Link from 'next/link';
import { Save, Loader2, ArrowLeft } from 'lucide-react';

interface TenantEditFormProps {
  tenant: {
    id: string;
    name: string;
    document: string | null;
    status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
    timezone: string;
    monthly_fee?: number;
    billing_due_day?: number;
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      id="btn-save-empresa"
      type="submit"
      className="btn btn--primary btn--lg"
      disabled={pending}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      {pending ? (
        <>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Save size={16} />
          <span>Salvar Alterações</span>
        </>
      )}
    </button>
  );
}

export function TenantEditForm({ tenant }: TenantEditFormProps) {
  const [state, action] = useFormState<UpdateTenantFormState, FormData>(updateTenant, {});

  return (
    <form action={action} noValidate>
      <input type="hidden" name="id" value={tenant.id} />

      {state.message && (
        <div
          role="alert"
          style={{
            background: state.success
              ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            border: `1px solid color-mix(in srgb, ${state.success ? 'var(--color-success)' : 'var(--color-danger)'} 30%, transparent)`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            color: state.success ? 'var(--color-success)' : 'var(--color-danger)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {state.message}
        </div>
      )}

      <div className="form-section">
        <h2 className="form-section__title">Dados Cadastrais da Empresa</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="tenant-name">
              Nome da Empresa *
            </label>
            <input
              id="tenant-name"
              name="name"
              type="text"
              className="input"
              required
              defaultValue={tenant.name}
              placeholder="Ex: Caçamba Express LTDA"
            />
            {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-document">
              CNPJ
            </label>
            <input
              id="tenant-document"
              name="document"
              type="text"
              className="input"
              defaultValue={tenant.document ?? ''}
              placeholder="00.000.000/0001-00"
            />
            {state.errors?.document && <p className="form-error">{state.errors.document[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-status">
              Status da Conta *
            </label>
            <select
              id="tenant-status"
              name="status"
              className="input"
              defaultValue={tenant.status}
            >
              <option value="ATIVO">🟢 Ativo (Acesso Liberado)</option>
              <option value="INATIVO">⚪ Inativo (Acesso Bloqueado)</option>
              <option value="SUSPENSO">🔴 Suspenso (Inadimplência / Bloqueio)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-timezone">
              Fuso Horário
            </label>
            <select
              id="tenant-timezone"
              name="timezone"
              className="input"
              defaultValue={tenant.timezone || 'America/Sao_Paulo'}
            >
              <option value="America/Sao_Paulo">Horário de Brasília (GMT-3)</option>
              <option value="America/Manaus">Manaus (GMT-4)</option>
              <option value="America/Belem">Belém (GMT-3)</option>
              <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
              <option value="America/Cuiaba">Cuiabá (GMT-4)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-monthly-fee">
              Valor da Mensalidade (R$)
            </label>
            <input
              id="tenant-monthly-fee"
              name="monthly_fee"
              type="number"
              step="0.01"
              min="0"
              className="input"
              defaultValue={tenant.monthly_fee ?? 0}
              placeholder="250.00"
            />
            {state.errors?.monthly_fee && <p className="form-error">{state.errors.monthly_fee[0]}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="tenant-due-day">
              Dia do Vencimento Mensal
            </label>
            <input
              id="tenant-due-day"
              name="billing_due_day"
              type="number"
              min="1"
              max="31"
              className="input"
              defaultValue={tenant.billing_due_day ?? 10}
              placeholder="10"
            />
            {state.errors?.billing_due_day && <p className="form-error">{state.errors.billing_due_day[0]}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton />
        <Link href="/empresas" className="btn btn--secondary btn--lg">
          Cancelar
        </Link>
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
