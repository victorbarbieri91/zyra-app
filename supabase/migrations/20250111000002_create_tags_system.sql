-- Migration: Sistema Centralizado de Tags/Etiquetas
-- Data: 2025-01-11
-- Descrição: Tabela mestre de tags com cores e contextos, tabelas relacionais para associações

-- =====================================================
-- TABELA MESTRE: tags_master
-- =====================================================

CREATE TABLE tags_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Identificação
  nome text NOT NULL,
  cor text NOT NULL, -- Cor em hexadecimal (ex: #EF4444)

  -- Contexto de uso
  contexto text NOT NULL CHECK (contexto IN ('agenda', 'processo', 'consultivo', 'documento')),

  -- Configurações
  is_predefinida boolean DEFAULT false, -- Se é uma tag padrão do sistema
  ordem integer DEFAULT 0, -- Para ordenação customizada pelo usuário
  ativa boolean DEFAULT true, -- Permite desativar sem deletar

  -- Metadados
  descricao text, -- Descrição opcional da tag
  icone text, -- Nome do ícone Lucide (opcional)

  -- Auditoria
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),

  -- Constraint: nome único por escritório e contexto
  UNIQUE(escritorio_id, contexto, nome)
);

-- Índices
CREATE INDEX idx_tags_master_escritorio ON tags_master(escritorio_id);
CREATE INDEX idx_tags_master_contexto ON tags_master(escritorio_id, contexto);
CREATE INDEX idx_tags_master_nome ON tags_master(nome);
CREATE INDEX idx_tags_master_ativa ON tags_master(ativa) WHERE ativa = true;
CREATE INDEX idx_tags_master_predefinida ON tags_master(is_predefinida) WHERE is_predefinida = true;

COMMENT ON TABLE tags_master IS 'Tabela mestre de tags/etiquetas com cores personalizáveis por contexto';

-- =====================================================
-- TABELAS RELACIONAIS: Associações de Tags
-- =====================================================

-- Tags em Tarefas
CREATE TABLE agenda_tarefas_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id uuid NOT NULL REFERENCES agenda_tarefas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags_master(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(tarefa_id, tag_id)
);

CREATE INDEX idx_agenda_tarefas_tags_tarefa ON agenda_tarefas_tags(tarefa_id);
CREATE INDEX idx_agenda_tarefas_tags_tag ON agenda_tarefas_tags(tag_id);

-- Tags em Eventos
CREATE TABLE agenda_eventos_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id uuid NOT NULL REFERENCES agenda_eventos(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags_master(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(evento_id, tag_id)
);

CREATE INDEX idx_agenda_eventos_tags_evento ON agenda_eventos_tags(evento_id);
CREATE INDEX idx_agenda_eventos_tags_tag ON agenda_eventos_tags(tag_id);

-- Tags em Audiências
CREATE TABLE agenda_audiencias_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audiencia_id uuid NOT NULL REFERENCES agenda_audiencias(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags_master(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(audiencia_id, tag_id)
);

CREATE INDEX idx_agenda_audiencias_tags_audiencia ON agenda_audiencias_tags(audiencia_id);
CREATE INDEX idx_agenda_audiencias_tags_tag ON agenda_audiencias_tags(tag_id);

-- Atualizar tabela processos_tags existente para usar tags_master
-- Primeiro criar a nova coluna, depois migraremos os dados
ALTER TABLE processos_tags ADD COLUMN tag_id uuid REFERENCES tags_master(id) ON DELETE CASCADE;
CREATE INDEX idx_processos_tags_tag_id ON processos_tags(tag_id);

-- Tags em Consultivos (assumindo que existe ou será criado)
CREATE TABLE IF NOT EXISTS consultivo_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultivo_id uuid NOT NULL, -- FK será criada quando módulo consultivo estiver completo
  tag_id uuid NOT NULL REFERENCES tags_master(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(consultivo_id, tag_id)
);

CREATE INDEX idx_consultivo_tags_consultivo ON consultivo_tags(consultivo_id);
CREATE INDEX idx_consultivo_tags_tag ON consultivo_tags(tag_id);

-- Tags em Documentos/Pastas (assumindo estrutura de documentos)
CREATE TABLE IF NOT EXISTS documentos_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id uuid NOT NULL, -- FK será criada quando módulo documentos estiver completo
  tag_id uuid NOT NULL REFERENCES tags_master(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(documento_id, tag_id)
);

CREATE INDEX idx_documentos_tags_documento ON documentos_tags(documento_id);
CREATE INDEX idx_documentos_tags_tag ON documentos_tags(tag_id);

-- =====================================================
-- TRIGGERS: Auditoria e Ordenação
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tags_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tags_master_updated_at
  BEFORE UPDATE ON tags_master
  FOR EACH ROW
  EXECUTE FUNCTION update_tags_master_updated_at();

-- Trigger para definir ordem automática ao criar tag
CREATE OR REPLACE FUNCTION set_tag_default_ordem()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem = 0 THEN
    SELECT COALESCE(MAX(ordem), 0) + 1
    INTO NEW.ordem
    FROM tags_master
    WHERE escritorio_id = NEW.escritorio_id
      AND contexto = NEW.contexto;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_tag_default_ordem
  BEFORE INSERT ON tags_master
  FOR EACH ROW
  EXECUTE FUNCTION set_tag_default_ordem();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE tags_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_tarefas_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_eventos_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_audiencias_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultivo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_tags ENABLE ROW LEVEL SECURITY;

-- Policies para tags_master
CREATE POLICY "Ver tags do próprio escritório"
  ON tags_master FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.escritorio_id = tags_master.escritorio_id
    )
  );

