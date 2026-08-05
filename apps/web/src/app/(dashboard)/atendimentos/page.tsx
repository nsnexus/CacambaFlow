import type { Metadata } from 'next';
import { getJobsForDispatch } from '@/app/actions/jobs';
import { JobBoard } from '@/components/jobs/job-board';

export const metadata: Metadata = { title: 'Despacho (Kanban) — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

// TODO: Migrar para Firestore - dados mock temporários
async function getResources() {
  const { tenantId } = await requireUserAndTenant();
  
  const [driversSnap, vehiclesSnap] = await Promise.all([
    adminDb.collection('profiles').where('tenant_id', '==', tenantId).where('role', '==', 'DRIVER').get(),
    adminDb.collection('vehicles').where('tenant_id', '==', tenantId).get()
  ]);

  return {
    drivers: driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    vehicles: vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  };
}

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  // Pega a data da URL ou usa a data atual
  const dateStr = (searchParams.date as string) || new Date().toISOString().split('T')[0] || '';
  
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
          />
          <button type="submit" className="btn btn--secondary btn--sm">
            Filtrar
          </button>
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
