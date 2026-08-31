import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Centro de Controle — CaçambaFlow' };

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { FleetControlView } from '@/components/map/fleet-control-view';
import { AutoRefresh } from '@/components/auto-refresh';
import { getDeliveredAssets } from '@/app/actions/assets';
import { serializeFirestoreData } from '@/lib/firebase/serialize';

// Status que contam como "atendimento ativo" pra um motorista — mesma lista
// usada no board de Despacho, menos os terminais (concluído/falhado/etc).
const ACTIVE_JOB_STATUSES = ['ATRIBUIDO', 'EM_ROTA', 'NO_LOCAL', 'EM_EXECUCAO', 'CONCLUIDO_LOCAL', 'SINCRONIZANDO'];

// Atendimentos ativos de HOJE de cada motorista (contagem + se tem algum "Em
// rota" agora), pra mostrar no Centro de Controle sem precisar abrir o
// Despacho. Sem o filtro de data contava atendimento de qualquer dia (ex.:
// um "Atribuído" de ontem que nunca foi concluído), inflando a contagem.
async function getActiveJobsByDriver(tenantId: string, driverIds: string[]) {
  const byDriver = new Map<string, { count: number; hasEmRota: boolean }>();
  if (driverIds.length === 0) return byDriver;

  const today = new Date().toISOString().split('T')[0];

  // Firestore 'in' aceita até 30 valores — a frota real não deve passar disso
  // tão cedo; se passar, dá pra paginar em lotes de 30 depois.
  const snapshot = await adminDb.collectionGroup('jobs')
    .where('tenant_id', '==', tenantId)
    .where('assigned_driver_id', 'in', driverIds.slice(0, 30))
    .where('scheduled_date', '==', today)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as any;
    if (!ACTIVE_JOB_STATUSES.includes(data.status)) continue;
    const entry = byDriver.get(data.assigned_driver_id) || { count: 0, hasEmRota: false };
    entry.count += 1;
    if (data.status === 'EM_ROTA') entry.hasEmRota = true;
    byDriver.set(data.assigned_driver_id, entry);
  }

  return byDriver;
}

// A app mobile grava cada ping de GPS como um documento novo em
// `driver_locations` (campos soltos: driver_id, latitude, longitude...).
// Aqui pegamos os pings mais recentes e ficamos só com o último de cada
// motorista.
async function getLatestLocations() {
  const { tenantId } = await requireUserAndTenant();
  try {
    const locationsSnap = await adminDb.collection('driver_locations')
      .where('tenant_id', '==', tenantId)
      .orderBy('device_timestamp', 'desc')
      .limit(200)
      .get();

    const latestByDriver = new Map<string, Record<string, any>>();
    for (const doc of locationsSnap.docs) {
      const data = doc.data() as Record<string, any>;
      if (!data.driver_id || latestByDriver.has(data.driver_id)) continue;
      latestByDriver.set(data.driver_id, data);
    }

    const driverIds = Array.from(latestByDriver.keys());
    const activeJobsByDriver = await getActiveJobsByDriver(tenantId, driverIds);

    const points = await Promise.all(driverIds.map(async (driverId) => {
      const data = latestByDriver.get(driverId)!;
      let name = 'Motorista removido';
      const drvDoc = await adminDb.collection('drivers').doc(driverId).get();
      if (drvDoc.exists) {
        const drvData = drvDoc.data() as any;
        if (drvData?.profile_id) {
          const profDoc = await adminDb.collection('profiles').doc(drvData.profile_id).get();
          if (profDoc.exists) name = (profDoc.data() as any)?.name ?? name;
        }
      }

      const jobsInfo = activeJobsByDriver.get(driverId) || { count: 0, hasEmRota: false };

      return {
        id: driverId,
        driver: { profiles: { name } },
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed ?? null,
          device_timestamp: data.device_timestamp,
        },
        assignedJobsCount: jobsInfo.count,
        isEmRota: jobsInfo.hasEmRota,
      };
    }));

    return points;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

export default async function MapaPage() {
  const [telemetry, deliveredAssets] = await Promise.all([
    getLatestLocations(),
    getDeliveredAssets(),
  ]);

  return (
    <div style={{ height: 'calc(100vh - var(--header-height) - 48px)', display: 'flex', flexDirection: 'column' }}>
      <AutoRefresh intervalMs={10000} />
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Centro de Controle (Real-time)</h1>
          <p className="text-muted text-sm">Acompanhamento da frota em campo via telemetria de aplicativo</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <span className="badge badge--concluido">● Atualizando ao vivo</span>
        </div>
      </div>

      <FleetControlView
        telemetry={serializeFirestoreData(telemetry) as any}
        assets={serializeFirestoreData(deliveredAssets) as any}
      />
    </div>
  );
}
