'use server';

import { adminDb, requireSuperAdmin } from '@/lib/firebase/server';
import { sendLeadNotification } from '@/lib/email';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const leadSchema = z.object({
  company_name: z.string().min(2, 'Informe o nome da empresa'),
  contact_phone: z.string().min(8, 'Informe um telefone válido'),
  contact_email: z.string().email('E-mail inválido'),
  cnpj: z.string().min(11, 'Informe o CNPJ'),
  responsible_name: z.string().min(3, 'Informe o nome completo do responsável'),
  city: z.string().min(1, 'Informe a cidade'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  office_users_count: z.coerce.number().int().min(1, 'Informe ao menos 1'),
  driver_users_count: z.coerce.number().int().min(1, 'Informe ao menos 1'),
  needs_tracking: z.enum(['SIM', 'NAO']),
});

export type LeadFormState = {
  errors?: Partial<Record<string, string[]>>;
  message?: string;
  success?: boolean;
};

export async function createLeadRequest(
  prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    company_name: formData.get('company_name'),
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email'),
    cnpj: formData.get('cnpj'),
    responsible_name: formData.get('responsible_name'),
    city: formData.get('city'),
    state: formData.get('state'),
    office_users_count: formData.get('office_users_count'),
    driver_users_count: formData.get('driver_users_count'),
    needs_tracking: formData.get('needs_tracking'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Verifique os campos destacados.' };
  }

  try {
    await adminDb.collection('leads').add({
      ...parsed.data,
      status: 'NOVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao enviar solicitação: ${error.message}` };
  }

  // A notificação por e-mail é só um aviso — se falhar, o lead já está
  // salvo no Firestore e continua visível em /solicitacoes de qualquer forma.
  try {
    await sendLeadNotification(parsed.data);
  } catch (error: any) {
    console.error('[leads] falha ao enviar notificação por e-mail:', error.message);
  }

  return { success: true };
}

// Visão administrativa: solicitações de orçamento são dados do próprio
// negócio CaçambaFlow (não de um tenant específico), por isso restrito a
// super admins — mesmo critério usado em /empresas.
export async function getLeads() {
  await requireSuperAdmin();

  const snapshot = await adminDb.collection('leads').orderBy('created_at', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      status: data.status || 'NOVO',
      created_at: data.created_at?.toDate?.().toISOString() ?? null,
    };
  });
}

export type LeadStatus = 'NOVO' | 'ORCAMENTO_ENVIADO' | 'EM_NEGOCIACAO' | 'APROVADO' | 'PERDIDO';

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  await requireSuperAdmin();

  await adminDb.collection('leads').doc(leadId).update({
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/solicitacoes');
}

export async function deleteLead(leadId: string) {
  await requireSuperAdmin();

  await adminDb.collection('leads').doc(leadId).delete();

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/solicitacoes');
}
