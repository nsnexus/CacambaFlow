// Componente de tabela reutilizável para todas as listas do sistema

import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  id: string;
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  id,
  columns,
  data,
  emptyMessage = 'Nenhum registro encontrado.',
  actions,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        id={`${id}-empty`}
        style={{
          textAlign: 'center',
          padding: 'var(--space-12)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Inbox size={32} style={{ marginBottom: 'var(--space-2)', opacity: 0.6 }} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    // Nota: NÃO colocar overflow:hidden aqui (nem inline nem via classe) —
    // isso anularia o overflow-x:auto do .table-container no globals.css e
    // travaria o acesso a colunas fora da tela (ex: Ações) em telas
    // estreitas, sem nem dar pra rolar pra ver. Cantos arredondados ficam
    // por conta do border-radius do .table-container mesmo, sem precisar
    // recortar o conteúdo.
    <div className="table-container" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
      <table id={id} className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th className="table-actions-cell">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={(row.id as string) ?? i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '—')}
                </td>
              ))}
              {actions && <td className="table-actions-cell">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
