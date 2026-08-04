'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

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
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('drivers')
    .select(`
      id, license_number, license_category, license_expires_at,
      tracking_enabled, status, created_at,
      profiles ( name, email, phone )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Criar motorista ---
export async function createDriver(
  prevState: DriverFormState,
  formData: FormData
): Promise<DriverFormState> {
  const supabase = createServerClient();

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

  // 1. Obter tenant_id do usuário autenticado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) return { message: 'Perfil não encontrado.' };

  // 2. Criar usuário no Supabase Auth (senha temporária)
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) return { message: `Erro ao criar acesso: ${authError.message}` };

  // 3. Criar profile
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      tenant_id: profile.tenant_id,
      auth_user_id: authUser.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: 'MOTORISTA',
    })
    .select('id')
    .single();

  if (profileError) return { message: `Erro ao criar perfil: ${profileError.message}` };

  // 4. Criar driver
  const { error: driverError } = await supabase.from('drivers').insert({
    tenant_id: profile.tenant_id,
    profile_id: newProfile.id,
    license_number: parsed.data.license_number,
    license_category: parsed.data.license_category,
    license_expires_at: parsed.data.license_expires_at,
    tracking_enabled: parsed.data.tracking_enabled,
  });

  if (driverError) return { message: `Erro ao criar motorista: ${driverError.message}` };

  revalidatePath('/motoristas');
  redirect('/motoristas');
}

// --- Atualizar status do motorista ---
export async function updateDriverStatus(driverId: string, status: 'ATIVO' | 'INATIVO') {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('drivers')
    .update({ status })
    .eq('id', driverId);

  if (error) throw new Error(error.message);
  revalidatePath('/motoristas');
}
