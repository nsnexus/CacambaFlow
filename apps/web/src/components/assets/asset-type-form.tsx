'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createAssetType, updateAssetType, type AssetTypeFormState } from '@/app/actions/assets';
import Link from 'next/link';

type AssetType = { id: string; name: string; volume_m3: number };

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-tipo-cacamba" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Tipo'}
    </button>
  );
}

export function AssetTypeForm({ assetType }: { assetType?: AssetType }) {
  const action = assetType ? updateAssetType.bind(null, assetType.id) : createAssetType;
  const [state, formAction] = useFormState<AssetTypeFormState, FormData>(action, {});

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-6)',
          fontSize: '0.875rem',
        }}>
          {state.message}
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="form-group">
          <label className="label" htmlFor="asset-type-name">Nome *</label>
          <input id="asset-type-name" name="name" type="text" className="input" required defaultValue={assetType?.name} placeholder="Caçamba 5m³" />
          {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="asset-type-volume">Volume (m³) *</label>
          <input id="asset-type-volume" name="volume_m3" type="number" step="0.1" min="0.1" className="input" required defaultValue={assetType?.volume_m3} placeholder="5" />
          {state.errors?.volume_m3 && <p className="form-error">{state.errors.volume_m3[0]}</p>}
        </div>
      </div>

      <div className="flex gap-4">
        <SubmitButton isEdit={!!assetType} />
        <Link href="/configuracoes/tipos-cacamba" className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: var(--space-4);
        }
      `}</style>
    </form>
  );
}
