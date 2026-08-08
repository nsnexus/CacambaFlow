import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomerForm } from '@/components/customers/customer-form';

export const metadata: Metadata = { title: 'Novo Cliente — CaçambaFlow' };

export default function NovoClientePage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/clientes" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Clientes
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Cliente</h1>
        <p className="text-muted text-sm">Cadastre um novo cliente para começar a registrar pedidos e obras.</p>
      </div>

      <div className="card">
        <CustomerForm />
      </div>
    </div>
  );
}
