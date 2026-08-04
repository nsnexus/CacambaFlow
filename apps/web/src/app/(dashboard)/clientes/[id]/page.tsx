import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerWithAddresses } from '@/app/actions/customers';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

export const metadata: Metadata = { title: 'Cliente — CaçambaFlow' };

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  let customer;
  try {
    customer = await getCustomerWithAddresses(params.id);
  } catch {
    notFound();
  }

  const addresses = (customer?.addresses ?? []) as Record<string, unknown>[];

  return (
    <div>
      <Link href="/clientes" className="text-muted text-sm" style={{ display: 'inline-flex', gap: '4px', marginBottom: 'var(--space-4)' }}>
        ← Voltar
      </Link>

      {/* Card do cliente */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{customer?.name}</h1>
            <p className="text-muted text-sm">{customer?.person_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} · {customer?.document ?? 'Sem documento'}</p>
          </div>
          <StatusBadge status={customer?.status ?? 'ATIVO'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {customer?.phone && (
            <div><p className="label">Telefone</p><p>{customer.phone}</p></div>
          )}
          {customer?.whatsapp && (
            <div><p className="label">WhatsApp</p><p>{customer.whatsapp}</p></div>
          )}
          {customer?.email && (
            <div><p className="label">E-mail</p><p>{customer.email}</p></div>
          )}
        </div>
      </div>

      {/* Endereços/Obras */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Obras / Endereços</h2>
        <Link
          id="btn-novo-endereco"
          href={`/clientes/${params.id}/novo-endereco`}
          className="btn btn--primary btn--sm"
        >
          + Nova Obra
        </Link>
      </div>

      <DataTable
        id="table-enderecos"
        data={addresses}
        emptyMessage="Nenhum endereço cadastrado para este cliente."
        columns={[
          { key: 'name', label: 'Nome da Obra' },
          {
            key: 'street',
            label: 'Endereço',
            render: (val, row) => `${val}, ${row.number ?? 'S/N'} — ${row.city}/${row.state}`,
          },
          { key: 'access_notes', label: 'Restrições' },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={val as string} />,
          },
        ]}
      />
    </div>
  );
}
