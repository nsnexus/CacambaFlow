import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/firebase/server';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';

export const metadata: Metadata = {
  title: 'CaçambaFlow — Gestão operacional para locadoras de caçambas',
  description:
    'Controle pedidos, despacho, motoristas e caçambas em campo com rastreamento em tempo real. Do pedido à cobrança, tudo em um só sistema.',
};

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '📦',
    title: 'Pedido entra no sistema',
    text: 'Cadastre cliente, obra e o tipo de atendimento (entrega, troca ou coleta). O pedido vira um ou mais atendimentos prontos pra despacho.',
  },
  {
    step: '02',
    icon: '🗺️',
    title: 'Despacho pro motorista certo',
    text: 'Atribua motorista, veículo e caçamba direto no quadro de atendimentos. A rota do dia aparece automaticamente no app de cada motorista.',
  },
  {
    step: '03',
    icon: '🚛',
    title: 'Execução em campo, com prova',
    text: 'O motorista segue a rota pelo app — inicia, chega, executa e conclui, com foto e localização GPS em cada etapa. Funciona mesmo sem internet.',
  },
  {
    step: '04',
    icon: '📊',
    title: 'Visão em tempo real e cobrança',
    text: 'Acompanhe a frota ao vivo no mapa, veja o status de cada caçamba em campo e feche o faturamento do mês com relatórios prontos.',
  },
];

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Centro de Controle em tempo real',
    text: 'Mapa ao vivo com a posição de cada motorista em campo, atualizado por telemetria do app.',
  },
  {
    icon: '📱',
    title: 'App do motorista, feito pro campo',
    text: 'Rota do dia, histórico de atendimentos, navegação até o local em um toque e captura de evidências — tudo pensado pra quem trabalha na rua.',
  },
  {
    icon: '🪣',
    title: 'Gestão de caçambas',
    text: 'Saiba exatamente quais caçambas estão disponíveis, locadas e onde cada uma está, com mapa dedicado.',
  },
  {
    icon: '✅',
    title: 'Evidência em cada etapa',
    text: 'Foto e geolocalização anexadas automaticamente à entrega, troca ou coleta — sem depender de papel ou WhatsApp.',
  },
  {
    icon: '📈',
    title: 'Relatórios operacionais e financeiros',
    text: 'Taxa de conclusão, ranking de motoristas, faturado e em aberto no mês, tudo num só painel.',
  },
  {
    icon: '🏢',
    title: 'Pronto pra crescer',
    text: 'Estrutura multi-empresa: gerencie mais de uma filial ou operação a partir da mesma conta.',
  },
];

