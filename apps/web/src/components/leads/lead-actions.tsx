'use client';

import { useTransition } from 'react';
import { deleteLead } from '@/app/actions/leads';
import { Trash2, Loader2 } from 'lucide-react';

interface LeadActionsProps {
  leadId: string;
  companyName: string;
}

export function LeadActions({ leadId, companyName }: LeadActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja remover a solicitação da empresa "${companyName}"?`)) {
      startTransition(async () => {
        try {
          await deleteLead(leadId);
        } catch (err) {
          alert('Erro ao excluir solicitação.');
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="btn btn--secondary btn--sm"
      title="Excluir Solicitação"
      style={{
        padding: '6px 8px',
        color: 'var(--color-danger)',
        borderColor: 'var(--color-border)',
      }}
    >
      {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
    </button>
  );
}
