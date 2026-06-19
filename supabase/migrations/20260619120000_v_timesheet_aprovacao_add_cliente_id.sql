-- Adiciona cliente_id à view de aprovação de timesheet, para permitir filtro por cliente
-- na tela de aprovação de horas. Espelha o mesmo CASE já usado em cliente_nome.
-- Coluna adicionada ao FINAL para compatibilidade com CREATE OR REPLACE VIEW.
CREATE OR REPLACE VIEW public.v_timesheet_aprovacao AS
 SELECT t.id,
    t.escritorio_id,
    e.nome AS nome_escritorio,
    t.user_id,
    p.nome_completo AS colaborador_nome,
    t.processo_id,
    proc.numero_cnj AS numero_processo,
    proc.numero_pasta AS processo_pasta,
        CASE
            WHEN proc.id IS NOT NULL AND proc.reu IS NOT NULL AND proc.reu <> ''::text THEN concat(proc.autor, ' x ', proc.reu)
            WHEN proc.id IS NOT NULL THEN proc.autor
            ELSE NULL::text
        END AS processo_titulo,
    t.consulta_id,
    cons.titulo AS consulta_titulo,
    t.tarefa_id,
    t.data_trabalho,
    t.hora_inicio,
    t.hora_fim,
    t.horas,
    t.atividade,
    t.origem,
    t.faturavel,
    t.faturavel_auto,
    t.faturado,
    t.fatura_id,
    t.aprovado,
    t.aprovado_por,
    t.aprovado_em,
    t.reprovado,
    t.reprovado_por,
    t.reprovado_em,
    t.justificativa_reprovacao,
        CASE
            WHEN t.aprovado = true THEN 'aprovado'::text
            WHEN t.reprovado = true THEN 'reprovado'::text
            ELSE 'pendente'::text
        END AS status,
        CASE
            WHEN t.processo_id IS NOT NULL THEN ( SELECT c.nome_completo
               FROM crm_pessoas c
              WHERE c.id = proc.cliente_id)
            WHEN t.consulta_id IS NOT NULL THEN ( SELECT c.nome_completo
               FROM crm_pessoas c
              WHERE c.id = cons.cliente_id)
            ELSE NULL::text
        END AS cliente_nome,
    COALESCE(proc.contrato_id, cons.contrato_id) AS contrato_id,
    COALESCE(( SELECT ch.forma_cobranca
           FROM financeiro_contratos_honorarios ch
          WHERE ch.id = proc.contrato_id), ( SELECT ch.forma_cobranca
           FROM financeiro_contratos_honorarios ch
          WHERE ch.id = cons.contrato_id)) AS forma_cobranca_contrato,
    get_valor_hora_efetivo(COALESCE(proc.contrato_id, cons.contrato_id), t.user_id) AS valor_hora_calculado,
    t.horas * get_valor_hora_efetivo(COALESCE(proc.contrato_id, cons.contrato_id), t.user_id) AS valor_total_estimado,
    t.editado,
    t.editado_em,
    t.editado_por,
    t.created_at,
    t.updated_at,
    COALESCE(( SELECT ch.formas_pagamento
           FROM financeiro_contratos_honorarios ch
          WHERE ch.id = proc.contrato_id), ( SELECT ch.formas_pagamento
           FROM financeiro_contratos_honorarios ch
          WHERE ch.id = cons.contrato_id)) AS formas_cobranca_contrato,
        CASE
            WHEN t.processo_id IS NOT NULL THEN proc.cliente_id
            WHEN t.consulta_id IS NOT NULL THEN cons.cliente_id
            ELSE NULL::uuid
        END AS cliente_id
   FROM financeiro_timesheet t
     JOIN escritorios e ON e.id = t.escritorio_id
     JOIN profiles p ON p.id = t.user_id
     LEFT JOIN processos_processos proc ON proc.id = t.processo_id
     LEFT JOIN consultivo_consultas cons ON cons.id = t.consulta_id
  ORDER BY t.data_trabalho DESC, t.created_at DESC;

GRANT SELECT ON public.v_timesheet_aprovacao TO authenticated;
