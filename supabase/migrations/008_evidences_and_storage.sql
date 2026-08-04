-- =================================================================
-- Migration 008: Evidências, Fotos e Supabase Storage
-- CaçambaFlow — Fase 7 / Módulo 7.1
-- =================================================================

-- --------------------------------
-- Tabela: evidences (Registro em banco)
-- --------------------------------
CREATE TABLE evidences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  evidence_type       TEXT NOT NULL
                      CHECK (evidence_type IN (
                        'FOTO_ENTREGA', 'FOTO_COLETA', 'FOTO_LOCAL',
                        'FOTO_RESIDUO', 'FOTO_AVARIA', 'ASSINATURA', 'DOCUMENTO'
                      )),
  storage_path        TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           BIGINT,
  sha256              TEXT,
  captured_at_device  TIMESTAMPTZ NOT NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude            NUMERIC(10,8),
  longitude           NUMERIC(11,8),
  created_by          UUID REFERENCES profiles(id),
  status              TEXT NOT NULL DEFAULT 'UPLOAD_OK'
                      CHECK (status IN ('PENDENTE', 'UPLOAD_OK', 'ERRO')),
  UNIQUE (tenant_id, storage_path)
);

CREATE INDEX idx_evidences_tenant ON evidences(tenant_id, uploaded_at DESC);
CREATE INDEX idx_evidences_job    ON evidences(job_id);

-- --------------------------------
-- RLS para Tabela Evidence
-- --------------------------------
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidences_select_own"
  ON evidences FOR SELECT
  USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.user_role() IN ('ADMIN', 'GESTOR', 'OPERADOR', 'SUPERADMIN', 'AUDITOR')
      OR job_id IN (
        SELECT id FROM jobs WHERE assigned_driver_id IN (
          SELECT id FROM drivers WHERE profile_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "evidences_insert_own"
  ON evidences FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

-- --------------------------------
-- Configuração do Supabase Storage
-- Requer a extensão "storage" ativa no projeto
-- --------------------------------
-- Nota: A criação do bucket em SQL direto depende da API interna do Supabase.
-- Se o comando der erro porque a tabela storage.buckets não existe localmente sem o supabase CLI, 
-- o usuário deve criar o bucket manualmente pelo painel. Mas normalmente o schema storage já vem habilitado.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidences', 
  'evidences', 
  false, 
  10485760, -- 10MB limite
  '{image/jpeg, image/png, image/webp, application/pdf}'
) ON CONFLICT (id) DO NOTHING;

-- RLS do Storage
-- Apenas usuários autenticados da plataforma podem ler arquivos do bucket.
CREATE POLICY "Storage_Evidences_Select" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'evidences' AND auth.role() = 'authenticated');

-- Qualquer usuário autenticado pode inserir. O aplicativo formata o caminho assim:
-- <tenant_id>/<job_id>/<uuid>.jpg
CREATE POLICY "Storage_Evidences_Insert" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'evidences' AND auth.role() = 'authenticated');
