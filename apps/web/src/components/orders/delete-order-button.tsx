'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteOrder } from '@/app/actions/orders';

/**
 * Exclui o pedido (e os atendimentos dele) depois de confirmar — ação
 * irreversível, por isso o window.confirm em vez de um clique direto.
 * `redirectTo` é usado na página de detalhe (volta pra lista depois de
 * apagar); sem isso, só atualiza a lista no lugar (router.refresh).
 */
export function DeleteOrderButton({
  orderId,
  orderNumber,
  redirectTo,
}: {
  orderId: string;
  orderNumber: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleDelete() {
    const confirmed = window.confirm(
      `Excluir o pedido ${orderNumber}?\n\nIsso apaga também todos os atendimentos (jobs) dele. Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setError('');
    startTransition(async () => {
      const result = await deleteOrder(orderId);
      if (result.message) {
        setError(result.message);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button type="button" onClick={handleDelete} className="btn btn--danger btn--sm" disabled={isPending}>
        {isPending ? 'Excluindo...' : 'Excluir'}
      </button>
      {error && <p className="form-error" style={{ marginTop: 'var(--space-1)' }}>{error}</p>}
    </div>
  );
}
