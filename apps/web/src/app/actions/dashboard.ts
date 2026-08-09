'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

// Mesmo critério de "online" usado no Centro de Controle: último ping de
// GPS há menos de 10 minutos.
const ONLINE_THRESHOLD_MINUTES = 10;

export async function getDashboardSummary() {
  const { tenantId } = await requireUserAndTenant();
  const today = new Date().toISOString().split('T')[0];

  const [jobsSnap, assetsSnap, locationsSnap] = await Promise.all([
    adminDb.collectionGroup('jobs')
      .where('tenant_id', '==', tenantId)
      .where('scheduled_date', '==', today)
      .get(),
    adminDb.collection('assets')
      .where('tenant_id', '==', tenantId)
      .get(),
    adminDb.collection('driver_locations')
      .where('tenant_id', '==', tenantId)
      .orderBy('device_timestamp', 'desc')
      .limit(200)
      .get(),
  ]);

  const statusCounts: Record<string, number> = {};
  jobsSnap.docs.forEach((doc) => {
    const status = doc.data().status as string;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  let cacambasDisponiveis = 0;
  let cacambasLocadas = 0;
  assetsSnap.docs.forEach((doc) => {
    const status = doc.data().status;
    if (status === 'DISPONIVEL') cacambasDisponiveis += 1;
    if (status === 'LOCADA') cacambasLocadas += 1;
  });

  // Fica só com o ping mais recente de cada motorista.
  const latestByDriver = new Map<string, string>();
  locationsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.driver_id || latestByDriver.has(data.driver_id)) return;
    latestByDriver.set(data.driver_id, data.device_timestamp);
  });

  const now = Date.now();
  let motoristasOnline = 0;
  latestByDriver.forEach((deviceTimestamp) => {
    const diffMin = (now - new Date(deviceTimestamp).getTime()) / 60000;
    if (diffMin < ONLINE_THRESHOLD_MINUTES) motoristasOnline += 1;
  });

  return {
    atendimentosHoje: jobsSnap.size,
    pendentes: statusCounts['PENDENTE'] || 0,
    emRota: statusCounts['EM_ROTA'] || 0,
    concluidos: statusCounts['CONCLUIDO'] || 0,
    falhados: statusCounts['FALHADO'] || 0,
    motoristasOnline,
    cacambasDisponiveis,
    cacambasLocadas,
  };
}