CREATE POLICY "Criar tags no próprio escritório"
  ON tags_master FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.escritorio_id = tags_master.escritorio_id
    )
  );

CREATE POLICY "Editar tags do próprio escritório"
  ON tags_master FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.escritorio_id = tags_master.escritorio_id
    )
  );

CREATE POLICY "Deletar tags do próprio escritório (exceto predefinidas)"
  ON tags_master FOR DELETE
  USING (
    is_predefinida = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.escritorio_id = tags_master.escritorio_id
    )
  );

-- Policies para tabelas relacionais (exemplo para tarefas, replicar para outras)
CREATE POLICY "Ver tags das próprias tarefas"
  ON agenda_tarefas_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_tarefas t
      JOIN profiles p ON p.escritorio_id = t.escritorio_id
      WHERE t.id = agenda_tarefas_tags.tarefa_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Adicionar tags às próprias tarefas"
  ON agenda_tarefas_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_tarefas t
      JOIN profiles p ON p.escritorio_id = t.escritorio_id
      WHERE t.id = agenda_tarefas_tags.tarefa_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Remover tags das próprias tarefas"
  ON agenda_tarefas_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agenda_tarefas t
      JOIN profiles p ON p.escritorio_id = t.escritorio_id
      WHERE t.id = agenda_tarefas_tags.tarefa_id
      AND p.id = auth.uid()
    )
  );

-- Replicar policies similares para outras tabelas relacionais
-- (eventos, audiências, processos, consultivo, documentos)

CREATE POLICY "Ver tags dos próprios eventos"
  ON agenda_eventos_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_eventos e
      JOIN profiles p ON p.escritorio_id = e.escritorio_id
      WHERE e.id = agenda_eventos_tags.evento_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Adicionar tags aos próprios eventos"
  ON agenda_eventos_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_eventos e
      JOIN profiles p ON p.escritorio_id = e.escritorio_id
      WHERE e.id = agenda_eventos_tags.evento_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Remover tags dos próprios eventos"
  ON agenda_eventos_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agenda_eventos e
      JOIN profiles p ON p.escritorio_id = e.escritorio_id
      WHERE e.id = agenda_eventos_tags.evento_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Ver tags das próprias audiências"
  ON agenda_audiencias_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_audiencias a
      JOIN profiles p ON p.escritorio_id = a.escritorio_id
      WHERE a.id = agenda_audiencias_tags.audiencia_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Adicionar tags às próprias audiências"
  ON agenda_audiencias_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_audiencias a
      JOIN profiles p ON p.escritorio_id = a.escritorio_id
      WHERE a.id = agenda_audiencias_tags.audiencia_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Remover tags das próprias audiências"
  ON agenda_audiencias_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agenda_audiencias a
      JOIN profiles p ON p.escritorio_id = a.escritorio_id
      WHERE a.id = agenda_audiencias_tags.audiencia_id
      AND p.id = auth.uid()
    )
  );
