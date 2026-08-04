import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Login — CaçambaFlow',
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <span className="login-brand__icon">🪣</span>
          <span className="login-brand__name">CaçambaFlow</span>
        </div>
        <div className="login-tagline">
          <h1>Gestão operacional de ponta a ponta</h1>
          <p>Controle entregas, coletas e motoristas em tempo real. Funciona mesmo sem internet.</p>
        </div>
        <div className="login-stats">
          <div className="login-stat">
            <span className="login-stat__value">100%</span>
            <span className="login-stat__label">Operação rastreada</span>
          </div>
          <div className="login-stat">
            <span className="login-stat__value">Offline</span>
            <span className="login-stat__label">First no campo</span>
          </div>
          <div className="login-stat">
            <span className="login-stat__value">Real-time</span>
            <span className="login-stat__label">Mapa operacional</span>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2>Entrar na plataforma</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-6)' }}>
            Use as credenciais fornecidas pelo administrador da sua empresa.
          </p>
          <LoginForm />
        </div>
      </div>

      <style>{`
        .login-page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }
        .login-left {
          background: linear-gradient(135deg, #0F1117 0%, #1a1230 50%, #0F1117 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: var(--space-12);
          position: relative;
          overflow: hidden;
        }
        .login-left::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: var(--space-12);
        }
        .login-brand__icon { font-size: 1.75rem; }
        .login-tagline h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: var(--space-4);
          background: linear-gradient(135deg, #fff 30%, var(--color-primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-tagline p {
          font-size: 1rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          max-width: 400px;
        }
        .login-stats {
          display: flex;
          gap: var(--space-8);
          margin-top: var(--space-12);
        }
        .login-stat__value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .login-stat__label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }
        .login-right {
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
          border-left: 1px solid var(--color-border);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
        }
        .login-card h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        @media (max-width: 768px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { background: var(--color-bg); }
        }
      `}</style>
    </main>
  );
}
