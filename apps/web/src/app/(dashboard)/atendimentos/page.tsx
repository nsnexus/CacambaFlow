import type { Metadata } from 'next';
import { getJobsForDispatch, getAvailableAssetsForDispatch } from '@/app/actions/jobs';
import { JobBoard } from '@/components/jobs/job-board';
import { AutoRefresh } from '@/components/auto-refresh';

export const metadata: Metadata = { title: 'Despacho (Kanban) — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

// O board precisa do id do documento em `drivers` (é isso que dispatchJob
// espera), não do uid do profile — por isso busca em `drivers` e resolve o
// nome de cada um a partir do profile vinculado, igual getDrivers() faz.
async function getResources() {
  const { tenantId } = await requireUserAndTenant();

  const [driversSnap, vehiclesSnap] = await Promise.all([
    adminDb.collection('drivers').where('tenant_id', '==', tenantId).where('status', '==', 'ATIVO').get(),
    adminDb.collection('vehicles').where('tenant_id', '==', tenantId).where('status', '==', 'ATIVO').get()
  ]);

  const drivers = await Promise.all(driversSnap.docs.map(async (doc) => {
    const data = doc.data();
    let profileData: any = { name: '—' };
    if (data.profile_id) {
      const profileDoc = await adminDb.collection('profiles').doc(data.profile_id).get();
      if (profileDoc.exists) profileData = profileDoc.data();
    }
    return { id: doc.id, profiles: profileData };
  }));

  return {
    drivers,
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
  
  const [jobs, { drivers, vehicles }, assets] = await Promise.all([
    getJobsForDispatch(dateStr),
    getResources(),
    getAvailableAssetsForDispatch()
  ]);

  return (
    <div>
      <AutoRefresh intervalMs={10000} />
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
        initialJobs={serializeFirestoreData(jobs) as any}
        drivers={serializeFirestoreData(drivers) as any}
        vehicles={serializeFirestoreData(vehicles) as any}
        assets={serializeFirestoreData(assets) as any}
      />
    </div>
  );
}
