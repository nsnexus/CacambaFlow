'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const CATEGORIES = ['CLIENTE', 'VEICULO', 'ACESSO', 'CLIMA', 'ATIVO', 'OPERACAO', 'OUTRO'] as const;

const failureReasonSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  category: z.enum(CATEGORIES),
  requires_note: z.boolean().default(false),
  requires_photo: z.boolean().default(false),
  allow_auto_reschedule: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type FailureReasonFormState = {
  errors?: Partial<Record<keyof z.infer<typeof failureReasonSchema>, string[]>>;
  message?: string;
};

export async function getFailureReasons() {
  const { tenantId } = await requireUserAndTenant();
  const snapshot = await adminDb.collection('failure_reasons')
    .where('tenant_id', '==', tenantId)
    .get();

  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return data.sort((a: any, b: any) => {
    const timeA = a.created_at?._seconds || 0;
    const timeB = b.created_at?._seconds || 0;
    return timeB - timeA;
  });
}

export async function getFailureReasonById(reasonId: string) {
  const { tenantId } = await requireUserAndTenant();
  const doc = await adminDb.collection('failure_reasons').doc(reasonId).get();
  if (!doc.exists) throw new Error('Motivo não encontrado');
  const data = doc.data() as any;
  if (data.tenant_id !== tenantId) throw new Error('Sem permissão');
  return { id: doc.id, ...data };
}

function parseFailureReasonForm(formData: FormData) {
  return failureReasonSchema.safeParse({
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    requires_note: formData.get('requires_note') === 'true',
    requires_photo: formData.get('requires_photo') === 'true',
    allow_auto_reschedule: formData.get('allow_auto_reschedule') === 'true',
    active: formData.get('active') === 'true',
  });
}

export async function createFailureReason(
  prevState: FailureReasonFormState,
  formData: FormData
): Promise<FailureReasonFormState> {
  const parsed = parseFailureReasonForm(formData);
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
    await adminDb.collection('failure_reasons').doc().set({
      tenant_id: sessionData.tenantId,
      ...parsed.data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar motivo: ${error.message}` };
  }

  revalidatePath('/configuracoes/motivos-falha');
  redirect('/configuracoes/motivos-falha');
}

export async function updateFailureReason(
  reasonId: string,
  prevState: FailureReasonFormState,
  formData: FormData
): Promise<FailureReasonFormState> {
  const parsed = parseFailureReasonForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  try {
    await adminDb.collection('failure_reasons').doc(reasonId).update({ ...parsed.data });
  } catch (error: any) {
    return { message: `Erro ao atualizar motivo: ${error.message}` };
  }

  revalidatePath('/configuracoes/motivos-falha');
  redirect('/configuracoes/motivos-falha');
}
