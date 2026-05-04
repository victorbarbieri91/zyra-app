-- ============================================================================
-- Sincronização de autor/reu/parte_contraria/polo_cliente em processos_processos
-- ----------------------------------------------------------------------------
-- Mantém os campos legados desnormalizados sempre coerentes com a fonte real
-- (processos_partes + cliente_id), via trigger AFTER em processos_partes.
--
-- Regra (mesma de src/hooks/useProcessoPartes.ts:78-89):
--   autor = string_agg(nome, ' e ' ORDER BY ordem) FILTER (tipo='autor')
--   reu   = string_agg(nome, ' e ' ORDER BY ordem) FILTER (tipo='reu')
--
-- O trigger só toca em processos_processos.{autor,reu} → sem recursão.
-- ============================================================================

-- 1) Função recalculadora -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalcular_autor_reu_processo(p_processo_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE
  v_autor text;
  v_reu   text;
BEGIN
  IF p_processo_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    NULLIF(string_agg(nome, ' e ' ORDER BY COALESCE(ordem, 999), nome)
           FILTER (WHERE tipo = 'autor'), ''),
    NULLIF(string_agg(nome, ' e ' ORDER BY COALESCE(ordem, 999), nome)
           FILTER (WHERE tipo = 'reu'), '')
  INTO v_autor, v_reu
  FROM public.processos_partes
  WHERE processo_id = p_processo_id;

  UPDATE public.processos_processos
  SET autor = v_autor,
      reu   = v_reu
  WHERE id = p_processo_id
    AND (autor IS DISTINCT FROM v_autor OR reu IS DISTINCT FROM v_reu);
END;
$function$;

-- 2) Trigger function --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sync_autor_reu_processos_partes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_autor_reu_processo(OLD.processo_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.processo_id IS DISTINCT FROM NEW.processo_id THEN
      PERFORM public.recalcular_autor_reu_processo(OLD.processo_id);
    END IF;
    PERFORM public.recalcular_autor_reu_processo(NEW.processo_id);
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.recalcular_autor_reu_processo(NEW.processo_id);
    RETURN NEW;
  END IF;
END;
$function$;

-- 3) Trigger -----------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_after_change_sync_autor_reu ON public.processos_partes;
CREATE TRIGGER trg_after_change_sync_autor_reu
  AFTER INSERT OR UPDATE OR DELETE ON public.processos_partes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_autor_reu_processos_partes();

-- ============================================================================
-- BACKFILL one-shot (idempotente)
-- ============================================================================

-- 4.1) Recalcula autor/reu de TODOS os processos a partir de processos_partes
WITH agg AS (
  SELECT
    processo_id,
    NULLIF(string_agg(nome, ' e ' ORDER BY COALESCE(ordem, 999), nome)
           FILTER (WHERE tipo = 'autor'), '') AS novo_autor,
    NULLIF(string_agg(nome, ' e ' ORDER BY COALESCE(ordem, 999), nome)
           FILTER (WHERE tipo = 'reu'), '') AS novo_reu
  FROM public.processos_partes
  GROUP BY processo_id
)
UPDATE public.processos_processos pr
SET autor = agg.novo_autor,
    reu   = agg.novo_reu
FROM agg
WHERE pr.id = agg.processo_id
  AND (pr.autor IS DISTINCT FROM agg.novo_autor
       OR pr.reu  IS DISTINCT FROM agg.novo_reu);

-- 4.2) Corrige polo_cliente invertido (3 níveis de match)
WITH cliente_em_parte AS (
  SELECT DISTINCT ON (pr.id)
    pr.id              AS processo_id,
    pp.tipo            AS tipo_parte
  FROM public.processos_processos pr
  LEFT JOIN public.crm_pessoas cp ON cp.id = pr.cliente_id
  JOIN public.processos_partes pp ON pp.processo_id = pr.id
  WHERE pr.cliente_id IS NOT NULL
    AND pp.tipo IN ('autor', 'reu')
    AND (
      (pp.cliente_id IS NOT NULL AND pp.cliente_id = pr.cliente_id)
      OR (regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g') <> ''
          AND regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g')
            = regexp_replace(COALESCE(cp.cpf_cnpj, ''), '\D', '', 'g'))
      OR (cp.nome_completo IS NOT NULL
          AND (pp.nome ILIKE '%' || cp.nome_completo || '%'
               OR cp.nome_completo ILIKE '%' || pp.nome || '%'))
    )
  ORDER BY pr.id,
           CASE
             WHEN pp.cliente_id IS NOT NULL AND pp.cliente_id = pr.cliente_id THEN 1
             WHEN regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g') <> ''
              AND regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g')
                = regexp_replace(COALESCE(cp.cpf_cnpj, ''), '\D', '', 'g') THEN 2
             ELSE 3
           END,
           pp.ordem NULLS LAST
)
UPDATE public.processos_processos pr
SET polo_cliente = CASE
                     WHEN cep.tipo_parte = 'autor' THEN 'ativo'
                     WHEN cep.tipo_parte = 'reu'   THEN 'passivo'
                     ELSE pr.polo_cliente
                   END
FROM cliente_em_parte cep
WHERE pr.id = cep.processo_id
  AND pr.polo_cliente IS DISTINCT FROM
      CASE
        WHEN cep.tipo_parte = 'autor' THEN 'ativo'
        WHEN cep.tipo_parte = 'reu'   THEN 'passivo'
        ELSE pr.polo_cliente
      END;

-- 4.3) Recalcula parte_contraria a partir do polo do cliente já corrigido
WITH primeira_parte_oposta AS (
  SELECT DISTINCT ON (pr.id)
    pr.id           AS processo_id,
    pp.nome         AS nome_oposto
  FROM public.processos_processos pr
  JOIN public.processos_partes pp ON pp.processo_id = pr.id
  WHERE pr.cliente_id IS NOT NULL
    AND pr.polo_cliente IN ('ativo', 'passivo')
    AND (
      (pr.polo_cliente = 'ativo'  AND pp.tipo = 'reu')
      OR (pr.polo_cliente = 'passivo' AND pp.tipo = 'autor')
    )
  ORDER BY pr.id, pp.ordem NULLS LAST, pp.nome
)
UPDATE public.processos_processos pr
SET parte_contraria = ppo.nome_oposto
FROM primeira_parte_oposta ppo
WHERE pr.id = ppo.processo_id
  AND pr.parte_contraria IS DISTINCT FROM ppo.nome_oposto;

-- 4.4) Vincula processos_partes.cliente_id quando ainda for NULL e der match
UPDATE public.processos_partes pp
SET cliente_id = pr.cliente_id
FROM public.processos_processos pr,
     public.crm_pessoas cp
WHERE pp.cliente_id IS NULL
  AND pp.processo_id = pr.id
  AND pr.cliente_id IS NOT NULL
  AND cp.id = pr.cliente_id
  AND (
    (regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g') <> ''
     AND regexp_replace(COALESCE(pp.cpf_cnpj, ''), '\D', '', 'g')
       = regexp_replace(COALESCE(cp.cpf_cnpj, ''), '\D', '', 'g'))
    OR (cp.nome_completo IS NOT NULL
        AND (pp.nome ILIKE '%' || cp.nome_completo || '%'
             OR cp.nome_completo ILIKE '%' || pp.nome || '%'))
  );
