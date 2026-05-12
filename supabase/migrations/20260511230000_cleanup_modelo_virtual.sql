-- ============================================================================
-- Migração: Cleanup pós-migração virtual → materializado
-- ============================================================================
-- Remove objetos não-utilizados que sobraram do modelo antigo de recorrências
-- da agenda. Validado em produção com Almir/Flávia/Andrei. Os 3 backups das
-- tabelas (criados em 2026-05-11) também são dropados — sem rollback de dados
-- a partir desse ponto, mas estrutura/funcionalidade não dependem mais deles.
--
-- Referências: commits ac6cfb3, 42d9ad6, 62f20df.
-- ============================================================================

-- 1) Drop dos 3 backups da migração principal
DROP TABLE IF EXISTS public._backup_agenda_recorrencias_20260511;
DROP TABLE IF EXISTS public._backup_agenda_tarefas_20260511;
DROP TABLE IF EXISTS public._backup_agenda_eventos_20260511;

-- 2) Drop do índice e coluna proxima_execucao (não-usados pelo modelo materializado)
DROP INDEX IF EXISTS public.idx_recorrencias_proxima;
ALTER TABLE public.agenda_recorrencias DROP COLUMN IF EXISTS proxima_execucao;

-- 3) Drop da função antiga substituída por proxima_data_recorrencia
DROP FUNCTION IF EXISTS public.calcular_proxima_execucao_recorrencia(text, integer, integer, integer[], integer, date);
