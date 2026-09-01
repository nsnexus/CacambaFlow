import type { Metadata } from 'next';
import { updateOwnPassword } from '@/app/actions/account';
import { ChangePasswordForm } from '@/components/ui/change-password-form';

export const metadata: Metadata = { title: 'Minha Conta — CaçambaFlow' };

export default function MinhaContaPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Minha Conta</h1>
        <p className="text-muted text-sm">Troque a senha que você usa pra entrar no painel.</p>
      </div>

      <div className="card" style={{ maxWidth: '560px' }}>
        <ChangePasswordForm action={updateOwnPassword} idPrefix="own" />
      </div>
    </div>
  );
}
