-- Migration: Seed de Tags Pré-definidas
-- Data: 2025-01-11
-- Descrição: Inserir tags padrão do sistema para cada contexto em todos os escritórios

-- =====================================================
-- FUNCTION: Criar Tags Pré-definidas para um Escritório
-- =====================================================

CREATE OR REPLACE FUNCTION seed_default_tags_for_escritorio(p_escritorio_id uuid)
RETURNS void AS $$
BEGIN
  -- =====================================================
  -- TAGS DE AGENDA (contexto: 'agenda')
  -- =====================================================

  INSERT INTO tags_master (escritorio_id, nome, cor, contexto, is_predefinida, ordem) VALUES
  (p_escritorio_id, 'Urgente', '#EF4444', 'agenda', true, 1),
  (p_escritorio_id, 'Prioridade Alta', '#F97316', 'agenda', true, 2),
  (p_escritorio_id, 'Acompanhamento Semanal', '#EAB308', 'agenda', true, 3),
  (p_escritorio_id, 'Follow-up', '#3B82F6', 'agenda', true, 4),
  (p_escritorio_id, 'Administrativo', '#6B7280', 'agenda', true, 5),
  (p_escritorio_id, 'Reunião Interna', '#8B5CF6', 'agenda', true, 6),
  (p_escritorio_id, 'Cliente VIP', '#EC4899', 'agenda', true, 7),
  (p_escritorio_id, 'Prazo Fatal', '#DC2626', 'agenda', true, 8)
  ON CONFLICT (escritorio_id, contexto, nome) DO NOTHING;

  -- =====================================================
  -- TAGS DE PROCESSO (contexto: 'processo')
  -- =====================================================

  INSERT INTO tags_master (escritorio_id, nome, cor, contexto, is_predefinida, ordem) VALUES
  (p_escritorio_id, '1ª Instância', '#10B981', 'processo', true, 1),
  (p_escritorio_id, '2ª Instância', '#3B82F6', 'processo', true, 2),
  (p_escritorio_id, 'STJ', '#8B5CF6', 'processo', true, 3),
  (p_escritorio_id, 'STF', '#991B1B', 'processo', true, 4),
  (p_escritorio_id, 'Aguardando Distribuição', '#EAB308', 'processo', true, 5),
  (p_escritorio_id, 'Suspenso', '#F97316', 'processo', true, 6),
  (p_escritorio_id, 'Arquivado', '#6B7280', 'processo', true, 7),
  (p_escritorio_id, 'Sentença Favorável', '#059669', 'processo', true, 8),
  (p_escritorio_id, 'Sentença Desfavorável', '#DC2626', 'processo', true, 9),
  (p_escritorio_id, 'Em Acordo', '#14B8A6', 'processo', true, 10),
  (p_escritorio_id, 'Trabalhista', '#F59E0B', 'processo', true, 11),
  (p_escritorio_id, 'Cível', '#3B82F6', 'processo', true, 12),
  (p_escritorio_id, 'Criminal', '#DC2626', 'processo', true, 13),
  (p_escritorio_id, 'Família', '#EC4899', 'processo', true, 14),
  (p_escritorio_id, 'Tributário', '#8B5CF6', 'processo', true, 15),
  (p_escritorio_id, 'Previdenciário', '#06B6D4', 'processo', true, 16)
  ON CONFLICT (escritorio_id, contexto, nome) DO NOTHING;

  -- =====================================================
  -- TAGS DE CONSULTIVO (contexto: 'consultivo')
  -- =====================================================

  INSERT INTO tags_master (escritorio_id, nome, cor, contexto, is_predefinida, ordem) VALUES
  (p_escritorio_id, 'Parecer Jurídico', '#3B82F6', 'consultivo', true, 1),
  (p_escritorio_id, 'Análise de Contrato', '#10B981', 'consultivo', true, 2),
  (p_escritorio_id, 'Due Diligence', '#8B5CF6', 'consultivo', true, 3),
  (p_escritorio_id, 'Compliance', '#F97316', 'consultivo', true, 4),
  (p_escritorio_id, 'LGPD', '#EC4899', 'consultivo', true, 5),
  (p_escritorio_id, 'Trabalhista Consultivo', '#EAB308', 'consultivo', true, 6),
  (p_escritorio_id, 'Societário', '#06B6D4', 'consultivo', true, 7),
  (p_escritorio_id, 'Regulatório', '#DC2626', 'consultivo', true, 8),
  (p_escritorio_id, 'M&A', '#991B1B', 'consultivo', true, 9),
  (p_escritorio_id, 'Contencioso Estratégico', '#6366F1', 'consultivo', true, 10)
  ON CONFLICT (escritorio_id, contexto, nome) DO NOTHING;

  -- =====================================================
  -- TAGS DE DOCUMENTO (contexto: 'documento')
  -- =====================================================

  INSERT INTO tags_master (escritorio_id, nome, cor, contexto, is_predefinida, ordem) VALUES
  (p_escritorio_id, 'Confidencial', '#EF4444', 'documento', true, 1),
  (p_escritorio_id, 'Público', '#10B981', 'documento', true, 2),
  (p_escritorio_id, 'Aguardando Revisão', '#EAB308', 'documento', true, 3),
  (p_escritorio_id, 'Aprovado', '#059669', 'documento', true, 4),
  (p_escritorio_id, 'Rascunho', '#6B7280', 'documento', true, 5),
  (p_escritorio_id, 'Assinatura Pendente', '#F97316', 'documento', true, 6),
  (p_escritorio_id, 'Arquivado', '#475569', 'documento', true, 7),
  (p_escritorio_id, 'Vencido', '#DC2626', 'documento', true, 8),
  (p_escritorio_id, 'Importante', '#EC4899', 'documento', true, 9),
  (p_escritorio_id, 'Template', '#8B5CF6', 'documento', true, 10)
  ON CONFLICT (escritorio_id, contexto, nome) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_default_tags_for_escritorio IS 'Cria tags pré-definidas para um escritório específico em todos os contextos';

-- =====================================================
-- Seed para Escritórios Existentes
-- =====================================================

-- Aplicar seed em todos os escritórios existentes
DO $$
DECLARE
  escritorio_record RECORD;
BEGIN
  FOR escritorio_record IN SELECT id FROM escritorios LOOP
    PERFORM seed_default_tags_for_escritorio(escritorio_record.id);
  END LOOP;
END $$;

-- =====================================================
-- TRIGGER: Criar Tags Automáticas para Novos Escritórios
-- =====================================================

CREATE OR REPLACE FUNCTION auto_seed_tags_for_new_escritorio()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_default_tags_for_escritorio(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_seed_tags
  AFTER INSERT ON escritorios
  FOR EACH ROW
  EXECUTE FUNCTION auto_seed_tags_for_new_escritorio();

COMMENT ON TRIGGER trigger_auto_seed_tags ON escritorios IS 'Cria automaticamente tags pré-definidas quando um novo escritório é criado';
