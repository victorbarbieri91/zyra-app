-- Expõe a coluna `tipo` (enum tipo_consulta) da tabela base na view, usada pela
-- Home do Consultivo V4. CREATE OR REPLACE exige manter as colunas existentes na
-- mesma ordem e só permite acrescentar novas no final → `c.tipo` vai por último.
create or replace view public.v_consultivo_consultas as
select
  c.id,
  c.numero,
  c.titulo,
  c.descricao,
  c.cliente_id,
  c.area,
  c.status,
  c.prioridade,
  c.prazo,
  c.responsavel_id,
  c.contrato_id,
  c.anexos,
  c.andamentos,
  c.created_at,
  c.updated_at,
  c.escritorio_id,
  p.nome_completo as cliente_nome,
  pr.nome_completo as responsavel_nome,
  c.tipo
from consultivo_consultas c
  left join crm_pessoas p on p.id = c.cliente_id
  left join profiles pr on pr.id = c.responsavel_id
where user_has_access_to_grupo(c.escritorio_id);
