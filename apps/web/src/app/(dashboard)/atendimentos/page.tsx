import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getJobsForDispatch } from '@/app/actions/jobs';
import { JobBoard } from '@/components/jobs/job-board';

export const metadata: Metadata = { title: 'Despacho (Kanban) — CaçambaFlow' };

// Helpers para carregar os recursos
async function getResources() {
  const supabase = createServerClient();
  const [drivers, vehicles] = await Promise.all([
    supabase.from('drivers').select('id, profiles(name)').eq('status', 'ATIVO'),
    supabase.from('vehicles').select('id, plate').eq('status', 'ATIVO')
  ]);
  return {
    drivers: drivers.data ?? [],
    vehicles: vehicles.data ?? []
  };
}

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  // Pega a data da URL ou usa a data atual
  const dateStr = searchParams.date ?? new Date().toISOString().split('T')[0];
  
  const [jobs, { drivers, vehicles }] = await Promise.all([
    getJobsForDispatch(dateStr),
    getResources()
  ]);

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Despacho Operacional</h1>
          <p className="text-muted text-sm">Arraste ou atribua atendimentos aos motoristas</p>
        </div>
        
        {/* Controle simples de data */}
        <form className="flex items-center gap-2">
          <input 
            type="date" 
            name="date" 
            defaultValue={dateStr} 
            className="input" 
            style={{ width: 'auto' }} 
            onChange={(e) => e.currentTarget.form?.submit()}
          />
        </form>
      </div>

      <JobBoard 
        initialJobs={jobs as any} 
        drivers={drivers as any} 
        vehicles={vehicles as any} 
      />
    </div>
  );
}
