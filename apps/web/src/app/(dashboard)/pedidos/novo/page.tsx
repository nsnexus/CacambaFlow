import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { OrderForm } from '@/components/orders/order-form';

export const metadata: Metadata = { title: 'Novo Pedido — CaçambaFlow' };

// Carregamentos simples para popular os dropdowns
async function getFormData() {
  const supabase = createServerClient();
  const [customers, addresses, assetTypes] = await Promise.all([
    supabase.from('customers').select('id, name, document').eq('status', 'ATIVO').order('name'),
    supabase.from('addresses').select('id, customer_id, name, street, number, city').eq('status', 'ATIVO'),
    supabase.from('asset_types').select('id, name, volume_m3').eq('active', true)
  ]);
  return {
    customers: customers.data ?? [],
    addresses: addresses.data ?? [],
    assetTypes: assetTypes.data ?? []
  };
}

export default async function NovoPedidoPage() {
  const { customers, addresses, assetTypes } = await getFormData();

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/pedidos" className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-2)' }}>
          ← Voltar para Pedidos
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Novo Pedido</h1>
        <p className="text-muted text-sm">Crie um pedido e adicione as entregas ou coletas necessárias.</p>
      </div>

      <div className="card">
        <OrderForm 
          customers={customers as any} 
          addresses={addresses as any} 
          assetTypes={assetTypes as any} 
        />
      </div>
    </div>
  );
}
