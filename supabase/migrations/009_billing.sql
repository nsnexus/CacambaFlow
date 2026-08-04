-- =================================================================
-- Migration 009: Faturamento (Billing) e Pagamentos
-- CaçambaFlow — Fase 8 / Módulo 8.1
-- =================================================================

-- --------------------------------
-- Tabela: invoices (Faturas / Cobranças)
-- --------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  invoice_number  TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO')),
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant_id  ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX idx_invoices_order      ON invoices(order_id);
CREATE INDEX idx_invoices_status     ON invoices(status);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------
-- RLS para Faturas
-- --------------------------------
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own"
  ON invoices FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "invoices_manage_finance"
  ON invoices FOR ALL
  USING (tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('ADMIN', 'GESTOR', 'SUPERADMIN'));
    
-- (Motoristas e Operadores padrão não têm acesso à tabela de faturas)