export default async function LandingPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="landing">
      <WhatsAppButton />

      {/* Header */}
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <div className="landing-brand">
            <Image src="/logo-mark.png" alt="" width={36} height={36} priority />
            <span>CaçambaFlow</span>
          </div>
          <nav className="landing-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
          </nav>
          <div className="landing-header__actions">
            <Link href="/login" className="btn btn--secondary">Entrar</Link>
            <Link href="/orcamento" className="btn btn--primary">Solicitar orçamento</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="landing-container hero__inner">
          <div className="hero__content">
            <span className="hero__eyebrow">Gestão operacional para locadoras de caçambas</span>
            <h1>
              Do pedido à cobrança, <span className="hero__highlight">sem planilha e sem perder o fio</span> da operação
            </h1>
            <p className="hero__lead">
              CaçambaFlow conecta o escritório e a frota em um só sistema: despache atendimentos, acompanhe
              motoristas em tempo real e saiba exatamente onde está cada caçamba — do pedido até a nota fiscal.
            </p>
            <div className="hero__actions">
              <Link href="/orcamento" className="btn btn--primary btn--lg">Solicitar orçamento</Link>
              <Link href="/login" className="btn btn--secondary btn--lg">Já sou cliente — Entrar</Link>
            </div>
            <div className="hero__stats">
              <div className="hero__stat">
                <span className="hero__stat-value">Tempo real</span>
                <span className="hero__stat-label">Rastreamento da frota</span>
              </div>
              <div className="hero__stat">
                <span className="hero__stat-value">Offline-first</span>
                <span className="hero__stat-label">App funciona sem internet</span>
              </div>
              <div className="hero__stat">
                <span className="hero__stat-value">Ponta a ponta</span>
                <span className="hero__stat-label">Pedido → campo → cobrança</span>
              </div>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__visual-glow" />
            <div className="hero__mock">
              <div className="hero__mock-row">
                <span className="hero__mock-dot" style={{ background: 'var(--color-danger)' }} />
                <span className="hero__mock-dot" style={{ background: 'var(--color-warning)' }} />
                <span className="hero__mock-dot" style={{ background: 'var(--color-success)' }} />
              </div>
              <div className="hero__mock-card">
                <span>📋 Atendimentos hoje</span>
                <strong>24</strong>
              </div>
              <div className="hero__mock-card">
                <span>🚛 Motoristas online</span>
                <strong style={{ color: 'var(--color-success)' }}>8</strong>
              </div>
              <div className="hero__mock-card">
                <span>🪣 Caçambas em campo</span>
                <strong>132</strong>
              </div>
              <div className="hero__mock-bars">
                <div className="hero__mock-bar" style={{ height: '40%' }} />
                <div className="hero__mock-bar" style={{ height: '70%' }} />
                <div className="hero__mock-bar" style={{ height: '55%' }} />
                <div className="hero__mock-bar" style={{ height: '90%' }} />
                <div className="hero__mock-bar" style={{ height: '65%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="section" id="como-funciona">
        <div className="landing-container">
          <div className="section__head">
            <span className="section__eyebrow">Como funciona</span>
            <h2>Da tela do escritório ao caminhão na rua</h2>
            <p>Um fluxo só, sem retrabalho: o que é despachado no painel aparece na hora no app do motorista.</p>
          </div>
          <div className="steps">
            {HOW_IT_WORKS.map((s) => (
              <div className="step-card" key={s.step}>
                <span className="step-card__number">{s.step}</span>
                <span className="step-card__icon">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="section section--alt" id="recursos">
        <div className="landing-container">
          <div className="section__head">
            <span className="section__eyebrow">Recursos</span>
            <h2>Tudo que a operação precisa, num só lugar</h2>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <span className="feature-card__icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="cta">
        <div className="landing-container cta__inner">
          <div>
            <h2>Pronto pra profissionalizar a gestão da sua locadora?</h2>
            <p>Conta pra gente como sua operação funciona hoje e a gente te mostra o CaçambaFlow em ação.</p>
          </div>
          <Link href="/orcamento" className="btn btn--primary btn--lg">Solicitar orçamento</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-brand">
            <Image src="/logo-mark.png" alt="" width={24} height={24} />
            <span>CaçambaFlow</span>
          </div>
          <p className="text-muted text-sm">© {new Date().getFullYear()} CaçambaFlow. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="https://wa.me/5594991081351" target="_blank" rel="noopener noreferrer" className="text-sm">WhatsApp</a>
            <Link href="/orcamento" className="text-sm">Solicitar orçamento</Link>
          </div>
        </div>
      </footer>

      <style>{`
        .landing-container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 var(--space-6);
        }

        .landing-brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          font-size: 1.0625rem;
        }

        /* Header */
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .landing-header__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
          gap: var(--space-6);
        }
        .landing-nav {
          display: flex;
          gap: var(--space-8);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .landing-nav a { color: var(--color-text-muted); }
        .landing-nav a:hover { color: var(--color-text); }
        .landing-header__actions { display: flex; align-items: center; gap: var(--space-3); }

        /* Hero */
        .hero {
          position: relative;
          overflow: hidden;
          padding: var(--space-12) 0 calc(var(--space-12) + var(--space-6));
          background:
            radial-gradient(600px circle at 15% 20%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 60%),
            radial-gradient(700px circle at 90% 0%, color-mix(in srgb, #3B82F6 12%, transparent), transparent 55%);
        }
        .hero__inner {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: var(--space-12);
          align-items: center;
        }
        .hero__eyebrow {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: var(--space-4);
        }
        .hero__content h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.01em;
          margin-bottom: var(--space-5);
        }
        .hero__highlight {
          background: linear-gradient(135deg, var(--color-primary) 0%, #FDBA74 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero__lead {
          font-size: 1.0625rem;
          color: var(--color-text-muted);
          line-height: 1.65;
          max-width: 540px;
          margin-bottom: var(--space-8);
        }
        .hero__actions { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-10); }
        .hero__stats { display: flex; gap: var(--space-8); flex-wrap: wrap; }
        .hero__stat-value { display: block; font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
        .hero__stat-label { display: block; font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 2px; }

        .hero__visual { position: relative; display: flex; justify-content: center; }
        .hero__visual-glow {
          position: absolute;
          inset: -10%;
          background: radial-gradient(circle, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%);
          filter: blur(20px);
        }
        .hero__mock {
          position: relative;
          width: 100%;
          max-width: 360px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          box-shadow: var(--shadow-lg);
        }
        .hero__mock-row { display: flex; gap: 6px; margin-bottom: var(--space-4); }
        .hero__mock-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .hero__mock-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-surface-2);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          margin-bottom: var(--space-3);
          font-size: 0.875rem;
        }
        .hero__mock-card strong { font-size: 1.125rem; }
        .hero__mock-bars {
          display: flex;
          align-items: flex-end;
          gap: var(--space-2);
          height: 72px;
          margin-top: var(--space-4);
          padding: 0 var(--space-1);
        }
        .hero__mock-bar {
          flex: 1;
          background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark));
          border-radius: 4px 4px 0 0;
          opacity: 0.9;
        }

        /* Section shared */
        .section { padding: var(--space-12) 0; }
        .section--alt { background: var(--color-surface); border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle); }
        .section__head { max-width: 620px; margin-bottom: var(--space-10); }
        .section__eyebrow {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: var(--space-3);
        }
        .section__head h2 { font-size: 1.875rem; font-weight: 800; margin-bottom: var(--space-3); letter-spacing: -0.01em; }
        .section__head p { color: var(--color-text-muted); font-size: 1rem; line-height: 1.6; }

        /* Como funciona */
        .steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-5);
        }
        .step-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6) var(--space-5) var(--space-5);
        }
        .step-card__number {
          position: absolute;
          top: var(--space-4);
          right: var(--space-5);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-disabled);
          font-family: monospace;
        }
        .step-card__icon { font-size: 1.75rem; display: block; margin-bottom: var(--space-4); }
        .step-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: var(--space-2); }
        .step-card p { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.55; }

        /* Recursos */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-5);
        }
        .feature-card {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          transition: transform var(--transition-fast), border-color var(--transition-fast);
        }
        .feature-card:hover { transform: translateY(-2px); border-color: var(--color-primary); }
        .feature-card__icon {
          font-size: 1.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--color-primary) 14%, transparent);
          margin-bottom: var(--space-4);
        }
        .feature-card h3 { font-size: 1.0625rem; font-weight: 700; margin-bottom: var(--space-2); }
        .feature-card p { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.55; }

        /* CTA */
        .cta { padding: var(--space-12) 0; }
        .cta__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-8);
          background: linear-gradient(135deg, #1a1230 0%, #0F1117 60%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-10);
          flex-wrap: wrap;
        }
        .cta__inner h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: var(--space-2); }
        .cta__inner p { color: var(--color-text-muted); max-width: 480px; }

        /* Footer */
        .landing-footer { border-top: 1px solid var(--color-border-subtle); padding: var(--space-8) 0; }
        .landing-footer__inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); }

        @media (max-width: 960px) {
          .hero__inner { grid-template-columns: 1fr; }
          .hero__visual { order: -1; }
          .steps { grid-template-columns: repeat(2, 1fr); }
          .features { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .landing-nav { display: none; }
          .steps { grid-template-columns: 1fr; }
          .features { grid-template-columns: 1fr; }
          .hero__actions { flex-direction: column; align-items: stretch; }
          .cta__inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </main>
  );
}
