-- ============================================================================
-- Vinculação retroativa de publicações ↔ processos ↔ agendamentos
-- ----------------------------------------------------------------------------
-- Cenário corrigido:
--   1) Publicação chega via AASP/Escavador antes do processo existir → fica
--      com processo_id = NULL.
--   2) Usuário cria a pasta (processo) depois → publicações órfãs ficam
--      perdidas a menos que o fluxo específico da página de Publicações seja
--      usado.
--   3) Tarefa/Evento/Audiência criados a partir da publicação herdam
--      processo_id = NULL.
--
-- Este migration adiciona:
--   • Trigger AFTER INSERT em processos_processos para re-vincular publicações
--     com mesmo escritorio_id e numero_processo = numero_cnj.
--   • Versão BEFORE UPDATE de vincular_publicacao_processo (defensiva: cobre
--     edição manual da publicação que adicionou o numero_processo depois).
--   • Backfill one-shot do estado atual: publicações ↔ processos e
--     agendamentos ↔ processos (via publicacao.agendamento_id).
-- ============================================================================

-- 1) Trigger AFTER INSERT em processos_processos --------------------------------

CREATE OR REPLACE FUNCTION public.vincular_publicacoes_ao_processo_novo()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.numero_cnj IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE publicacoes_publicacoes
  SET processo_id = NEW.id,
      confianca_vinculacao = 1.00
  WHERE escritorio_id = NEW.escritorio_id
    AND processo_id IS NULL
    AND numero_processo IS NOT NULL
    AND numero_processo = NEW.numero_cnj;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_after_insert_vincular_publicacoes ON public.processos_processos;
CREATE TRIGGER trg_after_insert_vincular_publicacoes
  AFTER INSERT ON public.processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION public.vincular_publicacoes_ao_processo_novo();

-- 2) vincular_publicacao_processo passa a rodar também em UPDATE ----------------
-- A função existente já checa `IF NEW.processo_id IS NOT NULL ... RETURN NEW` no
-- topo, então é segura para UPDATE. Adicionamos o gatilho com WHEN para evitar
-- recursão e só agir quando faz sentido.

DROP TRIGGER IF EXISTS trigger_vincular_publicacao_processo_update ON public.publicacoes_publicacoes;
CREATE TRIGGER trigger_vincular_publicacao_processo_update
  BEFORE UPDATE ON public.publicacoes_publicacoes
  FOR EACH ROW
  WHEN (
    NEW.processo_id IS NULL
    AND NEW.numero_processo IS NOT NULL
    AND OLD.numero_processo IS DISTINCT FROM NEW.numero_processo
  )
  EXECUTE FUNCTION public.vincular_publicacao_processo();

-- 3) Backfill one-shot ----------------------------------------------------------

-- 3a) Publicações órfãs com processo já existente
UPDATE publicacoes_publicacoes p
SET processo_id = pr.id,
    confianca_vinculacao = COALESCE(p.confianca_vinculacao, 1.00)
FROM processos_processos pr
WHERE p.processo_id IS NULL
  AND p.numero_processo IS NOT NULL
  AND pr.escritorio_id = p.escritorio_id
  AND pr.numero_cnj = p.numero_processo;

-- 3b) Tarefas órfãs cuja publicação agora aponta para um processo
UPDATE agenda_tarefas t
SET processo_id = p.processo_id
FROM publicacoes_publicacoes p
WHERE t.processo_id IS NULL
  AND p.agendamento_tipo = 'tarefa'
  AND p.agendamento_id = t.id
  AND p.processo_id IS NOT NULL;

-- 3c) Eventos órfãos
UPDATE agenda_eventos e
SET processo_id = p.processo_id
FROM publicacoes_publicacoes p
WHERE e.processo_id IS NULL
  AND p.agendamento_tipo = 'compromisso'
  AND p.agendamento_id = e.id
  AND p.processo_id IS NOT NULL;

-- 3d) Audiências órfãs
UPDATE agenda_audiencias a
SET processo_id = p.processo_id
FROM publicacoes_publicacoes p
WHERE a.processo_id IS NULL
  AND p.agendamento_tipo = 'audiencia'
  AND p.agendamento_id = a.id
  AND p.processo_id IS NOT NULL;
