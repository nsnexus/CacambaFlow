import type { Metadata } from 'next';
import { getDashboardSummary } from '@/app/actions/dashboard';
import { ClipboardList, Clock, Truck, CheckCircle2, XCircle, UserRound, Container, MapPin, type LucideIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard — CaçambaFlow',
};

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const stats: { id: string; label: string; value: number; icon: LucideIcon; color: string }[] = [
    { id: 'stat-atendimentos', label: 'Atendimentos Hoje', value: summary.atendimentosHoje, icon: ClipboardList, color: 'var(--color-info)' },
    { id: 'stat-pendentes', label: 'Pendentes', value: summary.pendentes, icon: Clock, color: 'var(--color-warning)' },
    { id: 'stat-em-rota', label: 'Em Rota', value: summary.emRota, icon: Truck, color: 'var(--color-status-em-rota)' },
    { id: 'stat-concluidos', label: 'Concluídos', value: summary.concluidos, icon: CheckCircle2, color: 'var(--color-success)' },
    { id: 'stat-falhados', label: 'Falhados', value: summary.falhados, icon: XCircle, color: 'var(--color-danger)' },
    { id: 'stat-motoristas', label: 'Motoristas Online', value: summary.motoristasOnline, icon: UserRound, color: 'var(--color-primary)' },
    { id: 'stat-cacambas-livres', label: 'Caçambas Disponíveis', value: summary.cacambasDisponiveis, icon: Container, color: 'var(--color-success)' },
    { id: 'stat-cacambas-locadas', label: 'Caçambas Locadas', value: summary.cacambasLocadas, icon: MapPin, color: 'var(--color-info)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard Operacional</h1>
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-1)' }}>
          Visão geral da operação de hoje
        </p>
      </div>

      {/* Indicadores */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.id} id={stat.id} className="stat-card">
            <div className="stat-card__icon" style={{ color: stat.color }}>
              <stat.icon size={26} strokeWidth={2} />
            </div>
            <div>
              <div className="stat-card__value">{stat.value}</div>
              <div className="stat-card__label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de sincronização */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }} id="sync-alerts">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          Alertas Operacionais
        </h2>
        <p className="text-muted text-sm">
          Nenhum alerta no momento. Os alertas de sincronização, falhas e atendimentos vencidos aparecerão aqui.
        </p>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--space-4);
        }
        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .stat-card__icon { font-size: 1.75rem; }
        .stat-card__value {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1;
        }
        .stat-card__label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
