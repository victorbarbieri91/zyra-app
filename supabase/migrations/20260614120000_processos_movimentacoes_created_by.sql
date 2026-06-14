-- Adiciona o autor dos andamentos manuais.
-- Até aqui, processos_movimentacoes só registrava quem LEU o andamento
-- (lida_por), nunca quem o CRIOU. Esta coluna passa a guardar o usuário que
-- registrou o andamento manual (origem manual/sistema). Fica NULL para
-- andamentos automáticos do tribunal (datajud/escavador) e para registros
-- antigos, anteriores a esta mudança.
ALTER TABLE processos_movimentacoes ADD COLUMN IF NOT EXISTS created_by uuid;

COMMENT ON COLUMN processos_movimentacoes.created_by IS 'Usuário que registrou o andamento manual (origem manual/sistema). NULL para andamentos automáticos do tribunal ou registros antigos.';
