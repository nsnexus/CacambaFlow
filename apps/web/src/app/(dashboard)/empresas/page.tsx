import type { Metadata } from 'next';
import Link from 'next/link';
import { getTenants } from '@/app/actions/tenants';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { TenantActions } from '@/components/tenants/tenant-actions';

export const metadata: Metadata = { title: 'Empresas — CaçambaFlow' };

export default async function EmpresasPage() {
  let tenants;
  try {
    tenants = await getTenants();
  } catch {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Acesso restrito</h1>
        <p className="text-muted text-sm">
          A gestão de empresas cruza dados de vários clientes e só está disponível para super administradores.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Empresas</h1>
          <p className="text-muted text-sm">{tenants.length} empresa(s) cadastrada(s)</p>
        </div>
        <Link id="btn-nova-empresa" href="/empresas/nova" className="btn btn--primary">
          + Nova Empresa
        </Link>
      </div>

      <DataTable
        id="table-empresas"
        data={tenants as unknown as Record<string, unknown>[]}
        emptyMessage="Nenhuma empresa cadastrada ainda."
        columns={[
          {
            key: 'name',
            label: 'Nome',
            render: (val, row) => (
              <div>
                <div style={{ fontWeight: 600 }}>{val as string}</div>
                <div className="text-muted text-xs">Fuso: {(row.timezone as string) || 'America/Sao_Paulo'}</div>
              </div>
            ),
          },
          { key: 'document', label: 'CNPJ', render: (val) => (val as string) || '—' },
          {
            key: 'monthly_fee',
            label: 'Mensalidade',
            render: (val, row) => {
              const fee = Number(val ?? 0);
              const day = (row.billing_due_day as number) || 10;
              if (!fee) return <span className="text-muted text-xs">Não definida</span>;
              return (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee)}
                  </div>
                  <div className="text-muted text-xs">Vence dia {day}</div>
                </div>
              );
            },
          },
          { key: 'driversCount', label: 'Motoristas' },
          { key: 'vehiclesCount', label: 'Veículos' },
          { key: 'customersCount', label: 'Clientes' },
          {
            key: 'status',
            label: 'Status',
            render: (val) => <StatusBadge status={(val as string) || 'ATIVO'} />,
          },
        ]}
        actions={(row) => (
          <TenantActions
            tenantId={row.id as string}
            tenantName={(row.name as string) || 'Empresa'}
            currentStatus={((row.status as string) || 'ATIVO') as 'ATIVO' | 'INATIVO' | 'SUSPENSO'}
          />
        )}
      />
    </div>
  );
}

