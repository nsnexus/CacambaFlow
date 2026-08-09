import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { LeadForm } from '@/components/leads/lead-form';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';

export const metadata: Metadata = {
  title: 'Solicitar orçamento — CaçambaFlow',
  description: 'Conta pra gente sobre a sua operação e receba um orçamento do CaçambaFlow.',
};

export default function OrcamentoPage() {
  return (
    <main className="orcamento-page">
      <WhatsAppButton />
      <div className="orcamento-container">
        <Link href="/" className="orcamento-back">← Voltar ao site</Link>

        <div className="orcamento-head">
          <div className="orcamento-brand">
            <Image src="/logo-mark.png" alt="" width={40} height={40} />
            <span>CaçambaFlow</span>
          </div>
          <h1>Vamos montar seu orçamento</h1>
          <p className="text-muted">
            Conta pra gente um pouco sobre a sua operação. Nosso time entra em contato pra apresentar o sistema e
            fechar a melhor proposta pra sua empresa.
          </p>
        </div>

        <div className="card">
          <LeadForm />
        </div>

        <p className="orcamento-footer text-muted text-sm">
          Já é cliente? <Link href="/login">Entrar na plataforma</Link>
        </p>
      </div>

      <style>{`
        .orcamento-page {
          min-height: 100vh;
          background:
            radial-gradient(600px circle at 15% 0%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 60%);
          padding: var(--space-10) var(--space-4) var(--space-12);
        }
        .orcamento-container { max-width: 720px; margin: 0 auto; }
        .orcamento-back {
          display: inline-block;
          color: var(--color-text-muted);
          font-size: 0.875rem;
          margin-bottom: var(--space-8);
        }
        .orcamento-back:hover { color: var(--color-text); }
        .orcamento-head { margin-bottom: var(--space-8); }
        .orcamento-brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          margin-bottom: var(--space-6);
        }
        .orcamento-head h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: var(--space-3); }
        .orcamento-head p { max-width: 520px; line-height: 1.6; }
        .orcamento-footer { text-align: center; margin-top: var(--space-6); }
      `}</style>
    </main>
  );
}
