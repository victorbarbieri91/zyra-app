-- Migration: Processos - Monitoramento e Sincronização
-- Data: 2025-01-07
-- Descrição: Sistema de monitoramento automático de tribunais e alertas

-- =====================================================
-- TABELA: processos_monitoramento
-- =====================================================

CREATE TABLE processos_monitoramento (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid NOT NULL UNIQUE REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Configuração
  ativo boolean DEFAULT true,
  frequencia_horas integer DEFAULT 6 CHECK (frequencia_horas > 0), -- De quanto em quanto tempo verificar

  -- Controle de execução
  ultima_verificacao timestamptz,
  proxima_verificacao timestamptz,
  verificacoes_realizadas integer DEFAULT 0,

  -- Resultados
  ultima_movimentacao_capturada timestamptz,
  total_movimentacoes_capturadas integer DEFAULT 0,
  erro_ultima_verificacao text,
  tentativas_falhas_consecutivas integer DEFAULT 0,

  -- Estratégia de captura
  metodo_captura text DEFAULT 'playwright' CHECK (metodo_captura IN (
    'playwright', 'api_datajud', 'api_tribunal', 'scraping', 'manual'
  )),
  url_consulta text, -- URL específica para consulta

  -- Configurações de captura
  capturar_movimentacoes boolean DEFAULT true,
  capturar_documentos boolean DEFAULT false,
  capturar_audiencias boolean DEFAULT true,
  notificar_novas_movimentacoes boolean DEFAULT true,

  -- Metadados
  metadata jsonb,

  -- Controle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_monit_processo ON processos_monitoramento(processo_id);
CREATE INDEX idx_processos_monit_escritorio ON processos_monitoramento(escritorio_id);
CREATE INDEX idx_processos_monit_ativo ON processos_monitoramento(ativo) WHERE ativo = true;
CREATE INDEX idx_processos_monit_proxima ON processos_monitoramento(proxima_verificacao)
  WHERE ativo = true AND proxima_verificacao <= now();
CREATE INDEX idx_processos_monit_erros ON processos_monitoramento(tentativas_falhas_consecutivas)
  WHERE tentativas_falhas_consecutivas > 0;

COMMENT ON TABLE processos_monitoramento IS 'Módulo Processos: Configuração de monitoramento automático de tribunais';

-- =====================================================
-- TABELA: processos_sync_log
-- =====================================================

CREATE TABLE processos_sync_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitoramento_id uuid NOT NULL REFERENCES processos_monitoramento(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,

  -- Execução
  iniciado_em timestamptz DEFAULT now(),
  finalizado_em timestamptz,
  duracao_ms integer,
  sucesso boolean,

  -- Método utilizado
  metodo_captura text NOT NULL,
  url_consultada text,

  -- Resultados
  movimentacoes_novas integer DEFAULT 0,
  movimentacoes_atualizadas integer DEFAULT 0,
  documentos_novos integer DEFAULT 0,
  audiencias_novas integer DEFAULT 0,

  -- Erros
  erro_tipo text, -- Ex: "timeout", "captcha", "processo_nao_encontrado"
  erro_mensagem text,
  erro_stack text,

  -- Detalhes técnicos
  requisicoes_http integer,
  bytes_transferidos bigint,
  screenshots_capturados integer,

  -- Metadados
  metadata jsonb,

  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_sync_monitoramento ON processos_sync_log(monitoramento_id);
CREATE INDEX idx_processos_sync_processo ON processos_sync_log(processo_id);
CREATE INDEX idx_processos_sync_data ON processos_sync_log(created_at DESC);
CREATE INDEX idx_processos_sync_sucesso ON processos_sync_log(sucesso);
CREATE INDEX idx_processos_sync_erro ON processos_sync_log(erro_tipo) WHERE erro_tipo IS NOT NULL;

COMMENT ON TABLE processos_sync_log IS 'Módulo Processos: Log de sincronizações e tentativas de captura';

-- =====================================================
-- TABELA: processos_alertas_config
-- =====================================================

CREATE TABLE processos_alertas_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id uuid REFERENCES processos_processos(id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = alerta global do processo

  -- Tipo de alerta
  tipo_alerta text NOT NULL CHECK (tipo_alerta IN (
    'nova_movimentacao', 'prazo_vencendo', 'audiencia_proxima',
    'documento_novo', 'mudanca_status', 'sentenca_publicada',
    'intimacao_recebida', 'acordo_proposto', 'processo_parado'
  )),

  -- Condições
  condicoes jsonb, -- Ex: {"prazo_dias": 3, "prioridade_minima": "alta"}

  -- Canais de notificação
  notificar_dashboard boolean DEFAULT true,
  notificar_email boolean DEFAULT false,
  notificar_whatsapp boolean DEFAULT false,
  notificar_sms boolean DEFAULT false,

  -- Frequência
  frequencia text DEFAULT 'sempre' CHECK (frequencia IN (
    'sempre', 'diaria', 'semanal', 'uma_vez'
  )),
  ultima_notificacao timestamptz,

  -- Status
  ativo boolean DEFAULT true,
  pausado_ate timestamptz,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Índices
CREATE INDEX idx_processos_alertas_processo ON processos_alertas_config(processo_id);
CREATE INDEX idx_processos_alertas_escritorio ON processos_alertas_config(escritorio_id);
CREATE INDEX idx_processos_alertas_user ON processos_alertas_config(user_id);
CREATE INDEX idx_processos_alertas_tipo ON processos_alertas_config(tipo_alerta);
CREATE INDEX idx_processos_alertas_ativo ON processos_alertas_config(ativo) WHERE ativo = true;

COMMENT ON TABLE processos_alertas_config IS 'Módulo Processos: Configuração de alertas e notificações personalizadas';

-- =====================================================
-- TABELA: processos_alertas_enviados
-- =====================================================

CREATE TABLE processos_alertas_enviados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_alerta_id uuid REFERENCES processos_alertas_config(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES processos_processos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Detalhes do alerta
  tipo_alerta text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  metadata jsonb,

  -- Canal
  canal text NOT NULL CHECK (canal IN ('dashboard', 'email', 'whatsapp', 'sms')),

  -- Status de envio
  enviado boolean DEFAULT false,
  enviado_em timestamptz,
  erro_envio text,
  tentativas integer DEFAULT 0,

  -- Interação do usuário
  visualizado boolean DEFAULT false,
  visualizado_em timestamptz,
  clicado boolean DEFAULT false,
  clicado_em timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_processos_alertas_env_config ON processos_alertas_enviados(config_alerta_id);
CREATE INDEX idx_processos_alertas_env_processo ON processos_alertas_enviados(processo_id);
CREATE INDEX idx_processos_alertas_env_user ON processos_alertas_enviados(user_id);
CREATE INDEX idx_processos_alertas_env_pendentes ON processos_alertas_enviados(enviado)
  WHERE enviado = false;
CREATE INDEX idx_processos_alertas_env_data ON processos_alertas_enviados(created_at DESC);

COMMENT ON TABLE processos_alertas_enviados IS 'Módulo Processos: Histórico de alertas enviados e suas interações';

-- =====================================================
-- FUNCTIONS: Monitoramento
-- =====================================================

-- Function: Agendar próxima verificação
CREATE OR REPLACE FUNCTION agendar_proxima_verificacao(p_monitoramento_id uuid)
RETURNS void AS $$
DECLARE
  v_frequencia integer;
BEGIN
  SELECT frequencia_horas INTO v_frequencia
  FROM processos_monitoramento
  WHERE id = p_monitoramento_id;

  UPDATE processos_monitoramento
  SET proxima_verificacao = now() + (v_frequencia || ' hours')::interval
  WHERE id = p_monitoramento_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Registrar tentativa de sincronização
CREATE OR REPLACE FUNCTION registrar_sync_resultado(
  p_monitoramento_id uuid,
  p_sucesso boolean,
  p_movimentacoes_novas integer DEFAULT 0,
  p_erro_mensagem text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Atualizar monitoramento
  UPDATE processos_monitoramento
  SET
    ultima_verificacao = now(),
    verificacoes_realizadas = verificacoes_realizadas + 1,
    erro_ultima_verificacao = p_erro_mensagem,
    tentativas_falhas_consecutivas = CASE
      WHEN p_sucesso THEN 0
      ELSE tentativas_falhas_consecutivas + 1
    END,
    total_movimentacoes_capturadas = total_movimentacoes_capturadas + p_movimentacoes_novas,
    ultima_movimentacao_capturada = CASE
      WHEN p_movimentacoes_novas > 0 THEN now()
      ELSE ultima_movimentacao_capturada
    END
  WHERE id = p_monitoramento_id;

  -- Agendar próxima verificação
  PERFORM agendar_proxima_verificacao(p_monitoramento_id);

  -- Se muitas falhas consecutivas, desativar temporariamente
  UPDATE processos_monitoramento
  SET ativo = false
  WHERE id = p_monitoramento_id
    AND tentativas_falhas_consecutivas >= 10;
END;
$$ LANGUAGE plpgsql;

-- Function: Obter processos para monitorar
CREATE OR REPLACE FUNCTION get_processos_para_monitorar(p_limite integer DEFAULT 10)
RETURNS TABLE (
  monitoramento_id uuid,
  processo_id uuid,
  numero_cnj text,
  metodo_captura text,
  url_consulta text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.processo_id,
    p.numero_cnj,
    m.metodo_captura,
    m.url_consulta
  FROM processos_monitoramento m
  JOIN processos_processos p ON p.id = m.processo_id
  WHERE m.ativo = true
    AND (m.proxima_verificacao IS NULL OR m.proxima_verificacao <= now())
    AND p.status IN ('ativo', 'suspenso')
    AND m.tentativas_falhas_consecutivas < 10
  ORDER BY
    m.proxima_verificacao ASC NULLS FIRST,
    m.ultima_verificacao ASC NULLS FIRST
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_processos_para_monitorar IS 'Retorna lista de processos que precisam ser verificados agora';

-- Function: Criar alerta padrão para novo processo
CREATE OR REPLACE FUNCTION criar_alertas_padrao_processo()
RETURNS TRIGGER AS $$
BEGIN
  -- Alertas padrão para todos processos ativos
  INSERT INTO processos_alertas_config (
    processo_id, escritorio_id, user_id, tipo_alerta,
    notificar_dashboard, notificar_email
  ) VALUES
    -- Alerta de nova movimentação (para responsável)
    (NEW.id, NEW.escritorio_id, NEW.responsavel_id, 'nova_movimentacao', true, true),
    -- Alerta de prazo vencendo (3 dias)
    (NEW.id, NEW.escritorio_id, NEW.responsavel_id, 'prazo_vencendo', true, true),
    -- Alerta de audiência próxima (1 dia)
    (NEW.id, NEW.escritorio_id, NEW.responsavel_id, 'audiencia_proxima', true, false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_criar_alertas_padrao
  AFTER INSERT ON processos_processos
  FOR EACH ROW
  WHEN (NEW.status = 'ativo')
  EXECUTE FUNCTION criar_alertas_padrao_processo();

-- Function: Verificar e enviar alertas de prazos vencendo
CREATE OR REPLACE FUNCTION verificar_alertas_prazos()
RETURNS integer AS $$
DECLARE
  v_prazo record;
  v_config record;
  v_alertas_criados integer := 0;
BEGIN
  -- Percorrer prazos que estão vencendo
  FOR v_prazo IN
    SELECT
      p.*,
      proc.numero_cnj,
      proc.escritorio_id
    FROM processos_prazos p
    JOIN processos_processos proc ON proc.id = p.processo_id
    WHERE p.status = 'aberto'
      AND p.data_limite BETWEEN CURRENT_DATE AND CURRENT_DATE + 3
  LOOP
    -- Buscar configurações de alerta
    FOR v_config IN
      SELECT *
      FROM processos_alertas_config
      WHERE processo_id = v_prazo.processo_id
        AND tipo_alerta = 'prazo_vencendo'
        AND ativo = true
        AND (pausado_ate IS NULL OR pausado_ate < now())
    LOOP
      -- Verificar se já foi notificado hoje
      IF NOT EXISTS (
        SELECT 1
        FROM processos_alertas_enviados
        WHERE config_alerta_id = v_config.id
          AND DATE(created_at) = CURRENT_DATE
      ) THEN
        -- Criar alerta
        INSERT INTO processos_alertas_enviados (
          config_alerta_id, processo_id, user_id,
          tipo_alerta, titulo, mensagem, canal, metadata
        ) VALUES (
          v_config.id,
          v_prazo.processo_id,
          COALESCE(v_config.user_id, v_prazo.responsavel_id),
          'prazo_vencendo',
          'Prazo vencendo - ' || v_prazo.numero_cnj,
          v_prazo.descricao || ' - Vence em ' ||
            (v_prazo.data_limite - CURRENT_DATE) || ' dia(s)',
          'dashboard',
          jsonb_build_object(
            'prazo_id', v_prazo.id,
            'data_limite', v_prazo.data_limite,
            'dias_restantes', v_prazo.data_limite - CURRENT_DATE
          )
        );

        v_alertas_criados := v_alertas_criados + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_alertas_criados;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_alertas_prazos IS 'Scheduled function: Verifica prazos vencendo e cria alertas';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at
CREATE TRIGGER processos_monitoramento_updated_at
  BEFORE UPDATE ON processos_monitoramento
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_updated_at();

-- Trigger: Criar monitoramento automático para novo processo
CREATE OR REPLACE FUNCTION criar_monitoramento_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar monitoramento apenas se processo é judicial e ativo
  IF NEW.tipo = 'judicial' AND NEW.status = 'ativo' THEN
    INSERT INTO processos_monitoramento (
      processo_id,
      escritorio_id,
      ativo,
      frequencia_horas,
      proxima_verificacao
    ) VALUES (
      NEW.id,
      NEW.escritorio_id,
      true,
      6, -- Verificar a cada 6 horas
      now() + interval '1 hour' -- Primeira verificação em 1 hora
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_criar_monitoramento
  AFTER INSERT ON processos_processos
  FOR EACH ROW
  EXECUTE FUNCTION criar_monitoramento_automatico();
