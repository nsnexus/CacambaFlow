import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Pencil } from 'lucide-react';
import { getCustomers, deleteCustomer } from '@/app/actions/customers';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteEntityButton } from '@/components/ui/delete-entity-button';
import { IconLinkButton } from '@/components/ui/icon-link-button';

export const metadata: Metadata = { title: 'Clientes — CaçambaFlow' };

export default async function ClientesPage() {
  const customers = await getCustomers();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Clientes</h1>
          <p className="text-muted text-sm">{customers.length} cliente(s) ativo(s)</p>
        </div>
        <Link id="btn-novo-cliente" href="/clientes/novo" className="btn btn--primary">
          + Novo Cliente
        </Link>
      </div>

      <DataTable
        id="table-clientes"
        data={customers as Record<string, unknown>[]}
        emptyMessage="Nenhum cliente cadastrado ainda."
        columns={[
          {
            key: 'name',
            label: 'Nome',
            render: (val, row) => (
              <div>
                <div style={{ fontWeight: 500 }}>{val as string}</div>
                <div className="text-xs text-muted">{row.person_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
              </div>
            ),
          },
          { key: 'document', label: 'CPF / CNPJ' },
          { key: 'phone', label: 'Telefone' },
          { key: 'whatsapp', label: 'WhatsApp' },
          { key: 'email', label: 'E-mail' },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
        ]}
        actions={(row) => (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <IconLinkButton href={`/clientes/${row.id}`} icon={Eye} label="Ver obras" id={`btn-detail-customer-${row.id}`} />
            <IconLinkButton href={`/clientes/${row.id}/editar`} icon={Pencil} label="Editar" />
            <DeleteEntityButton
              id={row.id as string}
              confirmMessage={`Excluir o cliente ${row.name}? Isso apaga também os endereços (obras) dele. Essa ação não pode ser desfeita.`}
              action={deleteCustomer}
            />
          </div>
        )}
      />
    </div>
  );
}
