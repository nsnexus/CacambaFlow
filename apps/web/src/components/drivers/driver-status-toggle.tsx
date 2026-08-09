'use client';

import { useTransition } from 'react';
import { updateDriverStatus } from '@/app/actions/drivers';

export function DriverStatusToggle({ driverId, status }: { driverId: string; status: 'ATIVO' | 'INATIVO' }) {
  const [isPending, startTransition] = useTransition();
  const next = status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

  return (
    <button
      id="btn-toggle-driver-status"
      className="btn btn--secondary btn--sm"
      disabled={isPending}
      onClick={() => startTransition(() => updateDriverStatus(driverId, next))}
    >
      {isPending ? 'Atualizando...' : status === 'ATIVO' ? 'Desativar' : 'Ativar'}
    </button>
  );
}
