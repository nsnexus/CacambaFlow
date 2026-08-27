import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { enqueueEvidence, trySyncPendingEvidence } from './evidenceQueue';

/**
 * Abre a câmera, tira a foto e coloca na fila de evidências (evidenceQueue.ts).
 * Tenta subir pro Storage/Firestore na hora — se não der (sem rede), a foto
 * já ficou salva localmente e some da fila sozinha assim que a conexão voltar
 * (ver trySyncPendingEvidence, chamado no app inteiro ao detectar rede de volta).
 */
export async function captureEvidence(
  jobId: string,
  orderId: string,
  evidenceType: 'FOTO_ENTREGA' | 'FOTO_COLETA' | 'FOTO_LOCAL' | 'FOTO_RESIDUO' | 'FOTO_AVARIA'
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão da câmera é necessária para capturar evidências.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    lat = loc.coords.latitude;
    lng = loc.coords.longitude;
  } catch (e) {
    console.warn('[CameraService] Não foi possível pegar a localização para a foto.');
  }

  // tenant_id vem do cache local do Firestore quando offline (o perfil já foi
  // lido antes, em login/profile/location) — só falha aqui se for a
  // primeiríssima leitura do app inteiro sem nunca ter tido rede.
  const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
  if (!profileSnap.exists()) throw new Error('Perfil não encontrado');
  const tenantId = profileSnap.data().tenant_id;
  if (!tenantId) throw new Error('Perfil sem tenant associado');

  const now = new Date().toISOString();

  await enqueueEvidence({
    jobId,
    orderId,
    tenantId,
    evidenceType,
    sourceUri: asset.uri,
    mimeType: 'image/jpeg',
    fileSize: asset.fileSize || 0,
    latitude: lat,
    longitude: lng,
    capturedAtDevice: now,
    createdBy: user.uid,
  });

  // Melhor esforço: tenta subir na hora (comportamento igual a antes quando
  // online). Se falhar (sem rede), a foto já está segura na fila.
  trySyncPendingEvidence().catch(() => {});

  return true;
}
