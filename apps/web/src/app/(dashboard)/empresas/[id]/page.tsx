import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantById } from '@/app/actions/tenants';
import { StatusBadge } from '@/components/ui/status-badge';
import { TenantEditForm } from '@/components/tenants/tenant-edit-form';
import { TenantPaymentsTable } from '@/components/tenants/tenant-payments-table';
import { DataTable } from '@/components/ui/data-table';
import { Building2, Users, Truck, Box, FileText, DollarSign, Calendar } from 'lucide-react';

export const metadata: Metadata = { title: 'Detalhes da Empresa — CaçambaFlow' };

export default async function EmpresaDetailPage({ params }: { params: { id: string } }) {
  let tenant;
  try {
    tenant = await getTenantById(params.id);
  } catch (error) {
    notFound();
  }

  const { stats, profiles, payments } = tenant;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div>
      <Link
        href="/empresas"
        className="text-muted text-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: 'var(--space-4)',
        }}
      >
        ← Voltar para Empresas
      </Link>

      {/* Cabeçalho da Empresa */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{tenant.name}</h1>
              <p className="text-muted text-sm">
                CNPJ: {tenant.document ?? 'Não informado'} · Cadastrada em:{' '}
                {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          </div>
          <StatusBadge status={tenant.status} />
        </div>

        {/* Métricas rápidas de recursos e financeiro */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <DollarSign size={14} /> Mensalidade
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-primary)' }}>
              {formatCurrency(tenant.monthly_fee)}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <Calendar size={14} /> Vencimento
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              Dia {tenant.billing_due_day}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <Users size={14} /> Motoristas
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.driversCount}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <Truck size={14} /> Veículos
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.vehiclesCount}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <Box size={14} /> Caçambas
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.assetsCount}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <Users size={14} /> Clientes
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.customersCount}
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--color-surface-2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 text-muted text-xs">
              <FileText size={14} /> Pedidos
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '4px' }}>
              {stats.ordersCount}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Mensalidades & Pagamentos */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <TenantPaymentsTable
          tenantId={tenant.id}
          tenantName={tenant.name}
          defaultMonthlyFee={tenant.monthly_fee}
          defaultDueDay={tenant.billing_due_day}
          payments={payments as any[]}
        />
      </div>

      {/* Formulário de Edição */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <TenantEditForm tenant={tenant} />
      </div>

      {/* Administradores e Usuários da Empresa */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Usuários e Administradores Vinculados
        </h2>
        <DataTable
          id="table-tenant-profiles"
          data={profiles as Record<string, unknown>[]}
          emptyMessage="Nenhum usuário cadastrado para esta empresa."
          columns={[
            { key: 'name', label: 'Nome' },
            { key: 'email', label: 'E-mail' },
            { key: 'role', label: 'Função' },
            {
              key: 'status',
              label: 'Status',
              render: (val) => <StatusBadge status={(val as string) || 'ATIVO'} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

