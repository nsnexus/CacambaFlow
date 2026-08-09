import type { Metadata } from 'next';
import Link from 'next/link';
import { getAssetTypes } from '@/app/actions/assets';
import { DataTable } from '@/components/ui/data-table';
import { SettingsNav } from '@/components/layout/settings-nav';

export const metadata: Metadata = { title: 'Tipos de Caçamba — CaçambaFlow' };

export default async function TiposCacambaPage() {
  const assetTypes = await getAssetTypes();

  return (
    <div>
      <SettingsNav />
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tipos de Caçamba</h1>
          <p className="text-muted text-sm">Cadastre os tamanhos disponíveis (ex: 5m³, 10m³) para usar em pedidos e caçambas.</p>
        </div>
        <Link id="btn-novo-tipo-cacamba" href="/configuracoes/tipos-cacamba/novo" className="btn btn--primary">
          + Novo Tipo
        </Link>
      </div>

      <DataTable
        id="table-asset-types"
        data={assetTypes as Record<string, unknown>[]}
        emptyMessage="Nenhum tipo de caçamba cadastrado ainda."
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'volume_m3', label: 'Volume', render: (val) => `${val}m³` },
        ]}
      />
    </div>
  );
}
