-- ============================================================
-- M4 · Consultivo: aposentar consultivo_timeline
-- A tabela só registrava "criação" (redundante: já geramos
-- 'consulta_criada' para todas as 206 em M3b). Nenhum código a usa.
-- ============================================================

-- 1) Repontar o trigger de criação para a tabela nova (novas consultas
--    nascem com o andamento "Consulta criada" em consultivo_movimentacoes)
CREATE OR REPLACE FUNCTION public.consultivo_registrar_criacao()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  INSERT INTO consultivo_movimentacoes
    (consulta_id, escritorio_id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, created_by)
  VALUES (
    NEW.id, NEW.escritorio_id, NOW(), 'consulta_criada', 'Consulta criada',
    'Consulta criada: ' || LEFT(COALESCE(NEW.titulo, 'Sem título'), 80),
    'sistema', COALESCE(NEW.created_by, NEW.responsavel_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloqueia a criação da consulta se o andamento falhar
  RAISE WARNING 'Erro ao registrar andamento de criação: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2) Remover a função órfã (referenciava tabelas inexistentes)
DROP FUNCTION IF EXISTS public.consultivo_registrar_timeline() CASCADE;

-- 3) Aposentar a tabela morta
DROP TABLE IF EXISTS public.consultivo_timeline;
