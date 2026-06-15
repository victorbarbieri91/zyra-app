-- ============================================================
-- M3b · Consultivo: migrar andamentos JSONB -> tabela + repontar triggers
-- O campo JSONB consultivo_consultas.andamentos PERMANECE intacto (backup).
-- Atômica: tudo ou nada.
-- ============================================================

-- 1) Migrar entradas do JSONB (exceto 'criacao', gerado no passo 2)
INSERT INTO consultivo_movimentacoes
  (consulta_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, referencia_tipo, referencia_id, created_by, created_at)
SELECT
  c.id,
  c.escritorio_id,
  COALESCE((a->>'data')::timestamptz, c.created_at, now()),
  (CASE
     WHEN a->>'tipo' = 'tarefa_concluida'       THEN 'tarefa_concluida'
     WHEN a->>'tipo' = 'audiencia_realizada'    THEN 'outro'
     WHEN lower(a->>'tipo') = 'arquivamento'    THEN 'arquivada'
     ELSE 'outro'
   END)::consultivo_andamento_tipo,
  (CASE
     WHEN a->>'tipo' = 'tarefa_concluida'       THEN 'Tarefa concluída'
     WHEN a->>'tipo' = 'audiencia_realizada'    THEN 'Audiência realizada'
     WHEN lower(a->>'tipo') = 'arquivamento'    THEN 'Arquivada'
     ELSE a->>'tipo'   -- preserva o rótulo original do texto livre
   END),
  COALESCE(a->>'descricao',''),
  CASE WHEN (a ? 'referencia_tipo') THEN 'sistema' ELSE 'manual' END,
  a->>'referencia_tipo',
  CASE WHEN (a->>'referencia_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN (a->>'referencia_id')::uuid ELSE NULL END,
  CASE WHEN (a->>'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN (a->>'user_id')::uuid ELSE NULL END,
  COALESCE((a->>'data')::timestamptz, c.created_at, now())
FROM consultivo_consultas c
CROSS JOIN LATERAL jsonb_array_elements(c.andamentos) a
WHERE jsonb_typeof(c.andamentos) = 'array'
  AND COALESCE(a->>'tipo','') <> 'criacao';

-- 2) Gerar "Consulta criada" (1 por consulta, das 206)
INSERT INTO consultivo_movimentacoes
  (consulta_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, created_by, created_at)
SELECT
  c.id, c.escritorio_id, COALESCE(c.created_at, now()),
  'consulta_criada', 'Consulta criada',
  'Consulta criada: ' || LEFT(COALESCE(c.titulo,'Sem título'), 80),
  'sistema', COALESCE(c.created_by, c.responsavel_id), COALESCE(c.created_at, now())
FROM consultivo_consultas c;

-- 3) Repontar os triggers de agenda para escreverem na TABELA (não mais no JSONB)

CREATE OR REPLACE FUNCTION public.registrar_andamento_tarefa_concluida()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_user_nome TEXT;
  v_escritorio_id UUID;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'concluida'
     AND (OLD.status IS NULL OR OLD.status <> 'concluida')
     AND NEW.consultivo_id IS NOT NULL THEN
    v_user_id := COALESCE(auth.uid(), NEW.responsavel_id, NEW.criado_por);
    SELECT nome_completo INTO v_user_nome FROM profiles WHERE id = v_user_id;
    SELECT escritorio_id INTO v_escritorio_id FROM consultivo_consultas WHERE id = NEW.consultivo_id;
    INSERT INTO consultivo_movimentacoes
      (consulta_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, referencia_tipo, referencia_id, created_by)
    VALUES
      (NEW.consultivo_id, v_escritorio_id, NOW(), 'tarefa_concluida', 'Tarefa concluída',
       'Tarefa "' || NEW.titulo || '" concluída por ' || COALESCE(v_user_nome,'usuário'),
       'sistema', 'agenda_tarefas', NEW.id, v_user_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_andamento_evento_concluido()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_user_nome TEXT;
  v_escritorio_id UUID;
  v_user_id UUID;
  v_descricao TEXT;
BEGIN
  IF NEW.status IN ('concluido','cumprido')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('concluido','cumprido'))
     AND NEW.consultivo_id IS NOT NULL THEN
    v_user_id := COALESCE(auth.uid(), NEW.responsavel_id, NEW.created_by);
    SELECT nome_completo INTO v_user_nome FROM profiles WHERE id = v_user_id;
    SELECT escritorio_id INTO v_escritorio_id FROM consultivo_consultas WHERE id = NEW.consultivo_id;
    IF NEW.subtipo LIKE '%prazo%' THEN
      v_descricao := 'Prazo "' || NEW.titulo || '" cumprido por ' || COALESCE(v_user_nome,'usuário');
    ELSE
      v_descricao := 'Compromisso "' || NEW.titulo || '" concluído por ' || COALESCE(v_user_nome,'usuário');
    END IF;
    INSERT INTO consultivo_movimentacoes
      (consulta_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, referencia_tipo, referencia_id, created_by)
    VALUES
      (NEW.consultivo_id, v_escritorio_id, NOW(), 'compromisso_concluido', 'Compromisso concluído',
       v_descricao, 'sistema', 'agenda_eventos', NEW.id, v_user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Consultivo não usa audiência: remove o trigger + função de audiência do consultivo
DROP FUNCTION IF EXISTS public.registrar_andamento_audiencia_realizada() CASCADE;
