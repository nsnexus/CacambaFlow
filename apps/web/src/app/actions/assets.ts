'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const assetSchema = z.object({
  identifier: z.string().min(1, 'Número/identificação obrigatório'),
  asset_type_id: z.string().min(1, 'Tipo obrigatório'),
  color: z.string().optional(),
});

export type AssetFormState = {
  errors?: Partial<Record<keyof z.infer<typeof assetSchema>, string[]>>;
  message?: string;
  success?: boolean;
};

export async function getAssets() {
  const { tenantId } = await requireUserAndTenant();

  const snapshot = await adminDb.collection('assets')
    .where('tenant_id', '==', tenantId)
    .get();

  const data = await Promise.all(snapshot.docs.map(async doc => {
    const assetData = doc.data() as any;

    let asset_types = null;
    if (assetData.asset_type_id) {
      const typeDoc = await adminDb.collection('asset_types').doc(assetData.asset_type_id).get();
      if (typeDoc.exists) asset_types = typeDoc.data();
    }

    let addresses = null;
    if (assetData.customer_id && assetData.address_id) {
      const addrDoc = await adminDb.collection('customers').doc(assetData.customer_id).collection('addresses').doc(assetData.address_id).get();
      if (addrDoc.exists) addresses = addrDoc.data();
    }

    return { id: doc.id, ...assetData, asset_types, addresses };
  }));

  return data.sort((a: any, b: any) => {
    const timeA = a.created_at?._seconds || 0;
    const timeB = b.created_at?._seconds || 0;
    return timeB - timeA;
  });
}

export async function getAssetById(assetId: string) {
  const { tenantId } = await requireUserAndTenant();

  const doc = await adminDb.collection('assets').doc(assetId).get();
  if (!doc.exists) throw new Error('Caçamba não encontrada');

  const data = doc.data() as any;
  if (data.tenant_id !== tenantId) throw new Error('Sem permissão');

  let asset_types = null;
  if (data.asset_type_id) {
    const typeDoc = await adminDb.collection('asset_types').doc(data.asset_type_id).get();
    if (typeDoc.exists) asset_types = typeDoc.data();
  }

  let addresses = null;
  if (data.customer_id && data.address_id) {
    const addrDoc = await adminDb.collection('customers').doc(data.customer_id).collection('addresses').doc(data.address_id).get();
    if (addrDoc.exists) addresses = addrDoc.data();
  }

  return { id: doc.id, ...data, asset_types, addresses };
}

export async function getAssetTypes() {
  const { tenantId } = await requireUserAndTenant();
  const snapshot = await adminDb.collection('asset_types').where('tenant_id', '==', tenantId).get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return data.sort((a: any, b: any) => (a.volume_m3 || 0) - (b.volume_m3 || 0));
}

const assetTypeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  volume_m3: z.coerce.number().positive('Volume deve ser maior que zero'),
});

export type AssetTypeFormState = {
  errors?: Partial<Record<keyof z.infer<typeof assetTypeSchema>, string[]>>;
  message?: string;
};

export async function createAssetType(
  prevState: AssetTypeFormState,
  formData: FormData
): Promise<AssetTypeFormState> {
  const parsed = assetTypeSchema.safeParse({
    name: formData.get('name') as string,
    volume_m3: formData.get('volume_m3') as string,
  });
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
    await adminDb.collection('asset_types').doc().set({
      tenant_id: sessionData.tenantId,
      ...parsed.data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar tipo de caçamba: ${error.message}` };
  }

  revalidatePath('/configuracoes/tipos-cacamba');
  revalidatePath('/cacambas/nova');
  redirect('/configuracoes/tipos-cacamba');
}

export async function createAsset(
  prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const rawData = {
    identifier: formData.get('identifier') as string,
    asset_type_id: formData.get('asset_type_id') as string,
    color: formData.get('color') as string,
  };

  const parsed = assetSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  const existingSnap = await adminDb.collection('assets')
    .where('tenant_id', '==', sessionData.tenantId)
    .where('identifier', '==', parsed.data.identifier)
    .get();

  if (!existingSnap.empty) {
    return { message: 'Já existe uma caçamba com este número.' };
  }

  try {
    const docRef = adminDb.collection('assets').doc();
    await docRef.set({
      tenant_id: sessionData.tenantId,
      identifier: parsed.data.identifier,
      asset_type_id: parsed.data.asset_type_id,
      color: parsed.data.color || null,
      customer_id: null,
      address_id: null,
      status: 'DISPONIVEL',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar caçamba: ${error.message}` };
  }

  revalidatePath('/cacambas');
  redirect('/cacambas');
}

