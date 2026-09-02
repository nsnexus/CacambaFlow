import { auth, db } from '../lib/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc, type QueryConstraint } from 'firebase/firestore';
import type { JobStatus } from '@cacambaflow/types';

export type JobCardData = {
  id: string;
  order_id: string;
  job_number: string;
  job_type: string;
  status: JobStatus;
  scheduled_date: string;
  // Só existe se o atendimento já foi empurrado de um dia atrasado pra hoje
  // (ver migrateOverdueJobs no painel web) — guarda a data original prevista.
  original_scheduled_date: string | null;
  orders: {
    customers: { name: string };
    addresses: { street: string; number: string; district: string; city: string; latitude: number | null; longitude: number | null };
  };
};

// Corridas nesses status já foram concluídas/encerradas e saem de "Minha Rota" para o Histórico.
export const TERMINAL_STATUSES: JobStatus[] = ['CONCLUIDO', 'FALHADO', 'CANCELADO'];

export async function getCurrentDriver(): Promise<{ driverId: string; tenantId: string } | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
  if (!profileDoc.exists()) return null;
  const tenantId = profileDoc.data().tenant_id;

  // O where('tenant_id', ...) é obrigatório aqui: as regras do Firestore
  // checam isSameTenant(resource.data), e o Firestore só autoriza a
  // query em lista se o mesmo campo também estiver filtrado nela.
  const driversQuery = query(
    collectionGroup(db, 'drivers'),
    where('profile_id', '==', user.uid),
    where('tenant_id', '==', tenantId)
  );
  const driversSnap = await getDocs(driversQuery);
  if (driversSnap.empty) return null;

  return { driverId: driversSnap.docs[0].id, tenantId };
}

export async function fetchDriverJobs(
  driverId: string,
  tenantId: string,
  extraConstraints: QueryConstraint[]
): Promise<JobCardData[]> {
  const jobsQuery = query(
    collectionGroup(db, 'jobs'),
    where('assigned_driver_id', '==', driverId),
    where('tenant_id', '==', tenantId),
    ...extraConstraints
  );

  const snapshot = await getDocs(jobsQuery);

  return Promise.all(
    snapshot.docs.map(async (jobDoc) => {
      const data = jobDoc.data();
      const orders: JobCardData['orders'] = {
        customers: { name: '' },
        addresses: { street: '', number: '', district: '', city: '', latitude: null, longitude: null },
      };

      if (data.order_id) {
        const orderSnap = await getDoc(doc(db, 'orders', data.order_id));
        if (orderSnap.exists()) {
          const o = orderSnap.data();
          if (o.customer_id) {
            const custDoc = await getDoc(doc(db, 'customers', o.customer_id));
            if (custDoc.exists()) {
              orders.customers.name = custDoc.data().name;

              if (o.address_id) {
                const addrDoc = await getDoc(doc(db, `customers/${o.customer_id}/addresses`, o.address_id));
                if (addrDoc.exists()) {
                  const addr = addrDoc.data();
                  orders.addresses = {
                    street: addr.street,
                    number: addr.number,
                    district: addr.district,
                    city: addr.city,
                    latitude: addr.latitude ?? null,
                    longitude: addr.longitude ?? null,
                  };
                }
              }
            }
          }
        }
      }

      return {
        id: jobDoc.id,
        order_id: data.order_id,
        job_number: data.job_number,
        job_type: data.job_type,
        status: data.status,
        scheduled_date: data.scheduled_date,
        original_scheduled_date: data.original_scheduled_date ?? null,
        orders,
      } as JobCardData;
    })
  );
}
