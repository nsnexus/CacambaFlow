'use server';

import { adminAuth, adminDb, requireSuperAdmin } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const tenantSchema = z.object({
  name: z.string().min(2, 'Nome da empresa obrigatório'),
  document: z.string().optional(),
  admin_name: z.string().min(3, 'Nome do administrador deve ter pelo menos 3 caracteres'),
  admin_email: z.string().email('E-mail inválido'),
});

export type TenantFormState = {
  errors?: Partial<Record<keyof z.infer<typeof tenantSchema>, string[]>>;
  message?: string;
  success?: { tenantName: string; adminEmail: string; tempPassword: string };
};

// Lista todas as empresas com a contagem de motoristas/veículos/clientes de
// cada uma. Só acessível por SUPER_ADMIN — é a única tela do sistema que
// cruza dados de tenants diferentes de propósito.
export async function getTenants() {
  await requireSuperAdmin();

  const tenantsSnap = await adminDb.collection('tenants').get();

  const tenants = await Promise.all(tenantsSnap.docs.map(async (doc) => {
    const [driversSnap, vehiclesSnap, customersSnap] = await Promise.all([
      adminDb.collection('drivers').where('tenant_id', '==', doc.id).count().get(),
      adminDb.collection('vehicles').where('tenant_id', '==', doc.id).count().get(),
      adminDb.collection('customers').where('tenant_id', '==', doc.id).count().get(),
    ]);

    return {
      id: doc.id,
      ...doc.data(),
      driversCount: driversSnap.data().count,
      vehiclesCount: vehiclesSnap.data().count,
      customersCount: customersSnap.data().count,
    };
  }));

  return tenants;
}

export async function createTenant(
  prevState: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const parsed = tenantSchema.safeParse({
    name: formData.get('name') as string,
    document: formData.get('document') as string,
    admin_name: formData.get('admin_name') as string,
    admin_email: formData.get('admin_email') as string,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await requireSuperAdmin();
  } catch (e) {
    redirect('/login');
  }

  const tenantRef = adminDb.collection('tenants').doc();

  // 1. Criar o usuário admin dessa empresa
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  let authUser;
  try {
    authUser = await adminAuth.createUser({
      email: parsed.data.admin_email,
      password: tempPassword,
      displayName: parsed.data.admin_name,
    });
  } catch (error: any) {
    return { message: `Erro ao criar acesso do administrador: ${error.message}` };
  }

  // Custom claim de tenant no token — as regras do Firestore leem daqui.
  await adminAuth.setCustomUserClaims(authUser.uid, { tenant_id: tenantRef.id });

  // 2. Criar a empresa
  try {
    await tenantRef.set({
      name: parsed.data.name,
      document: parsed.data.document || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar empresa: ${error.message}` };
  }

  // 3. Criar o perfil do administrador, vinculado à nova empresa
  try {
    await adminDb.collection('profiles').doc(authUser.uid).set({
      tenant_id: tenantRef.id,
      auth_user_id: authUser.uid,
      name: parsed.data.admin_name,
      email: parsed.data.admin_email,
      role: 'ADMIN',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar perfil do administrador: ${error.message}` };
  }

  revalidatePath('/empresas');

  // Não redireciona: não existe envio de e-mail configurado ainda, então a
  // senha temporária só existe nesta resposta — precisa ser mostrada e
  // repassada manualmente pro admin da nova empresa.
  return {
    success: {
      tenantName: parsed.data.name,
      adminEmail: parsed.data.admin_email,
      tempPassword,
    },
  };
}
