// =====================================================================
// CaçambaFlow — Tipos de Sincronização Offline
// =====================================================================

export type SyncEventType =
  | 'JOB_STARTED'
  | 'JOB_ARRIVED'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'JOB_PAUSED'
  | 'EVIDENCE_CAPTURED'
  | 'LOCATION_BATCH'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED';

export interface SyncOutboxEvent {
  event_id: string;          // UUID único — garante idempotência
  tenant_id: string;
  device_id: string;
  aggregate_type: 'job' | 'session' | 'location';
  aggregate_id: string;
  event_type: SyncEventType;
  occurred_at_device: string; // ISO 8601 com timezone
  payload: Record<string, unknown>;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export interface SyncStatus {
  is_online: boolean;
  last_push_at: string | null;
  last_pull_at: string | null;
  pending_events: number;
  pending_files: number;
  current_error: string | null;
}
