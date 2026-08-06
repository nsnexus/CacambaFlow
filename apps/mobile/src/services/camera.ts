import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Abre a câmera, tira a foto e sobe direto para o Firebase Storage,
 * gravando o metadado na coleção `evidences`. Upload é online-only por
 * enquanto — a fila offline (Outbox) é da Fase 5, ainda não implementada.
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

  const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
  if (!profileSnap.exists()) throw new Error('Perfil não encontrado');
  const tenantId = profileSnap.data().tenant_id;
  if (!tenantId) throw new Error('Perfil sem tenant associado');

  const fileName = `${generateId()}.jpg`;
  const storagePath = `evidences/${tenantId}/${orderId}/${jobId}/${fileName}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);

  const now = new Date().toISOString();

  await addDoc(collection(db, 'evidences'), {
    tenant_id: tenantId,
    job_id: jobId,
    order_id: orderId,
    evidence_type: evidenceType,
    storage_path: storagePath,
    download_url: downloadUrl,
    mime_type: 'image/jpeg',
    file_size: asset.fileSize || blob.size || 0,
    captured_at_device: now,
    latitude: lat,
    longitude: lng,
    created_by: user.uid,
    status: 'UPLOAD_OK',
    created_at: serverTimestamp(),
  });

  return downloadUrl;
}
