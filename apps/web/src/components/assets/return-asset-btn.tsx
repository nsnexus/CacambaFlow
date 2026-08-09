'use client';

import { useTransition } from 'react';
import { returnAsset } from '@/app/actions/assets';

export function ReturnAssetBtn({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      id="btn-registrar-coleta"
      className="btn btn--secondary btn--sm"
      disabled={isPending}
      onClick={() => startTransition(() => returnAsset(assetId))}
    >
      {isPending ? 'Registrando...' : 'Registrar Coleta'}
    </button>
  );
}
