-- Migration: Processos - RLS Policies
-- Data: 2025-01-07
-- Descrição: Políticas de segurança Row Level Security para todas tabelas

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE processos_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_partes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_relacionados ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_prazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_templates_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_analise_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_jurisprudencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_estrategia ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_monitoramento ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_alertas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_alertas_enviados ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Verificar se usuário tem acesso ao processo
-- =====================================================

CREATE OR REPLACE FUNCTION user_tem_acesso_processo(p_processo_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM processos_processos p
    WHERE p.id = p_processo_id
      AND p.escritorio_id IN (
        SELECT escritorio_id
        FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Verificar se usuário pode editar processo
-- =====================================================

CREATE OR REPLACE FUNCTION user_pode_editar_processo(p_processo_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Admins e owners podem editar qualquer processo
  IF EXISTS (
    SELECT 1
    FROM escritorios_usuarios eu
    JOIN processos_processos p ON p.escritorio_id = eu.escritorio_id
    WHERE p.id = p_processo_id
      AND eu.user_id = auth.uid()
      AND eu.ativo = true
      AND eu.role IN ('owner', 'admin')
  ) THEN
    RETURN true;
  END IF;

  -- Responsável pode editar
  IF EXISTS (
    SELECT 1
    FROM processos_processos p
    WHERE p.id = p_processo_id
      AND p.responsavel_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- Membro da equipe com permissão pode editar
  IF EXISTS (
    SELECT 1
    FROM processos_equipe e
    WHERE e.processo_id = p_processo_id
      AND e.user_id = auth.uid()
      AND e.pode_editar = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLICIES: processos_processos
-- =====================================================

-- SELECT: Ver processos do próprio escritório
CREATE POLICY "Usuários podem ver processos do próprio escritório"
  ON processos_processos FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- INSERT: Criar processos no próprio escritório
CREATE POLICY "Usuários podem criar processos no próprio escritório"
  ON processos_processos FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- UPDATE: Atualizar se for responsável, equipe ou admin
CREATE POLICY "Usuários podem atualizar processos que gerenciam"
  ON processos_processos FOR UPDATE
  USING (user_pode_editar_processo(id))
  WITH CHECK (user_pode_editar_processo(id));

-- DELETE: Apenas admins podem deletar
CREATE POLICY "Admins podem deletar processos"
  ON processos_processos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM escritorios_usuarios
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('owner', 'admin')
        AND escritorio_id = processos_processos.escritorio_id
    )
  );

-- =====================================================
-- POLICIES: processos_partes
-- =====================================================

CREATE POLICY "Ver partes dos processos acessíveis"
  ON processos_partes FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar partes em processos editáveis"
  ON processos_partes FOR INSERT
  WITH CHECK (user_pode_editar_processo(processo_id));

CREATE POLICY "Atualizar partes em processos editáveis"
  ON processos_partes FOR UPDATE
  USING (user_pode_editar_processo(processo_id))
  WITH CHECK (user_pode_editar_processo(processo_id));

CREATE POLICY "Deletar partes em processos editáveis"
  ON processos_partes FOR DELETE
  USING (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_equipe
-- =====================================================

CREATE POLICY "Ver equipe dos processos acessíveis"
  ON processos_equipe FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Adicionar membros à equipe (responsável ou admin)"
  ON processos_equipe FOR INSERT
  WITH CHECK (user_pode_editar_processo(processo_id));

CREATE POLICY "Atualizar equipe (responsável ou admin)"
  ON processos_equipe FOR UPDATE
  USING (user_pode_editar_processo(processo_id))
  WITH CHECK (user_pode_editar_processo(processo_id));

CREATE POLICY "Remover membros da equipe (responsável ou admin)"
  ON processos_equipe FOR DELETE
  USING (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_tags
-- =====================================================

CREATE POLICY "Ver tags dos processos acessíveis"
  ON processos_tags FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar tags em processos acessíveis"
  ON processos_tags FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Deletar tags em processos acessíveis"
  ON processos_tags FOR DELETE
  USING (user_tem_acesso_processo(processo_id));

-- =====================================================
-- POLICIES: processos_relacionados
-- =====================================================

CREATE POLICY "Ver relacionamentos de processos acessíveis"
  ON processos_relacionados FOR SELECT
  USING (
    user_tem_acesso_processo(processo_origem_id) OR
    user_tem_acesso_processo(processo_destino_id)
  );

CREATE POLICY "Criar relacionamentos em processos editáveis"
  ON processos_relacionados FOR INSERT
  WITH CHECK (
    user_pode_editar_processo(processo_origem_id) AND
    user_tem_acesso_processo(processo_destino_id)
  );

CREATE POLICY "Deletar relacionamentos em processos editáveis"
  ON processos_relacionados FOR DELETE
  USING (user_pode_editar_processo(processo_origem_id));

-- =====================================================
-- POLICIES: processos_movimentacoes
-- =====================================================

CREATE POLICY "Ver movimentações dos processos acessíveis"
  ON processos_movimentacoes FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar movimentações em processos acessíveis"
  ON processos_movimentacoes FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar movimentações (marcar como lida, comentários)"
  ON processos_movimentacoes FOR UPDATE
  USING (user_tem_acesso_processo(processo_id))
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Deletar movimentações (apenas responsável ou admin)"
  ON processos_movimentacoes FOR DELETE
  USING (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_historico
-- =====================================================

CREATE POLICY "Ver histórico dos processos acessíveis"
  ON processos_historico FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

-- Histórico é criado automaticamente via triggers, não precisa INSERT/UPDATE/DELETE manual

-- =====================================================
-- POLICIES: processos_prazos
-- =====================================================

CREATE POLICY "Ver prazos dos processos acessíveis"
  ON processos_prazos FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar prazos em processos acessíveis"
  ON processos_prazos FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar prazos em processos acessíveis"
  ON processos_prazos FOR UPDATE
  USING (user_tem_acesso_processo(processo_id))
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Deletar prazos em processos editáveis"
  ON processos_prazos FOR DELETE
  USING (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_pecas
-- =====================================================

CREATE POLICY "Ver peças dos processos acessíveis"
  ON processos_pecas FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar peças em processos acessíveis"
  ON processos_pecas FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar peças próprias ou se pode editar processo"
  ON processos_pecas FOR UPDATE
  USING (
    criado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  )
  WITH CHECK (
    criado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  );

CREATE POLICY "Deletar peças próprias ou se responsável/admin"
  ON processos_pecas FOR DELETE
  USING (
    criado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  );

-- =====================================================
-- POLICIES: processos_templates_pecas
-- =====================================================

CREATE POLICY "Ver templates do próprio escritório"
  ON processos_templates_pecas FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    ) OR publico = true
  );

CREATE POLICY "Criar templates no próprio escritório"
  ON processos_templates_pecas FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Atualizar templates próprios ou se admin"
  ON processos_templates_pecas FOR UPDATE
  USING (
    criado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM escritorios_usuarios
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('owner', 'admin')
        AND escritorio_id = processos_templates_pecas.escritorio_id
    )
  );

CREATE POLICY "Deletar templates próprios ou se admin"
  ON processos_templates_pecas FOR DELETE
  USING (
    criado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM escritorios_usuarios
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('owner', 'admin')
        AND escritorio_id = processos_templates_pecas.escritorio_id
    )
  );

-- =====================================================
-- POLICIES: processos_documentos
-- =====================================================

CREATE POLICY "Ver documentos dos processos acessíveis"
  ON processos_documentos FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar documentos em processos acessíveis"
  ON processos_documentos FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Deletar documentos próprios ou se pode editar"
  ON processos_documentos FOR DELETE
  USING (
    enviado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  );

-- =====================================================
-- POLICIES: processos_analise_ia
-- =====================================================

CREATE POLICY "Ver análises dos processos acessíveis"
  ON processos_analise_ia FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar análises em processos acessíveis"
  ON processos_analise_ia FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar análises (feedback)"
  ON processos_analise_ia FOR UPDATE
  USING (user_tem_acesso_processo(processo_id));

-- =====================================================
-- POLICIES: processos_jurisprudencias
-- =====================================================

CREATE POLICY "Ver jurisprudências dos processos acessíveis"
  ON processos_jurisprudencias FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar jurisprudências em processos acessíveis"
  ON processos_jurisprudencias FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar jurisprudências próprias ou se pode editar"
  ON processos_jurisprudencias FOR UPDATE
  USING (
    adicionado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  );

CREATE POLICY "Deletar jurisprudências próprias ou se pode editar"
  ON processos_jurisprudencias FOR DELETE
  USING (
    adicionado_por = auth.uid() OR
    user_pode_editar_processo(processo_id)
  );

-- =====================================================
-- POLICIES: processos_estrategia
-- =====================================================

CREATE POLICY "Ver estratégia dos processos acessíveis"
  ON processos_estrategia FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar estratégia em processos acessíveis"
  ON processos_estrategia FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar estratégia se pode editar"
  ON processos_estrategia FOR UPDATE
  USING (user_pode_editar_processo(processo_id))
  WITH CHECK (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_audiencias
-- =====================================================

CREATE POLICY "Ver audiências dos processos acessíveis"
  ON processos_audiencias FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar audiências em processos acessíveis"
  ON processos_audiencias FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar audiências em processos acessíveis"
  ON processos_audiencias FOR UPDATE
  USING (user_tem_acesso_processo(processo_id))
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Deletar audiências se pode editar"
  ON processos_audiencias FOR DELETE
  USING (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_monitoramento
-- =====================================================

CREATE POLICY "Ver monitoramento dos processos acessíveis"
  ON processos_monitoramento FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

CREATE POLICY "Criar monitoramento em processos acessíveis"
  ON processos_monitoramento FOR INSERT
  WITH CHECK (user_tem_acesso_processo(processo_id));

CREATE POLICY "Atualizar monitoramento se pode editar"
  ON processos_monitoramento FOR UPDATE
  USING (user_pode_editar_processo(processo_id))
  WITH CHECK (user_pode_editar_processo(processo_id));

-- =====================================================
-- POLICIES: processos_sync_log
-- =====================================================

CREATE POLICY "Ver logs de sync dos processos acessíveis"
  ON processos_sync_log FOR SELECT
  USING (user_tem_acesso_processo(processo_id));

-- Logs são criados automaticamente pelo sistema

-- =====================================================
-- POLICIES: processos_alertas_config
-- =====================================================

CREATE POLICY "Ver alertas do próprio escritório ou próprios"
  ON processos_alertas_config FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Criar alertas próprios ou no escritório"
  ON processos_alertas_config FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    (user_id IS NULL AND user_tem_acesso_processo(processo_id))
  );

CREATE POLICY "Atualizar alertas próprios ou se admin"
  ON processos_alertas_config FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND user_pode_editar_processo(processo_id))
  );

CREATE POLICY "Deletar alertas próprios ou se admin"
  ON processos_alertas_config FOR DELETE
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND user_pode_editar_processo(processo_id))
  );

-- =====================================================
-- POLICIES: processos_alertas_enviados
-- =====================================================

CREATE POLICY "Ver alertas próprios"
  ON processos_alertas_enviados FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Atualizar alertas próprios (visualizado/clicado)"
  ON processos_alertas_enviados FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Garantir que funções helper possam ser executadas
GRANT EXECUTE ON FUNCTION user_tem_acesso_processo TO authenticated;
GRANT EXECUTE ON FUNCTION user_pode_editar_processo TO authenticated;
GRANT EXECUTE ON FUNCTION create_processo TO authenticated;
GRANT EXECUTE ON FUNCTION get_processo_completo TO authenticated;
GRANT EXECUTE ON FUNCTION add_movimentacao TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_data_prazo TO authenticated;
