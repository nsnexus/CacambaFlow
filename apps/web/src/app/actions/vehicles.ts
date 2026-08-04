'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const vehicleSchema = z.object({
  plate: z.string().min(7, 'Placa inválida').max(8),
  brand: z.string().min(1, 'Marca obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
  color: z.string().optional(),
  year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  vehicle_type: z.string().default('CAMINHÃO'),
  capacity: z.coerce.number().positive().optional(),
});

export type VehicleFormState = {
  errors?: Partial<Record<keyof z.infer<typeof vehicleSchema>, string[]>>;
  message?: string;
  success?: boolean;
};

export async function getVehicles() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, plate, brand, model, color, year, vehicle_type, capacity, status, created_at')
    .order('plate', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createVehicle(
  prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const supabase = createServerClient();

  const rawData = {
    plate: (formData.get('plate') as string)?.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    brand: formData.get('brand') as string,
    model: formData.get('model') as string,
    color: formData.get('color') as string,
    year: formData.get('year') as string,
    vehicle_type: formData.get('vehicle_type') as string,
    capacity: formData.get('capacity') as string,
  };

  const parsed = vehicleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (!profile) return { message: 'Perfil não encontrado.' };

  const { error } = await supabase.from('vehicles').insert({
    tenant_id: profile.tenant_id,
    ...parsed.data,
  });

  if (error) {
    if (error.code === '23505') return { message: 'Esta placa já está cadastrada.' };
    return { message: `Erro ao criar veículo: ${error.message}` };
  }

  revalidatePath('/veiculos');
  redirect('/veiculos');
}

export async function updateVehicleStatus(vehicleId: string, status: 'ATIVO' | 'MANUTENCAO' | 'INATIVO') {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('vehicles')
    .update({ status })
    .eq('id', vehicleId);

  if (error) throw new Error(error.message);
  revalidatePath('/veiculos');
}
