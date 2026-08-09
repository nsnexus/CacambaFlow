import type { Metadata } from 'next';
import Link from 'next/link';
import { FailureReasonForm } from '@/components/failure-reasons/failure-reason-form';

export const metadata: Metadata = { title: 'Novo Motivo de Falha — CaçambaFlow' };

export default function NovoMotivoFalhaPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/configuracoes/motivos-falha" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Motivos de Falha
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Motivo de Falha</h1>
        <p className="text-muted text-sm">Motoristas poderão selecionar este motivo ao registrar uma falha no atendimento.</p>
      </div>

      <div className="card">
        <FailureReasonForm />
      </div>
    </div>
  );
}
