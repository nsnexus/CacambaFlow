import type { Metadata } from 'next';
import Link from 'next/link';
import { DriverForm } from '@/components/drivers/driver-form';

export const metadata: Metadata = { title: 'Novo Motorista — CaçambaFlow' };

export default function NovoMotoristaPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/motoristas" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Motoristas
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Motorista</h1>
        <p className="text-muted text-sm">
          Um e-mail com a senha temporária será enviado ao motorista para primeiro acesso no app.
        </p>
      </div>

      <div className="card">
        <DriverForm />
      </div>
    </div>
  );
}
