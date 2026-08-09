'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  createFailureReason,
  updateFailureReason,
  type FailureReasonFormState,
} from '@/app/actions/failure-reasons';

const CATEGORY_LABELS: Record<string, string> = {
  CLIENTE: 'Cliente',
  VEICULO: 'Veículo',
  ACESSO: 'Acesso',
  CLIMA: 'Clima',
  ATIVO: 'Ativo/Caçamba',
  OPERACAO: 'Operação',
  OUTRO: 'Outro',
};

type FailureReason = {
  id: string;
  name: string;
  category: string;
  requires_note: boolean;
  requires_photo: boolean;
  allow_auto_reschedule: boolean;
  active: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button id="btn-submit-motivo" type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar Motivo'}
    </button>
  );
}

export function FailureReasonForm({ reason }: { reason?: FailureReason }) {
  const action = reason ? updateFailureReason.bind(null, reason.id) : createFailureReason;
  const [state, formAction] = useFormState<FailureReasonFormState, FormData>(action, {});

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div role="alert" style={{
          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-6)',
          fontSize: '0.875rem',
        }}>
          {state.message}
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="form-group">
          <label className="label" htmlFor="reason-name">Nome *</label>
          <input id="reason-name" name="name" type="text" className="input" required defaultValue={reason?.name} placeholder="Ex: Cliente ausente" />
          {state.errors?.name && <p className="form-error">{state.errors.name[0]}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="reason-category">Categoria *</label>
          <select id="reason-category" name="category" className="input" required defaultValue={reason?.category ?? ''}>
            <option value="">Selecione...</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {state.errors?.category && <p className="form-error">{state.errors.category[0]}</p>}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input name="requires_note" type="checkbox" value="true" defaultChecked={reason?.requires_note ?? false} />
          <span style={{ fontSize: '0.875rem' }}>Exige observação do motorista</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input name="requires_photo" type="checkbox" value="true" defaultChecked={reason?.requires_photo ?? false} />
          <span style={{ fontSize: '0.875rem' }}>Exige foto do motorista</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input name="allow_auto_reschedule" type="checkbox" value="true" defaultChecked={reason?.allow_auto_reschedule ?? false} />
          <span style={{ fontSize: '0.875rem' }}>Permite reagendamento automático</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input name="active" type="checkbox" value="true" defaultChecked={reason?.active ?? true} />
          <span style={{ fontSize: '0.875rem' }}>Ativo (disponível para o motorista selecionar)</span>
        </label>
      </div>

      <div className="flex gap-4">
        <SubmitButton />
        <Link href="/configuracoes/motivos-falha" className="btn btn--secondary btn--lg">Cancelar</Link>
      </div>

      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }
      `}</style>
    </form>
  );
}
