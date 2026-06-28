-- Estende v_processos_com_movimentacoes com o TEXTO da última movimentação
-- (mais recente, qualquer origem: tribunal ou escritório), para a coluna
-- "Última mov." da Página Inicial de Processos. Mantém as colunas existentes
-- na mesma ordem e só acrescenta novas ao final (requisito do CREATE OR REPLACE).
create or replace view public.v_processos_com_movimentacoes as
select
  p.id,
  p.numero_pasta,
  p.numero_cnj,
  p.parte_contraria,
  p.area,
  p.fase,
  p.instancia,
  p.status,
  p.updated_at,
  p.responsavel_id,
  p.cliente_id,
  p.escritorio_id,
  p.escavador_monitoramento_id,
  c.nome_completo as cliente_nome,
  pr.nome_completo as responsavel_nome,
  coalesce(um.data_movimento, p.updated_at) as ultima_movimentacao,
  coalesce((
    select count(*) from processos_movimentacoes m
    where m.processo_id = p.id and m.lida = false
  ), 0::bigint)::integer as movimentacoes_nao_lidas,
  p.contrato_id,
  um.descricao as ultima_mov_descricao,
  um.tipo_descricao as ultima_mov_tipo,
  um.origem as ultima_mov_origem
from processos_processos p
  left join crm_pessoas c on c.id = p.cliente_id
  left join profiles pr on pr.id = p.responsavel_id
  left join lateral (
    select m.descricao, m.tipo_descricao, m.origem, m.data_movimento
    from processos_movimentacoes m
    where m.processo_id = p.id
    order by m.data_movimento desc, m.created_at desc
    limit 1
  ) um on true
where user_has_access_to_grupo(p.escritorio_id);
