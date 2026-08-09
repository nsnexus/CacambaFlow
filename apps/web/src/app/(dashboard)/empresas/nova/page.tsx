import type { Metadata } from 'next';
import Link from 'next/link';
import { TenantForm } from '@/components/tenants/tenant-form';

export const metadata: Metadata = { title: 'Nova Empresa — CaçambaFlow' };

export default function NovaEmpresaPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/empresas" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Empresas
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nova Empresa</h1>
        <p className="text-muted text-sm">Cria a empresa e o primeiro usuário administrador dela.</p>
      </div>

      <div className="card">
        <TenantForm />
      </div>
    </div>
  );
}
