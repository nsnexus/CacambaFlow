'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// Zod schema genérico para um item de pedido (atendimento/job)
const jobSchema = z.object({
  job_type: z.enum(['ENTREGA', 'COLETA', 'TROCA', 'TAREFA']),
  scheduled_date: z.string().min(10), // YYYY-MM-DD
  expected_asset_type_id: z.string().optional().or(z.literal('')),
  priority: z.coerce.number().default(1),
  window_start: z.string().optional(),
  window_end: z.string().optional(),
});

// Zod schema para o pedido principal
const orderSchema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  address_id: z.string().min(1, 'Selecione um endereço'),
  price: z.coerce.number().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  jobs: z.array(jobSchema).min(1, 'O pedido deve ter pelo menos um atendimento'),
});

export type OrderFormState = {
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

// --- Gerar um número amigável e único ---
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PD-${year}${month}-${random}`;
}

function generateJobNumber(orderNumber: string, seq: number) {
  return `${orderNumber}/${seq}`;
}

// --- Obter lista de pedidos ---
export async function getOrders() {
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('orders')
    .where('tenant_id', '==', tenantId)
    .get();

  const orders = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Fetch customer details
    let customerData = {};
    if (data.customer_id) {
      const custDoc = await adminDb.collection('customers').doc(data.customer_id).get();
      if (custDoc.exists) customerData = custDoc.data() || {};
    }

    // Fetch address details
    let addressData = {};
    if (data.customer_id && data.address_id) {
      const addrDoc = await adminDb.collection('customers').doc(data.customer_id).collection('addresses').doc(data.address_id).get();
      if (addrDoc.exists) addressData = addrDoc.data() || {};
    }

    // Fetch jobs
    const jobsSnap = await adminDb.collection('orders').doc(doc.id).collection('jobs').get();
    const jobs = jobsSnap.docs.map(j => ({ id: j.id, ...j.data() }));

    orders.push({
      id: doc.id,
      ...data,
      customers: customerData,
      addresses: addressData,
      jobs
    });
  }

  return orders.sort((a: any, b: any) => {
    const timeA = a.created_at?._seconds || 0;
    const timeB = b.created_at?._seconds || 0;
    return timeB - timeA;
  });
}

// --- Obter detalhes do pedido ---
export async function getOrderById(orderId: string) {
  const { tenantId } = await requireUserAndTenant();
  
  const doc = await adminDb.collection('orders').doc(orderId).get();
  if (!doc.exists) throw new Error('Pedido não encontrado');
  const data = doc.data() as any;

  if (data.tenant_id !== tenantId) throw new Error('Sem permissão');

  // Fetch customer
  let customerData: any = { id: data.customer_id };
  if (data.customer_id) {
    const custDoc = await adminDb.collection('customers').doc(data.customer_id).get();
    if (custDoc.exists) customerData = { id: custDoc.id, ...custDoc.data() };
  }

  // Fetch address
  let addressData: any = { id: data.address_id };
  if (data.customer_id && data.address_id) {
    const addrDoc = await adminDb.collection('customers').doc(data.customer_id).collection('addresses').doc(data.address_id).get();
    if (addrDoc.exists) addressData = { id: addrDoc.id, ...addrDoc.data() };
  }

  // Fetch jobs and their nested relations
  const jobsSnap = await adminDb.collection('orders').doc(doc.id).collection('jobs').orderBy('sequence_number', 'asc').get();
  const jobs = await Promise.all(jobsSnap.docs.map(async j => {
    const jData = j.data();
    let drivers = {};
    let vehicles = {};
    let asset_types = {};
    
    // Simplification for MVP: Normally you'd fetch these from their collections if ID exists
    
    return {
      id: j.id,
      ...jData,
      drivers,
      vehicles,
      asset_types
    };
  }));

  return {
    id: doc.id,
    ...data,
    customers: customerData,
    addresses: addressData,
    jobs
  };
}

export async function createOrder(
  prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  // Parsing manual do formData complexo (array de jobs)
  const jobsData = [];
  let i = 0;
  while (formData.has(`jobs[${i}][job_type]`)) {
    jobsData.push({
      job_type: formData.get(`jobs[${i}][job_type]`),
      scheduled_date: formData.get(`jobs[${i}][scheduled_date]`),
      expected_asset_type_id: formData.get(`jobs[${i}][expected_asset_type_id]`),
      priority: formData.get(`jobs[${i}][priority]`),
    });
    i++;
  }

  const rawData = {
    customer_id: formData.get('customer_id') as string,
    address_id: formData.get('address_id') as string,
    price: formData.get('price'),
    payment_method: formData.get('payment_method') as string,
    notes: formData.get('notes') as string,
    jobs: jobsData,
  };

  const parsed = orderSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    return { errors: parsed.error.flatten().fieldErrors, message: 'Verifique os erros no formulário.' };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  const orderNumber = generateOrderNumber();

  try {
    // Usar Batch do Firestore para atomicidade (Transação simples)
    const batch = adminDb.batch();
    
    const orderRef = adminDb.collection('orders').doc();
    batch.set(orderRef, {
      tenant_id: sessionData.tenantId,
      customer_id: parsed.data.customer_id,
      address_id: parsed.data.address_id,
      order_number: orderNumber,
      scheduled_date: parsed.data.jobs[0]?.scheduled_date || null,
      price: parsed.data.price || null,
      payment_method: parsed.data.payment_method || null,
      notes: parsed.data.notes || null,
      created_by: sessionData.profileId,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    parsed.data.jobs.forEach((job, index) => {
      const jobRef = orderRef.collection('jobs').doc();
      batch.set(jobRef, {
        tenant_id: sessionData.tenantId,
        order_id: orderRef.id,
        job_number: generateJobNumber(orderNumber, index + 1),
        job_type: job.job_type,
        status: 'PENDENTE',
        scheduled_date: job.scheduled_date,
        expected_asset_type_id: job.expected_asset_type_id || null,
        priority: job.priority,
        sequence_number: index + 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    
    revalidatePath('/pedidos');
    revalidatePath('/atendimentos');
    redirect(`/pedidos/${orderRef.id}`);
  } catch (error: any) {
    return { message: `Erro ao criar pedido: ${error.message}` };
  }
}
