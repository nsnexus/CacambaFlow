-- =================================================================
-- Migration 007: Log de Localização (Telemetria GPS)
-- CaçambaFlow — Fase 6 / Módulo 6.1
-- =================================================================

CREATE TABLE driver_locations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id        UUID REFERENCES vehicles(id),
  job_id            UUID REFERENCES jobs(id),
  latitude          NUMERIC(10,8) NOT NULL,
  longitude         NUMERIC(11,8) NOT NULL,
  accuracy          NUMERIC(8,2),
  speed             NUMERIC(8,2),
  heading           NUMERIC(8,2),
  device_timestamp  TIMESTAMPTZ NOT NULL,
  server_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para busca de última localização (real-time do mapa)
CREATE INDEX idx_locations_driver ON driver_locations(tenant_id, driver_id, device_timestamp DESC);
CREATE INDEX idx_locations_job    ON driver_locations(tenant_id, job_id, device_timestamp DESC);

-- Opcional (se usar particionamento no futuro): particionar por tenant_id ou data.
-- Sendo um MVP, apenas índices são suficientes.

-- RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_locations_insert_own"
  ON driver_locations FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "driver_locations_select_admin"
  ON driver_locations FOR SELECT
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));
