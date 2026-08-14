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
  monthly_fee: z.coerce.number().min(0, 'Valor deve ser zero ou positivo').default(0),
  billing_due_day: z.coerce.number().int().min(1).max(31).default(10),
  first_due_date: z.string().optional(),
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
    const data = doc.data();
    const [driversSnap, vehiclesSnap, customersSnap, assetsSnap] = await Promise.all([
      adminDb.collection('drivers').where('tenant_id', '==', doc.id).count().get(),
      adminDb.collection('vehicles').where('tenant_id', '==', doc.id).count().get(),
      adminDb.collection('customers').where('tenant_id', '==', doc.id).count().get(),
      adminDb.collection('assets').where('tenant_id', '==', doc.id).count().get(),
    ]);

    return {
      id: doc.id,
      name: data.name ?? 'Sem Nome',
      document: data.document ?? null,
      status: (data.status as 'ATIVO' | 'INATIVO' | 'SUSPENSO') || 'ATIVO',
      timezone: data.timezone || 'America/Sao_Paulo',
      monthly_fee: Number(data.monthly_fee ?? 0),
      billing_due_day: Number(data.billing_due_day ?? 10),
      created_at: data.created_at?.toDate?.().toISOString() ?? null,
      driversCount: driversSnap.data().count,
      vehiclesCount: vehiclesSnap.data().count,
      customersCount: customersSnap.data().count,
      assetsCount: assetsSnap.data().count,
    };
  }));

  return tenants;
}

