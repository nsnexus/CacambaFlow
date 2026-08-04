// =====================================================================
// CaçambaFlow — Tipos do Domínio
// Estes tipos espelham o banco de dados (Supabase) e são compartilhados
// entre o painel web e o app mobile.
// =====================================================================

// --- Enums de Status ---

export type JobStatus =
  | 'RASCUNHO'
  | 'PENDENTE'
  | 'ATRIBUIDO'
  | 'EM_ROTA'
  | 'NO_LOCAL'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO_LOCAL'
  | 'SINCRONIZANDO'
  | 'CONCLUIDO'
  | 'FALHADO'
  | 'REAGENDADO'
  | 'CANCELADO'
  | 'REABERTO'
  | 'ERRO_SYNC';

export type JobType = 'ENTREGA' | 'COLETA' | 'TROCA' | 'TAREFA';

export type AssetStatus =
  | 'DISPONIVEL'
  | 'RESERVADA'
  | 'EM_TRANSPORTE'
  | 'LOCADA'
  | 'COLETA_PROGRAMADA'
  | 'EM_DESCARGA'
  | 'EM_LIMPEZA'
  | 'MANUTENCAO'
  | 'INATIVA'
  | 'PERDIDA';

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'GESTOR'
  | 'OPERADOR'
  | 'FINANCEIRO'
  | 'MOTORISTA'
  | 'AUDITOR';

export type PersonType = 'PF' | 'PJ';

export type FailureCategory =
  | 'CLIENTE'
  | 'VEICULO'
  | 'ACESSO'
  | 'CLIMA'
  | 'ATIVO'
  | 'OPERACAO'
  | 'OUTRO';

export type EvidenceType =
  | 'FOTO_ENTREGA'
  | 'FOTO_COLETA'
  | 'FOTO_LOCAL'
  | 'FOTO_RESIDUO'
  | 'FOTO_AVARIA'
  | 'ASSINATURA'
  | 'DOCUMENTO'
  | 'LOCALIZACAO'
  | 'OBSERVACAO';

// --- Entidades principais ---

export interface Tenant {
  id: string;
  name: string;
  document: string | null;
  timezone: string;
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  plan_code: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: 'ATIVO' | 'INATIVO';
  created_at: string;
}

export interface Driver {
  id: string;
  tenant_id: string;
  profile_id: string;
  license_number: string;
  license_category: string;
  license_expires_at: string;
  tracking_enabled: boolean;
  status: 'ATIVO' | 'INATIVO';
  created_at: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  plate: string;
  brand: string;
  model: string;
  color: string;
  vehicle_type: string;
  capacity: number | null;
  status: 'ATIVO' | 'MANUTENCAO' | 'INATIVO';
  created_at: string;
}

export interface AssetType {
  id: string;
  tenant_id: string;
  name: string;
  volume_m3: number;
  description: string | null;
}

export interface Asset {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  asset_type_id: string;
  identifier: string;
  public_code: string;
  qr_value: string | null;
  status: AssetStatus;
  current_address_id: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  version: number;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  person_type: PersonType;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: 'ATIVO' | 'INATIVO';
  created_at: string;
}

export interface Address {
  id: string;
  tenant_id: string;
  customer_id: string;
  name: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string;
  address_id: string;
  order_number: string;
  status: 'ATIVO' | 'CANCELADO' | 'CONCLUIDO';
  requested_at: string;
  scheduled_date: string;
  price: number | null;
  payment_method: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Job {
  id: string;
  tenant_id: string;
  order_id: string;
  job_number: string;
  job_type: JobType;
  status: JobStatus;
  priority: number;
  scheduled_date: string;
  window_start: string | null;
  window_end: string | null;
  expected_asset_type_id: string | null;
  expected_asset_id: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  sequence_number: number;
  swap_group_id: string | null;
  version: number;
  published_at: string | null;
  started_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export interface JobStatusEvent {
  id: string;
  tenant_id: string;
  job_id: string;
  event_id: string;
  from_status: JobStatus | null;
  to_status: JobStatus;
  source: 'MOBILE' | 'WEB' | 'SYSTEM';
  actor_user_id: string | null;
  device_id: string | null;
  occurred_at_device: string;
  received_at_server: string;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
}

export interface Evidence {
  id: string;
  tenant_id: string;
  job_id: string;
  evidence_type: EvidenceType;
  storage_path: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  captured_at_device: string;
  uploaded_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  status: 'PENDENTE' | 'UPLOAD_OK' | 'ERRO';
}

export interface FailureReason {
  id: string;
  tenant_id: string;
  name: string;
  category: FailureCategory;
  requires_note: boolean;
  requires_photo: boolean;
  active: boolean;
}

export interface DriverLocation {
  id: string;
  tenant_id: string;
  driver_id: string;
  vehicle_id: string;
  job_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  device_timestamp: string;
  server_timestamp: string;
}

// --- Tipo Database para o cliente Supabase ---
// Este tipo será gerado automaticamente pelo CLI do Supabase após as migrations.
// Por enquanto é um placeholder.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
  };
};

// --- Re-exports ---
export * from './sync';
