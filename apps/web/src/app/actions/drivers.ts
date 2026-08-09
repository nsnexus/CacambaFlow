'use server';

import { adminAuth, adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// --- Schema de validação ---
const driverSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  license_number: z.string().min(1, 'CNH obrigatória'),
  license_category: z.string().min(1, 'Categoria obrigatória'),
  license_expires_at: z.string().min(1, 'Validade da CNH obrigatória'),
  tracking_enabled: z.boolean().default(true),
});

export type DriverFormState = {
  errors?: Partial<Record<keyof z.infer<typeof driverSchema>, string[]>>;
  message?: string;
  success?: boolean;
};

// --- Listar motoristas ---
export async function getDrivers() {
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('drivers')
    .where('tenant_id', '==', tenantId)
    .get();

  const drivers = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let profileData = {};
    if (data.profile_id) {
      const profileDoc = await adminDb.collection('profiles').doc(data.profile_id).get();
      if (profileDoc.exists) {
        profileData = profileDoc.data() || {};
      }
    }
    drivers.push({
      id: doc.id,
      ...data,
      profiles: profileData
    });
  }

  return drivers.sort((a: any, b: any) => {
    const timeA = a.created_at?._seconds || 0;
    const timeB = b.created_at?._seconds || 0;
    return timeB - timeA;
  });
}

// --- Criar motorista ---
export async function createDriver(
  prevState: DriverFormState,
  formData: FormData
): Promise<DriverFormState> {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    license_number: formData.get('license_number') as string,
    license_category: formData.get('license_category') as string,
    license_expires_at: formData.get('license_expires_at') as string,
    tracking_enabled: formData.get('tracking_enabled') === 'true',
  };

  const parsed = driverSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  // 1. Criar usuário no Firebase Auth
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  let authUser;
  try {
    authUser = await adminAuth.createUser({
      email: parsed.data.email,
      password: tempPassword,
      displayName: parsed.data.name,
    });
  } catch (error: any) {
    return { message: `Erro ao criar acesso: ${error.message}` };
  }

  // 2. Criar Profile
  try {
    await adminDb.collection('profiles').doc(authUser.uid).set({
      tenant_id: sessionData.tenantId,
      auth_user_id: authUser.uid,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: 'MOTORISTA',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar perfil: ${error.message}` };
  }

  // 3. Criar Driver
  try {
    const driverRef = adminDb.collection('drivers').doc();
    await driverRef.set({
      tenant_id: sessionData.tenantId,
      profile_id: authUser.uid,
      license_number: parsed.data.license_number,
      license_category: parsed.data.license_category,
      license_expires_at: parsed.data.license_expires_at,
      tracking_enabled: parsed.data.tracking_enabled,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar motorista: ${error.message}` };
  }

  revalidatePath('/motoristas');
  redirect('/motoristas');
}

// --- Buscar motorista por ID ---
export async function getDriverById(driverId: string) {
  const { tenantId } = await requireUserAndTenant();

  const doc = await adminDb.collection('drivers').doc(driverId).get();
  if (!doc.exists) throw new Error('Motorista não encontrado');

  const data = doc.data() as any;
  if (data.tenant_id !== tenantId) throw new Error('Sem permissão');

  let profileData = {};
  if (data.profile_id) {
    const profileDoc = await adminDb.collection('profiles').doc(data.profile_id).get();
    if (profileDoc.exists) profileData = profileDoc.data() || {};
  }

  const jobsSnap = await adminDb.collectionGroup('jobs')
    .where('tenant_id', '==', tenantId)
    .where('assigned_driver_id', '==', driverId)
    .orderBy('scheduled_date', 'desc')
    .limit(10)
    .get();

  const recentJobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    id: doc.id,
    ...data,
    profiles: profileData,
    recentJobs,
  };
}

// --- Atualizar status do motorista ---
export async function updateDriverStatus(driverId: string, status: 'ATIVO' | 'INATIVO') {
  await requireUserAndTenant();
  
  await adminDb.collection('drivers').doc(driverId).update({
    status
  });
  
  revalidatePath('/motoristas');
}