export async function getTenantById(tenantId: string) {
  await requireSuperAdmin();

  const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new Error('Empresa não encontrada');
  }

  const data = tenantDoc.data()!;

  const [driversSnap, vehiclesSnap, customersSnap, assetsSnap, ordersSnap, profilesSnap, paymentsSnap] = await Promise.all([
    adminDb.collection('drivers').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('vehicles').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('customers').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('assets').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('orders').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('profiles').where('tenant_id', '==', tenantId).get(),
    adminDb.collection('tenant_payments').where('tenant_id', '==', tenantId).get(),
  ]);

  const profiles = profilesSnap.docs.map((p) => ({
    id: p.id,
    name: p.data().name,
    email: p.data().email,
    role: p.data().role,
    status: p.data().status || 'ATIVO',
    phone: p.data().phone || null,
  }));

  const payments = paymentsSnap.docs
    .map((doc) => {
      const p = doc.data();
      return {
        id: doc.id,
        tenant_id: p.tenant_id,
        reference_month: p.reference_month || '—',
        amount: Number(p.amount ?? 0),
        due_date: p.due_date ? (p.due_date.toDate ? p.due_date.toDate().toISOString() : p.due_date) : '',
        status: (p.status as 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO') || 'PENDENTE',
        paid_at: p.paid_at ? (p.paid_at.toDate ? p.paid_at.toDate().toISOString() : p.paid_at) : null,
        payment_method: p.payment_method || null,
        notes: p.notes || '',
        created_at: p.created_at?.toDate?.().toISOString() ?? null,
      };
    })
    .sort((a, b) => (b.due_date > a.due_date ? 1 : -1));

  return {
    id: tenantDoc.id,
    name: data.name,
    document: data.document || null,
    status: (data.status as 'ATIVO' | 'INATIVO' | 'SUSPENSO') || 'ATIVO',
    timezone: data.timezone || 'America/Sao_Paulo',
    plan_code: data.plan_code || 'PADRAO',
    monthly_fee: Number(data.monthly_fee ?? 0),
    billing_due_day: Number(data.billing_due_day ?? 10),
    created_at: data.created_at?.toDate?.().toISOString() ?? null,
    stats: {
      driversCount: driversSnap.data().count,
      vehiclesCount: vehiclesSnap.data().count,
      customersCount: customersSnap.data().count,
      assetsCount: assetsSnap.data().count,
      ordersCount: ordersSnap.data().count,
    },
    profiles,
    payments,
  };
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
    monthly_fee: formData.get('monthly_fee') as string,
    billing_due_day: formData.get('billing_due_day') as string,
    first_due_date: formData.get('first_due_date') as string,
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
      status: 'ATIVO',
      timezone: 'America/Sao_Paulo',
      monthly_fee: parsed.data.monthly_fee,
      billing_due_day: parsed.data.billing_due_day,
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
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar perfil do administrador: ${error.message}` };
  }

  // 4. Gerar a primeira mensalidade no histórico se houver valor mensal configurado
  if (parsed.data.monthly_fee > 0) {
    try {
      const now = new Date();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = now.getFullYear();
      const refMonth = `${currentMonth}/${currentYear}`;

      let dueDateStr = parsed.data.first_due_date;
      if (!dueDateStr) {
        const dueDay = Math.min(parsed.data.billing_due_day, 28);
        const dueDate = new Date(currentYear, now.getMonth(), dueDay);
        dueDateStr = dueDate.toISOString().slice(0, 10);
      }

      await adminDb.collection('tenant_payments').add({
        tenant_id: tenantRef.id,
        reference_month: refMonth,
        amount: parsed.data.monthly_fee,
        due_date: dueDateStr,
        status: 'PENDENTE',
        paid_at: null,
        payment_method: null,
        notes: 'Primeira mensalidade de ativação da plataforma',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[createTenant] Falha ao gerar mensalidade inicial:', error);
    }
  }

  revalidatePath('/empresas');

  return {
    success: {
      tenantName: parsed.data.name,
      adminEmail: parsed.data.admin_email,
      tempPassword,
    },
  };
}

const updateTenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, 'Nome da empresa obrigatório'),
  document: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'SUSPENSO']),
  timezone: z.string().default('America/Sao_Paulo'),
  monthly_fee: z.coerce.number().min(0).default(0),
  billing_due_day: z.coerce.number().int().min(1).max(31).default(10),
});

export type UpdateTenantFormState = {
  errors?: Partial<Record<keyof z.infer<typeof updateTenantSchema>, string[]>>;
  message?: string;
  success?: boolean;
};

export async function updateTenant(
  prevState: UpdateTenantFormState,
  formData: FormData
): Promise<UpdateTenantFormState> {
  const parsed = updateTenantSchema.safeParse({
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    document: formData.get('document') as string,
    status: formData.get('status') as string,
    timezone: formData.get('timezone') as string,
    monthly_fee: formData.get('monthly_fee') as string,
    billing_due_day: formData.get('billing_due_day') as string,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Verifique os dados informados.' };
  }

  try {
    await requireSuperAdmin();
  } catch {
    redirect('/login');
  }

  try {
    await adminDb.collection('tenants').doc(parsed.data.id).update({
      name: parsed.data.name,
      document: parsed.data.document || null,
      status: parsed.data.status,
      timezone: parsed.data.timezone,
      monthly_fee: parsed.data.monthly_fee,
      billing_due_day: parsed.data.billing_due_day,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath('/empresas');
    revalidatePath(`/empresas/${parsed.data.id}`);

    return { success: true, message: 'Dados da empresa atualizados com sucesso!' };
  } catch (error: any) {
    return { message: `Erro ao atualizar empresa: ${error.message}` };
  }
}

export async function toggleTenantStatus(
  tenantId: string,
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO'
) {
  await requireSuperAdmin();

  await adminDb.collection('tenants').doc(tenantId).update({
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  revalidatePath('/empresas');
  revalidatePath(`/empresas/${tenantId}`);
}

export async function deleteTenant(tenantId: string): Promise<{ success?: boolean; error?: string }> {
  await requireSuperAdmin();

  // Verifica dependências
  const [driversSnap, vehiclesSnap, customersSnap, assetsSnap, ordersSnap] = await Promise.all([
    adminDb.collection('drivers').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('vehicles').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('customers').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('assets').where('tenant_id', '==', tenantId).count().get(),
    adminDb.collection('orders').where('tenant_id', '==', tenantId).count().get(),
  ]);

  const totalDeps =
    driversSnap.data().count +
    vehiclesSnap.data().count +
    customersSnap.data().count +
    assetsSnap.data().count +
    ordersSnap.data().count;

  if (totalDeps > 0) {
    return {
      error: `Não é possível excluir esta empresa pois ela possui dados vinculados (${totalDeps} registros entre motoristas, veículos, clientes, caçambas ou pedidos). Em vez disso, altere o status para INATIVO ou SUSPENSO.`,
    };
  }

  // Remove lançamentos de pagamentos vinculados se for empresa sem dados
  const paymentsSnap = await adminDb.collection('tenant_payments').where('tenant_id', '==', tenantId).get();
  for (const doc of paymentsSnap.docs) {
    await doc.ref.delete();
  }

  // Remove perfis e usuários auth
  const profilesSnap = await adminDb.collection('profiles').where('tenant_id', '==', tenantId).get();
  for (const doc of profilesSnap.docs) {
    const authUid = doc.data().auth_user_id;
    if (authUid) {
      try {
        await adminAuth.deleteUser(authUid);
      } catch (e) {
        console.warn(`[deleteTenant] Usuário Auth ${authUid} não pôde ser removido:`, e);
      }
    }
    await doc.ref.delete();
  }

  // Deleta o documento do tenant
  await adminDb.collection('tenants').doc(tenantId).delete();

  revalidatePath('/empresas');
  return { success: true };
}

// --- Funções de Gestão do Histórico de Mensalidades (Tenant Payments) ---

export async function recordTenantPayment(
  paymentId: string,
  tenantId: string,
  data: {
    paid_at: string;
    payment_method: 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'OUTRO';
    notes?: string;
  }
) {
  await requireSuperAdmin();

  await adminDb.collection('tenant_payments').doc(paymentId).update({
    status: 'PAGO',
    paid_at: data.paid_at,
    payment_method: data.payment_method,
    notes: data.notes || '',
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  revalidatePath(`/empresas/${tenantId}`);
  revalidatePath('/empresas');
}

export async function generateTenantPayment(
  tenantId: string,
  data: {
    reference_month: string;
    amount: number;
    due_date: string;
    notes?: string;
  }
) {
  await requireSuperAdmin();

  await adminDb.collection('tenant_payments').add({
    tenant_id: tenantId,
    reference_month: data.reference_month,
    amount: data.amount,
    due_date: data.due_date,
    status: 'PENDENTE',
    paid_at: null,
    payment_method: null,
    notes: data.notes || '',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  revalidatePath(`/empresas/${tenantId}`);
  revalidatePath('/empresas');
}

export async function deleteTenantPayment(paymentId: string, tenantId: string) {
  await requireSuperAdmin();

  await adminDb.collection('tenant_payments').doc(paymentId).delete();

  revalidatePath(`/empresas/${tenantId}`);
  revalidatePath('/empresas');
}
