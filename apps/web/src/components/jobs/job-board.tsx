'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { dispatchJob, unassignJob } from '@/app/actions/jobs';

type Job = any; // Em um cenário real, usaria o tipo completo do Supabase
type Driver = { id: string; profiles: { name: string } };
type Vehicle = { id: string; plate: string };

interface JobBoardProps {
  initialJobs: Job[];
  drivers: Driver[];
  vehicles: Vehicle[];
}

export function JobBoard({ initialJobs, drivers, vehicles }: JobBoardProps) {
  // Para MVP, não faremos drag and drop real. Faremos modals simples/ações em linha para atribuir
  const [jobs, setJobs] = useState(initialJobs);
  const [assigningJob, setAssigningJob] = useState<string | null>(null);

  const pendentes = jobs.filter(j => j.status === 'PENDENTE' || j.status === 'REAGENDADO' || j.status === 'RASCUNHO');
  const atribuidos = jobs.filter(j => j.status === 'ATRIBUIDO');
  const emExecucao = jobs.filter(j => ['EM_ROTA', 'NO_LOCAL', 'EM_EXECUCAO', 'CONCLUIDO_LOCAL', 'SINCRONIZANDO'].includes(j.status));
  const concluidos = jobs.filter(j => ['CONCLUIDO', 'FALHADO', 'ERRO_SYNC'].includes(j.status));

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assigningJob) return;
    
    const formData = new FormData(e.currentTarget);
    const driverId = formData.get('driver_id') as string;
    const vehicleId = formData.get('vehicle_id') as string;
    
    const job = jobs.find(j => j.id === assigningJob);
    if (!job?.order_id) return;
    await dispatchJob(job.order_id, assigningJob, driverId, vehicleId);
    
    // Atualiza otimista
    setJobs(jobs.map(j => 
      j.id === assigningJob 
        ? { ...j, status: 'ATRIBUIDO', drivers: drivers.find(d => d.id === driverId), vehicles: vehicles.find(v => v.id === vehicleId) }
        : j
    ));
    setAssigningJob(null);
  }

  async function handleUnassign(jobId: string) {
    const job = jobs.find(j => j.id === jobId);
    if (!job?.order_id) return;
    await unassignJob(job.order_id, jobId);
    setJobs(jobs.map(j => 
      j.id === jobId 
        ? { ...j, status: 'PENDENTE', drivers: null, vehicles: null }
        : j
    ));
  }

  const renderJobCard = (job: Job, showAssignBtn: boolean = false, showUnassignBtn: boolean = false) => (
    <div key={job.id} className="job-card" style={{ background: 'var(--color-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-3)' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-2)' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem' }}>{job.job_number}</span>
        <StatusBadge status={job.status} />
      </div>
      <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{job.orders.customers.name}</div>
      <div className="text-muted text-xs" style={{ marginBottom: 'var(--space-3)' }}>
        {job.orders.addresses.street}, {job.orders.addresses.number} - {job.orders.addresses.district}
      </div>
      
      <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--space-3)' }}>
        <span className="text-xs" style={{ background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
          {job.job_type}
        </span>
        {job.asset_types?.name && (
          <span className="text-xs" style={{ background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
            {job.asset_types.name}
          </span>
        )}
      </div>

      {job.drivers && (
        <div style={{ padding: 'var(--space-2)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div>👤 {job.drivers.profiles.name}</div>
            {job.vehicles && <div>🚛 {job.vehicles.plate}</div>}
          </div>
          {showUnassignBtn && (
            <button onClick={() => handleUnassign(job.id)} className="text-xs text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Desfazer
            </button>
          )}
        </div>
      )}

      {showAssignBtn && (
        <button 
          onClick={() => setAssigningJob(job.id)} 
          className="btn btn--secondary btn--sm w-full" 
          style={{ width: '100%', marginTop: 'var(--space-2)' }}
        >
          Atribuir
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="kanban-board">
        {/* Coluna 1: Pendentes */}
        <div className="kanban-col">
          <h3 className="kanban-col-header">Pendentes ({pendentes.length})</h3>
          <div className="kanban-col-body">
            {pendentes.map(j => renderJobCard(j, true, false))}
          </div>
        </div>

        {/* Coluna 2: Atribuídos */}
        <div className="kanban-col">
          <h3 className="kanban-col-header">Atribuídos / App ({atribuidos.length})</h3>
          <div className="kanban-col-body">
            {atribuidos.map(j => renderJobCard(j, false, true))}
          </div>
        </div>

        {/* Coluna 3: Em Execução */}
        <div className="kanban-col">
          <h3 className="kanban-col-header">Em Execução ({emExecucao.length})</h3>
          <div className="kanban-col-body">
            {emExecucao.map(j => renderJobCard(j))}
          </div>
        </div>

        {/* Coluna 4: Concluídos */}
        <div className="kanban-col">
          <h3 className="kanban-col-header">Finalizados ({concluidos.length})</h3>
          <div className="kanban-col-body">
            {concluidos.map(j => renderJobCard(j))}
          </div>
        </div>
      </div>

      <style>{`
        .kanban-board {
          display: flex;
          gap: var(--space-4);
          height: calc(100vh - var(--header-height) - 140px);
          overflow-x: auto;
          padding-bottom: var(--space-4);
        }
        .kanban-col {
          flex: 0 0 320px;
          display: flex;
          flex-direction: column;
          background: color-mix(in srgb, var(--color-surface) 50%, transparent);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }
        .kanban-col-header {
          padding: var(--space-4);
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-border);
        }
        .kanban-col-body {
          flex: 1;
          padding: var(--space-3);
          overflow-y: auto;
        }
      `}</style>

      {/* Modal simples de atribuição */}
      {assigningJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Atribuir Atendimento</h2>
            <form onSubmit={handleAssign}>
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Motorista</label>
                <select name="driver_id" className="input" required>
                  <option value="">Selecione...</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.profiles.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="label">Veículo</label>
                <select name="vehicle_id" className="input" required>
                  <option value="">Selecione...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>Confirmar Atribuição</button>
                <button type="button" onClick={() => setAssigningJob(null)} className="btn btn--secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
