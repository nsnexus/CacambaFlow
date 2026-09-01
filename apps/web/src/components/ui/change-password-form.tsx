'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { PasswordField } from './password-field';

type ChangePasswordState = {
  errors?: Partial<Record<'password' | 'confirm_password', string[]>>;
  message?: string;
  success?: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Salvando...' : 'Trocar Senha'}
    </button>
  );
}

// Formulário genérico de troca de senha — reusado pra "minha conta" (admin
// troca a própria senha) e pra troca de senha de motorista no painel.
export function ChangePasswordForm({
  action,
  idPrefix,
}: {
  action: (state: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>;
  idPrefix: string;
}) {
  const [state, formAction] = useFormState<ChangePasswordState, FormData>(action, {});

  return (
    <form action={formAction}>
      {state.message && (
        <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {state.message}
        </div>
      )}
      {state.success && (
        <div role="status" style={{ padding: 'var(--space-3)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          ✓ Senha alterada com sucesso.
        </div>
      )}
      <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 'var(--space-4)' }}>
        <PasswordField id={`${idPrefix}-password`} name="password" label="Nova senha *" error={state.errors?.password?.[0]} />
        <PasswordField id={`${idPrefix}-confirm-password`} name="confirm_password" label="Confirmar nova senha *" error={state.errors?.confirm_password?.[0]} />
      </div>
      <SubmitButton />
    </form>
  );
}
