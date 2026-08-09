import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetTypeForm } from '@/components/assets/asset-type-form';

export const metadata: Metadata = { title: 'Novo Tipo de Caçamba — CaçambaFlow' };

export default function NovoTipoCacambaPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/configuracoes/tipos-cacamba" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Tipos de Caçamba
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Tipo de Caçamba</h1>
      </div>

      <div className="card">
        <AssetTypeForm />
      </div>
    </div>
  );
}
