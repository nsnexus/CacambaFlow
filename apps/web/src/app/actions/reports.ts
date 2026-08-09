'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

function monthRange(month: string) {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const mon = parts[1] ?? new Date().getMonth() + 1;
  const start = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export async function getReportsSummary(month?: string) {
  const { tenantId } = await requireUserAndTenant();

  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(targetMonth);

  const jobsSnap = await adminDb.collectionGroup('jobs')
    .where('tenant_id', '==', tenantId)
    .where('scheduled_date', '>=', start)
    .where('scheduled_date', '<=', end)
    .get();

  const jobs = jobsSnap.docs.map(d => d.data() as any);

  const statusCounts: Record<string, number> = {};
  const driverStats = new Map<string, { concluidos: number; falhados: number; total: number }>();

  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;

    if (job.assigned_driver_id) {
      const stats = driverStats.get(job.assigned_driver_id) || { concluidos: 0, falhados: 0, total: 0 };
      stats.total += 1;
      if (job.status === 'CONCLUIDO') stats.concluidos += 1;
      if (job.status === 'FALHADO') stats.falhados += 1;
      driverStats.set(job.assigned_driver_id, stats);
    }
  }

  const driverIds = Array.from(driverStats.keys());
  const driverRanking = await Promise.all(driverIds.map(async (driverId) => {
    const stats = driverStats.get(driverId)!;
    let name = 'Motorista removido';
    const drvDoc = await adminDb.collection('drivers').doc(driverId).get();
    if (drvDoc.exists) {
      const drvData = drvDoc.data() as any;
      if (drvData.profile_id) {
        const profDoc = await adminDb.collection('profiles').doc(drvData.profile_id).get();
        if (profDoc.exists) name = (profDoc.data() as any)?.name ?? name;
      }
    }
    return { driverId, name, ...stats };
  }));

  driverRanking.sort((a, b) => b.concluidos - a.concluidos);

  const invoicesSnap = await adminDb.collection('invoices')
    .where('tenant_id', '==', tenantId)
    .get();

  let faturado = 0;
  let recebido = 0;
  let emAberto = 0;

  invoicesSnap.docs.forEach(doc => {
    const inv = doc.data() as any;
    const createdMonth = inv.created_at?.toDate?.() ? inv.created_at.toDate().toISOString().slice(0, 7) : null;
    if (createdMonth !== targetMonth) return;

    const amount = Number(inv.amount) || 0;
    faturado += amount;
    if (inv.status === 'PAGO') recebido += amount;
    else emAberto += amount;
  });

  const totalJobs = jobs.length;
  const concluidos = statusCounts['CONCLUIDO'] || 0;
  const falhados = statusCounts['FALHADO'] || 0;
  const completionRate = totalJobs > 0 ? (concluidos / totalJobs) * 100 : 0;

  return {
    month: targetMonth,
    totalJobs,
    concluidos,
    falhados,
    completionRate,
    statusCounts,
    driverRanking,
    financials: { faturado, recebido, emAberto },
  };
}
