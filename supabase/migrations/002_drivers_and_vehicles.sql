-- =================================================================
-- Migration 002: Motoristas e Veículos
-- CaçambaFlow — Fase 2 / Módulo 2.2 e 2.3
-- =================================================================

-- --------------------------------
-- Tabela: drivers (motoristas)
-- --------------------------------
CREATE TABLE drivers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id          UUID NOT NULL REFERENCES profiles(id),
  license_number      TEXT NOT NULL,
  license_category    TEXT NOT NULL,
  license_expires_at  DATE NOT NULL,
  tracking_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  status              TEXT NOT NULL DEFAULT 'ATIVO'
                      CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, license_number)
);

CREATE INDEX idx_drivers_tenant_id  ON drivers(tenant_id);
CREATE INDEX idx_drivers_profile_id ON drivers(profile_id);

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Tabela: vehicles (veículos)
-- --------------------------------
CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES branches(id),
  plate         TEXT NOT NULL,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  color         TEXT,
  year          INTEGER,
  vehicle_type  TEXT NOT NULL DEFAULT 'CAMINHÃO',
  capacity      NUMERIC(8,2),
  status        TEXT NOT NULL DEFAULT 'ATIVO'
                CHECK (status IN ('ATIVO', 'MANUTENCAO', 'INATIVO')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, plate)
);

CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Tabela: driver_vehicle_permissions
-- Vincula motoristas aos veículos autorizados
-- --------------------------------
CREATE TABLE driver_vehicle_permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, vehicle_id)
);

CREATE INDEX idx_dvp_driver_id  ON driver_vehicle_permissions(driver_id);
CREATE INDEX idx_dvp_vehicle_id ON driver_vehicle_permissions(vehicle_id);

-- --------------------------------
-- Tabela: vehicle_sessions (jornadas diárias)
-- --------------------------------
CREATE TABLE vehicle_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id     UUID NOT NULL REFERENCES drivers(id),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id),
  device_id     UUID NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  online_status TEXT NOT NULL DEFAULT 'ONLINE'
                CHECK (online_status IN ('ONLINE', 'OFFLINE')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vsessions_tenant_id  ON vehicle_sessions(tenant_id);
CREATE INDEX idx_vsessions_driver_id  ON vehicle_sessions(driver_id);
CREATE INDEX idx_vsessions_started_at ON vehicle_sessions(started_at DESC);

-- --------------------------------
-- RLS: drivers
-- --------------------------------
ALTER TABLE drivers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicle_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sessions           ENABLE ROW LEVEL SECURITY;

-- drivers: qualquer usuário do tenant pode visualizar
CREATE POLICY "drivers_select_own_tenant"
  ON drivers FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "drivers_manage_admin_gestor"
  ON drivers FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));

-- vehicles
CREATE POLICY "vehicles_select_own_tenant"
  ON vehicles FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "vehicles_manage_admin"
  ON vehicles FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));

-- driver_vehicle_permissions
CREATE POLICY "dvp_select_own_tenant"
  ON driver_vehicle_permissions FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE tenant_id = auth.tenant_id())
  );

CREATE POLICY "dvp_manage_admin"
  ON driver_vehicle_permissions FOR ALL
  USING (
    driver_id IN (SELECT id FROM drivers WHERE tenant_id = auth.tenant_id())
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'SUPERADMIN')
  );

-- vehicle_sessions: motorista vê apenas a própria sessão
CREATE POLICY "vsession_select_own"
  ON vehicle_sessions FOR SELECT
  USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN')
      OR driver_id IN (SELECT id FROM drivers WHERE profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "vsession_insert_driver"
  ON vehicle_sessions FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());
