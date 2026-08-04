-- =================================================================
-- Seed: Motivos de falha padrão
-- Execute após criar uma empresa e obter o tenant_id
-- Substitua '<TENANT_ID>' pelo UUID real da empresa
-- =================================================================

-- Para usar: copie e cole no SQL Editor do Supabase, substituindo o tenant_id

DO $$
DECLARE
  v_tenant UUID := '<TENANT_ID>'; -- Substitua aqui
BEGIN
  INSERT INTO failure_reasons (tenant_id, name, category, requires_note, requires_photo, allow_auto_reschedule)
  VALUES
    -- Categoria: Cliente
    (v_tenant, 'Cliente ausente', 'CLIENTE', TRUE, FALSE, TRUE),
    (v_tenant, 'Cliente solicitou cancelamento', 'CLIENTE', TRUE, FALSE, FALSE),
    (v_tenant, 'Endereço não localizado', 'CLIENTE', TRUE, FALSE, TRUE),
    (v_tenant, 'Cliente solicitou reagendamento', 'CLIENTE', TRUE, FALSE, TRUE),

    -- Categoria: Acesso
    (v_tenant, 'Rua sem acesso para caminhão', 'ACESSO', TRUE, TRUE, TRUE),
    (v_tenant, 'Portão fechado / sem chave', 'ACESSO', TRUE, FALSE, TRUE),
    (v_tenant, 'Obra sem espaço para caçamba', 'ACESSO', TRUE, TRUE, FALSE),
    (v_tenant, 'Via interditada / bloqueada', 'ACESSO', TRUE, TRUE, TRUE),

    -- Categoria: Veículo
    (v_tenant, 'Pane mecânica do veículo', 'VEICULO', TRUE, FALSE, FALSE),
    (v_tenant, 'Pneu furado', 'VEICULO', TRUE, FALSE, FALSE),
    (v_tenant, 'Acidente com o veículo', 'VEICULO', TRUE, TRUE, FALSE),

    -- Categoria: Ativo
    (v_tenant, 'Caçamba danificada', 'ATIVO', TRUE, TRUE, FALSE),
    (v_tenant, 'Número da caçamba divergente', 'ATIVO', TRUE, TRUE, FALSE),
    (v_tenant, 'Caçamba não encontrada no local', 'ATIVO', TRUE, FALSE, FALSE),

    -- Categoria: Clima
    (v_tenant, 'Chuva forte / alagamento', 'CLIMA', TRUE, FALSE, TRUE),
    (v_tenant, 'Neblina / visibilidade baixa', 'CLIMA', TRUE, FALSE, TRUE),

    -- Categoria: Operação
    (v_tenant, 'Tempo insuficiente na rota', 'OPERACAO', TRUE, FALSE, TRUE),
    (v_tenant, 'Encerramento de jornada', 'OPERACAO', TRUE, FALSE, FALSE),

    -- Categoria: Outro
    (v_tenant, 'Outro motivo', 'OUTRO', TRUE, FALSE, FALSE);
END;
$$;
