import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Esqueci minha senha — CaçambaFlow' };

export default function EsqueciSenhaPage() {
  return (
    <main className="forgot-page">
      <div className="forgot-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <span style={{ fontSize: '1.75rem' }}>🪣</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>CaçambaFlow</span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Esqueci minha senha</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-6)' }}>
          Informe o e-mail da sua conta e enviaremos um link pra você criar uma nova senha.
        </p>

        <ForgotPasswordForm />

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <Link href="/login" className="text-muted text-sm">← Voltar para o login</Link>
        </div>
      </div>

      <style>{`
        .forgot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          padding: var(--space-6);
        }
        .forgot-card {
          width: 100%;
          max-width: 400px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
        }
      `}</style>
    </main>
  );
}