export async function updateAssetStatus(assetId: string, status: 'DISPONIVEL' | 'LOCADA' | 'MANUTENCAO' | 'PERDIDA') {
  await requireUserAndTenant();

  await adminDb.collection('assets').doc(assetId).update({ status });

  revalidatePath('/cacambas');
  revalidatePath(`/cacambas/${assetId}`);
}

// --- Entrega / coleta (para saber quais caçambas estão em campo e onde) ---

export async function getCustomersWithAddresses() {
  const { tenantId } = await requireUserAndTenant();

  const customersSnap = await adminDb.collection('customers')
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'ATIVO')
    .get();

  const customers = await Promise.all(customersSnap.docs.map(async (custDoc) => {
    const addrSnap = await custDoc.ref.collection('addresses').where('status', '==', 'ATIVO').get();
    return {
      id: custDoc.id,
      name: custDoc.data().name,
      addresses: addrSnap.docs.map(a => ({ id: a.id, ...a.data() })),
    };
  }));

  return customers;
}

const deliverAssetSchema = z.object({
  customer_id: z.string().min(1, 'Cliente obrigatório'),
  address_id: z.string().min(1, 'Obra obrigatória'),
  delivered_at: z.string().min(1, 'Data de entrega obrigatória'),
  expected_return_date: z.string().optional(),
});

export type DeliverAssetFormState = {
  errors?: Partial<Record<keyof z.infer<typeof deliverAssetSchema>, string[]>>;
  message?: string;
};

export async function deliverAsset(
  assetId: string,
  prevState: DeliverAssetFormState,
  formData: FormData
): Promise<DeliverAssetFormState> {
  const parsed = deliverAssetSchema.safeParse({
    customer_id: formData.get('customer_id') as string,
    address_id: formData.get('address_id') as string,
    delivered_at: formData.get('delivered_at') as string,
    expected_return_date: formData.get('expected_return_date') as string,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  try {
    await adminDb.collection('assets').doc(assetId).update({
      status: 'LOCADA',
      customer_id: parsed.data.customer_id,
      address_id: parsed.data.address_id,
      delivered_at: parsed.data.delivered_at,
      expected_return_date: parsed.data.expected_return_date || null,
    });
  } catch (error: any) {
    return { message: `Erro ao registrar entrega: ${error.message}` };
  }

  revalidatePath('/cacambas');
  revalidatePath(`/cacambas/${assetId}`);
  revalidatePath('/cacambas/mapa');
  redirect(`/cacambas/${assetId}`);
}

export async function returnAsset(assetId: string) {
  await requireUserAndTenant();

  await adminDb.collection('assets').doc(assetId).update({
    status: 'DISPONIVEL',
    customer_id: null,
    address_id: null,
    delivered_at: null,
    expected_return_date: null,
  });

  revalidatePath('/cacambas');
  revalidatePath(`/cacambas/${assetId}`);
  revalidatePath('/cacambas/mapa');
}

// Todas as caçambas atualmente entregues (LOCADA), com endereço e cliente
// resolvidos — usado na tela de mapa de caçambas.
export async function getDeliveredAssets() {
  const { tenantId } = await requireUserAndTenant();

  const snapshot = await adminDb.collection('assets')
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'LOCADA')
    .get();

  const data = await Promise.all(snapshot.docs.map(async doc => {
    const assetData = doc.data() as any;

    let asset_types = null;
    if (assetData.asset_type_id) {
      const typeDoc = await adminDb.collection('asset_types').doc(assetData.asset_type_id).get();
      if (typeDoc.exists) asset_types = typeDoc.data();
    }

    let customer = null;
    let address = null;
    if (assetData.customer_id) {
      const custDoc = await adminDb.collection('customers').doc(assetData.customer_id).get();
      if (custDoc.exists) customer = custDoc.data();

      if (assetData.address_id) {
        const addrDoc = await adminDb.collection('customers').doc(assetData.customer_id).collection('addresses').doc(assetData.address_id).get();
        if (addrDoc.exists) address = { id: addrDoc.id, ...addrDoc.data() };
      }
    }

    return { id: doc.id, ...assetData, asset_types, customer, address };
  }));

  return data;
}
