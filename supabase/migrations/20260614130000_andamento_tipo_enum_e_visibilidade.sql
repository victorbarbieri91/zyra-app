-- ============================================================
-- Tipos fechados de andamento (enum) + visibilidade ao cliente
-- Aplicada via MCP em 14/06/2026.
-- ============================================================

-- 1) Enum fechado de tipos de andamento
CREATE TYPE andamento_tipo AS ENUM (
  -- Manuais (escolhidos no modal)
  'relatorio_cliente','contato_cliente','acompanhamento_processual','analise_publicacao',
  'peticao_protocolo','recurso','audiencia','acordo','calculo','diligencia',
  'reuniao_interna','observacao_interna','encerramento','outro',
  -- Automáticos (gerados pelo sistema)
  'tarefa_concluida','audiencia_realizada','compromisso_concluido','prazo_cumprido',
  'documento_anexado','processo_encerrado'
);

-- 2) Visibilidade ao cliente (futuro portal); padrão visível
ALTER TABLE processos_movimentacoes ADD COLUMN IF NOT EXISTS visivel_cliente boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN processos_movimentacoes.visivel_cliente IS 'Se o andamento é visível ao cliente (futuro portal) ou interno ao escritório.';

-- 3) Alinhar os triggers existentes aos códigos novos (apenas troca de literais)
CREATE OR REPLACE FUNCTION public.registrar_movimentacao_tarefa_concluida()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_user_nome TEXT;
  v_escritorio_id UUID;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'concluida'
     AND (OLD.status IS NULL OR OLD.status != 'concluida')
     AND NEW.processo_id IS NOT NULL THEN
    v_user_id := COALESCE(auth.uid(), NEW.responsavel_id, NEW.criado_por);
    SELECT nome_completo, escritorio_id INTO v_user_nome, v_escritorio_id FROM profiles WHERE id = v_user_id;
    INSERT INTO processos_movimentacoes (
      id, processo_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao,
      descricao, origem, importante, lida, created_at, referencia_tipo, referencia_id
    ) VALUES (
      gen_random_uuid(), NEW.processo_id, v_escritorio_id, NOW(), 'tarefa_concluida', 'Tarefa concluída',
      'Tarefa "' || NEW.titulo || '" concluída por ' || COALESCE(v_user_nome, 'usuário'),
      'sistema', false, false, NOW(), 'agenda_tarefas', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_audiencia_realizada()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_user_nome TEXT;
  v_escritorio_id UUID;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'realizada'
     AND (OLD.status IS NULL OR OLD.status != 'realizada')
     AND NEW.processo_id IS NOT NULL THEN
    v_user_id := COALESCE(auth.uid(), NEW.responsavel_id, NEW.criado_por);
    SELECT nome_completo, escritorio_id INTO v_user_nome, v_escritorio_id FROM profiles WHERE id = v_user_id;
    INSERT INTO processos_movimentacoes (
      id, processo_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao,
      descricao, origem, importante, lida, created_at, referencia_tipo, referencia_id
    ) VALUES (
      gen_random_uuid(), NEW.processo_id, v_escritorio_id, NOW(), 'audiencia_realizada', 'Audiência realizada',
      'Audiência "' || NEW.titulo || '" realizada por ' || COALESCE(v_user_nome, 'usuário'),
      'sistema', false, false, NOW(), 'agenda_audiencias', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_evento_concluido()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_user_nome TEXT;
  v_escritorio_id UUID;
  v_tipo_codigo TEXT;
  v_tipo_descricao TEXT;
  v_descricao TEXT;
  v_user_id UUID;
BEGIN
  IF NEW.status IN ('concluido', 'cumprido')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('concluido', 'cumprido'))
     AND NEW.processo_id IS NOT NULL THEN
    v_user_id := COALESCE(auth.uid(), NEW.responsavel_id, NEW.created_by);
    SELECT nome_completo, escritorio_id INTO v_user_nome, v_escritorio_id FROM profiles WHERE id = v_user_id;
    IF NEW.subtipo LIKE '%prazo%' THEN
      v_tipo_codigo := 'prazo_cumprido';
      v_tipo_descricao := 'Prazo cumprido';
      v_descricao := 'Prazo "' || NEW.titulo || '" cumprido por ' || COALESCE(v_user_nome, 'usuário');
    ELSE
      v_tipo_codigo := 'compromisso_concluido';
      v_tipo_descricao := 'Compromisso concluído';
      v_descricao := 'Compromisso "' || NEW.titulo || '" concluído por ' || COALESCE(v_user_nome, 'usuário');
    END IF;
    INSERT INTO processos_movimentacoes (
      id, processo_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao,
      descricao, origem, importante, lida, created_at, referencia_tipo, referencia_id
    ) VALUES (
      gen_random_uuid(), NEW.processo_id, v_escritorio_id, NOW(), v_tipo_codigo, v_tipo_descricao,
      v_descricao, 'sistema', false, false, NOW(), 'agenda_eventos', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Normalizar os códigos já existentes (maiúsculo -> minúsculo)
UPDATE processos_movimentacoes SET tipo_codigo='tarefa_concluida'    WHERE tipo_codigo='TAREFA_CONCLUIDA';
UPDATE processos_movimentacoes SET tipo_codigo='audiencia_realizada' WHERE tipo_codigo='AUDIENCIA_REALIZADA';
UPDATE processos_movimentacoes SET tipo_codigo='analise_publicacao'  WHERE tipo_codigo='DESPACHO';

-- 5) De-para dos andamentos manuais antigos (texto livre -> tipo fechado)
UPDATE processos_movimentacoes SET tipo_codigo='relatorio_cliente'         WHERE origem='manual' AND tipo_codigo IS NULL AND tipo_descricao ILIKE '%relat%';
UPDATE processos_movimentacoes SET tipo_codigo='audiencia'                 WHERE origem='manual' AND tipo_codigo IS NULL AND tipo_descricao ILIKE '%audi%';
UPDATE processos_movimentacoes SET tipo_codigo='acordo'                    WHERE origem='manual' AND tipo_codigo IS NULL AND tipo_descricao ILIKE '%acordo%';
UPDATE processos_movimentacoes SET tipo_codigo='calculo'                   WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%cálculo%' OR tipo_descricao ILIKE '%calculo%' OR tipo_descricao ILIKE '%liquida%');
UPDATE processos_movimentacoes SET tipo_codigo='recurso'                   WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%recurso%' OR tipo_descricao ILIKE '%apelaç%' OR tipo_descricao ILIKE '%agravo%');
UPDATE processos_movimentacoes SET tipo_codigo='peticao_protocolo'         WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%protocolo%' OR tipo_descricao ILIKE '%petiç%' OR tipo_descricao ILIKE '%peticao%' OR tipo_descricao ILIKE '%embargo%');
UPDATE processos_movimentacoes SET tipo_codigo='reuniao_interna'          WHERE origem='manual' AND tipo_codigo IS NULL AND tipo_descricao ILIKE '%reuni%';
UPDATE processos_movimentacoes SET tipo_codigo='observacao_interna'       WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%observ%' OR tipo_descricao ILIKE '%intern%' OR tipo_descricao ILIKE '%informaç%');
UPDATE processos_movimentacoes SET tipo_codigo='encerramento'             WHERE origem='manual' AND tipo_codigo IS NULL AND tipo_descricao ILIKE '%encerr%';
UPDATE processos_movimentacoes SET tipo_codigo='analise_publicacao'       WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%despacho%' OR tipo_descricao ILIKE '%senten%' OR tipo_descricao ILIKE '%decis%' OR tipo_descricao ILIKE '%anális%' OR tipo_descricao ILIKE '%analise%');
UPDATE processos_movimentacoes SET tipo_codigo='diligencia'              WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%diligenc%' OR tipo_descricao ILIKE '%correspond%');
UPDATE processos_movimentacoes SET tipo_codigo='contato_cliente'         WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%contato%' OR tipo_descricao ILIKE '%ligaç%' OR tipo_descricao ILIKE '%e-mail%' OR tipo_descricao ILIKE '%email%' OR tipo_descricao ILIKE '%whats%');
UPDATE processos_movimentacoes SET tipo_codigo='acompanhamento_processual' WHERE origem='manual' AND tipo_codigo IS NULL AND (tipo_descricao ILIKE '%andamento%' OR tipo_descricao ILIKE '%atualiz%' OR tipo_descricao ILIKE '%acompanh%');
UPDATE processos_movimentacoes SET tipo_codigo='outro'                    WHERE origem='manual' AND tipo_codigo IS NULL;

-- 6) Converter a coluna para o enum
ALTER TABLE processos_movimentacoes
  ALTER COLUMN tipo_codigo TYPE andamento_tipo USING tipo_codigo::andamento_tipo;
