'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const customerSchema = z.object({
  person_type: z.enum(['PF', 'PJ']),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  document: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
});

const addressSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().min(1, 'Nome da obra obrigatório'),
  postal_code: z.string().optional(),
  street: z.string().min(1, 'Logradouro obrigatório'),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  access_notes: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
});

export type CustomerFormState = {
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export async function getCustomers() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, person_type, name, document, phone, whatsapp, email, status, created_at')
    .eq('status', 'ATIVO')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomerWithAddresses(customerId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id, person_type, name, document, phone, whatsapp, email, notes, status,
      addresses ( id, name, street, number, city, state, postal_code, access_notes, status )
    `)
    .eq('id', customerId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createCustomer(
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const supabase = createServerClient();

  const rawData = {
    person_type: formData.get('person_type') as 'PF' | 'PJ',
    name: formData.get('name') as string,
    document: formData.get('document') as string,
    phone: formData.get('phone') as string,
    whatsapp: formData.get('whatsapp') as string,
    email: formData.get('email') as string,
    notes: formData.get('notes') as string,
  };

  const parsed = customerSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) return { message: 'Perfil não encontrado.' };

  const { error } = await supabase.from('customers').insert({
    tenant_id: profile.tenant_id,
    ...parsed.data,
    email: parsed.data.email || null,
  });

  if (error) return { message: `Erro ao criar cliente: ${error.message}` };

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function createAddress(
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const supabase = createServerClient();

  const rawData = {
    customer_id: formData.get('customer_id') as string,
    name: formData.get('name') as string,
    postal_code: formData.get('postal_code') as string,
    street: formData.get('street') as string,
    number: formData.get('number') as string,
    complement: formData.get('complement') as string,
    district: formData.get('district') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    latitude: formData.get('latitude') as string,
    longitude: formData.get('longitude') as string,
    access_notes: formData.get('access_notes') as string,
    contact_name: formData.get('contact_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  };

  const parsed = addressSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) return { message: 'Perfil não encontrado.' };

  const { error } = await supabase.from('addresses').insert({
    tenant_id: profile.tenant_id,
    ...parsed.data,
  });

  if (error) return { message: `Erro ao criar endereço: ${error.message}` };

  const customerId = parsed.data.customer_id;
  revalidatePath(`/clientes/${customerId}`);
  redirect(`/clientes/${customerId}`);
}
