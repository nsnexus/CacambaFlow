import type { Metadata } from 'next';
import { getReportsSummary } from '@/app/actions/reports';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/data-table';

export const metadata: Metadata = { title: 'Relatórios — CaçambaFlow' };

const STATUS_BAR_COLORS: Record<string, string> = {
  RASCUNHO: 'var(--color-status-cancelado)',
  PENDENTE: 'var(--color-status-pendente)',
  ATRIBUIDO: 'var(--color-status-atribuido)',
  EM_ROTA: 'var(--color-status-em-rota)',
  NO_LOCAL: 'var(--color-status-no-local)',
  EM_EXECUCAO: 'var(--color-status-em-execucao)',
  CONCLUIDO_LOCAL: 'var(--color-status-em-execucao)',
  SINCRONIZANDO: 'var(--color-status-atribuido)',
  CONCLUIDO: 'var(--color-status-concluido)',
  FALHADO: 'var(--color-status-falhado)',
  REAGENDADO: 'var(--color-status-pendente)',
  CANCELADO: 'var(--color-status-cancelado)',
  REABERTO: 'var(--color-status-pendente)',
  ERRO_SYNC: 'var(--color-status-falhado)',
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const month = searchParams.month || new Date().toISOString().slice(0, 7);
  const report = await getReportsSummary(month);

  const statusEntries = Object.entries(report.statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, count]) => count));

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Relatórios</h1>
          <p className="text-muted text-sm" style={{ textTransform: 'capitalize' }}>{monthLabel}</p>
        </div>
        <form className="flex items-center gap-2">
          <input type="month" name="month" defaultValue={month} className="input" style={{ width: 'auto' }} />
          <button type="submit" className="btn btn--secondary btn--sm">Filtrar</button>
        </form>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Atendimentos no Período</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>{report.totalJobs}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Taxa de Conclusão</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>{report.completionRate.toFixed(1)}%</p>
          <p className="text-xs text-muted">{report.concluidos} concluído(s), {report.falhados} falhado(s)</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Faturado no Mês</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {report.financials.faturado.toFixed(2)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <p className="text-sm text-muted" style={{ fontWeight: 600 }}>Em Aberto</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>R$ {report.financials.emAberto.toFixed(2)}</p>
          <p className="text-xs text-muted">Recebido: R$ {report.financials.recebido.toFixed(2)}</p>
        </div>
      </div>

      <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Distribuição por status */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Atendimentos por Status</h2>
          {statusEntries.length === 0 ? (
            <p className="text-muted text-sm">Nenhum atendimento neste período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {statusEntries.map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(count / maxStatusCount) * 100}%`,
                      background: STATUS_BAR_COLORS[status] ?? 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranking de motoristas */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Ranking de Motoristas</h2>
          <DataTable
            id="table-driver-ranking"
            data={report.driverRanking as unknown as Record<string, unknown>[]}
            emptyMessage="Nenhum atendimento atribuído a motoristas neste período."
            columns={[
              { key: 'name', label: 'Motorista' },
              { key: 'total', label: 'Total' },
              { key: 'concluidos', label: 'Concluídos', render: (val) => <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{val as number}</span> },
              { key: 'falhados', label: 'Falhados', render: (val) => <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{val as number}</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
