'use server';

import { adminDb, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';

const TERMINAL_STATUSES = ['CONCLUIDO', 'FALHADO', 'CANCELADO'];

export async function getJobsForDispatch(date?: string) {
  const { tenantId } = await requireUserAndTenant();

  const today = new Date().toISOString().split('T')[0];
  const targetDate = date || today;

  // jobs é subcoleção de orders (orders/{orderId}/jobs/{jobId}), por isso a
  // busca precisa ser um collectionGroup, não uma coleção de topo.
  const snapshot = await adminDb.collectionGroup('jobs')
    .where('tenant_id', '==', tenantId)
    .where('status', 'in', [
      'PENDENTE', 'REAGENDADO', 'RASCUNHO',
      'ATRIBUIDO',
      'EM_ROTA', 'NO_LOCAL', 'EM_EXECUCAO', 'CONCLUIDO_LOCAL', 'SINCRONIZANDO',
      'CONCLUIDO', 'FALHADO', 'ERRO_SYNC',
    ])
    .where('scheduled_date', '==', targetDate)
    .get();

  let docs = snapshot.docs;

  // Vendo o quadro de "hoje" (padrão da tela): traz junto o que ficou
  // atrasado de dias anteriores e ainda não foi concluído/falhado/cancelado
  // — sem precisar reagendar nada na mão, e sem mexer na scheduled_date
  // real do atendimento (o atraso é só visual, calculado na hora).
  if (targetDate === today) {
    const overdueSnapshot = await adminDb.collectionGroup('jobs')
      .where('tenant_id', '==', tenantId)
      .where('scheduled_date', '<', today)
      .get();
    const overdueDocs = overdueSnapshot.docs.filter((doc) => !TERMINAL_STATUSES.includes(doc.data().status));
    docs = [...overdueDocs, ...docs];
  }

  const jobs = await Promise.all(docs.map(async doc => {
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
    return { id: doc.id, identifier: assetData.identifier, asset_type_id: assetData.asset_type_id ?? null, asset_types };
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

// Só entrega e troca deixam uma caçamba nova em campo — mesma regra usada no
// app do motorista (ver apps/mobile/src/app/job/[id].tsx).
const JOB_TYPES_NEED_ASSET = ['ENTREGA', 'TROCA'];

// Fecha um atendimento direto pelo painel, sem depender do app do motorista
// (útil quando o app falha, o motorista não tem o celular à mão, etc.).
// Espelha exatamente o que o app faz ao concluir: marca o job como CONCLUIDO
// e atualiza a caçamba (entrega → LOCADA no endereço do pedido; coleta →
// DISPONIVEL de novo). O local da entrega é o que o admin informar aqui
// (por padrão, pré-preenchido com as coordenadas já cadastradas do endereço).
export async function completeJobManually(
  orderId: string,
  jobId: string,
  formData: FormData
): Promise<{ message?: string }> {
  const { tenantId, profileId } = await requireUserAndTenant();

  const jobRef = adminDb.collection('orders').doc(orderId).collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) return { message: 'Atendimento não encontrado.' };

  const job = jobSnap.data() as any;
  if (job.tenant_id !== tenantId) return { message: 'Sem permissão pra concluir esse atendimento.' };
  if (['CONCLUIDO', 'CANCELADO'].includes(job.status)) {
    return { message: 'Esse atendimento já está encerrado.' };
  }

  const orderSnap = await adminDb.collection('orders').doc(orderId).get();
  const order = orderSnap.data() as any;

  const latRaw = (formData.get('delivery_latitude') as string) || '';
  const lngRaw = (formData.get('delivery_longitude') as string) || '';
  const note = ((formData.get('note') as string) || '').trim();
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;

  const now = new Date().toISOString();

  try {
    await jobRef.update({
      status: 'CONCLUIDO',
      updated_at: now,
      completed_manually: true,
      completed_manually_by: profileId,
      completed_manually_note: note || null,
    });

    const assetId = job.assigned_asset_id || job.expected_asset_id || null;

    if (JOB_TYPES_NEED_ASSET.includes(job.job_type) && assetId && order?.customer_id && order?.address_id) {
      await adminDb.collection('assets').doc(assetId).update({
        status: 'LOCADA',
        customer_id: order.customer_id,
        address_id: order.address_id,
        delivered_at: now.split('T')[0],
        expected_return_date: job.expected_return_date ?? null,
        delivery_latitude: latitude,
        delivery_longitude: longitude,
      });
    } else if (job.job_type === 'COLETA' && order?.customer_id && order?.address_id) {
      // Coleta não tem asset pré-vinculado — localiza a caçamba LOCADA nesse
      // endereço, igual o app faz.
      const assetsSnap = await adminDb.collection('assets')
        .where('tenant_id', '==', tenantId)
        .where('customer_id', '==', order.customer_id)
        .where('address_id', '==', order.address_id)
        .where('status', '==', 'LOCADA')
        .limit(1)
        .get();

      const assetDoc = assetsSnap.docs[0];
      if (assetDoc) {
        await assetDoc.ref.update({
          status: 'DISPONIVEL',
          customer_id: null,
          address_id: null,
          delivered_at: null,
          expected_return_date: null,
          delivery_latitude: null,
          delivery_longitude: null,
        });
      }
    }
  } catch (error: any) {
    return { message: `Erro ao concluir manualmente: ${error.message}` };
  }

  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath('/pedidos');
  revalidatePath('/atendimentos');
  return {};
}
