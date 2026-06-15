-- ============================================================
-- M3a · Consultivo: estrutura de andamentos relacionais
-- Espelha processos_movimentacoes (enxuta — consultivo é extrajudicial).
-- Aditivo: cria enum, tabela, índices e RLS. Não toca em dados.
-- ============================================================

CREATE TYPE consultivo_andamento_tipo AS ENUM (
  -- Manuais (escolhidos no modal)
  'analise','parecer','documento_recebido','reuniao','contato_cliente',
  'diligencia','negociacao','acordo','notificacao_extrajudicial','observacao_interna','outro',
  -- Automáticos (gerados pelo sistema)
  'consulta_criada','tarefa_concluida','compromisso_concluido','documento_anexado',
  'transformada_processo','arquivada'
);

CREATE TABLE consultivo_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES consultivo_consultas(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  tipo_codigo consultivo_andamento_tipo NOT NULL,
  tipo_descricao text,
  descricao text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT 'manual',  -- 'manual' | 'sistema'
  referencia_tipo text,
  referencia_id uuid,
  visivel_cliente boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultivo_movimentacoes IS
  'Andamentos relacionais das consultas (substitui o campo JSONB consultivo_consultas.andamentos, mantido como backup).';

CREATE INDEX idx_consultivo_mov_consulta_data ON consultivo_movimentacoes (consulta_id, data_movimento DESC);
CREATE INDEX idx_consultivo_mov_referencia ON consultivo_movimentacoes (referencia_tipo, referencia_id) WHERE referencia_id IS NOT NULL;
CREATE INDEX idx_consultivo_mov_escritorio ON consultivo_movimentacoes (escritorio_id);

ALTER TABLE consultivo_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultivo_movimentacoes_select ON consultivo_movimentacoes
  FOR SELECT USING (user_has_access_to_grupo(escritorio_id));
CREATE POLICY consultivo_movimentacoes_insert ON consultivo_movimentacoes
  FOR INSERT WITH CHECK (user_has_access_to_grupo(escritorio_id));
CREATE POLICY consultivo_movimentacoes_update ON consultivo_movimentacoes
  FOR UPDATE USING (user_has_access_to_grupo(escritorio_id));
CREATE POLICY consultivo_movimentacoes_delete ON consultivo_movimentacoes
  FOR DELETE USING (user_has_access_to_grupo(escritorio_id));
