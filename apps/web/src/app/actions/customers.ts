'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

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
  customer_id: z.string(),
  name: z.string().min(1, 'Nome da obra obrigatório'),
  postal_code: z.string().optional(),
  street: z.string().min(1, 'Logradouro obrigatório'),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  latitude: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().optional()),
  longitude: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().optional()),
  access_notes: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
});

export type CustomerFormState = {
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export async function getCustomers() {
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('customers')
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'ATIVO')
    .get();

  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
}

export async function getCustomerWithAddresses(customerId: string) {
  const { tenantId } = await requireUserAndTenant();

  const doc = await adminDb.collection('customers').doc(customerId).get();
  if (!doc.exists) throw new Error('Cliente não encontrado');
  
  const customerData = doc.data() as any;
  if (customerData.tenant_id !== tenantId) throw new Error('Sem permissão');

  const addressesSnap = await adminDb.collection('customers').doc(customerId).collection('addresses')
    .where('status', '==', 'ATIVO')
    .get();

  return {
    id: doc.id,
    ...customerData,
    addresses: addressesSnap.docs.map(a => ({ id: a.id, ...a.data() }))
  };
}

export async function getAddressById(customerId: string, addressId: string) {
  const { tenantId } = await requireUserAndTenant();

  const custDoc = await adminDb.collection('customers').doc(customerId).get();
  if (!custDoc.exists || custDoc.data()?.tenant_id !== tenantId) throw new Error('Cliente não encontrado ou sem permissão.');

  const addrDoc = await adminDb.collection('customers').doc(customerId).collection('addresses').doc(addressId).get();
  if (!addrDoc.exists) throw new Error('Endereço não encontrado.');

  return {
    id: addrDoc.id,
    customer_name: custDoc.data()?.name ?? '',
    ...addrDoc.data(),
  };
}

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    person_type: formData.get('person_type') as 'PF' | 'PJ',
    name: formData.get('name') as string,
    document: formData.get('document') as string,
    phone: formData.get('phone') as string,
    whatsapp: formData.get('whatsapp') as string,
    email: formData.get('email') as string,
    notes: formData.get('notes') as string,
  });
}

export async function createCustomer(
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  try {
    const docRef = adminDb.collection('customers').doc();
    await docRef.set({
      tenant_id: sessionData.tenantId,
      ...parsed.data,
      email: parsed.data.email || null,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar cliente: ${error.message}` };
  }

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function updateCustomer(
  customerId: string,
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { tenantId } = await requireUserAndTenant();

  const ref = adminDb.collection('customers').doc(customerId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.tenant_id !== tenantId) {
    return { message: 'Cliente não encontrado ou sem permissão.' };
  }

  try {
    await ref.update({ ...parsed.data, email: parsed.data.email || null });
  } catch (error: any) {
    return { message: `Erro ao atualizar cliente: ${error.message}` };
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${customerId}`);
  redirect(`/clientes/${customerId}`);
}

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
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
  });
}

export async function createAddress(
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  try {
    const customerId = parsed.data.customer_id;
    const { customer_id, ...addressData } = parsed.data;

    const docRef = adminDb.collection('customers').doc(customerId).collection('addresses').doc();
    await docRef.set({
      tenant_id: sessionData.tenantId,
      ...addressData,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar endereço: ${error.message}` };
  }

  revalidatePath(`/clientes/${parsed.data.customer_id}`);
  redirect(`/clientes/${parsed.data.customer_id}`);
}

// Edita um endereço (obra) já cadastrado — é o jeito de corrigir endereço
// errado num pedido já finalizado (a caçamba não aparece no mapa sem
// coordenada, e o pedido não deixa escolher endereço de novo, então
// consertar o próprio endereço é o caminho).
export async function updateAddress(
  customerId: string,
  addressId: string,
  prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = parseAddressForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { tenantId } = await requireUserAndTenant();

  const custSnap = await adminDb.collection('customers').doc(customerId).get();
  if (!custSnap.exists || custSnap.data()?.tenant_id !== tenantId) {
    return { message: 'Cliente não encontrado ou sem permissão.' };
  }

  const addrRef = adminDb.collection('customers').doc(customerId).collection('addresses').doc(addressId);
  const addrSnap = await addrRef.get();
  if (!addrSnap.exists) {
    return { message: 'Endereço não encontrado.' };
  }

  try {
    const { customer_id, ...addressData } = parsed.data;
    await addrRef.update({ ...addressData });
  } catch (error: any) {
    return { message: `Erro ao atualizar endereço: ${error.message}` };
  }

  revalidatePath(`/clientes/${customerId}`);
  revalidatePath('/cacambas/mapa');
  revalidatePath('/pedidos');
  redirect(`/clientes/${customerId}`);
}

// Apaga o cliente e os endereços (obras) dele — irreversível. Pedidos/caçambas
// antigos que já referenciam esse cliente ficam com o vínculo órfão, só pra
// histórico.
export async function deleteCustomer(customerId: string): Promise<{ message?: string }> {
  const { tenantId } = await requireUserAndTenant();

  const ref = adminDb.collection('customers').doc(customerId);
  const snap = await ref.get();
  if (!snap.exists) return { message: 'Cliente não encontrado.' };
  if (snap.data()?.tenant_id !== tenantId) return { message: 'Sem permissão pra excluir esse cliente.' };

  const addressesSnap = await ref.collection('addresses').get();
  const batch = adminDb.batch();
  addressesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();

  revalidatePath('/clientes');
  return {};
}
