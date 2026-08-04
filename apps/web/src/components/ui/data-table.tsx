// Componente de tabela reutilizável para todas as listas do sistema

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
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📭</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <table id={id} className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th>Ações</th>}
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
              {actions && <td>{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
