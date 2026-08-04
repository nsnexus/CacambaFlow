'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

// --- Buscar faturas pendentes e pagas ---
export async function getInvoices() {
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('invoices')
    .where('tenant_id', '==', tenantId)
    .orderBy('due_date', 'desc')
    .get();

  const invoices = await Promise.all(snapshot.docs.map(async doc => {
    const data = doc.data();
    let customers = {};
    if (data.customer_id) {
      const custDoc = await adminDb.collection('customers').doc(data.customer_id).get();
      if (custDoc.exists) customers = custDoc.data() || {};
    }
    return { id: doc.id, ...data, customers };
  }));

  return invoices;
}

// --- Buscar pedidos concluídos que ainda não foram faturados ---
export async function getUnbilledOrders() {
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('orders')
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'CONCLUIDO')
    .get();

  const unbilled = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.price !== null && data.price !== undefined) {
      // Check if invoice exists for this order
      const invSnap = await adminDb.collection('invoices').where('order_id', '==', doc.id).get();
      if (invSnap.empty) {
        let customers = {};
        if (data.customer_id) {
          const custDoc = await adminDb.collection('customers').doc(data.customer_id).get();
          if (custDoc.exists) customers = { id: custDoc.id, ...custDoc.data() };
        }
        unbilled.push({ id: doc.id, ...data, customers, invoices: [] });
      }
    }
  }

  return unbilled;
}

// --- Gerar nova fatura ---
export async function createInvoice(orderId: string, customerId: string, amount: number, dueDate: string) {
  const { tenantId, profileId } = await requireUserAndTenant();

  const invoiceNumber = `FAT-${Date.now().toString().slice(-6)}`;

  await adminDb.collection('invoices').doc().set({
    tenant_id: tenantId,
    order_id: orderId,
    customer_id: customerId,
    invoice_number: invoiceNumber,
    amount,
    due_date: dueDate,
    status: 'PENDENTE',
    created_by: profileId,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  revalidatePath('/financeiro');
}

// --- Marcar como pago ---
export async function markInvoiceAsPaid(invoiceId: string) {
  await requireUserAndTenant();
  
  await adminDb.collection('invoices').doc(invoiceId).update({
    status: 'PAGO',
    paid_at: new Date().toISOString()
  });
  
  revalidatePath('/financeiro');
}
