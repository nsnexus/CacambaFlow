-- =================================================================
-- Migration 006: Pedidos, Atendimentos (Jobs) e Histórico de Status
-- CaçambaFlow — Fase 3 / Módulo 3.1
-- =================================================================

-- --------------------------------
-- Tabela: orders (pedidos)
-- --------------------------------
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  address_id      UUID NOT NULL REFERENCES addresses(id),
  order_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ATIVO'
                  CHECK (status IN ('ATIVO', 'CANCELADO', 'CONCLUIDO')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_date  DATE NOT NULL,
  price           NUMERIC(10,2),
  payment_method  TEXT,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, order_number)
);

CREATE INDEX idx_orders_tenant_id  ON orders(tenant_id);
CREATE INDEX idx_orders_customer   ON orders(customer_id);
CREATE INDEX idx_orders_date       ON orders(tenant_id, scheduled_date);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Tabela: jobs (atendimentos / pernas da operação)
-- --------------------------------
CREATE TABLE jobs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  job_number              TEXT NOT NULL,
  job_type                TEXT NOT NULL
                          CHECK (job_type IN ('ENTREGA', 'COLETA', 'TROCA', 'TAREFA')),
  status                  TEXT NOT NULL DEFAULT 'PENDENTE'
                          CHECK (status IN (
                            'RASCUNHO', 'PENDENTE', 'ATRIBUIDO', 'EM_ROTA', 'NO_LOCAL',
                            'EM_EXECUCAO', 'CONCLUIDO_LOCAL', 'SINCRONIZANDO',
                            'CONCLUIDO', 'FALHADO', 'REAGENDADO', 'CANCELADO',
                            'REABERTO', 'ERRO_SYNC'
                          )),
  priority                INTEGER NOT NULL DEFAULT 1,
  scheduled_date          DATE NOT NULL,
  window_start            TIME,
  window_end              TIME,
  expected_asset_type_id  UUID REFERENCES asset_types(id),
  expected_asset_id       UUID REFERENCES assets(id),
  assigned_driver_id      UUID REFERENCES drivers(id),
  assigned_vehicle_id     UUID REFERENCES vehicles(id),
  sequence_number         INTEGER NOT NULL DEFAULT 1,
  swap_group_id           UUID,          -- Para agrupar coleta + entrega simultâneas (troca)
  version                 INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps do ciclo de vida
  published_at            TIMESTAMPTZ,   -- Quando ficou visível no app
  started_at              TIMESTAMPTZ,   -- Quando motorista iniciou rota
  arrived_at              TIMESTAMPTZ,   -- Quando chegou no local
  completed_at            TIMESTAMPTZ,   -- Quando finalizou com sucesso
  failed_at               TIMESTAMPTZ,   -- Quando registrou falha
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, job_number)
);

CREATE INDEX idx_jobs_tenant_id  ON jobs(tenant_id);
CREATE INDEX idx_jobs_order_id   ON jobs(order_id);
CREATE INDEX idx_jobs_driver_id  ON jobs(assigned_driver_id);
CREATE INDEX idx_jobs_status     ON jobs(tenant_id, status);
CREATE INDEX idx_jobs_date       ON jobs(tenant_id, scheduled_date);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Tabela: job_status_events (histórico de eventos)
-- --------------------------------
CREATE TABLE job_status_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL, -- UUID gerado pelo mobile (idempotência)
  from_status         TEXT,
  to_status           TEXT NOT NULL,
  source              TEXT NOT NULL CHECK (source IN ('MOBILE', 'WEB', 'SYSTEM')),
  actor_user_id       UUID REFERENCES profiles(id),
  device_id           UUID,
  occurred_at_device  TIMESTAMPTZ NOT NULL,
  received_at_server  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude            NUMERIC(10,8),
  longitude           NUMERIC(11,8),
  metadata            JSONB,
  UNIQUE (job_id, event_id)
);

CREATE INDEX idx_jse_job_id       ON job_status_events(job_id);
CREATE INDEX idx_jse_received_at  ON job_status_events(received_at_server);

-- --------------------------------
-- RLS
-- --------------------------------
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_events ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE POLICY "orders_select_own_tenant"
  ON orders FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "orders_manage_operador"
  ON orders FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));

-- Jobs (Atendimentos)
-- Motorista vê os jobs atribuídos a ele E os concluídos na sessão atual
CREATE POLICY "jobs_select_own"
  ON jobs FOR SELECT
  USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN')
      OR assigned_driver_id IN (
        SELECT id FROM drivers WHERE profile_id IN (
          SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "jobs_manage_operador"
  ON jobs FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));

-- Motorista pode atualizar o status do job (restrito pelas funções / RLS)
CREATE POLICY "jobs_update_driver"
  ON jobs FOR UPDATE
  USING (
    assigned_driver_id IN (
      SELECT id FROM drivers WHERE profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Eventos de Status
CREATE POLICY "jse_select_own"
  ON job_status_events FOR SELECT
  USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN')
      OR job_id IN (
        SELECT id FROM jobs WHERE assigned_driver_id IN (
          SELECT id FROM drivers WHERE profile_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "jse_insert_own"
  ON job_status_events FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());
