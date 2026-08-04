-- =================================================================
-- Migration 004: Clientes e Endereços
-- CaçambaFlow — Fase 2 / Módulo 2.5
-- =================================================================

-- --------------------------------
-- Tabela: customers (clientes)
-- --------------------------------
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL DEFAULT 'PF'
              CHECK (person_type IN ('PF', 'PJ')),
  name        TEXT NOT NULL,
  document    TEXT,             -- CPF ou CNPJ
  phone       TEXT,
  whatsapp    TEXT,
  email       TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'ATIVO'
              CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_name      ON customers(tenant_id, name);
CREATE INDEX idx_customers_document  ON customers(tenant_id, document);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Tabela: addresses (endereços/obras)
-- --------------------------------
CREATE TABLE addresses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,           -- Nome da obra
  postal_code       TEXT,
  street            TEXT NOT NULL,
  number            TEXT,
  complement        TEXT,
  district          TEXT,
  city              TEXT NOT NULL,
  state             CHAR(2) NOT NULL,
  latitude          NUMERIC(10,8),
  longitude         NUMERIC(11,8),
  parking_type      TEXT,                    -- Tipo de estacionamento
  reference_point   TEXT,
  access_notes      TEXT,                    -- Restrições de acesso
  window_start      TIME,                    -- Janela de atendimento início
  window_end        TIME,                    -- Janela de atendimento fim
  contact_name      TEXT,
  contact_phone     TEXT,
  status            TEXT NOT NULL DEFAULT 'ATIVO'
                    CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_tenant_id   ON addresses(tenant_id);
CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_addresses_city        ON addresses(tenant_id, city);

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agora que addresses existe, adicionar FK em assets
ALTER TABLE assets
  ADD CONSTRAINT fk_assets_current_address
  FOREIGN KEY (current_address_id) REFERENCES addresses(id);

-- --------------------------------
-- RLS: customers e addresses
-- --------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_own_tenant"
  ON customers FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "customers_manage_operador"
  ON customers FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));

CREATE POLICY "addresses_select_own_tenant"
  ON addresses FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "addresses_manage_operador"
  ON addresses FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN'));
