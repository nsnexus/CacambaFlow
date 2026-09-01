'use server';

import { adminDb, adminStorage, requireUserAndTenant } from '@/lib/firebase/server';
import { revalidatePath } from 'next/cache';
import { ANDROID_APK_URL } from '@/lib/mobile-app';

// Configuração (por tenant) de como o motorista baixa o app: ou um link
// (ex: build do EAS, ou qualquer outro link que o admin queira usar) ou o
// próprio arquivo .apk hospedado no Firebase Storage. Quem decide qual das
// duas fontes fica ativa é o admin, na tela de Configurações.
export type MobileAppSettings = {
  mode: 'link' | 'file';
  link_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  updated_at: string | null;
};

export async function getMobileAppSettings(): Promise<MobileAppSettings> {
  const { tenantId } = await requireUserAndTenant();
  const doc = await adminDb.collection('tenant_settings').doc(tenantId).get();
  const data = (doc.exists ? doc.data()?.mobile_app : null) as Partial<MobileAppSettings> | null | undefined;

  return {
    mode: data?.mode ?? 'link',
    // Antes dessa tela existir, o link do build atual já ficava hardcoded no
    // painel — usa ele como valor inicial pra ninguém perder a opção de
    // download só porque ainda não configurou nada aqui.
    link_url: data?.link_url ?? ANDROID_APK_URL,
    file_url: data?.file_url ?? null,
    file_name: data?.file_name ?? null,
    file_size: data?.file_size ?? null,
    updated_at: data?.updated_at ?? null,
  };
}

// Link que a tela de Motoristas efetivamente usa no botão de download —
// resolve pra link ou arquivo dependendo do que o admin escolheu.
export async function getMobileAppDownloadUrl(): Promise<string | null> {
  const settings = await getMobileAppSettings();
  return settings.mode === 'file' ? settings.file_url : settings.link_url;
}

export type MobileAppSettingsFormState = { message?: string; success?: boolean };

export async function updateMobileAppSettings(
  prevState: MobileAppSettingsFormState,
  formData: FormData
): Promise<MobileAppSettingsFormState> {
  const { tenantId, role } = await requireUserAndTenant();
  if (role === 'MOTORISTA') {
    return { message: 'Sem permissão pra alterar essa configuração.' };
  }

  const mode = (formData.get('mode') as string) === 'file' ? 'file' : 'link';
  const linkUrl = ((formData.get('link_url') as string) || '').trim();
  const file = formData.get('apk_file') as File | null;

  const update: Record<string, unknown> = {
    mode,
    updated_at: new Date().toISOString(),
  };

  if (mode === 'link') {
    if (!linkUrl) {
      return { message: 'Informe o link do APK.' };
    }
    update.link_url = linkUrl;
  } else {
    if (file && file.size > 0) {
      if (!file.name.toLowerCase().endsWith('.apk')) {
        return { message: 'O arquivo precisa ser um .apk.' };
      }
      try {
        const bucket = adminStorage.bucket();
        const path = `tenants/${tenantId}/mobile-app/app.apk`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const storageFile = bucket.file(path);
        await storageFile.save(buffer, {
          contentType: 'application/vnd.android.package-archive',
        });
        // Expira só daqui a muito tempo — é um download interno pros
        // motoristas, não precisa renovar link toda hora.
        const [url] = await storageFile.getSignedUrl({ action: 'read', expires: '01-01-2500' });
        update.file_url = url;
        update.file_name = file.name;
        update.file_size = file.size;
      } catch (error: any) {
        return { message: `Erro ao enviar o arquivo: ${error.message}` };
      }
    } else {
      // Não mandou arquivo novo dessa vez — só continua usando o que já
      // tinha subido antes (se tinha).
      const current = await getMobileAppSettings();
      if (!current.file_url) {
        return { message: 'Envie o arquivo .apk.' };
      }
    }
  }

  try {
    await adminDb.collection('tenant_settings').doc(tenantId).set({ mobile_app: update }, { merge: true });
  } catch (error: any) {
    return { message: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath('/configuracoes/app-motorista');
  revalidatePath('/motoristas');
  return { success: true };
}
