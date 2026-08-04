-- =================================================================
-- Migration 001: Tenants, Profiles e Autenticação Multiempresa
-- CaçambaFlow — Fase 1 / Módulo 1.2
-- =================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------
-- Tabela: tenants (empresas)
-- --------------------------------
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  document    TEXT,                    -- CNPJ ou CPF da empresa
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  status      TEXT NOT NULL DEFAULT 'ATIVO'
              CHECK (status IN ('ATIVO', 'INATIVO', 'SUSPENSO')),
  plan_code   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Empresas cadastradas na plataforma CaçambaFlow.';

-- --------------------------------
-- Tabela: branches (filiais)
-- --------------------------------
CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ATIVO'
              CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);

-- --------------------------------
-- Tabela: profiles (usuários do sistema)
-- Vinculado ao Supabase Auth (auth.users)
-- --------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL
                CHECK (role IN ('SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR', 'FINANCEIRO', 'MOTORISTA', 'AUDITOR')),
  status        TEXT NOT NULL DEFAULT 'ATIVO'
                CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant_id    ON profiles(tenant_id);
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);

-- --------------------------------
-- Tabela: audit_logs
-- --------------------------------
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  before_data   JSONB,
  after_data    JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created   ON audit_logs(created_at DESC);

-- --------------------------------
-- Tabela: processed_events (idempotência)
-- --------------------------------
CREATE TABLE processed_events (
  event_id      UUID NOT NULL,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id     UUID NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result        TEXT NOT NULL DEFAULT 'OK',
  PRIMARY KEY (event_id, tenant_id)
);

CREATE INDEX idx_processed_events_tenant ON processed_events(tenant_id);

-- --------------------------------
-- Trigger: atualizar updated_at automaticamente
-- --------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- Row Level Security (RLS)
-- --------------------------------

ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: obter tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função auxiliar: obter role do usuário autenticado
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas: tenants
CREATE POLICY "tenant_select_own"
  ON tenants FOR SELECT
  USING (id = auth.tenant_id());

CREATE POLICY "tenant_update_admin"
  ON tenants FOR UPDATE
  USING (id = auth.tenant_id() AND auth.user_role() IN ('ADMIN', 'SUPERADMIN'));

-- Políticas: branches
CREATE POLICY "branch_select_own_tenant"
  ON branches FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "branch_manage_admin"
  ON branches FOR ALL
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('ADMIN', 'SUPERADMIN'));

-- Políticas: profiles
CREATE POLICY "profile_select_own_tenant"
  ON profiles FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "profile_manage_admin"
  ON profiles FOR ALL
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('ADMIN', 'SUPERADMIN'));

-- Políticas: audit_logs (somente leitura para admins e auditores)
CREATE POLICY "auditlog_select_tenant"
  ON audit_logs FOR SELECT
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('ADMIN', 'SUPERADMIN', 'GESTOR', 'AUDITOR'));

-- Políticas: processed_events (uso interno, somente via service role)
CREATE POLICY "processed_events_service_only"
  ON processed_events FOR ALL
  USING (tenant_id = auth.tenant_id());
