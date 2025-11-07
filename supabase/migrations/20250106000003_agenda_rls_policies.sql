-- Migration: RLS Policies para Agenda
-- Data: 2025-01-06

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE agenda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_tarefas_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_vinculacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_recorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_feriados ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: agenda_tarefas
-- =====================================================

-- SELECT: Ver tarefas do próprio escritório
CREATE POLICY "Usuários podem ver tarefas do próprio escritório"
  ON agenda_tarefas FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- INSERT: Criar tarefas no próprio escritório
CREATE POLICY "Usuários podem criar tarefas no próprio escritório"
  ON agenda_tarefas FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- UPDATE: Atualizar tarefas do próprio escritório
CREATE POLICY "Usuários podem atualizar tarefas do próprio escritório"
  ON agenda_tarefas FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- DELETE: Deletar tarefas do próprio escritório
CREATE POLICY "Usuários podem deletar tarefas do próprio escritório"
  ON agenda_tarefas FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- POLICIES: agenda_audiencias
-- =====================================================

CREATE POLICY "Usuários podem ver audiências do próprio escritório"
  ON agenda_audiencias FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem criar audiências no próprio escritório"
  ON agenda_audiencias FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem atualizar audiências do próprio escritório"
  ON agenda_audiencias FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem deletar audiências do próprio escritório"
  ON agenda_audiencias FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- POLICIES: agenda_tarefas_checklist
-- =====================================================

CREATE POLICY "Usuários podem ver checklist de tarefas do próprio escritório"
  ON agenda_tarefas_checklist FOR SELECT
  USING (
    tarefa_id IN (
      SELECT id FROM agenda_tarefas
      WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem criar checklist para tarefas do próprio escritório"
  ON agenda_tarefas_checklist FOR INSERT
  WITH CHECK (
    tarefa_id IN (
      SELECT id FROM agenda_tarefas
      WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem atualizar checklist de tarefas do próprio escritório"
  ON agenda_tarefas_checklist FOR UPDATE
  USING (
    tarefa_id IN (
      SELECT id FROM agenda_tarefas
      WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem deletar checklist de tarefas do próprio escritório"
  ON agenda_tarefas_checklist FOR DELETE
  USING (
    tarefa_id IN (
      SELECT id FROM agenda_tarefas
      WHERE escritorio_id IN (
        SELECT escritorio_id FROM escritorios_usuarios
        WHERE user_id = auth.uid() AND ativo = true
      )
    )
  );

-- =====================================================
-- POLICIES: agenda_vinculacoes
-- =====================================================

CREATE POLICY "Usuários podem ver vinculações do próprio escritório"
  ON agenda_vinculacoes FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem criar vinculações no próprio escritório"
  ON agenda_vinculacoes FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem deletar vinculações do próprio escritório"
  ON agenda_vinculacoes FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- POLICIES: agenda_lembretes
-- =====================================================

CREATE POLICY "Usuários podem ver lembretes do próprio escritório"
  ON agenda_lembretes FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem criar lembretes no próprio escritório"
  ON agenda_lembretes FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem atualizar lembretes do próprio escritório"
  ON agenda_lembretes FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem deletar lembretes do próprio escritório"
  ON agenda_lembretes FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- POLICIES: agenda_recorrencias
-- =====================================================

CREATE POLICY "Usuários podem ver recorrências do próprio escritório"
  ON agenda_recorrencias FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem criar recorrências no próprio escritório"
  ON agenda_recorrencias FOR INSERT
  WITH CHECK (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem atualizar recorrências do próprio escritório"
  ON agenda_recorrencias FOR UPDATE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "Usuários podem deletar recorrências do próprio escritório"
  ON agenda_recorrencias FOR DELETE
  USING (
    escritorio_id IN (
      SELECT escritorio_id FROM escritorios_usuarios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- =====================================================
-- POLICIES: agenda_feriados
-- =====================================================

-- Feriados: todos podem ver
CREATE POLICY "Todos podem ver feriados"
  ON agenda_feriados FOR SELECT
  USING (true);

-- Feriados: apenas admins podem criar/editar/deletar
CREATE POLICY "Admins podem gerenciar feriados"
  ON agenda_feriados FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM escritorios_usuarios
      WHERE user_id = auth.uid()
        AND ativo = true
        AND role IN ('owner', 'admin')
    )
  );
