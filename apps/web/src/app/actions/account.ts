'use server';

import { adminAuth, requireUserAndTenant } from '@/lib/firebase/server';
import { z } from 'zod';

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

// Troca a própria senha do usuário logado (admin) — já está autenticado via
// cookie de sessão, então não pede a senha atual de novo.
export async function updateOwnPassword(
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

  const { uid } = await requireUserAndTenant();

  try {
    await adminAuth.updateUser(uid, { password: parsed.data.password });
  } catch (error: any) {
    return { message: `Erro ao trocar a senha: ${error.message}` };
  }

  return { success: true };
}
