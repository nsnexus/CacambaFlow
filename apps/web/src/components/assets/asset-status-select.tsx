'use client';

import { useTransition } from 'react';
import { updateAssetStatus } from '@/app/actions/assets';

type AssetStatus = 'DISPONIVEL' | 'LOCADA' | 'EM_TRANSPORTE' | 'MANUTENCAO' | 'PERDIDA';

export function AssetStatusSelect({ assetId, status }: { assetId: string; status: AssetStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      id="select-asset-status"
      className="input"
      style={{ width: 'auto' }}
      disabled={isPending}
      defaultValue={status}
      onChange={(e) => startTransition(() => updateAssetStatus(assetId, e.target.value as AssetStatus))}
    >
      <option value="DISPONIVEL">Disponível</option>
      <option value="LOCADA">Locada</option>
      <option value="EM_TRANSPORTE">Em Trânsito (voltando pro depósito)</option>
      <option value="MANUTENCAO">Manutenção</option>
      <option value="PERDIDA">Perdida</option>
    </select>
  );
}
