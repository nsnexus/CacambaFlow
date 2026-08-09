'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';

export async function getEvidences() {
  const { tenantId } = await requireUserAndTenant();

  const snapshot = await adminDb.collection('evidences')
    .where('tenant_id', '==', tenantId)
    .limit(60)
    .get();

  const jobCache = new Map<string, any>();
  const orderCache = new Map<string, any>();
  const customerCache = new Map<string, any>();
  const driverCache = new Map<string, any>();

  const evidences = await Promise.all(snapshot.docs.map(async doc => {
    const data = doc.data() as any;

    let jobData: any = null;
    if (data.order_id && data.job_id) {
      const jobKey = `${data.order_id}/${data.job_id}`;
      if (jobCache.has(jobKey)) {
        jobData = jobCache.get(jobKey);
      } else {
        const jobDoc = await adminDb.collection('orders').doc(data.order_id).collection('jobs').doc(data.job_id).get();
        jobData = jobDoc.exists ? jobDoc.data() : null;
        jobCache.set(jobKey, jobData);
      }
    }

    let orderData: any = null;
    if (data.order_id) {
      if (orderCache.has(data.order_id)) {
        orderData = orderCache.get(data.order_id);
      } else {
        const orderDoc = await adminDb.collection('orders').doc(data.order_id).get();
        orderData = orderDoc.exists ? orderDoc.data() : null;
        orderCache.set(data.order_id, orderData);
      }
    }

    let customerData: any = null;
    if (orderData?.customer_id) {
      if (customerCache.has(orderData.customer_id)) {
        customerData = customerCache.get(orderData.customer_id);
      } else {
        const custDoc = await adminDb.collection('customers').doc(orderData.customer_id).get();
        customerData = custDoc.exists ? custDoc.data() : null;
        customerCache.set(orderData.customer_id, customerData);
      }
    }

    let driverName: string | null = null;
    if (jobData?.assigned_driver_id) {
      if (driverCache.has(jobData.assigned_driver_id)) {
        driverName = driverCache.get(jobData.assigned_driver_id);
      } else {
        const drvDoc = await adminDb.collection('drivers').doc(jobData.assigned_driver_id).get();
        if (drvDoc.exists) {
          const drvData = drvDoc.data() as any;
          if (drvData?.profile_id) {
            const profDoc = await adminDb.collection('profiles').doc(drvData.profile_id).get();
            driverName = profDoc.exists ? (profDoc.data() as any)?.name ?? null : null;
          }
        }
        driverCache.set(jobData.assigned_driver_id, driverName);
      }
    }

    return {
      id: doc.id,
      ...data,
      jobs: {
        job_number: jobData?.job_number ?? null,
        job_type: jobData?.job_type ?? null,
        orders: { customers: { name: customerData?.name ?? null } },
        drivers: { profiles: { name: driverName } },
      },
    };
  }));

  return evidences.sort((a: any, b: any) => {
    const timeA = a.captured_at_device ? new Date(a.captured_at_device).getTime() : 0;
    const timeB = b.captured_at_device ? new Date(b.captured_at_device).getTime() : 0;
    return timeB - timeA;
  });
}
