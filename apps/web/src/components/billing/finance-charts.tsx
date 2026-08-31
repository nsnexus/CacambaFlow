'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, type LucideIcon } from 'lucide-react';

type MonthlyPoint = { label: string; value: number };
type StatusPoint = { key: string; label: string; color: string; value: number; count: number };

const STATUS_ICON: Record<string, LucideIcon> = {
  PAGO: CheckCircle2,
  PENDENTE: Clock,
  ATRASADO: AlertTriangle,
};

function formatCompact(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.0', '')}k`;
  return `R$ ${value.toFixed(0)}`;
}

function formatFull(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

// Gráfico de barras (faturamento mensal) — série única, então usa só a cor
// da marca; sem legenda (regra: uma série não precisa de caixa de legenda).
function MonthlyBarChart({ data }: { data: MonthlyPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const width = 560;
  const height = 220;
  const paddingLeft = 48;
  const paddingBottom = 28;
  const paddingTop = 24;
  const chartW = width - paddingLeft - 12;
  const chartH = height - paddingBottom - paddingTop;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  // Arredonda o teto pra um número "redondo" (regra: ticks em números limpos)
  const niceMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
  const ticks = [0, niceMax / 2, niceMax];

  const barSlot = chartW / data.length;
  const barWidth = Math.min(24, barSlot * 0.5);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Faturamento por mês">
        {/* Gridlines horizontais */}
        {ticks.map((t, i) => {
          const y = paddingTop + chartH - (t / niceMax) * chartH;
          return (
            <g key={i}>
              <line x1={paddingLeft} x2={width - 12} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} />
              <text x={paddingLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-text-muted)">
                {formatCompact(t)}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {data.map((d, i) => {
          const barH = (d.value / niceMax) * chartH;
          const x = paddingLeft + i * barSlot + (barSlot - barWidth) / 2;
          const y = paddingTop + chartH - barH;
          const isHovered = hovered === i;

          return (
            <g
              key={i}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* hit target maior que a barra */}
              <rect x={paddingLeft + i * barSlot} y={paddingTop} width={barSlot} height={chartH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 1)}
                rx={4}
                fill="var(--color-primary)"
                opacity={isHovered ? 0.85 : 1}
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">
                {d.value > 0 ? formatCompact(d.value) : ''}
              </text>
              <text x={x + barWidth / 2} y={height - paddingBottom + 16} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] && (
        <div
          style={{
            position: 'absolute',
            left: `${((paddingLeft + hovered * barSlot + barSlot / 2) / width) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <strong>{formatFull(data[hovered]!.value)}</strong>
          <span className="text-muted" style={{ marginLeft: '6px' }}>{data[hovered]!.label}</span>
        </div>
      )}
    </div>
  );
}

// Barras horizontais por status — cor reservada (status palette), nunca cor
// sozinha: cada linha carrega ícone + rótulo em texto, não só a cor.
function StatusBarChart({ data }: { data: StatusPoint[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {data.map((d) => {
        const Icon = STATUS_ICON[d.key] ?? Clock;
        const widthPct = (d.value / maxValue) * 100;
        return (
          <div key={d.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Icon size={14} />
              <span className="text-sm" style={{ fontWeight: 600 }}>{d.label}</span>
              <span className="text-xs text-muted">({d.count})</span>
              <span className="text-sm" style={{ marginLeft: 'auto', fontWeight: 600 }}>{formatFull(d.value)}</span>
            </div>
            <div style={{ height: '10px', background: 'var(--color-surface-2)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${widthPct}%`, background: d.color, borderRadius: '5px', minWidth: d.value > 0 ? '4px' : 0 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FinanceCharts({ monthlyData, statusData }: { monthlyData: MonthlyPoint[]; statusData: StatusPoint[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Faturamento por Mês</h2>
        <MonthlyBarChart data={monthlyData} />
      </div>
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Faturas por Status</h2>
        <StatusBarChart data={statusData} />
      </div>
    </div>
  );
}
