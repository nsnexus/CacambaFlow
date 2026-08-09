'use client';

import { useTransition } from 'react';
import { updateVehicleStatus } from '@/app/actions/vehicles';

type VehicleStatus = 'ATIVO' | 'MANUTENCAO' | 'INATIVO';

export function VehicleStatusSelect({ vehicleId, status }: { vehicleId: string; status: VehicleStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      id="select-vehicle-status"
      className="input"
      style={{ width: 'auto' }}
      disabled={isPending}
      defaultValue={status}
      onChange={(e) => startTransition(() => updateVehicleStatus(vehicleId, e.target.value as VehicleStatus))}
    >
      <option value="ATIVO">Ativo</option>
      <option value="MANUTENCAO">Manutenção</option>
      <option value="INATIVO">Inativo</option>
    </select>
  );
}
