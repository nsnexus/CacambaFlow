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
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a senha'),
  phone: z.string().optional(),
  license_number: z.string().min(1, 'CNH obrigatória'),
  license_category: z.string().min(1, 'Categoria obrigatória'),
  license_expires_at: z.string().min(1, 'Validade da CNH obrigatória'),
  tracking_enabled: z.boolean().default(true),
}).refine((data) => data.password === data.confirm_password, {
  message: 'As senhas não conferem.',
  path: ['confirm_password'],
});

export type DriverFormState = {
  errors?: Partial<Record<'name' | 'email' | 'password' | 'confirm_password' | 'phone' | 'license_number' | 'license_category' | 'license_expires_at' | 'tracking_enabled', string[]>>;
  message?: string;
  success?: boolean;
};

// Editar não mexe em e-mail/login (isso é do Firebase Auth, tratado à
// parte) — só os dados próprios do motorista.
const driverEditSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().optional(),
  license_number: z.string().min(1, 'CNH obrigatória'),
  license_category: z.string().min(1, 'Categoria obrigatória'),
  license_expires_at: z.string().min(1, 'Validade da CNH obrigatória'),
  tracking_enabled: z.boolean().default(true),
});

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
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
    phone: formData.get('phone') as string,
    license_number: formData.get('license_number') as string,
    license_category: formData.get('license_category') as string,
    license_expires_at: formData.get('license_expires_at') as string,
    tracking_enabled: formData.get('tracking_enabled') === 'true',
  };

  const parsed = driverSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as DriverFormState['errors'] };
  }

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  // 1. Criar usuário no Firebase Auth já com a senha que o admin definiu —
  // ele mesmo entrega login e senha pro motorista (ex: por WhatsApp).
  let authUser;
  try {
    authUser = await adminAuth.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.name,
    });
  } catch (error: any) {
    return { message: `Erro ao criar acesso: ${error.message}` };
  }

  // Custom claim de tenant no token — as regras do Firestore leem daqui
  // (request.auth.token.tenant_id) em vez de fazer get() no profile, porque
  // get() cruzando coleção quebra consultas em lista/collectionGroup.
  await adminAuth.setCustomUserClaims(authUser.uid, { tenant_id: sessionData.tenantId });

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

export async function updateDriver(
  driverId: string,
  prevState: DriverFormState,
  formData: FormData
): Promise<DriverFormState> {
  const parsed = driverEditSchema.safeParse({
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    license_number: formData.get('license_number') as string,
    license_category: formData.get('license_category') as string,
    license_expires_at: formData.get('license_expires_at') as string,
    tracking_enabled: formData.get('tracking_enabled') === 'true',
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as any };
  }

  const { tenantId } = await requireUserAndTenant();

  const driverRef = adminDb.collection('drivers').doc(driverId);
  const driverSnap = await driverRef.get();
  if (!driverSnap.exists || driverSnap.data()?.tenant_id !== tenantId) {
    return { message: 'Motorista não encontrado ou sem permissão.' };
  }

  try {
    await driverRef.update({
      license_number: parsed.data.license_number,
      license_category: parsed.data.license_category,
      license_expires_at: parsed.data.license_expires_at,
      tracking_enabled: parsed.data.tracking_enabled,
    });

    const profileId = driverSnap.data()?.profile_id;
    if (profileId) {
      await adminDb.collection('profiles').doc(profileId).update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      });
    }
  } catch (error: any) {
    return { message: `Erro ao atualizar motorista: ${error.message}` };
  }

  revalidatePath('/motoristas');
  revalidatePath(`/motoristas/${driverId}`);
  redirect(`/motoristas/${driverId}`);
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

const passwordChangeSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a senha'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'As senhas não conferem.',
  path: ['confirm_password'],
});

export type PasswordChangeFormState = {
  errors?: Partial<Record<'password' | 'confirm_password', string[]>>;
  message?: string;
  success?: boolean;
};

// Admin troca a senha de acesso do motorista direto no painel — não precisa
// mais gerar link nenhum. Só mexe no Firebase Auth (login), nada em
// `drivers`/`profiles`.
export async function updateDriverPassword(
  driverId: string,
  prevState: PasswordChangeFormState,
  formData: FormData
): Promise<PasswordChangeFormState> {
  const parsed = passwordChangeSchema.safeParse({
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { tenantId, role } = await requireUserAndTenant();
  if (role === 'MOTORISTA') {
    return { message: 'Sem permissão pra alterar essa senha.' };
  }

  const driverSnap = await adminDb.collection('drivers').doc(driverId).get();
  if (!driverSnap.exists || driverSnap.data()?.tenant_id !== tenantId) {
    return { message: 'Motorista não encontrado ou sem permissão.' };
  }

  const profileId = driverSnap.data()?.profile_id;
  if (!profileId) {
    return { message: 'Esse motorista não tem login vinculado.' };
  }

  try {
    await adminAuth.updateUser(profileId, { password: parsed.data.password });
  } catch (error: any) {
    return { message: `Erro ao trocar a senha: ${error.message}` };
  }

  return { success: true };
}

// Remove o motorista da frota — apaga só o documento em `drivers`, não mexe
// no login dele (profile/conta do Firebase Auth continuam existindo, então
// dá pra recriar o vínculo depois se precisar). Atendimentos antigos ficam
// com assigned_driver_id órfão — as telas já tratam isso como "Motorista
// removido".
export async function deleteDriver(driverId: string): Promise<{ message?: string }> {
  const { tenantId } = await requireUserAndTenant();

  const ref = adminDb.collection('drivers').doc(driverId);
  const snap = await ref.get();
  if (!snap.exists) return { message: 'Motorista não encontrado.' };
  if (snap.data()?.tenant_id !== tenantId) return { message: 'Sem permissão pra excluir esse motorista.' };

  await ref.delete();
  revalidatePath('/motoristas');
  return {};
}
