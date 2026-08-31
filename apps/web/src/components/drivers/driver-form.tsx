'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createDriver, updateDriver, type DriverFormState } from '@/app/actions/drivers';
import Link from 'next/link';

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      id="btn-submit-motorista"
      type="submit"
      className="btn btn--primary btn--lg"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Motorista'}
    </button>
  );
}

function ResetLinkSuccess({ resetLink }: { resetLink: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div id="driver-created-success">
      <div
        role="status"
        style={{
          background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>✓ Motorista criado com sucesso!</p>
        <p className="text-sm" style={{ marginBottom: 'var(--space-3)' }}>
          Tentamos mandar um e-mail com o link de acesso, mas o mais garantido é você mesmo mandar esse link pro
          motorista (WhatsApp, por exemplo) — clicando nele, ele define a própria senha:
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input readOnly value={resetLink} className="input" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }} onClick={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => {
              navigator.clipboard.writeText(resetLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      </div>
      <Link href="/motoristas" className="btn btn--primary btn--lg">Voltar para Motoristas</Link>
    </div>
  );
}

type Driver = {
  id: string;
  profiles?: { name?: string; email?: string; phone?: string };
  license_number?: string;
  license_category?: string;
  license_expires_at?: string;
  tracking_enabled?: boolean;
};

export function DriverForm({ driver }: { driver?: Driver }) {
  const isEdit = !!driver;
  const action = isEdit ? updateDriver.bind(null, driver.id) : createDriver;
  const [state, formAction] = useFormState<DriverFormState, FormData>(action, {});

  if (state.success && state.resetLink) {
    return <ResetLinkSuccess resetLink={state.resetLink} />;
  }

  if (state.success) {
    return (
      <div>
        <p style={{ marginBottom: 'var(--space-4)' }}>
          ✓ Motorista criado, mas não consegui gerar o link de acesso agora (falha temporária). Exclua e recadastre esse motorista pra tentar de novo, ou peça suporte técnico.
        </p>
        <Link href="/motoristas" className="btn btn--primary btn--lg">Voltar para Motoristas</Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
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
        <h2 className="form-section__title">Dados de Acesso</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="driver-name">Nome completo *</label>
            <input id="driver-name" name="name" type="text" className="input" required defaultValue={driver?.profiles?.name} placeholder="João da Silva" />
            {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="driver-email">E-mail (acesso ao app) {!isEdit && '*'}</label>
            {isEdit ? (
              <input id="driver-email" type="email" className="input" value={driver?.profiles?.email ?? ''} disabled readOnly />
            ) : (
              <input id="driver-email" name="email" type="email" className="input" required placeholder="joao@empresa.com" />
            )}
            {isEdit && <p className="text-muted text-xs" style={{ marginTop: '4px' }}>E-mail de login não pode ser alterado aqui.</p>}
            {state.errors?.email && <p className="form-error">{state.errors.email[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="driver-phone">Telefone</label>
            <input id="driver-phone" name="phone" type="tel" className="input" defaultValue={driver?.profiles?.phone} placeholder="(11) 99999-9999" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Habilitação</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label" htmlFor="driver-license-number">Número da CNH *</label>
            <input id="driver-license-number" name="license_number" type="text" className="input" required defaultValue={driver?.license_number} placeholder="00000000000" />
            {state.errors?.license_number && <p className="form-error">{state.errors.license_number[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="driver-license-category">Categoria *</label>
            <select id="driver-license-category" name="license_category" className="input" required defaultValue={driver?.license_category ?? ''}>
              <option value="">Selecione...</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="BC">BC</option>
              <option value="CE">CE</option>
            </select>
            {state.errors?.license_category && <p className="form-error">{state.errors.license_category[0]}</p>}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="driver-license-expires">Validade da CNH *</label>
            <input id="driver-license-expires" name="license_expires_at" type="date" className="input" required defaultValue={driver?.license_expires_at} />
            {state.errors?.license_expires_at && <p className="form-error">{state.errors.license_expires_at[0]}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section__title">Rastreamento</h2>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input id="driver-tracking" name="tracking_enabled" type="checkbox" value="true" defaultChecked={driver?.tracking_enabled ?? true} />
            <span style={{ fontSize: '0.875rem' }}>
              Permitir rastreamento durante a jornada
              <span className="text-muted text-xs" style={{ display: 'block' }}>
                Conforme política da empresa e consentimento do motorista (LGPD)
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton isEdit={isEdit} />
        <Link href="/motoristas" className="btn btn--secondary btn--lg">Cancelar</Link>
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
