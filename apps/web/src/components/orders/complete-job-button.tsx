'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { completeJobManually } from '@/app/actions/jobs';

// Fecha um atendimento direto pelo painel — pro caso do app do motorista
// falhar (sem internet, bug, celular quebrado) e mesmo assim o serviço ter
// sido feito. Pré-preenche o local da entrega com as coordenadas já
// cadastradas do endereço, mas o admin pode ajustar.
export function CompleteJobButton({
  orderId,
  jobId,
  jobNumber,
  defaultLatitude,
  defaultLongitude,
}: {
  orderId: string;
  jobId: string;
  jobNumber: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await completeJobManually(orderId, jobId, formData);
      if (result.message) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn icon-btn--secondary"
        title="Concluir manualmente"
        aria-label="Concluir manualmente"
      >
        <CheckCircle2 size={16} />
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '420px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Concluir Manualmente</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              Atendimento {jobNumber} — use só quando o app do motorista não puder registrar (falha, sem sinal, etc.). Isso já atualiza a caçamba como se tivesse sido concluído pelo app.
            </p>
            {error && (
              <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="label">Latitude do local</label>
                  <input name="delivery_latitude" type="number" step="any" className="input" defaultValue={defaultLatitude ?? ''} placeholder="Opcional" />
                </div>
                <div className="form-group">
                  <label className="label">Longitude do local</label>
                  <input name="delivery_longitude" type="number" step="any" className="input" defaultValue={defaultLongitude ?? ''} placeholder="Opcional" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="label">Motivo da conclusão manual</label>
                <textarea name="note" className="input" rows={2} placeholder="Ex: motorista sem internet, app travou..." />
              </div>
              <div className="flex gap-4">
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={isPending}>
                  {isPending ? 'Concluindo...' : 'Confirmar Conclusão'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn--secondary" disabled={isPending}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
