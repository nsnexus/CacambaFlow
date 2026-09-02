'use client';

import { useState } from 'react';
import { FleetMapLoader } from './fleet-map-loader';
import type { TelemetryPoint, FleetAsset } from './fleet-map';

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

/**
 * Sidebar + mapa do Centro de Controle, com abas Motoristas/Caçambas — cada
 * aba mostra só o que é dela (lista + marcadores), e clicar num item da
 * lista centraliza o mapa nele. Fica num client component porque precisa de
 * estado compartilhado (aba ativa, item selecionado) entre a lista e o mapa.
 */
export function FleetControlView({ telemetry, assets }: { telemetry: TelemetryPoint[]; assets: FleetAsset[] }) {
  const [tab, setTab] = useState<'motoristas' | 'cacambas'>('motoristas');
  const [selectedDriverIdx, setSelectedDriverIdx] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const assetPoints = assets.filter((a) => a.address?.latitude && a.address?.longitude);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 'var(--space-3)' }}>
      {/* Abas */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          type="button"
          className={tab === 'motoristas' ? 'btn btn--primary btn--sm' : 'btn btn--secondary btn--sm'}
          onClick={() => setTab('motoristas')}
        >
          🚚 Motoristas ({telemetry.length})
        </button>
        <button
          type="button"
          className={tab === 'cacambas' ? 'btn btn--primary btn--sm' : 'btn btn--secondary btn--sm'}
          onClick={() => setTab('cacambas')}
        >
          Caçambas ({assetPoints.length})
        </button>
      </div>

      <div className="fleet-control-layout" style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar tática */}
        <div className="fleet-control-sidebar" style={{ width: '320px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflowY: 'auto', flexShrink: 0 }}>
          {tab === 'motoristas' ? (
            <div style={{ padding: 'var(--space-2)' }}>
              {telemetry.length === 0 ? (
                <p className="text-muted text-sm" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  Nenhum sinal GPS recebido hoje.
                </p>
              ) : (
                telemetry.map((t, idx) => {
                  const diffMin = Math.floor((new Date().getTime() - new Date(t.location.device_timestamp).getTime()) / 60000);
                  const isOnline = diffMin < 10;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDriverIdx(idx)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: 'var(--space-3)',
                        background: selectedDriverIdx === idx ? 'var(--color-surface-2)' : 'var(--color-bg)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-2)',
                        borderLeft: `3px solid ${isOnline ? 'var(--color-success)' : 'var(--color-warning)'}`,
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>🚚 {t.driver.profiles.name}</span>
                        <span style={{ fontSize: '0.75rem', color: isOnline ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {isOnline ? 'Online' : `Há ${diffMin} min`}
                        </span>
                      </div>
                      <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>
                        {t.location.latitude.toFixed(5)}, {t.location.longitude.toFixed(5)}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        Velocidade: {t.location.speed ? `${(t.location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'var(--space-2)' }}>
                        {t.isEmRota && (
                          <span className="badge" style={{ background: 'var(--color-warning)', color: '#111', fontSize: '0.6875rem' }}>
                            Em rota de entrega
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          {t.assignedJobsCount ?? 0} atendimento{(t.assignedJobsCount ?? 0) === 1 ? '' : 's'} atribuído{(t.assignedJobsCount ?? 0) === 1 ? '' : 's'} hoje
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-2)' }}>
              {assetPoints.length === 0 ? (
                <p className="text-muted text-sm" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  Nenhuma caçamba alocada no momento.
                </p>
              ) : (
                assetPoints.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAssetId(a.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-3)',
                      background: selectedAssetId === a.id ? 'var(--color-surface-2)' : 'var(--color-bg)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-2)',
                      borderLeft: '3px solid var(--color-primary)',
                      cursor: 'pointer',
                      color: 'inherit',
                      font: 'inherit',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>
                      {a.identifier} {a.asset_types ? `— ${a.asset_types.name}` : ''}
                    </div>
                    <div className="text-xs text-muted">{a.customer?.name}</div>
                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      {a.address?.street}, {a.address?.number ?? 'S/N'} — {a.address?.city}/{a.address?.state}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      Previsão de coleta: {formatDate(a.expected_return_date)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Área do Mapa Principal */}
        <div className="fleet-control-map" style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <FleetMapLoader
            telemetry={tab === 'motoristas' ? telemetry : []}
            assets={tab === 'cacambas' ? assets : []}
            selectedDriverIdx={tab === 'motoristas' ? selectedDriverIdx : null}
            selectedAssetId={tab === 'cacambas' ? selectedAssetId : null}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .fleet-control-layout { flex-direction: column; overflow: visible; }
          .fleet-control-sidebar { width: 100% !important; max-height: 240px; }
          .fleet-control-map { min-height: 50vh; order: -1; }
        }
      `}</style>
    </div>
  );
}
