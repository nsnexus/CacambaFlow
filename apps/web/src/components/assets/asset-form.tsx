'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createAsset, updateAsset, type AssetFormState } from '@/app/actions/assets';
import Link from 'next/link';

type AssetType = { id: string; name: string; volume_m3: number };
type Asset = { id: string; identifier: string; asset_type_id?: string; color?: string };

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      id="btn-submit-cacamba"
      type="submit"
      className="btn btn--primary btn--lg"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Caçamba'}
    </button>
  );
}

export function AssetForm({ assetTypes, asset }: { assetTypes: AssetType[]; asset?: Asset }) {
  const action = asset ? updateAsset.bind(null, asset.id) : createAsset;
  const [state, formAction] = useFormState<AssetFormState, FormData>(action, {});

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div
          id="form-error-message"
          role="alert"
          style={{
            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.875rem',
          }}
        >
          {state.message}
        </div>
      )}

      {assetTypes.length === 0 && (
        <div
          role="alert"
          style={{
            background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            color: 'var(--color-warning)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.875rem',
          }}
        >
          Nenhum tipo de caçamba cadastrado ainda (ex: 5m³, 10m³).{' '}
          <Link href="/configuracoes/tipos-cacamba/novo" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Cadastre um tipo primeiro
          </Link>.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label className="label" htmlFor="asset-identifier">Número / Identificação *</label>
          <input id="asset-identifier" name="identifier" type="text" className="input" required defaultValue={asset?.identifier} placeholder="CB-0001" />
          {state.errors?.identifier && <p className="form-error">{state.errors.identifier[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="asset-type">Tipo *</label>
          <select id="asset-type" name="asset_type_id" className="input" required disabled={assetTypes.length === 0} defaultValue={asset?.asset_type_id ?? ''}>
            <option value="">Selecione...</option>
            {assetTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.volume_m3}m³</option>
            ))}
          </select>
          {state.errors?.asset_type_id && <p className="form-error">{state.errors.asset_type_id[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="asset-color">Cor</label>
          <input id="asset-color" name="color" type="text" className="input" defaultValue={asset?.color} placeholder="Laranja" />
        </div>
      </div>

      <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
        <SubmitButton isEdit={!!asset} />
        <Link href="/cacambas" className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }
      `}</style>
    </form>
  );
}
