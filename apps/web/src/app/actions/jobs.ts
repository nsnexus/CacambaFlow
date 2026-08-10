'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';

export async function getJobsForDispatch(date?: string) {
  const { tenantId } = await requireUserAndTenant();

  // jobs é subcoleção de orders (orders/{orderId}/jobs/{jobId}), por isso a
  // busca precisa ser um collectionGroup, não uma coleção de topo.
  let jobsQuery = adminDb.collectionGroup('jobs')
    .where('tenant_id', '==', tenantId)
    .where('status', 'in', [
      'PENDENTE', 'REAGENDADO', 'RASCUNHO',
      'ATRIBUIDO',
      'EM_ROTA', 'NO_LOCAL', 'EM_EXECUCAO', 'CONCLUIDO_LOCAL', 'SINCRONIZANDO',
      'CONCLUIDO', 'FALHADO', 'ERRO_SYNC',
    ]);

  if (date) {
    jobsQuery = jobsQuery.where('scheduled_date', '==', date);
  }

  const snapshot = await jobsQuery.get();

  const jobs = await Promise.all(snapshot.docs.map(async doc => {
    const data = doc.data();
    
    // Pegar order correspondente
    let orderData = {};
    if (data.order_id) {
      const orderDoc = await adminDb.collection('orders').doc(data.order_id).get();
      if (orderDoc.exists) {
        const o = orderDoc.data() || {};
        
        let customerData = {};
        if (o.customer_id) {
          const custDoc = await adminDb.collection('customers').doc(o.customer_id).get();
          if (custDoc.exists) customerData = custDoc.data() || {};
        }

        let addressData = {};
        if (o.customer_id && o.address_id) {
          const addrDoc = await adminDb.collection('customers').doc(o.customer_id).collection('addresses').doc(o.address_id).get();
          if (addrDoc.exists) addressData = addrDoc.data() || {};
        }
        
        orderData = { ...o, customers: customerData, addresses: addressData };
      }
    }

    let drivers = {};
    if (data.assigned_driver_id) {
      const drvDoc = await adminDb.collection('drivers').doc(data.assigned_driver_id).get();
      if (drvDoc.exists) drivers = drvDoc.data() || {};
    }

    let vehicles = {};
    if (data.assigned_vehicle_id) {
      const vhcDoc = await adminDb.collection('vehicles').doc(data.assigned_vehicle_id).get();
      if (vhcDoc.exists) vehicles = vhcDoc.data() || {};
    }

    let assets = {};
    if (data.assigned_asset_id) {
      const astDoc = await adminDb.collection('assets').doc(data.assigned_asset_id).get();
      if (astDoc.exists) assets = astDoc.data() || {};
    }

    return {
      id: doc.id,
      ...data,
      orders: orderData,
      drivers,
      vehicles,
      assets
    };
  }));

  return jobs;
}

// Caçambas disponíveis pra vincular no despacho (só entrega/troca precisam
// de uma unidade física — coleta usa a que já está no local).
export async function getAvailableAssetsForDispatch() {
  const { tenantId } = await requireUserAndTenant();

  const snapshot = await adminDb.collection('assets')
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'DISPONIVEL')
    .get();

  const data = await Promise.all(snapshot.docs.map(async doc => {
    const assetData = doc.data();
    let asset_types = null;
    if (assetData.asset_type_id) {
      const typeDoc = await adminDb.collection('asset_types').doc(assetData.asset_type_id).get();
      if (typeDoc.exists) asset_types = typeDoc.data();
    }
    return { id: doc.id, identifier: assetData.identifier, asset_types };
  }));

  return data;
}

export async function dispatchJob(orderId: string, jobId: string, driverId: string, vehicleId: string, assetId?: string) {
  await requireUserAndTenant();

  const jobRef = adminDb.collection('orders').doc(orderId).collection('jobs').doc(jobId);
  const doc = await jobRef.get();

  if (doc.exists && doc.data()?.status === 'PENDENTE') {
    await jobRef.update({
      assigned_driver_id: driverId,
      assigned_vehicle_id: vehicleId,
      assigned_asset_id: assetId || null,
      status: 'ATRIBUIDO',
      published_at: new Date().toISOString(),
    });
  }

  revalidatePath('/atendimentos');
}

export async function unassignJob(orderId: string, jobId: string) {
  await requireUserAndTenant();

  const jobRef = adminDb.collection('orders').doc(orderId).collection('jobs').doc(jobId);
  const doc = await jobRef.get();

  if (doc.exists && doc.data()?.status === 'ATRIBUIDO') {
    await jobRef.update({
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      assigned_asset_id: null,
      status: 'PENDENTE',
      published_at: null,
    });
  }

  revalidatePath('/atendimentos');
}

export async function cancelJob(orderId: string, jobId: string) {
  await requireUserAndTenant();
  
  const jobRef = adminDb.collection('orders').doc(orderId).collection('jobs').doc(jobId);
  await jobRef.update({ status: 'CANCELADO' });
  
  revalidatePath('/atendimentos');
}
