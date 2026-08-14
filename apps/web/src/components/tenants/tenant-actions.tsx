'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { deleteTenant, toggleTenantStatus } from '@/app/actions/tenants';
import { Edit, Trash2, Loader2, MoreVertical, PowerOff, CheckCircle } from 'lucide-react';

interface TenantActionsProps {
  tenantId: string;
  tenantName: string;
  currentStatus: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
}

export function TenantActions({ tenantId, tenantName, currentStatus }: TenantActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    setErrorMessage(null);
    if (confirm(`Tem certeza que deseja excluir permanentemente a empresa "${tenantName}"?`)) {
      startTransition(async () => {
        try {
          const res = await deleteTenant(tenantId);
          if (res?.error) {
            alert(res.error);
            setErrorMessage(res.error);
          }
        } catch (err: any) {
          alert('Erro ao excluir empresa: ' + (err.message || 'Falha na requisição'));
        }
      });
    }
  };

  const handleToggleStatus = (newStatus: 'ATIVO' | 'INATIVO' | 'SUSPENSO') => {
    startTransition(async () => {
      try {
        await toggleTenantStatus(tenantId, newStatus);
      } catch (err: any) {
        alert('Erro ao alterar status: ' + err.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/empresas/${tenantId}`}
        className="btn btn--secondary btn--sm"
        id={`btn-edit-tenant-${tenantId}`}
        title="Gerenciar / Editar Empresa"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <Edit size={14} />
        <span>Detalhes</span>
      </Link>

      {currentStatus === 'ATIVO' ? (
        <button
          type="button"
          onClick={() => handleToggleStatus('INATIVO')}
          disabled={isPending}
          className="btn btn--secondary btn--sm"
          title="Desativar Empresa"
          style={{ padding: '6px 8px', color: 'var(--color-warning)' }}
        >
          <PowerOff size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleToggleStatus('ATIVO')}
          disabled={isPending}
          className="btn btn--secondary btn--sm"
          title="Ativar Empresa"
          style={{ padding: '6px 8px', color: 'var(--color-success)' }}
        >
          <CheckCircle size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="btn btn--secondary btn--sm"
        id={`btn-delete-tenant-${tenantId}`}
        title="Excluir Empresa"
        style={{ padding: '6px 8px', color: 'var(--color-danger)' }}
      >
        {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}
