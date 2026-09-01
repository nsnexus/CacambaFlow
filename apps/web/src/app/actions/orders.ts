'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// Zod schema genérico para um item de pedido (atendimento/job). Esse
// formulário só cria entregas — o job_type fica sempre 'ENTREGA' — e o
// recolhimento (COLETA) é sempre gerado automaticamente a partir de
// expected_return_date (ver createOrder). Troca/Tarefa continuam existindo
// como job_type no modelo de dados, só não são criados por aqui.
const jobSchema = z.object({
  scheduled_date: z.string().min(10), // YYYY-MM-DD — data da entrega
  expected_return_date: z.string().min(10), // YYYY-MM-DD — data prevista do recolhimento automático
  expected_asset_id: z.string().min(1, 'Selecione a caçamba'),
  priority: z.coerce.number().default(1),
  window_start: z.string().optional(),
  window_end: z.string().optional(),
});

// Os campos de "pedido rápido" só existem no DOM quando esse modo está
// ligado no formulário — quando não estão, formData.get() devolve `null`
// (não `''`), então o schema precisa aceitar null/undefined também, senão a
// validação falha pro pedido normal (com cliente já cadastrado) também.
const optionalText = z.preprocess((v) => (v === null || v === undefined ? '' : v), z.string());
// Mesma ideia acima, mas pra número — string vazia/null/undefined vira
// undefined em vez de quebrar o coerce.number().
const optionalCoords = z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), z.coerce.number().optional());

