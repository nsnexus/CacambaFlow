'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { JobStatus } from '@cacambaflow/types';

// --- Obter lista de atendimentos do dia para o Kanban ---
export async function getJobsForDispatch(dateStr: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, job_type, status, priority, scheduled_date, sequence_number,
      expected_asset_type_id, expected_asset_id, assigned_driver_id, assigned_vehicle_id,
      orders ( 
        customers ( name ),
        addresses ( street, number, district, city )
      ),
      asset_types ( name ),
      assets ( identifier ),
      drivers ( profiles ( name ) ),
      vehicles ( plate )
    `)
    .eq('scheduled_date', dateStr)
    .order('priority', { ascending: false })
    .order('sequence_number', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Atribuir motorista e veículo ao atendimento ---
export async function dispatchJob(jobId: string, driverId: string, vehicleId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('jobs')
    .update({
      assigned_driver_id: driverId,
      assigned_vehicle_id: vehicleId,
      status: 'ATRIBUIDO',
      published_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'PENDENTE'); // Só atribui se ainda estiver pendente

  if (error) throw new Error(error.message);
  revalidatePath('/atendimentos');
}

// --- Reverter atribuição (voltar para pendente) ---
export async function unassignJob(jobId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('jobs')
    .update({
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      status: 'PENDENTE',
      published_at: null,
    })
    .eq('id', jobId)
    .in('status', ['ATRIBUIDO']); // Só permite reverter se o motorista ainda não aceitou/iniciou rota

  if (error) throw new Error(error.message);
  revalidatePath('/atendimentos');
}

// --- Cancelar atendimento ---
export async function cancelJob(jobId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'CANCELADO' })
    .eq('id', jobId);

  if (error) throw new Error(error.message);
  revalidatePath('/atendimentos');
}
