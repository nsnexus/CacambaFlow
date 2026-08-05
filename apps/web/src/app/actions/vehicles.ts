'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as admin from 'firebase-admin';

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
  const { tenantId } = await requireUserAndTenant();
  
  const snapshot = await adminDb.collection('vehicles')
    .where('tenant_id', '==', tenantId)
    .get();

  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return data.sort((a: any, b: any) => (a.plate || '').localeCompare(b.plate || ''));
}

export async function createVehicle(
  prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
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

  let sessionData;
  try {
    sessionData = await requireUserAndTenant();
  } catch (e) {
    redirect('/login');
  }

  // Verifica se a placa já existe para este tenant
  const existingSnap = await adminDb.collection('vehicles')
    .where('tenant_id', '==', sessionData.tenantId)
    .where('plate', '==', parsed.data.plate)
    .get();
    
  if (!existingSnap.empty) {
    return { message: 'Esta placa já está cadastrada.' };
  }

  try {
    const docRef = adminDb.collection('vehicles').doc();
    await docRef.set({
      tenant_id: sessionData.tenantId,
      ...parsed.data,
      status: 'ATIVO',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    return { message: `Erro ao criar veículo: ${error.message}` };
  }

  revalidatePath('/veiculos');
  redirect('/veiculos');
}

export async function updateVehicleStatus(vehicleId: string, status: 'ATIVO' | 'MANUTENCAO' | 'INATIVO') {
  await requireUserAndTenant();
  
  await adminDb.collection('vehicles').doc(vehicleId).update({
    status
  });
  
  revalidatePath('/veiculos');
}
