import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';

export const metadata: Metadata = { title: 'Motivos de Falha — CaçambaFlow' };

// TODO: Migrar para Firestore
async function getFailureReasons() {
  return [] as any[];
}

const CATEGORY_LABELS: Record<string, string> = {
  CLIENTE: 'Cliente',
  VEICULO: 'Veículo',
  ACESSO: 'Acesso',
  CLIMA: 'Clima',
  ATIVO: 'Ativo/Caçamba',
  OPERACAO: 'Operação',
  OUTRO: 'Outro',
};

export default async function MotivosFalhaPage() {
  const reasons = await getFailureReasons();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Motivos de Falha</h1>
          <p className="text-muted text-sm">Configure os motivos que os motoristas podem selecionar ao registrar uma falha.</p>
        </div>
        <Link id="btn-novo-motivo" href="/configuracoes/motivos-falha/novo" className="btn btn--primary">
          + Novo Motivo
        </Link>
      </div>

      <DataTable
        id="table-failure-reasons"
        data={reasons as Record<string, unknown>[]}
        emptyMessage="Nenhum motivo cadastrado. Adicione motivos de falha para que os motoristas possam selecioná-los."
        columns={[
          { key: 'name', label: 'Nome' },
          {
            key: 'category',
            label: 'Categoria',
            render: (val) => (
              <span style={{
                background: 'var(--color-surface-2)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                {CATEGORY_LABELS[val as string] ?? val as string}
              </span>
            ),
          },
          {
            key: 'requires_note',
            label: 'Exige Obs.',
            render: (val) => <span style={{ color: val ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{val ? '✓' : '—'}</span>,
          },
          {
            key: 'requires_photo',
            label: 'Exige Foto',
            render: (val) => <span style={{ color: val ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{val ? '✓' : '—'}</span>,
          },
          {
            key: 'allow_auto_reschedule',
            label: 'Reagenda Auto.',
            render: (val) => <span style={{ color: val ? 'var(--color-info)' : 'var(--color-text-muted)' }}>{val ? '✓' : '—'}</span>,
          },
          {
            key: 'active',
            label: 'Ativo',
            render: (val) => <span style={{ color: val ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{val ? 'Sim' : 'Não'}</span>,
          },
        ]}
        actions={(row) => (
          <Link
            href={`/configuracoes/motivos-falha/${row.id}`}
            className="btn btn--secondary btn--sm"
            id={`btn-edit-reason-${row.id}`}
          >
            Editar
          </Link>
        )}
      />
    </div>
  );
}
