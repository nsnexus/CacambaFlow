import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

const QUEUE_KEY = 'pending_evidence_queue_v1';
const LOCAL_DIR = FileSystem.documentDirectory + 'pending_evidence/';

export type PendingEvidence = {
  id: string;
  jobId: string;
  orderId: string;
  tenantId: string;
  evidenceType: 'FOTO_ENTREGA' | 'FOTO_COLETA' | 'FOTO_LOCAL' | 'FOTO_RESIDUO' | 'FOTO_AVARIA';
  localUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  latitude: number | null;
  longitude: number | null;
  capturedAtDevice: string;
  createdBy: string;
};

/**
 * Fila de evidências pendentes de upload, persistida em disco (não em
 * memória) — sobrevive o app fechar/reabrir enquanto o motorista fica sem
 * rede. Upload em si (Storage) não tem persistência offline nativa como o
 * Firestore tem; por isso essa fila manual.
 */
async function readQueue(): Promise<PendingEvidence[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingEvidence[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingEvidence[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Copia o arquivo temporário da câmera pro armazenamento persistente do app
 * e adiciona a evidência na fila. Não faz upload aqui — quem chama decide
 * quando tentar sincronizar (ver trySyncPendingEvidence).
 */
export async function enqueueEvidence(item: {
  jobId: string;
  orderId: string;
  tenantId: string;
  evidenceType: PendingEvidence['evidenceType'];
  sourceUri: string;
  mimeType: string;
  fileSize: number;
  latitude: number | null;
  longitude: number | null;
  capturedAtDevice: string;
  createdBy: string;
}): Promise<PendingEvidence> {
  await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true }).catch(() => {});

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fileName = `${id}.jpg`;
  const localUri = LOCAL_DIR + fileName;
  await FileSystem.copyAsync({ from: item.sourceUri, to: localUri });

  const pending: PendingEvidence = {
    id,
    jobId: item.jobId,
    orderId: item.orderId,
    tenantId: item.tenantId,
    evidenceType: item.evidenceType,
    localUri,
    fileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    latitude: item.latitude,
    longitude: item.longitude,
    capturedAtDevice: item.capturedAtDevice,
    createdBy: item.createdBy,
  };

  const queue = await readQueue();
  queue.push(pending);
  await writeQueue(queue);
  return pending;
}

export async function getPendingEvidence(): Promise<PendingEvidence[]> {
  return readQueue();
}

export async function getPendingEvidenceCountForJob(jobId: string): Promise<number> {
  const queue = await readQueue();
  return queue.filter((e) => e.jobId === jobId).length;
}

async function uploadOne(item: PendingEvidence): Promise<void> {
  const storagePath = `evidences/${item.tenantId}/${item.orderId}/${item.jobId}/${item.fileName}`;
  const response = await fetch(item.localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: item.mimeType });
  const downloadUrl = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'evidences'), {
    tenant_id: item.tenantId,
    job_id: item.jobId,
    order_id: item.orderId,
    evidence_type: item.evidenceType,
    storage_path: storagePath,
    download_url: downloadUrl,
    mime_type: item.mimeType,
    file_size: item.fileSize,
    captured_at_device: item.capturedAtDevice,
    latitude: item.latitude,
    longitude: item.longitude,
    created_by: item.createdBy,
    status: 'UPLOAD_OK',
    created_at: serverTimestamp(),
  });

  await FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => {});
}

let syncing = false;

/**
 * Tenta subir todas as evidências pendentes, uma por uma. Continua a fila
 * mesmo se algum item falhar (ex.: ainda sem rede) — os que falharem ficam
 * pra próxima tentativa. Chamado ao abrir o app, quando a rede volta
 * (NetInfo) e depois de cada nova captura.
 */
export async function trySyncPendingEvidence(): Promise<{ synced: number; remaining: number }> {
  if (syncing) return { synced: 0, remaining: (await readQueue()).length };
  syncing = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const stillPending: PendingEvidence[] = [];
    let synced = 0;
    for (const item of queue) {
      try {
        await uploadOne(item);
        synced += 1;
      } catch (e) {
        console.warn('[EvidenceQueue] falha ao sincronizar evidência, tenta depois:', item.id, e);
        stillPending.push(item);
      }
    }
    await writeQueue(stillPending);
    return { synced, remaining: stillPending.length };
  } finally {
    syncing = false;
  }
}
