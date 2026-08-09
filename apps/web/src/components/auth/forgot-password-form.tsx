'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      // Não revela se o e-mail existe ou não, por segurança
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        id="forgot-password-success"
        role="status"
        style={{
          background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          fontSize: '0.875rem',
        }}
      >
        Se esse e-mail estiver cadastrado, você vai receber um link pra redefinir a senha em instantes.
      </div>
    );
  }

  return (
    <form id="forgot-password-form" onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
        <label className="label" htmlFor="forgot-email">E-mail</label>
        <input
          id="forgot-email"
          type="email"
          className="input"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      {error && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          fontSize: '0.875rem',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-4)',
        }}>
          {error}
        </div>
      )}

      <button
        id="forgot-password-submit"
        type="submit"
        className="btn btn--primary btn--lg"
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Enviando...' : 'Enviar link de redefinição'}
      </button>
    </form>
  );
}
