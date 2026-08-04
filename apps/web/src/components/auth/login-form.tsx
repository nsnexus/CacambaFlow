'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { setSessionCookie } from '@/app/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const sessionResult = await setSessionCookie(idToken);
      if (!sessionResult.success) {
        setError('Falha ao iniciar sessão no servidor.');
        setLoading(false);
        return;
      }
    } catch (authError: any) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form id="login-form" onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
        <label className="label" htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          className="input"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
        <label className="label" htmlFor="login-password">Senha</label>
        <input
          id="login-password"
          type="password"
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div
          id="login-error"
          role="alert"
          style={{
            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            fontSize: '0.875rem',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error}
        </div>
      )}

      <button
        id="login-submit"
        type="submit"
        className="btn btn--primary w-full btn--lg"
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
        <a href="/esqueci-senha" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Esqueci minha senha
        </a>
      </div>
    </form>
  );
}
