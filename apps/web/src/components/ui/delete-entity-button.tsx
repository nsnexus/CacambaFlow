'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

/**
 * Botão redondo de excluir — confirma com window.confirm antes de chamar a
 * server action (ação irreversível). Reutilizado em pedidos, caçambas,
 * motoristas, veículos, clientes, tipos de caçamba e motivos de falha em vez
 * de duplicar a mesma lógica de confirmação/loading/erro em cada tela.
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
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <button
        type="button"
        onClick={handleDelete}
        className="icon-btn icon-btn--danger"
        disabled={isPending}
        title="Excluir"
        aria-label="Excluir"
      >
        {isPending ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
      </button>
      {error && (
        <p
          className="form-error"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            whiteSpace: 'nowrap',
            zIndex: 10,
            background: 'var(--color-surface)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
