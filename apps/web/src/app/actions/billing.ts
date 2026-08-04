'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// --- Buscar faturas pendentes e pagas ---
export async function getInvoices() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, amount, due_date, status, paid_at,
      customers ( name, document )
    `)
    .order('due_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Buscar pedidos concluídos que ainda não foram faturados ---
export async function getUnbilledOrders() {
  const supabase = createServerClient();
  
  // Um pedido é faturável se estiver concluído e não tiver fatura gerada
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, price, scheduled_date,
      customers ( id, name, document ),
      invoices ( id )
    `)
    .eq('status', 'CONCLUIDO')
    .not('price', 'is', null);

  if (error) throw new Error(error.message);

  // Filtra apenas os que têm a array de invoices vazia
  return (data ?? []).filter((o: any) => o.invoices.length === 0);
}

// --- Gerar nova fatura ---
export async function createInvoice(orderId: string, customerId: string, amount: number, dueDate: string) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado');

  const invoiceNumber = `FAT-${Date.now().toString().slice(-6)}`;

  const { error } = await supabase
    .from('invoices')
    .insert({
      tenant_id: profile.tenant_id,
      order_id: orderId,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      amount,
      due_date: dueDate,
      created_by: profile.id,
    });

  if (error) throw new Error(error.message);
  
  revalidatePath('/financeiro');
}

// --- Marcar como pago ---
export async function markInvoiceAsPaid(invoiceId: string) {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'PAGO',
      paid_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) throw new Error(error.message);
  
  revalidatePath('/financeiro');
}
