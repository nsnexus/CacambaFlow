'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';

export async function getJobsForDispatch() {
  const { tenantId } = await requireUserAndTenant();
  
  // Como são várias coleções, precisamos trazer tudo do tenant
  const snapshot = await adminDb.collection('jobs')
    .where('tenant_id', '==', tenantId)
    .where('status', 'in', ['PENDING', 'ASSIGNED', 'IN_PROGRESS'])
    .get();

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

    return {
      id: doc.id,
      ...data,
      orders: orderData,
      drivers,
      vehicles
    };
  }));

  return jobs;
}

export async function dispatchJob(orderId: string, jobId: string, driverId: string, vehicleId: string) {
  await requireUserAndTenant();
  
  const jobRef = adminDb.collection('orders').doc(orderId).collection('jobs').doc(jobId);
  const doc = await jobRef.get();
  
  if (doc.exists && doc.data()?.status === 'PENDENTE') {
    await jobRef.update({
      assigned_driver_id: driverId,
      assigned_vehicle_id: vehicleId,
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