// Zod schema para o pedido principal — aceita um cliente já cadastrado
// (customer_id + address_id) OU os dados de "pedido rápido" pra cliente
// avulso, que nunca passou pela tela de Clientes (ver refine abaixo).
const orderSchema = z.object({
  customer_id: optionalText,
  address_id: optionalText,
  quick_customer_name: optionalText,
  quick_customer_phone: optionalText,
  quick_address_street: optionalText,
  quick_address_number: optionalText,
  quick_address_district: optionalText,
  quick_address_city: optionalText,
  quick_address_state: optionalText,
  quick_address_access_notes: optionalText,
  quick_address_postal_code: optionalText,
  quick_address_latitude: optionalCoords,
  quick_address_longitude: optionalCoords,
  price: z.coerce.number().optional(),
  payment_method: z.string().optional(),
  // Cliente às vezes paga na entrega, às vezes só no recolhimento — por isso
  // isso é um status que se atualiza depois (ver updateOrderPaymentStatus),
  // não só uma opção fixa escolhida na criação do pedido.
  payment_status: z.enum(['PAGO', 'PENDENTE']).default('PENDENTE'),
  notes: z.string().optional(),
  jobs: z.array(jobSchema).min(1, 'O pedido deve ter pelo menos um atendimento'),
}).refine((data) => {
  const hasExisting = !!data.customer_id && !!data.address_id;
  const hasQuick = !!data.quick_customer_name && !!data.quick_address_street && !!data.quick_address_city && !!data.quick_address_state;
  return hasExisting || hasQuick;
}, {
  message: 'Selecione um cliente cadastrado ou preencha os dados do pedido rápido.',
  path: ['customer_id'],
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
  while (formData.has(`jobs[${i}][scheduled_date]`)) {
    jobsData.push({
      scheduled_date: formData.get(`jobs[${i}][scheduled_date]`),
      expected_return_date: formData.get(`jobs[${i}][expected_return_date]`),
      expected_asset_id: formData.get(`jobs[${i}][expected_asset_id]`),
      priority: formData.get(`jobs[${i}][priority]`),
    });
    i++;
  }

  const rawData = {
    customer_id: formData.get('customer_id') as string,
    address_id: formData.get('address_id') as string,
    quick_customer_name: formData.get('quick_customer_name') as string,
    quick_customer_phone: formData.get('quick_customer_phone') as string,
    quick_address_street: formData.get('quick_address_street') as string,
    quick_address_number: formData.get('quick_address_number') as string,
    quick_address_district: formData.get('quick_address_district') as string,
    quick_address_city: formData.get('quick_address_city') as string,
    quick_address_state: formData.get('quick_address_state') as string,
    quick_address_access_notes: formData.get('quick_address_access_notes') as string,
    quick_address_postal_code: formData.get('quick_address_postal_code') as string,
    quick_address_latitude: formData.get('quick_address_latitude'),
    quick_address_longitude: formData.get('quick_address_longitude'),
    price: formData.get('price'),
    payment_method: formData.get('payment_method') as string,
    payment_status: formData.get('payment_status') as string,
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

  let orderRef: FirebaseFirestore.DocumentReference;
  try {
    // Usar Batch do Firestore para atomicidade (Transação simples)
    const batch = adminDb.batch();

    // Pedido rápido: sem customer_id/address_id vindo do formulário — cria
    // um cadastro simples de cliente + obra por baixo dos panos, no mesmo
    // batch do pedido, pra cliente que só compra uma vez não precisar passar
    // pela tela de Clientes antes.
    let customerId = parsed.data.customer_id || '';
    let addressId = parsed.data.address_id || '';

    if (!customerId || !addressId) {
      const customerRef = adminDb.collection('customers').doc();
      batch.set(customerRef, {
        tenant_id: sessionData.tenantId,
        person_type: 'PF',
        name: parsed.data.quick_customer_name,
        document: null,
        phone: parsed.data.quick_customer_phone || null,
        whatsapp: null,
        email: null,
        notes: 'Cliente avulso — criado direto no pedido rápido.',
        origin: 'PEDIDO_RAPIDO',
        status: 'ATIVO',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      customerId = customerRef.id;

      const addressRef = customerRef.collection('addresses').doc();
      batch.set(addressRef, {
        tenant_id: sessionData.tenantId,
        name: 'Obra',
        postal_code: parsed.data.quick_address_postal_code || null,
        street: parsed.data.quick_address_street,
        number: parsed.data.quick_address_number || null,
        district: parsed.data.quick_address_district || null,
        city: parsed.data.quick_address_city,
        state: (parsed.data.quick_address_state || '').toUpperCase(),
        // Vem da busca de endereço (Google Geocoding) quando o admin escolhe
        // um resultado — sem isso, a caçamba não aparece certo no mapa e o
        // app do motorista precisa geocodificar aproximado no aparelho.
        latitude: parsed.data.quick_address_latitude ?? null,
        longitude: parsed.data.quick_address_longitude ?? null,
        access_notes: parsed.data.quick_address_access_notes || null,
        status: 'ATIVO',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      addressId = addressRef.id;
    }

    orderRef = adminDb.collection('orders').doc();
    batch.set(orderRef, {
      tenant_id: sessionData.tenantId,
      customer_id: customerId,
      address_id: addressId,
      order_number: orderNumber,
      scheduled_date: parsed.data.jobs[0]?.scheduled_date || null,
      price: parsed.data.price || null,
      payment_method: parsed.data.payment_method || null,
      payment_status: parsed.data.payment_status,
      notes: parsed.data.notes || null,
      created_by: sessionData.profileId,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Cada linha do formulário vira dois jobs: a entrega em si e o
    // recolhimento automático na data prevista (expected_return_date) — o
    // motorista nunca precisa que alguém crie a coleta manualmente depois.
    let sequence = 1;
    parsed.data.jobs.forEach((job) => {
      const deliveryRef = orderRef.collection('jobs').doc();
      batch.set(deliveryRef, {
        tenant_id: sessionData.tenantId,
        order_id: orderRef.id,
        job_number: generateJobNumber(orderNumber, sequence),
        job_type: 'ENTREGA',
        status: 'PENDENTE',
        scheduled_date: job.scheduled_date,
        // Guarda também na própria entrega (não só na coleta) — é o que o
        // app do motorista e a conclusão manual usam pra gravar a previsão
        // de coleta na caçamba quando a entrega é concluída.
        expected_return_date: job.expected_return_date,
        expected_asset_id: job.expected_asset_id,
        priority: job.priority,
        sequence_number: sequence,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      sequence++;

      const pickupRef = orderRef.collection('jobs').doc();
      batch.set(pickupRef, {
        tenant_id: sessionData.tenantId,
        order_id: orderRef.id,
        job_number: generateJobNumber(orderNumber, sequence),
        job_type: 'COLETA',
        status: 'PENDENTE',
        scheduled_date: job.expected_return_date,
        expected_asset_id: job.expected_asset_id,
        priority: job.priority,
        sequence_number: sequence,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      sequence++;
    });

    await batch.commit();
  } catch (error: any) {
    return { message: `Erro ao criar pedido: ${error.message}` };
  }

  revalidatePath('/pedidos');
  revalidatePath('/atendimentos');
  redirect(`/pedidos/${orderRef.id}`);
}

// Cliente às vezes paga na entrega, às vezes só no recolhimento — por isso
// isso precisa poder mudar depois de criado, não só ficar fixo desde a
// criação do pedido.
export async function updateOrderPaymentStatus(orderId: string, status: 'PAGO' | 'PENDENTE') {
  const { tenantId } = await requireUserAndTenant();

  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists || orderSnap.data()?.tenant_id !== tenantId) return;

  await orderRef.update({ payment_status: status });

  revalidatePath('/pedidos');
  revalidatePath(`/pedidos/${orderId}`);
}

// Apaga o pedido e todos os atendimentos (jobs) dele — irreversível. Não
// mexe em `evidences` (ficam órfãs, mas não atrapalham nada; servem de
// registro caso precise auditar depois).
export async function deleteOrder(orderId: string): Promise<{ message?: string }> {
  const { tenantId } = await requireUserAndTenant();

  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return { message: 'Pedido não encontrado.' };
  if (orderSnap.data()?.tenant_id !== tenantId) return { message: 'Sem permissão pra excluir esse pedido.' };

  const jobsSnap = await orderRef.collection('jobs').get();
  const batch = adminDb.batch();
  jobsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(orderRef);
  await batch.commit();

  revalidatePath('/pedidos');
  revalidatePath('/atendimentos');
  return {};
}
