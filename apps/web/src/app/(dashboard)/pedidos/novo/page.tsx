import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderForm } from '@/components/orders/order-form';

export const metadata: Metadata = { title: 'Novo Pedido — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

// TODO: Migrar para Firestore
async function getFormData() {
  const { tenantId } = await requireUserAndTenant();
  
  const [customersSnap, addressesSnap, assetTypesSnap] = await Promise.all([
    adminDb.collection('customers').where('tenant_id', '==', tenantId).get(),
    adminDb.collection('addresses').where('tenant_id', '==', tenantId).get(),
    adminDb.collection('asset_types').where('tenant_id', '==', tenantId).get()
  ]);

  return {
    customers: customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    addresses: addressesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    assetTypes: assetTypesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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
