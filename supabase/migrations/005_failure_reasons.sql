-- =================================================================
-- Migration 005: Motivos de Falha
-- CaçambaFlow — Fase 2 / Módulo 2.6
-- =================================================================

CREATE TABLE failure_reasons (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'OPERACAO'
                        CHECK (category IN (
                          'CLIENTE', 'VEICULO', 'ACESSO', 'CLIMA', 'ATIVO', 'OPERACAO', 'OUTRO'
                        )),
  requires_note         BOOLEAN NOT NULL DEFAULT FALSE,
  requires_photo        BOOLEAN NOT NULL DEFAULT FALSE,
  allow_auto_reschedule BOOLEAN NOT NULL DEFAULT FALSE,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_failure_reasons_tenant_id ON failure_reasons(tenant_id);

CREATE TRIGGER trg_failure_reasons_updated_at
  BEFORE UPDATE ON failure_reasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inserir motivos padrão (serão clonados por tenant ao criar conta)
-- Apenas como seed de referência
-- INSERT INTO failure_reasons (tenant_id, name, category, requires_note, requires_photo) VALUES ...

-- --------------------------------
-- RLS
-- --------------------------------
ALTER TABLE failure_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "failure_reasons_select_own_tenant"
  ON failure_reasons FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "failure_reasons_manage_admin"
  ON failure_reasons FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'SUPERADMIN'));
