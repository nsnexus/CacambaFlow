'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { JobType } from '@cacambaflow/types';

// Zod schema genérico para um item de pedido (atendimento/job)
const jobSchema = z.object({
  job_type: z.enum(['ENTREGA', 'COLETA', 'TROCA', 'TAREFA']),
  scheduled_date: z.string().min(10), // YYYY-MM-DD
  expected_asset_type_id: z.string().uuid().optional().or(z.literal('')),
  priority: z.coerce.number().default(1),
  window_start: z.string().optional(),
  window_end: z.string().optional(),
});

// Zod schema para o pedido principal
const orderSchema = z.object({
  customer_id: z.string().uuid('Selecione um cliente'),
  address_id: z.string().uuid('Selecione um endereço'),
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
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, requested_at, scheduled_date, price,
      customers ( name ),
      addresses ( street, number, district, city ),
      jobs ( id, job_number, job_type, status )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Obter detalhes do pedido ---
export async function getOrderById(orderId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, requested_at, scheduled_date, price, payment_method, notes,
      customers ( id, name, document, phone ),
      addresses ( id, name, street, number, district, city, state, access_notes ),
      jobs ( 
        id, job_number, job_type, status, scheduled_date, 
        asset_types ( name ), 
        drivers ( profiles ( name ) ),
        vehicles ( plate )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// --- Criar pedido (com jobs vinculados em transação RPC, se existisse, mas faremos via promise.all ou RPC simple insert) ---
// Como é MVP, faremos inserts sequenciais. (Nota: Para produção, é recomendado usar uma Edge Function ou Stored Procedure para atomicidade total).
export async function createOrder(
  prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const supabase = createServerClient();

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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) return { message: 'Perfil não encontrado.' };

  const orderNumber = generateOrderNumber();

  // 1. Inserir Order
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    tenant_id: profile.tenant_id,
    customer_id: parsed.data.customer_id,
    address_id: parsed.data.address_id,
    order_number: orderNumber,
    scheduled_date: parsed.data.jobs[0].scheduled_date, // Puxa do 1º job
    price: parsed.data.price || null,
    payment_method: parsed.data.payment_method || null,
    notes: parsed.data.notes || null,
    created_by: profile.id,
  }).select('id').single();

  if (orderError) return { message: `Erro ao criar pedido: ${orderError.message}` };

  // 2. Inserir Jobs (Atendimentos)
  const jobsToInsert = parsed.data.jobs.map((job, index) => ({
    tenant_id: profile.tenant_id,
    order_id: order.id,
    job_number: generateJobNumber(orderNumber, index + 1),
    job_type: job.job_type,
    status: 'PENDENTE',
    scheduled_date: job.scheduled_date,
    expected_asset_type_id: job.expected_asset_type_id || null,
    priority: job.priority,
    sequence_number: index + 1,
  }));

  const { error: jobsError } = await supabase.from('jobs').insert(jobsToInsert);

  if (jobsError) {
    // Tentativa simples de rollback compensatório
    await supabase.from('orders').delete().eq('id', order.id);
    return { message: `Erro ao criar atendimentos: ${jobsError.message}` };
  }

  revalidatePath('/pedidos');
  revalidatePath('/atendimentos');
  redirect(`/pedidos/${order.id}`);
}
