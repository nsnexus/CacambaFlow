import type { Metadata } from 'next';
import Link from 'next/link';
import { VehicleForm } from '@/components/vehicles/vehicle-form';

export const metadata: Metadata = { title: 'Novo Veículo — CaçambaFlow' };

export default function NovoVeiculoPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/veiculos" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Veículos
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Veículo</h1>
      </div>
      <div className="card"><VehicleForm /></div>
    </div>
  );
}
