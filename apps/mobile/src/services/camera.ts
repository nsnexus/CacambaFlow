import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { outbox } from '@cacambaflow/sync-engine';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abre a câmera, tira a foto, comprime e salva no diretório persistente do celular.
 * Depois enfileira o metadado no Outbox para ser sincronizado quando houver internet.
 */
export async function captureEvidence(
  jobId: string, 
  evidenceType: 'FOTO_ENTREGA' | 'FOTO_COLETA' | 'FOTO_LOCAL' | 'FOTO_RESIDUO' | 'FOTO_AVARIA'
) {
  // 1. Permissões de câmera
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão da câmera é necessária para capturar evidências.');
  }

  // 2. Abre a câmera e tira foto
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7, // Compressão de 70% para não onerar rede e disco
    exif: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null; // Usuário cancelou
  }

  const asset = result.assets[0];

  // 3. Pega a localização atual para estampar na evidência
  let lat = null;
  let lng = null;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    lat = loc.coords.latitude;
    lng = loc.coords.longitude;
  } catch (e) {
    console.warn('[CameraService] Não foi possível pegar a localização para a foto.');
  }

  // 4. Copia a foto temporária para um diretório permanente (DocumentDirectory) do app
  // para que ela não suma enquanto não houver internet para upload
  const fileName = `${uuidv4()}.jpg`;
  const permanentPath = `${FileSystem.documentDirectory}evidences/${fileName}`;
  
  const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}evidences/`);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}evidences/`, { intermediates: true });
  }

  await FileSystem.copyAsync({
    from: asset.uri,
    to: permanentPath
  });

  // 5. Descobrir os dados do usuário para o SyncEngine
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Não autenticado');

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('auth_user_id', userData.user.id).single();
  if (!profile) throw new Error('Perfil não encontrado');

  const storagePath = `${profile.tenant_id}/${jobId}/${fileName}`;
  const now = new Date().toISOString();

  // 6. Coloca na Fila Offline (Outbox) - Evento de Tipo EVIDENCE_UPLOAD
  // No orquestrador de sync (Futuro), teríamos que tratar EVIDENCE_UPLOAD diferente:
  // Primeiro envia o binário pro Supabase Storage. Se sucesso, chama a API de push normal para gravar no banco o metadado.
  await outbox.enqueueEvent(
    profile.tenant_id,
    'mobile-device-id',
    'job',
    jobId,
    'EVIDENCE_UPLOAD',
    {
      evidence_type: evidenceType,
      local_file_uri: permanentPath,
      storage_path: storagePath,
      mime_type: 'image/jpeg',
      file_size: asset.fileSize || 0,
      captured_at_device: now,
      lat,
      lng
    }
  );

  return permanentPath;
}
