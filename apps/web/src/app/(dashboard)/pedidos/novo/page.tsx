import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderForm } from '@/components/orders/order-form';

export const metadata: Metadata = { title: 'Novo Pedido — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

// Endereços são subcoleção de customers (customers/{id}/addresses), por isso
// buscamos todos os clientes do tenant e agregamos os endereços de cada um.
async function getFormData() {
  const { tenantId } = await requireUserAndTenant();

  const customersSnap = await adminDb.collection('customers').where('tenant_id', '==', tenantId).get();

  const customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const addressesByCustomer = await Promise.all(
    customersSnap.docs.map(async (custDoc) => {
      const addrSnap = await custDoc.ref.collection('addresses').where('status', '==', 'ATIVO').get();
      return addrSnap.docs.map(a => ({ id: a.id, customer_id: custDoc.id, ...a.data() }));
    })
  );

  return {
    customers: serializeFirestoreData(customers),
    addresses: serializeFirestoreData(addressesByCustomer.flat()),
  };
}

export default async function NovoPedidoPage() {
  const { customers, addresses } = await getFormData();

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
        />
      </div>
    </div>
  );
}
