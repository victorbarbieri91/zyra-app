-- Módulo: Agenda - Tabelas Principais
-- Criação das tabelas base para o sistema de eventos e agenda

-- Tabela principal de eventos
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('compromisso', 'audiencia', 'prazo', 'tarefa')),
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    dia_inteiro BOOLEAN DEFAULT false,
    local TEXT,
    descricao TEXT,
    cor TEXT, -- hex color
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    processo_id UUID REFERENCES processos(id) ON DELETE SET NULL,
    criado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'realizado', 'cancelado', 'remarcado')),
    recorrencia_id UUID,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_eventos_escritorio ON eventos(escritorio_id);
CREATE INDEX idx_eventos_tipo ON eventos(tipo);
CREATE INDEX idx_eventos_data_inicio ON eventos(data_inicio);
CREATE INDEX idx_eventos_data_fim ON eventos(data_fim);
CREATE INDEX idx_eventos_cliente ON eventos(cliente_id);
CREATE INDEX idx_eventos_processo ON eventos(processo_id);
CREATE INDEX idx_eventos_responsavel ON eventos(responsavel_id);
CREATE INDEX idx_eventos_status ON eventos(status);
CREATE INDEX idx_eventos_recorrencia ON eventos(recorrencia_id) WHERE recorrencia_id IS NOT NULL;

-- Tabela de audiências (extensão de eventos)
CREATE TABLE eventos_audiencias (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_audiencia TEXT CHECK (tipo_audiencia IN ('inicial', 'instrucao', 'conciliacao', 'julgamento', 'una', 'outras')),
    modalidade TEXT DEFAULT 'presencial' CHECK (modalidade IN ('presencial', 'virtual')),
    link_virtual TEXT,
    forum_vara TEXT,
    juiz TEXT,
    pauta TEXT,
    documentos_necessarios TEXT[],
    tempo_deslocamento_min INTEGER,
    checklist_preparacao JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audiencias_tipo ON eventos_audiencias(tipo_audiencia);
CREATE INDEX idx_audiencias_modalidade ON eventos_audiencias(modalidade);

-- Tabela de prazos processuais (extensão de eventos)
CREATE TABLE eventos_prazos (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_prazo TEXT CHECK (tipo_prazo IN ('recurso', 'manifestacao', 'cumprimento', 'juntada', 'pagamento', 'outros')),
    data_intimacao DATE NOT NULL,
    data_limite DATE NOT NULL,
    dias_uteis BOOLEAN DEFAULT true,
    quantidade_dias INTEGER NOT NULL,
    suspenso BOOLEAN DEFAULT false,
    data_suspensao DATE,
    prorrogado BOOLEAN DEFAULT false,
    nova_data_limite DATE,
    cumprido BOOLEAN DEFAULT false,
    cumprido_em TIMESTAMP WITH TIME ZONE,
    perdido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prazos_tipo ON eventos_prazos(tipo_prazo);
CREATE INDEX idx_prazos_data_limite ON eventos_prazos(data_limite);
CREATE INDEX idx_prazos_cumprido ON eventos_prazos(cumprido) WHERE NOT cumprido;
CREATE INDEX idx_prazos_perdido ON eventos_prazos(perdido) WHERE perdido;

-- Tabela de participantes de eventos
CREATE TABLE eventos_participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('interno', 'externo')),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    confirmado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_participante_data CHECK (
        (tipo = 'interno' AND user_id IS NOT NULL) OR
        (tipo = 'externo' AND nome IS NOT NULL)
    )
);

CREATE INDEX idx_participantes_evento ON eventos_participantes(evento_id);
CREATE INDEX idx_participantes_user ON eventos_participantes(user_id);

-- Tabela de lembretes de eventos
CREATE TABLE eventos_lembretes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tempo_antes_minutos INTEGER NOT NULL,
    metodos TEXT[] DEFAULT ARRAY['push'], -- 'email', 'push', 'sms', 'whatsapp'
    enviado BOOLEAN DEFAULT false,
    enviado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lembretes_evento ON eventos_lembretes(evento_id);
CREATE INDEX idx_lembretes_user ON eventos_lembretes(user_id);
CREATE INDEX idx_lembretes_nao_enviados ON eventos_lembretes(enviado) WHERE NOT enviado;

-- Tabela de recorrência de eventos
CREATE TABLE eventos_recorrencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frequencia TEXT NOT NULL CHECK (frequencia IN ('diaria', 'semanal', 'mensal', 'anual', 'custom')),
    intervalo INTEGER DEFAULT 1, -- a cada X dias/semanas/meses
    dias_semana INTEGER[], -- 0=dom, 6=sab
    dia_mes INTEGER, -- dia do mês
    mes INTEGER, -- mês do ano
    data_fim DATE,
    ocorrencias INTEGER, -- número de repetições
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias de eventos
CREATE TABLE eventos_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    icone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escritorio_id, nome)
);

CREATE INDEX idx_categorias_escritorio ON eventos_categorias(escritorio_id);

-- Tabela de feriados
CREATE TABLE feriados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal')),
    uf TEXT,
    cidade TEXT,
    fixo BOOLEAN DEFAULT false, -- se repete todo ano
    recesso_forense BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, tipo, uf, cidade)
);

CREATE INDEX idx_feriados_data ON feriados(data);
CREATE INDEX idx_feriados_tipo ON feriados(tipo);
CREATE INDEX idx_feriados_recesso ON feriados(recesso_forense) WHERE recesso_forense;

-- Tabela para vincular eventos a categorias (muitos para muitos)
CREATE TABLE eventos_categorias_vinculo (
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES eventos_categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (evento_id, categoria_id)
);

CREATE INDEX idx_eventos_categorias_evento ON eventos_categorias_vinculo(evento_id);
CREATE INDEX idx_eventos_categorias_categoria ON eventos_categorias_vinculo(categoria_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_audiencias_updated_at
    BEFORE UPDATE ON eventos_audiencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_prazos_updated_at
    BEFORE UPDATE ON eventos_prazos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE eventos IS 'Tabela principal de eventos da agenda';
COMMENT ON TABLE eventos_audiencias IS 'Extensão de eventos para audiências judiciais';
COMMENT ON TABLE eventos_prazos IS 'Extensão de eventos para prazos processuais';
COMMENT ON TABLE eventos_participantes IS 'Participantes de eventos (internos e externos)';
COMMENT ON TABLE eventos_lembretes IS 'Lembretes configurados para eventos';
COMMENT ON TABLE eventos_recorrencia IS 'Configuração de recorrência de eventos';
COMMENT ON TABLE eventos_categorias IS 'Categorias personalizadas de eventos por escritório';
COMMENT ON TABLE feriados IS 'Feriados nacionais, estaduais e municipais para cálculo de prazos';
