'use client';

import { useTransition, useState } from 'react';
import { updateLeadStatus, type LeadStatus } from '@/app/actions/leads';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loader2 } from 'lucide-react';

interface LeadStatusSelectProps {
  leadId: string;
  currentStatus: LeadStatus;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'NOVO', label: '🟡 Novo' },
  { value: 'ORCAMENTO_ENVIADO', label: '🔵 Orçamento Enviado' },
  { value: 'EM_NEGOCIACAO', label: '🟠 Em Negociação' },
  { value: 'APROVADO', label: '🟢 Aprovado' },
  { value: 'PERDIDO', label: '⚪ Perdido' },
];

export function LeadStatusSelect({ leadId, currentStatus }: LeadStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    setStatus(newStatus);
    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, newStatus);
      } catch (err) {
        console.error('Erro ao atualizar status do lead:', err);
        setStatus(currentStatus);
      }
    });
  };

  return (
    <div className="flex items-center gap-2" style={{ position: 'relative' }}>
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className="input"
        style={{
          padding: '4px 8px',
          fontSize: '0.8125rem',
          height: '32px',
          minWidth: '170px',
          cursor: isPending ? 'wait' : 'pointer',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          borderColor: isPending ? 'var(--color-primary)' : 'var(--color-border)',
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isPending && <Loader2 size={14} className="animate-spin text-muted" style={{ animation: 'spin 1s linear infinite' }} />}
    </div>
  );
}
