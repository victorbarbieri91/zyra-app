-- Amplia o CHECK de processos_historico.acao para aceitar os 6 valores
-- de cancelamento usados pelas RPCs cancelar_agenda_* (migration anterior).

ALTER TABLE public.processos_historico
  DROP CONSTRAINT processos_historico_acao_check;

ALTER TABLE public.processos_historico
  ADD CONSTRAINT processos_historico_acao_check
  CHECK (acao = ANY (ARRAY[
    'criacao',
    'edicao',
    'arquivamento',
    'reativacao',
    'adicao_parte',
    'remocao_parte',
    'adicao_movimentacao',
    'mudanca_status',
    'mudanca_responsavel',
    'cancelamento_tarefa',
    'cancelamento_evento',
    'cancelamento_audiencia',
    'cancelamento_serie_tarefa',
    'cancelamento_serie_evento',
    'cancelamento_lote_encerramento',
    'outro'
  ]::text[]));
