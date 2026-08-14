import type { Metadata } from 'next';
import { getLeads, type LeadStatus } from '@/app/actions/leads';
import { DataTable } from '@/components/ui/data-table';
import { LeadStatusSelect } from '@/components/leads/lead-status-select';
import { LeadActions } from '@/components/leads/lead-actions';

export const metadata: Metadata = { title: 'Solicitações de Orçamento — CaçambaFlow' };

export default async function SolicitacoesPage() {
  let leads;
  try {
    leads = await getLeads();
  } catch {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Acesso restrito</h1>
        <p className="text-muted text-sm">
          As solicitações de orçamento são dados do negócio CaçambaFlow e só estão disponíveis para super administradores.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Solicitações de Orçamento</h1>
        <p className="text-muted text-sm">{leads.length} solicitação(ões) recebida(s) pelo site</p>
      </div>

      <DataTable
        id="table-solicitacoes"
        data={leads as unknown as Record<string, unknown>[]}
        emptyMessage="Nenhuma solicitação recebida ainda."
        columns={[
          { key: 'company_name', label: 'Empresa' },
          { key: 'cnpj', label: 'CNPJ' },
          { key: 'responsible_name', label: 'Responsável' },
          {
            key: 'contact_phone',
            label: 'Contato',
            render: (_val, row) => (
              <div>
                <div style={{ fontWeight: 500 }}>{row.contact_phone as string}</div>
                <div className="text-muted text-xs">{row.contact_email as string}</div>
              </div>
            ),
          },
          { key: 'city', label: 'Cidade/UF', render: (_val, row) => `${row.city}/${row.state}` },
          {
            key: 'office_users_count',
            label: 'Usuários',
            render: (_val, row) => `${row.office_users_count} escritório · ${row.driver_users_count} mot.`,
          },
          {
            key: 'needs_tracking',
            label: 'Rastreamento',
            render: (val) => (
              <span className={`badge ${val === 'SIM' ? 'badge--concluido' : 'badge--cancelado'}`}>
                {val === 'SIM' ? 'Sim' : 'Não'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status do Orçamento',
            render: (val, row) => (
              <LeadStatusSelect
                leadId={row.id as string}
                currentStatus={(val as LeadStatus) || 'NOVO'}
              />
            ),
          },
          {
            key: 'created_at',
            label: 'Recebido em',
            render: (val) => (val ? new Date(val as string).toLocaleString('pt-BR') : '—'),
          },
        ]}
        actions={(row) => (
          <LeadActions
            leadId={row.id as string}
            companyName={(row.company_name as string) || 'Empresa'}
          />
        )}
      />
    </div>
  );
}

