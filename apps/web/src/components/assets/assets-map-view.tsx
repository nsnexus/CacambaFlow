'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { AssetMapLoader } from './asset-map-loader';
import type { DeliveredAsset } from './asset-map';

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

export function AssetsMapView({ assets }: { assets: DeliveredAsset[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const withCoords = assets.filter(a => a.address?.latitude && a.address?.longitude).length;

  return (
    <div>
      {withCoords < assets.length && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          fontSize: '0.8125rem',
          marginBottom: 'var(--space-4)',
        }}>
          {assets.length - withCoords} de {assets.length} caçamba(s) entregue(s) não tem coordenadas cadastradas no endereço e por isso não aparece no mapa (só na tabela abaixo).
        </div>
      )}

      <div className="assets-map-layout">
        <div className="table-container" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Caçamba</th>
                <th>Cliente / Obra</th>
                <th>Entregue em</th>
                <th>Previsão coleta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => a.address?.latitude && setSelectedId(a.id)}
                  style={{
                    cursor: a.address?.latitude ? 'pointer' : 'default',
                    background: selectedId === a.id ? 'var(--color-surface-2)' : undefined,
                  }}
                >
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{a.identifier}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.customer?.name ?? '—'}</div>
                    <div className="text-xs text-muted">{a.address?.name}</div>
                  </td>
                  <td>{formatDate(a.delivered_at)}</td>
                  <td>{formatDate(a.expected_return_date)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {!a.address?.latitude && a.customer_id && a.address_id && (
                        <Link
                          href={`/clientes/${a.customer_id}/enderecos/${a.address_id}/editar`}
                          className="btn btn--secondary btn--sm"
                          style={{ color: 'var(--color-warning)', whiteSpace: 'nowrap' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Corrigir endereço
                        </Link>
                      )}
                      <Link href={`/cacambas/${a.id}`} className="btn btn--secondary btn--sm" onClick={(e) => e.stopPropagation()}>
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={5} className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>Nenhuma caçamba entregue no momento.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="assets-map-pane" style={{ height: '70vh', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <AssetMapLoader assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <style>{`
        .assets-map-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: var(--space-6);
          align-items: start;
        }
        @media (max-width: 900px) {
          .assets-map-layout { grid-template-columns: 1fr; }
          /* Mapa primeiro (é o que o usuário quer ver grande), tabela embaixo */
          .assets-map-pane { height: 60vh !important; order: -1; margin-bottom: var(--space-4); }
        }
      `}</style>
    </div>
  );
}
