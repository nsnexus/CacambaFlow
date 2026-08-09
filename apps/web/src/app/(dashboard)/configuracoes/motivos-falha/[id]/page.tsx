import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFailureReasonById } from '@/app/actions/failure-reasons';
import { FailureReasonForm } from '@/components/failure-reasons/failure-reason-form';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

export const metadata: Metadata = { title: 'Editar Motivo de Falha — CaçambaFlow' };

export default async function EditarMotivoFalhaPage({ params }: { params: { id: string } }) {
  let reason;
  try {
    reason = await getFailureReasonById(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/configuracoes/motivos-falha" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Motivos de Falha
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Editar Motivo de Falha</h1>
      </div>

      <div className="card">
        <FailureReasonForm reason={serializeFirestoreData(reason) as any} />
      </div>
    </div>
  );
}
