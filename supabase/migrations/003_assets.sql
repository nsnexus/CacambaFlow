-- =================================================================
-- Migration 003: Caçambas (Ativos)
-- CaçambaFlow — Fase 2 / Módulo 2.4
-- =================================================================

-- --------------------------------
-- Tabela: asset_types (tipos/capacidades)
-- --------------------------------
CREATE TABLE asset_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  volume_m3   NUMERIC(6,2) NOT NULL,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_types_tenant_id ON asset_types(tenant_id);

-- --------------------------------
-- Tabela: assets (caçambas)
-- --------------------------------
CREATE TABLE assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id           UUID REFERENCES branches(id),
  asset_type_id       UUID NOT NULL REFERENCES asset_types(id),
  identifier          TEXT NOT NULL,          -- Número pintado na caçamba
  public_code         TEXT NOT NULL,          -- UUID público para QR Code
  qr_value            TEXT,                   -- Conteúdo do QR: CF1:<public_code>:<checksum>
  color               TEXT,
  status              TEXT NOT NULL DEFAULT 'DISPONIVEL'
                      CHECK (status IN (
                        'DISPONIVEL', 'RESERVADA', 'EM_TRANSPORTE', 'LOCADA',
                        'COLETA_PROGRAMADA', 'EM_DESCARGA', 'EM_LIMPEZA',
                        'MANUTENCAO', 'INATIVA', 'PERDIDA'
                      )),
  current_address_id  UUID,                   -- FK adicionada após criar addresses
  last_latitude       NUMERIC(10,8),
  last_longitude      NUMERIC(11,8),
  acquired_at         DATE,
  last_maintenance_at DATE,
  notes               TEXT,
  version             INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, identifier),
  UNIQUE (public_code)
);

CREATE INDEX idx_assets_tenant_id    ON assets(tenant_id);
CREATE INDEX idx_assets_status       ON assets(tenant_id, status);
CREATE INDEX idx_assets_public_code  ON assets(public_code);

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função para gerar o valor QR automaticamente ao inserir
CREATE OR REPLACE FUNCTION generate_asset_qr()
RETURNS TRIGGER AS $$
BEGIN
  -- Formato: CF1:<public_code>:<primeiros 8 chars do id como checksum simples>
  NEW.qr_value = 'CF1:' || NEW.public_code || ':' || LEFT(NEW.id::TEXT, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_generate_qr
  BEFORE INSERT ON assets
  FOR EACH ROW EXECUTE FUNCTION generate_asset_qr();

-- --------------------------------
-- RLS: assets
-- --------------------------------
ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_types_select_own_tenant"
  ON asset_types FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "asset_types_manage_admin"
  ON asset_types FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'SUPERADMIN'));

CREATE POLICY "assets_select_own_tenant"
  ON assets FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "assets_manage_operador"
  ON assets FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));
