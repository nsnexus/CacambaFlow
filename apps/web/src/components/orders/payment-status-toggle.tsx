'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderPaymentStatus } from '@/app/actions/orders';

export function PaymentStatusToggle({ orderId, status }: { orderId: string; status: 'PAGO' | 'PENDENTE' }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next = status === 'PAGO' ? 'PENDENTE' : 'PAGO';

  return (
    <button
      id="btn-toggle-payment-status"
      className="btn btn--secondary btn--sm"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await updateOrderPaymentStatus(orderId, next);
        router.refresh();
      })}
    >
      {isPending ? 'Atualizando...' : status === 'PAGO' ? 'Marcar como Pendente' : 'Marcar como Pago'}
    </button>
  );
}
