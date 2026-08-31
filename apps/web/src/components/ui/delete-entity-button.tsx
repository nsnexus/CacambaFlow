'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Botão de excluir genérico — confirma com window.confirm antes de chamar a
 * server action (ação irreversível). Reutilizado em pedidos, caçambas,
 * motoristas, veículos e clientes em vez de duplicar a mesma lógica de
 * confirmação/loading/erro em cada tela.
 */
export function DeleteEntityButton({
  id,
  confirmMessage,
  action,
  redirectTo,
}: {
  id: string;
  confirmMessage: string;
  action: (id: string) => Promise<{ message?: string }>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleDelete() {
    if (!window.confirm(confirmMessage)) return;

    setError('');
    startTransition(async () => {
      const result = await action(id);
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
