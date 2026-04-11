-- =====================================================
-- FASE 2: Reescrever funções consumidoras para usar formas_pagamento
-- =====================================================
-- 7 funções refatoradas, todas via helper contrato_tem_forma() criado na Fase 1.
-- Cada função passa a reconhecer contratos híbridos (que têm múltiplas formas
-- no array formas_pagamento) ao invés de filtrar pelo enum único forma_cobranca.
-- =====================================================

-- 1. get_valor_hora_contrato
-- Antes: WHERE forma_cobranca = 'por_hora'
-- Agora: aceita qualquer contrato que tenha 'por_hora' em formas_pagamento
CREATE OR REPLACE FUNCTION public.get_valor_hora_contrato(p_contrato_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_valor NUMERIC;
BEGIN
  SELECT (config->>'valor_hora')::NUMERIC
  INTO v_valor
  FROM financeiro_contratos_honorarios
  WHERE id = p_contrato_id
    AND contrato_tem_forma(id, 'por_hora');

  RETURN v_valor;
END;
$function$;

-- =====================================================
-- 2. validar_modalidade_processo (trigger)
-- Lê formas_pagamento[0] explicitamente em vez de forma_cobranca,
-- com fallback para forma_cobranca caso o array esteja inconsistente.
-- =====================================================
CREATE OR REPLACE FUNCTION public.validar_modalidade_processo()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_primeira_forma text;
BEGIN
  IF NEW.contrato_id IS NULL THEN
    NEW.modalidade_cobranca := NULL;
    RETURN NEW;
  END IF;

  IF NEW.modalidade_cobranca IS NULL THEN
    SELECT COALESCE(formas_pagamento->0->>'forma', forma_cobranca)
    INTO v_primeira_forma
    FROM financeiro_contratos_honorarios
    WHERE id = NEW.contrato_id;

    NEW.modalidade_cobranca := v_primeira_forma;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 3. trigger_detectar_ato_cobravel
-- Antes: só processava se forma_cobranca = 'por_ato'
-- Agora: processa se 'por_ato' está em qualquer posição do array formas_pagamento.
-- Isso significa que contratos híbridos (ex: CONT-0001 [fixo, por_ato])
-- agora também geram alertas automáticos de cobrança de atos.
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_detectar_ato_cobravel()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contrato_id UUID;
  v_escritorio_id UUID;
  v_valor_causa NUMERIC;
  v_mapeamento RECORD;
  v_valor_sugerido NUMERIC;
  v_descricao_lower TEXT;
  v_tipo_lower TEXT;
BEGIN
  SELECT pp.contrato_id, pp.escritorio_id, pp.valor_causa
    INTO v_contrato_id, v_escritorio_id, v_valor_causa
    FROM processos_processos pp
   WHERE pp.id = NEW.processo_id;

  IF v_contrato_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mudança: usar contrato_tem_forma em vez de comparar forma_cobranca
  IF NOT contrato_tem_forma(v_contrato_id, 'por_ato') THEN
    RETURN NEW;
  END IF;

  v_descricao_lower := LOWER(COALESCE(NEW.descricao, ''));
  v_tipo_lower := LOWER(COALESCE(NEW.tipo_descricao, ''));

  FOR v_mapeamento IN
    SELECT m.*, t.nome AS ato_nome
      FROM financeiro_mapeamento_atos_movimentacao m
      JOIN financeiro_atos_processuais_tipos t ON t.id = m.ato_tipo_id
     WHERE m.escritorio_id = v_escritorio_id
       AND m.ativo = true
       AND t.ativo = true
  LOOP
    IF EXISTS (
      SELECT 1 FROM unnest(v_mapeamento.palavras_chave) AS palavra
      WHERE v_descricao_lower LIKE '%' || LOWER(palavra) || '%'
         OR v_tipo_lower LIKE '%' || LOWER(palavra) || '%'
    ) THEN
      SELECT COALESCE(
        (elem->>'valor_fixo')::NUMERIC,
        CASE WHEN (elem->>'percentual_valor_causa')::NUMERIC IS NOT NULL
          THEN v_valor_causa * (elem->>'percentual_valor_causa')::NUMERIC / 100
          ELSE NULL
        END
      ) INTO v_valor_sugerido
      FROM financeiro_contratos_honorarios fch,
           jsonb_array_elements(fch.atos) AS elem
      WHERE fch.id = v_contrato_id
        AND (elem->>'ato_tipo_id')::UUID = v_mapeamento.ato_tipo_id
      LIMIT 1;

      IF NOT EXISTS (
        SELECT 1 FROM financeiro_alertas_cobranca
        WHERE movimentacao_id = NEW.id
      ) THEN
        INSERT INTO financeiro_alertas_cobranca (
          escritorio_id, processo_id, movimentacao_id, ato_tipo_id,
          tipo_alerta, titulo, descricao, valor_sugerido, status
        ) VALUES (
          v_escritorio_id, NEW.processo_id, NEW.id, v_mapeamento.ato_tipo_id,
          'ato_processual', v_mapeamento.ato_nome,
          'Detectado automaticamente: ' || COALESCE(NEW.descricao, NEW.tipo_descricao, ''),
          v_valor_sugerido, 'pendente'
        );
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 4. aplicar_reajuste_contrato
-- Antes: bloqueava se forma_cobranca NOT IN ('fixo', 'por_pasta')
-- Agora: bloqueia se contrato NÃO tem nem 'fixo' nem 'por_pasta' em formas_pagamento
-- =====================================================
CREATE OR REPLACE FUNCTION public.aplicar_reajuste_contrato(
  p_contrato_id uuid,
  p_indice text DEFAULT 'INPC'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_contrato RECORD;
  v_resultado RECORD;
  v_data_base date;
  v_valor_base numeric;
BEGIN
  SELECT id, valor_total, valor_atualizado, data_inicio, data_ultimo_reajuste
    INTO v_contrato
    FROM financeiro_contratos_honorarios
   WHERE id = p_contrato_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato não encontrado');
  END IF;

  -- Mudança: aceitar contrato se tem fixo OU por_pasta em formas_pagamento
  IF NOT (contrato_tem_forma(p_contrato_id, 'fixo') OR contrato_tem_forma(p_contrato_id, 'por_pasta')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reajuste só aplicável a contratos com cobrança fixa ou por pasta');
  END IF;

  IF v_contrato.valor_total IS NULL OR v_contrato.valor_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato sem valor definido');
  END IF;

  IF v_contrato.data_ultimo_reajuste IS NOT NULL AND v_contrato.valor_atualizado IS NOT NULL THEN
    v_data_base := v_contrato.data_ultimo_reajuste;
    v_valor_base := v_contrato.valor_atualizado;
  ELSE
    v_data_base := v_contrato.data_inicio;
    v_valor_base := v_contrato.valor_total;
  END IF;

  SELECT * INTO v_resultado
    FROM calcular_correcao_monetaria(v_valor_base, v_data_base, CURRENT_DATE, p_indice);

  IF v_resultado.fator_correcao = 1.0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Período insuficiente para reajuste');
  END IF;

  UPDATE financeiro_contratos_honorarios
  SET valor_atualizado = v_resultado.valor_corrigido,
      indice_reajuste = p_indice,
      data_ultimo_reajuste = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_contrato_id;

  RETURN jsonb_build_object(
    'success', true,
    'contrato_id', p_contrato_id,
    'valor_anterior', v_valor_base,
    'valor_atualizado', v_resultado.valor_corrigido,
    'fator_correcao', v_resultado.fator_correcao,
    'indice', p_indice
  );
END;
$function$;

-- =====================================================
-- 5. atualizar_contratos_reajuste_escritorio
-- Antes: WHERE forma_cobranca IN ('fixo', 'por_pasta')
-- Agora: filtra por contratos que tenham 'fixo' OU 'por_pasta' em formas_pagamento
-- =====================================================
CREATE OR REPLACE FUNCTION public.atualizar_contratos_reajuste_escritorio(p_escritorio_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_contrato RECORD;
  v_total integer := 0;
  v_atualizados integer := 0;
  v_erros integer := 0;
  v_resultado jsonb;
BEGIN
  FOR v_contrato IN
    SELECT id, indice_reajuste
      FROM financeiro_contratos_honorarios
     WHERE escritorio_id = p_escritorio_id
       AND ativo = true
       AND reajuste_ativo = true
       AND (contrato_tem_forma(id, 'fixo') OR contrato_tem_forma(id, 'por_pasta'))
       AND valor_total IS NOT NULL
       AND valor_total > 0
  LOOP
    v_total := v_total + 1;

    v_resultado := aplicar_reajuste_contrato(
      v_contrato.id,
      COALESCE(v_contrato.indice_reajuste, 'INPC')
    );

    IF (v_resultado->>'success')::boolean THEN
      v_atualizados := v_atualizados + 1;
    ELSE
      v_erros := v_erros + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'escritorio_id', p_escritorio_id,
    'total_contratos', v_total,
    'atualizados', v_atualizados,
    'erros', v_erros,
    'data_execucao', now()
  );
END;
$function$;

-- =====================================================
-- 6. calcular_valor_timesheet_mensal
-- Antes: só retornava se forma_cobranca IN ('por_hora', 'por_cargo')
-- Agora: aceita contratos que tenham qualquer um desses no array de formas
-- =====================================================
CREATE OR REPLACE FUNCTION public.calcular_valor_timesheet_mensal(
  p_contrato_id uuid,
  p_mes date
)
RETURNS TABLE(
  total_horas numeric,
  valor_hora_usado numeric,
  valor_bruto numeric,
  valor_final numeric,
  aplicou_minimo boolean,
  aplicou_maximo boolean
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_total_horas NUMERIC := 0;
  v_valor_hora NUMERIC := 0;
  v_valor_bruto NUMERIC := 0;
  v_valor_final NUMERIC := 0;
  v_min NUMERIC;
  v_max NUMERIC;
  v_aplicou_minimo BOOLEAN := FALSE;
  v_aplicou_maximo BOOLEAN := FALSE;
  v_tem_por_hora BOOLEAN;
  v_tem_por_cargo BOOLEAN;
BEGIN
  -- Validar que contrato cobra horas (por_hora ou por_cargo)
  v_tem_por_hora := contrato_tem_forma(p_contrato_id, 'por_hora');
  v_tem_por_cargo := contrato_tem_forma(p_contrato_id, 'por_cargo');

  IF NOT v_tem_por_hora AND NOT v_tem_por_cargo THEN
    RETURN;
  END IF;

  -- Buscar config de valor_hora e limites
  SELECT
    (fch.config->>'valor_hora')::NUMERIC,
    (fch.config->>'valor_minimo_mensal')::NUMERIC,
    (fch.config->>'valor_maximo_mensal')::NUMERIC
  INTO v_valor_hora, v_min, v_max
  FROM financeiro_contratos_honorarios fch
  WHERE fch.id = p_contrato_id;

  -- Calcular total de horas faturáveis aprovadas no mês
  SELECT COALESCE(SUM(ft.horas), 0)
  INTO v_total_horas
  FROM financeiro_timesheet ft
  JOIN processos_processos pp ON pp.id = ft.processo_id
  WHERE pp.contrato_id = p_contrato_id
    AND ft.aprovado = TRUE
    AND ft.faturado = FALSE
    AND ft.faturavel = TRUE
    AND DATE_TRUNC('month', ft.data_trabalho) = DATE_TRUNC('month', p_mes);

  -- Para por_cargo, ainda é TODO calcular por cargo (mantém comportamento atual)
  IF v_tem_por_cargo AND NOT v_tem_por_hora THEN
    v_valor_bruto := 0;
    v_valor_final := 0;
  ELSE
    -- por_hora (sozinho ou combinado com por_cargo): usar taxa única
    IF v_valor_hora IS NOT NULL THEN
      v_valor_bruto := v_total_horas * v_valor_hora;
      v_valor_final := v_valor_bruto;

      IF v_min IS NOT NULL AND v_valor_final < v_min THEN
        v_valor_final := v_min;
        v_aplicou_minimo := TRUE;
      END IF;

      IF v_max IS NOT NULL AND v_valor_final > v_max THEN
        v_valor_final := v_max;
        v_aplicou_maximo := TRUE;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_total_horas,
    v_valor_hora,
    v_valor_bruto,
    v_valor_final,
    v_aplicou_minimo,
    v_aplicou_maximo;
END;
$function$;

-- =====================================================
-- 7. gerar_receitas_contrato
-- Adiciona validação: contrato precisa ter 'fixo' OU 'por_pasta' em formas_pagamento
-- para gerar receitas (até hoje a função apenas dependia de valores_fixos no config,
-- o que poderia gerar receitas indevidas em contratos não-fixos).
-- =====================================================
CREATE OR REPLACE FUNCTION public.gerar_receitas_contrato(
  p_contrato_id uuid,
  p_meses integer DEFAULT 1,
  p_data_inicio date DEFAULT NULL::date,
  p_parcelado boolean DEFAULT false,
  p_numero_parcelas integer DEFAULT 1
)
RETURNS TABLE(
  receita_id uuid,
  descricao text,
  valor numeric,
  data_vencimento date,
  mes_numero integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_contrato RECORD;
  v_config JSONB;
  v_valor_fixo RECORD;
  v_valores_fixos JSONB;
  v_data_base DATE;
  v_dia_cobranca INTEGER;
  v_mes INTEGER;
  v_data_venc DATE;
  v_receita_id UUID;
  v_descricao TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  SELECT c.id, c.escritorio_id, c.cliente_id, c.config, c.titulo,
         c.data_inicio, c.formas_pagamento, c.forma_cobranca, c.ativo,
         p.nome_completo AS cliente_nome
    INTO v_contrato
    FROM financeiro_contratos_honorarios c
    JOIN crm_pessoas p ON p.id = c.cliente_id
   WHERE c.id = p_contrato_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  IF NOT v_contrato.ativo THEN
    RAISE EXCEPTION 'Contrato está encerrado';
  END IF;

  -- Validação nova: o contrato precisa ter pelo menos uma forma de cobrança recorrente
  IF NOT (contrato_tem_forma(p_contrato_id, 'fixo') OR contrato_tem_forma(p_contrato_id, 'por_pasta')) THEN
    RAISE EXCEPTION 'Geração de receitas só é permitida em contratos que cobram valor fixo ou por pasta';
  END IF;

  v_config := COALESCE(v_contrato.config, '{}'::jsonb);
  v_dia_cobranca := COALESCE((v_config->>'dia_cobranca')::integer, 1);
  v_data_base := COALESCE(p_data_inicio, CURRENT_DATE);
  v_valores_fixos := v_config->'valores_fixos';

  IF v_valores_fixos IS NULL OR jsonb_array_length(v_valores_fixos) = 0 THEN
    IF (v_config->>'valor_fixo') IS NOT NULL THEN
      v_valores_fixos := jsonb_build_array(
        jsonb_build_object(
          'descricao', 'Mensalidade',
          'valor', (v_config->>'valor_fixo')::numeric
        )
      );
    ELSE
      RAISE EXCEPTION 'Contrato não possui valores fixos configurados';
    END IF;
  END IF;

  IF p_meses < 1 OR p_meses > 24 THEN
    RAISE EXCEPTION 'Número de meses deve ser entre 1 e 24';
  END IF;

  IF p_parcelado AND (p_numero_parcelas < 2 OR p_numero_parcelas > 60) THEN
    RAISE EXCEPTION 'Número de parcelas deve ser entre 2 e 60';
  END IF;

  FOR v_mes IN 0..(p_meses - 1) LOOP
    v_data_venc := make_date(
      EXTRACT(YEAR FROM (v_data_base + (v_mes * INTERVAL '1 month')))::integer,
      EXTRACT(MONTH FROM (v_data_base + (v_mes * INTERVAL '1 month')))::integer,
      LEAST(v_dia_cobranca,
        EXTRACT(DAY FROM (
          date_trunc('month', v_data_base + (v_mes * INTERVAL '1 month')) + INTERVAL '1 month - 1 day'
        ))::integer
      )
    );

    FOR v_valor_fixo IN
      SELECT
        COALESCE(elem->>'descricao', 'Mensalidade') AS descricao,
        (elem->>'valor')::numeric AS valor
      FROM jsonb_array_elements(v_valores_fixos) AS elem
      WHERE (elem->>'valor')::numeric > 0
    LOOP
      IF EXISTS (
        SELECT 1 FROM financeiro_receitas fr
        WHERE fr.contrato_id = p_contrato_id
          AND fr.data_vencimento = v_data_venc
          AND fr.descricao = v_valor_fixo.descricao
          AND fr.tipo = 'honorario'
          AND fr.status != 'cancelado'
      ) THEN
        CONTINUE;
      END IF;

      v_descricao := v_valor_fixo.descricao;

      INSERT INTO financeiro_receitas (
        escritorio_id, tipo, cliente_id, contrato_id, descricao, categoria,
        valor, data_competencia, data_vencimento, status, parcelado, numero_parcelas, created_by
      ) VALUES (
        v_contrato.escritorio_id,
        'honorario'::receita_tipo_enum,
        v_contrato.cliente_id,
        p_contrato_id,
        v_descricao,
        'honorarios'::receita_categoria_enum,
        v_valor_fixo.valor,
        date_trunc('month', v_data_venc)::date,
        v_data_venc,
        'pendente'::receita_status_enum,
        p_parcelado,
        CASE WHEN p_parcelado THEN p_numero_parcelas ELSE 1 END,
        v_user_id
      )
      RETURNING id INTO v_receita_id;

      receita_id := v_receita_id;
      descricao := v_descricao;
      valor := v_valor_fixo.valor;
      data_vencimento := v_data_venc;
      mes_numero := v_mes + 1;
      RETURN NEXT;
    END LOOP;
  END LOOP;

  RETURN;
END;
$function$;
