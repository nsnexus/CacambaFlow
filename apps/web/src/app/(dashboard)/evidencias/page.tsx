import type { Metadata } from 'next';
import { getEvidences } from '@/app/actions/evidences';

export const metadata: Metadata = { title: 'Evidências — CaçambaFlow' };

const EVIDENCE_LABELS: Record<string, string> = {
  FOTO_ENTREGA: 'Foto de Entrega',
  FOTO_COLETA: 'Foto de Coleta',
  FOTO_LOCAL: 'Foto do Local',
  FOTO_RESIDUO: 'Foto do Resíduo',
  FOTO_AVARIA: 'Avaria no Ativo',
  ASSINATURA: 'Assinatura',
  DOCUMENTO: 'Documento Anexo',
};


export default async function EvidenciasPage() {
  const evidences = await getEvidences();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Galeria de Evidências</h1>
          <p className="text-muted text-sm">Fotos, assinaturas e comprovantes capturados em campo.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
        {evidences.map((item) => (
          <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Imagem */}
            <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--color-surface-2)', position: 'relative' }}>
              {item.download_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.download_url}
                  alt={item.evidence_type}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                  {item.status === 'UPLOAD_OK' ? 'Imagem não encontrada' : 'Aguardando Upload (Offline)'}
                </div>
              )}
              
              {/* Badge Overlay */}
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>
                {EVIDENCE_LABELS[item.evidence_type] ?? item.evidence_type}
              </div>
            </div>

            {/* Informações */}
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{(item.jobs as any)?.job_number}</span>
                <span className="text-muted" style={{ margin: '0 8px' }}>—</span>
                <span className="text-sm">{(item.jobs as any)?.job_type}</span>
              </div>

              <div className="text-sm" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Cliente:</strong> {(item.jobs as any)?.orders?.customers?.name ?? '—'}
              </div>
              
              <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                <span>{(item.jobs as any)?.drivers?.profiles?.name}</span>
                <span>{new Date(item.captured_at_device).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              
              {item.latitude && item.longitude && (
                <div className="text-xs text-muted" style={{ marginTop: '2px', fontFamily: 'monospace' }}>
                  GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        ))}

        {evidences.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            Nenhuma evidência capturada ainda.
          </div>
        )}
      </div>
    </div>
  );
}
