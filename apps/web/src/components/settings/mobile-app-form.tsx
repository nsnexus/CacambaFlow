'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { updateMobileAppSettings, type MobileAppSettings, type MobileAppSettingsFormState } from '@/app/actions/mobile-app-settings';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  );
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function MobileAppForm({ settings }: { settings: MobileAppSettings }) {
  const [state, action] = useFormState<MobileAppSettingsFormState, FormData>(updateMobileAppSettings, {});
  const [mode, setMode] = useState<'link' | 'file'>(settings.mode);

  return (
    <form action={action}>
      {state.message && (
        <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {state.message}
        </div>
      )}
      {state.success && (
        <div role="status" style={{ padding: 'var(--space-3)', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          Configuração salva.
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
        <label className="label">Como o motorista baixa o app</label>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input type="radio" name="mode" value="link" checked={mode === 'link'} onChange={() => setMode('link')} />
            Por um link
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input type="radio" name="mode" value="file" checked={mode === 'file'} onChange={() => setMode('file')} />
            Pelo arquivo .apk direto
          </label>
        </div>
      </div>

      {mode === 'link' ? (
        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="label">Link do APK</label>
          <input
            name="link_url"
            type="url"
            className="input"
            placeholder="https://expo.dev/accounts/.../builds/..."
            defaultValue={settings.link_url ?? ''}
            required
          />
          <p className="text-muted text-xs" style={{ marginTop: 'var(--space-1)' }}>
            Pode ser o link de build do EAS ou qualquer outro link direto de download.
          </p>
        </div>
      ) : (
        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="label">Arquivo .apk</label>
          <input name="apk_file" type="file" accept=".apk" className="input" />
          {settings.file_url && settings.file_name && (
            <p className="text-muted text-xs" style={{ marginTop: 'var(--space-1)' }}>
              Já enviado: {settings.file_name} ({formatBytes(settings.file_size)}). Envie outro arquivo aqui só se quiser trocar.
            </p>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
