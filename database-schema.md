# Estrutura Completa do Banco de Dados

## Visão Geral

Este documento consolida toda a estrutura do banco de dados PostgreSQL no Supabase para o sistema jurídico com IA.

## Organização

As tabelas estão organizadas por módulo para facilitar o entendimento e manutenção. Há tabelas compartilhadas entre módulos que são usadas como referência.

## Extensões PostgreSQL Necessárias

```sql
-- Para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Para busca full-text
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Para busca vetorial (se usar embeddings)
CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## Módulo: Autenticação e Perfis

### auth.users
Gerenciada pelo Supabase Auth (não criamos diretamente)

### profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    oab_numero TEXT,
    oab_uf TEXT,
    telefone TEXT,
    avatar_url TEXT,
    escritorio_id UUID REFERENCES escritorios(id),
    role TEXT CHECK (role IN ('admin', 'advogado', 'assistente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### escritorios
```sql
CREATE TABLE escritorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    endereco JSONB,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Dashboard

### dashboard_metrics
```sql
CREATE TABLE dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    modulo TEXT NOT NULL,
    metrica TEXT NOT NULL,
    valor NUMERIC,
    detalhes JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ai_chat_history
```sql
CREATE TABLE ai_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_session ON ai_chat_history(session_id);
CREATE INDEX idx_chat_history_user ON ai_chat_history(user_id);
```

### ai_commands_log
```sql
CREATE TABLE ai_commands_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    intent TEXT,
    action_taken TEXT,
    result JSONB,
    success BOOLEAN,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_shortcuts
```sql
CREATE TABLE user_shortcuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    icon TEXT,
    favorito BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT,
    metadata JSONB,
    link TEXT,
    lida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE NOT lida;
```

---

## Módulo: CRM

### clientes
```sql
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('pf', 'pj')),
    nome_completo TEXT NOT NULL,
    nome_fantasia TEXT,
    cpf_cnpj TEXT UNIQUE,
    rg_ie TEXT,
    data_nascimento DATE,
    nacionalidade TEXT,
    estado_civil TEXT,
    profissao TEXT,
    origem TEXT,
    indicado_por UUID REFERENCES clientes(id),
    responsavel_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('ativo', 'inativo', 'prospecto')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    inativado_em TIMESTAMP WITH TIME ZONE,
    motivo_inativacao TEXT
);

CREATE INDEX idx_clientes_escritorio ON clientes(escritorio_id);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX idx_clientes_responsavel ON clientes(responsavel_id);
```

### clientes_contatos
```sql
CREATE TABLE clientes_contatos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('telefone', 'email', 'endereco', 'social')),
    label TEXT,
    valor TEXT NOT NULL,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contatos_cliente ON clientes_contatos(cliente_id);
```

### clientes_enderecos
```sql
CREATE TABLE clientes_enderecos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('residencial', 'comercial')),
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### clientes_relacionamentos
```sql
CREATE TABLE clientes_relacionamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_origem_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    cliente_destino_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_relacionamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### interacoes
```sql
CREATE TABLE interacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    tipo TEXT CHECK (tipo IN ('ligacao', 'reuniao', 'email', 'whatsapp', 'outros')),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER,
    assunto TEXT NOT NULL,
    descricao TEXT,
    participantes TEXT[],
    follow_up BOOLEAN DEFAULT false,
    follow_up_data DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interacoes_cliente ON interacoes(cliente_id);
CREATE INDEX idx_interacoes_data ON interacoes(data_hora DESC);
```

### interacoes_anexos
```sql
CREATE TABLE interacoes_anexos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interacao_id UUID REFERENCES interacoes(id) ON DELETE CASCADE,
    arquivo_nome TEXT,
    arquivo_url TEXT,
    arquivo_tipo TEXT,
    arquivo_tamanho INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### clientes_tags
```sql
CREATE TABLE clientes_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cliente_id, tag)
);
```

### clientes_origem_captacao
```sql
CREATE TABLE clientes_origem_captacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    tipo TEXT CHECK (tipo IN ('organico', 'pago', 'indicacao', 'evento')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Agenda

### eventos
```sql
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('compromisso', 'audiencia', 'prazo', 'tarefa')),
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    dia_inteiro BOOLEAN DEFAULT false,
    local TEXT,
    descricao TEXT,
    cor TEXT,
    cliente_id UUID REFERENCES clientes(id),
    processo_id UUID REFERENCES processos(id),
    criado_por UUID REFERENCES profiles(id),
    responsavel_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('agendado', 'realizado', 'cancelado', 'remarcado')),
    recorrencia_id UUID,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_eventos_data ON eventos(data_inicio);
CREATE INDEX idx_eventos_responsavel ON eventos(responsavel_id);
CREATE INDEX idx_eventos_processo ON eventos(processo_id);
```

### eventos_audiencias
```sql
CREATE TABLE eventos_audiencias (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_audiencia TEXT,
    modalidade TEXT CHECK (modalidade IN ('presencial', 'virtual')),
    link_virtual TEXT,
    forum_vara TEXT,
    juiz TEXT,
    pauta TEXT,
    documentos_necessarios TEXT[],
    tempo_deslocamento_min INTEGER,
    checklist_preparacao JSONB
);
```

### eventos_prazos
```sql
CREATE TABLE eventos_prazos (
    evento_id UUID PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_prazo TEXT,
    data_intimacao DATE,
    data_limite DATE NOT NULL,
    dias_uteis BOOLEAN DEFAULT true,
    quantidade_dias INTEGER,
    suspenso BOOLEAN DEFAULT false,
    data_suspensao DATE,
    prorrogado BOOLEAN DEFAULT false,
    nova_data_limite DATE,
    cumprido BOOLEAN DEFAULT false,
    cumprido_em TIMESTAMP WITH TIME ZONE,
    perdido BOOLEAN DEFAULT false
);
```

### eventos_participantes
```sql
CREATE TABLE eventos_participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('interno', 'externo')),
    user_id UUID REFERENCES profiles(id),
    nome TEXT,
    email TEXT,
    telefone TEXT,
    confirmado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### eventos_lembretes
```sql
CREATE TABLE eventos_lembretes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    tempo_antes_minutos INTEGER NOT NULL,
    metodos TEXT[],
    enviado BOOLEAN DEFAULT false,
    enviado_em TIMESTAMP WITH TIME ZONE
);
```

### eventos_recorrencia
```sql
CREATE TABLE eventos_recorrencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frequencia TEXT CHECK (frequencia IN ('diaria', 'semanal', 'mensal', 'anual', 'custom')),
    intervalo INTEGER DEFAULT 1,
    dias_semana INTEGER[],
    dia_mes INTEGER,
    mes INTEGER,
    data_fim DATE,
    ocorrencias INTEGER
);
```

### feriados
```sql
CREATE TABLE feriados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    data DATE NOT NULL,
    tipo TEXT CHECK (tipo IN ('nacional', 'estadual', 'municipal')),
    uf TEXT,
    cidade TEXT,
    fixo BOOLEAN DEFAULT false,
    recesso_forense BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, tipo, uf, cidade)
);

CREATE INDEX idx_feriados_data ON feriados(data);
```

### eventos_categorias
```sql
CREATE TABLE eventos_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT,
    icone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Processos

### processos
```sql
CREATE TABLE processos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    numero_cnj TEXT UNIQUE,
    numero_interno TEXT,
    tipo TEXT CHECK (tipo IN ('judicial', 'administrativo', 'arbitragem')),
    area TEXT,
    fase TEXT,
    instancia TEXT,
    rito TEXT,
    valor_causa NUMERIC,
    tribunal TEXT,
    comarca TEXT,
    vara TEXT,
    juiz TEXT,
    relator TEXT,
    data_distribuicao DATE,
    numero_distribuicao TEXT,
    cliente_id UUID REFERENCES clientes(id),
    polo_cliente TEXT CHECK (polo_cliente IN ('ativo', 'passivo', 'terceiro')),
    responsavel_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('ativo', 'suspenso', 'arquivado', 'baixado', 'transito_julgado')),
    prioridade TEXT CHECK (prioridade IN ('alta', 'media', 'baixa')),
    observacoes TEXT,
    estrategia TEXT,
    risco TEXT CHECK (risco IN ('alto', 'medio', 'baixo')),
    valor_risco NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    arquivado_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_processos_numero ON processos(numero_cnj);
CREATE INDEX idx_processos_cliente ON processos(cliente_id);
CREATE INDEX idx_processos_responsavel ON processos(responsavel_id);
CREATE INDEX idx_processos_status ON processos(status);
```

### processos_partes
```sql
CREATE TABLE processos_partes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tipo TEXT,
    cliente_id UUID REFERENCES clientes(id),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    qualificacao TEXT,
    advogados TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### processos_movimentacoes
```sql
CREATE TABLE processos_movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    data_movimento TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo TEXT,
    descricao TEXT NOT NULL,
    conteudo_completo TEXT,
    origem TEXT CHECK (origem IN ('tribunal', 'manual')),
    lida BOOLEAN DEFAULT false,
    lida_por UUID REFERENCES profiles(id),
    lida_em TIMESTAMP WITH TIME ZONE,
    importante BOOLEAN DEFAULT false,
    tem_prazo BOOLEAN DEFAULT false,
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_processo ON processos_movimentacoes(processo_id);
CREATE INDEX idx_movimentacoes_data ON processos_movimentacoes(data_movimento DESC);
```

### processos_pecas
```sql
CREATE TABLE processos_pecas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tipo TEXT,
    titulo TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    arquivo_nome TEXT,
    versao INTEGER DEFAULT 1,
    protocolado BOOLEAN DEFAULT false,
    numero_protocolo TEXT,
    data_protocolo TIMESTAMP WITH TIME ZONE,
    criado_por UUID REFERENCES profiles(id),
    gerado_ia BOOLEAN DEFAULT false,
    template_id UUID REFERENCES templates_pecas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### processos_relacionados
```sql
CREATE TABLE processos_relacionados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_origem_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    processo_destino_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tipo_relacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### processos_analise_ia
```sql
CREATE TABLE processos_analise_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tipo_analise TEXT,
    resultado JSONB,
    confianca NUMERIC,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valido_ate TIMESTAMP WITH TIME ZONE
);
```

### processos_jurisprudencias
```sql
CREATE TABLE processos_jurisprudencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tribunal TEXT,
    numero_acordao TEXT,
    data_julgamento DATE,
    ementa TEXT,
    link TEXT,
    relevancia TEXT CHECK (relevancia IN ('alta', 'media', 'baixa')),
    aplicada_em_peca BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### templates_pecas
```sql
CREATE TABLE templates_pecas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo_peca TEXT,
    area TEXT,
    conteudo_template TEXT,
    variaveis JSONB,
    instrucoes_ia TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### processos_tags
```sql
CREATE TABLE processos_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(processo_id, tag)
);
```

### processos_monitoramento
```sql
CREATE TABLE processos_monitoramento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    ultima_verificacao TIMESTAMP WITH TIME ZONE,
    proxima_verificacao TIMESTAMP WITH TIME ZONE,
    frequencia_horas INTEGER DEFAULT 24,
    ativo BOOLEAN DEFAULT true,
    erro_ultima_verificacao TEXT
);
```

---

## Módulo: Consultivo

### consultas
```sql
CREATE TABLE consultas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    numero_interno TEXT UNIQUE,
    cliente_id UUID REFERENCES clientes(id),
    tipo TEXT CHECK (tipo IN ('simples', 'parecer', 'contrato', 'due_diligence', 'opiniao')),
    area TEXT,
    assunto TEXT NOT NULL,
    descricao TEXT,
    urgencia TEXT CHECK (urgencia IN ('alta', 'media', 'baixa')),
    prazo_cliente DATE,
    sla_horas INTEGER,
    data_recebimento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_conclusao_estimada TIMESTAMP WITH TIME ZONE,
    data_conclusao_real TIMESTAMP WITH TIME ZONE,
    responsavel_id UUID REFERENCES profiles(id),
    revisor_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('nova', 'em_analise', 'em_revisao', 'concluida', 'enviada', 'aprovada')),
    valor_servico NUMERIC,
    horas_estimadas NUMERIC,
    horas_reais NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consultas_cliente ON consultas(cliente_id);
CREATE INDEX idx_consultas_responsavel ON consultas(responsavel_id);
CREATE INDEX idx_consultas_status ON consultas(status);
```

### consultas_equipe
```sql
CREATE TABLE consultas_equipe (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    papel TEXT CHECK (papel IN ('responsavel', 'colaborador', 'revisor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### consultas_analise
```sql
CREATE TABLE consultas_analise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
    conteudo TEXT,
    versao INTEGER DEFAULT 1,
    status TEXT CHECK (status IN ('rascunho', 'em_revisao', 'aprovado', 'final')),
    notas_pesquisa TEXT,
    checklist JSONB,
    created_by UUID REFERENCES profiles(id),
    revised_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### consultas_documentos
```sql
CREATE TABLE consultas_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('recebido', 'gerado', 'minuta', 'final')),
    categoria TEXT,
    titulo TEXT,
    arquivo_url TEXT,
    arquivo_nome TEXT,
    versao INTEGER,
    criado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### consultas_referencias
```sql
CREATE TABLE consultas_referencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('legislacao', 'jurisprudencia', 'doutrina', 'precedente')),
    titulo TEXT,
    referencia_completa TEXT,
    link TEXT,
    relevancia TEXT CHECK (relevancia IN ('alta', 'media', 'baixa')),
    citado_no_parecer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### consultas_timeline
```sql
CREATE TABLE consultas_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
    tipo_acao TEXT,
    descricao TEXT,
    user_id UUID REFERENCES profiles(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### templates_pareceres
```sql
CREATE TABLE templates_pareceres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo_consulta TEXT,
    area TEXT,
    estrutura JSONB,
    conteudo_template TEXT,
    variaveis JSONB,
    clausulas_padrao JSONB,
    ativo BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### minutas_contratuais
```sql
CREATE TABLE minutas_contratuais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo_contrato TEXT,
    conteudo_template TEXT,
    clausulas JSONB,
    variaveis_obrigatorias TEXT[],
    variaveis_opcionais TEXT[],
    instrucoes_preenchimento TEXT,
    tags TEXT[],
    versao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### clausulas_biblioteca
```sql
CREATE TABLE clausulas_biblioteca (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    categoria TEXT,
    tipo_contrato TEXT[],
    texto_clausula TEXT,
    variaveis JSONB,
    tags TEXT[],
    uso_count INTEGER DEFAULT 0,
    aprovada BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### precedentes_internos
```sql
CREATE TABLE precedentes_internos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_origem_id UUID REFERENCES consultas(id),
    titulo TEXT NOT NULL,
    area TEXT,
    resumo TEXT,
    teses TEXT[],
    palavras_chave TEXT[],
    aplicavel_em TEXT[],
    arquivo_url TEXT,
    aprovado_publicacao BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Publicações & Intimações (AASP)

### publicacoes
```sql
CREATE TABLE publicacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    aasp_id TEXT UNIQUE NOT NULL,
    data_publicacao DATE NOT NULL,
    data_captura TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tribunal TEXT NOT NULL,
    vara TEXT,
    tipo_publicacao TEXT CHECK (tipo_publicacao IN ('intimacao', 'sentenca', 'despacho', 'decisao', 'acordao')),
    numero_processo TEXT NOT NULL,
    processo_id UUID REFERENCES processos(id),
    cliente_id UUID REFERENCES clientes(id),
    partes TEXT[],
    texto_completo TEXT NOT NULL,
    pdf_url TEXT,
    hash_conteudo TEXT,
    status TEXT CHECK (status IN ('pendente', 'em_analise', 'processada', 'arquivada')),
    urgente BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_publicacoes_data ON publicacoes(data_publicacao DESC);
CREATE INDEX idx_publicacoes_processo ON publicacoes(processo_id);
CREATE INDEX idx_publicacoes_status ON publicacoes(status);
CREATE INDEX idx_publicacoes_aasp_id ON publicacoes(aasp_id);
CREATE INDEX idx_publicacoes_urgente ON publicacoes(escritorio_id) WHERE urgente = true AND status != 'processada';
```

### publicacoes_analise_ia
```sql
CREATE TABLE publicacoes_analise_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacao_id UUID REFERENCES publicacoes(id) ON DELETE CASCADE UNIQUE,
    resumo_executivo TEXT,
    tipo_decisao TEXT,
    sentimento TEXT CHECK (sentimento IN ('favoravel', 'desfavoravel', 'neutro')),
    pontos_principais JSONB,
    tem_prazo BOOLEAN DEFAULT false,
    tipo_prazo TEXT,
    prazo_dias INTEGER,
    prazo_tipo_dias TEXT CHECK (prazo_tipo_dias IN ('uteis', 'corridos')),
    data_intimacao DATE,
    data_limite DATE,
    fundamentacao_legal TEXT,
    tem_determinacao BOOLEAN DEFAULT false,
    determinacoes JSONB,
    requer_manifestacao BOOLEAN DEFAULT false,
    acoes_sugeridas JSONB,
    template_sugerido TEXT,
    confianca_analise NUMERIC,
    metadados_extras JSONB,
    processado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analise_publicacao ON publicacoes_analise_ia(publicacao_id);
```

### publicacoes_tratamento
```sql
CREATE TABLE publicacoes_tratamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacao_id UUID REFERENCES publicacoes(id) ON DELETE CASCADE,
    processado_por UUID REFERENCES profiles(id),
    acao_tomada TEXT CHECK (acao_tomada IN ('prazo_criado', 'andamento_registrado', 'tarefa_criada', 'descartada')),
    evento_id UUID REFERENCES eventos(id),
    observacoes TEXT,
    editou_sugestao BOOLEAN DEFAULT false,
    tempo_processamento_segundos INTEGER,
    processado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tratamento_publicacao ON publicacoes_tratamento(publicacao_id);
```

### publicacoes_historico
```sql
CREATE TABLE publicacoes_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacao_id UUID REFERENCES publicacoes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    acao TEXT CHECK (acao IN ('recebida', 'analisada_ia', 'visualizada', 'editada', 'processada', 'descartada')),
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historico_publicacao ON publicacoes_historico(publicacao_id);
CREATE INDEX idx_historico_data ON publicacoes_historico(created_at DESC);
```

### aasp_sync_log
```sql
CREATE TABLE aasp_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('automatica', 'manual')),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    publicacoes_novas INTEGER DEFAULT 0,
    publicacoes_atualizadas INTEGER DEFAULT 0,
    sucesso BOOLEAN,
    erro_mensagem TEXT,
    triggered_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_sync_log_escritorio ON aasp_sync_log(escritorio_id);
CREATE INDEX idx_sync_log_data ON aasp_sync_log(data_inicio DESC);
```

### aasp_config
```sql
CREATE TABLE aasp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE UNIQUE,
    api_url TEXT NOT NULL,
    api_token TEXT NOT NULL,
    webhook_url TEXT,
    webhook_secret TEXT,
    sync_frequencia_horas INTEGER DEFAULT 4,
    ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
    proxima_sincronizacao TIMESTAMP WITH TIME ZONE,
    notificar_users UUID[],
    notificar_apenas_urgentes BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### publicacoes_notificacoes
```sql
CREATE TABLE publicacoes_notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacao_id UUID REFERENCES publicacoes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    metodo TEXT CHECK (metodo IN ('email', 'push', 'whatsapp')),
    enviado BOOLEAN DEFAULT false,
    enviado_em TIMESTAMP WITH TIME ZONE,
    lido BOOLEAN DEFAULT false,
    lido_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notif_publicacao ON publicacoes_notificacoes(publicacao_id);
CREATE INDEX idx_notif_user ON publicacoes_notificacoes(user_id);
```

---

## Módulo: Financeiro

### financeiro_contratos_honorarios
```sql
CREATE TABLE financeiro_contratos_honorarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    numero_contrato TEXT UNIQUE NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    tipo_servico TEXT CHECK (tipo_servico IN ('processo', 'consultoria', 'avulso', 'misto')),
    forma_cobranca TEXT CHECK (forma_cobranca IN ('fixo', 'por_hora', 'por_etapa', 'misto')),
    ativo BOOLEAN DEFAULT true,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    arquivo_contrato_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contratos_cliente ON financeiro_contratos_honorarios(cliente_id);
CREATE INDEX idx_contratos_ativo ON financeiro_contratos_honorarios(escritorio_id) WHERE ativo = true;
```

### financeiro_contratos_honorarios_config
```sql
CREATE TABLE financeiro_contratos_honorarios_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID REFERENCES financeiro_contratos_honorarios(id) ON DELETE CASCADE,
    tipo_config TEXT CHECK (tipo_config IN ('fixo', 'hora', 'etapa', 'exito')),
    valor_fixo NUMERIC,
    valor_hora NUMERIC,
    horas_estimadas NUMERIC,
    etapas_valores JSONB,
    percentual_exito NUMERIC,
    valor_minimo_exito NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_config_contrato ON financeiro_contratos_honorarios_config(contrato_id);
```

### financeiro_honorarios
```sql
CREATE TABLE financeiro_honorarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    numero_interno TEXT UNIQUE NOT NULL,
    contrato_id UUID REFERENCES contratos_honorarios(id),
    cliente_id UUID REFERENCES clientes(id),
    processo_id UUID REFERENCES processos(id),
    consulta_id UUID REFERENCES consultas(id),
    tipo_lancamento TEXT CHECK (tipo_lancamento IN ('fixo', 'etapa', 'hora', 'exito', 'avulso')),
    etapa_processual TEXT CHECK (etapa_processual IN ('inicial', 'sentenca', 'recurso', 'exito')),
    descricao TEXT NOT NULL,
    valor_total NUMERIC NOT NULL,
    referencia_horas NUMERIC,
    parcelado BOOLEAN DEFAULT false,
    numero_parcelas INTEGER,
    responsavel_id UUID REFERENCES profiles(id),
    data_competencia DATE NOT NULL,
    data_emissao DATE DEFAULT CURRENT_DATE,
    observacoes TEXT,
    status TEXT CHECK (status IN ('proposta', 'aprovado', 'em_aberto', 'pago', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_honorarios_cliente ON financeiro_honorarios(cliente_id);
CREATE INDEX idx_honorarios_processo ON financeiro_honorarios(processo_id);
CREATE INDEX idx_honorarios_consulta ON financeiro_honorarios(consulta_id);
CREATE INDEX idx_honorarios_status ON financeiro_honorarios(status);
CREATE INDEX idx_honorarios_contrato ON financeiro_honorarios(contrato_id);
```

### financeiro_timesheet
```sql
CREATE TABLE financeiro_timesheet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    processo_id UUID REFERENCES processos(id),
    consulta_id UUID REFERENCES consultas(id),
    data_trabalho DATE NOT NULL,
    horas NUMERIC NOT NULL,
    atividade TEXT,
    faturavel BOOLEAN DEFAULT true,
    faturado BOOLEAN DEFAULT false,
    honorario_id UUID REFERENCES financeiro_honorarios(id),
    aprovado BOOLEAN DEFAULT false,
    aprovado_por UUID REFERENCES profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_timesheet_processo ON financeiro_timesheet(processo_id);
CREATE INDEX idx_timesheet_consulta ON financeiro_timesheet(consulta_id);
CREATE INDEX idx_timesheet_user ON financeiro_timesheet(user_id);
CREATE INDEX idx_timesheet_faturavel ON financeiro_timesheet(escritorio_id) WHERE faturavel = true AND faturado = false;
```

### processos_etapas_faturadas
```sql
CREATE TABLE processos_etapas_faturadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
    etapa TEXT CHECK (etapa IN ('inicial', 'sentenca', 'recurso', 'exito')),
    honorario_id UUID REFERENCES financeiro_honorarios(id),
    data_lancamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lancado_por UUID REFERENCES profiles(id),
    UNIQUE(processo_id, etapa)
);

CREATE INDEX idx_etapas_processo ON processos_etapas_faturadas(processo_id);
```

### financeiro_honorarios_parcelas
```sql
CREATE TABLE financeiro_honorarios_parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    honorario_id UUID REFERENCES financeiro_honorarios(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago NUMERIC,
    forma_pagamento TEXT,
    status TEXT CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    boleto_url TEXT,
    pix_qrcode TEXT,
    dias_atraso INTEGER,
    juros_aplicados NUMERIC,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parcelas_honorario ON financeiro_honorarios_parcelas(honorario_id);
CREATE INDEX idx_parcelas_vencimento ON financeiro_honorarios_parcelas(data_vencimento);
```

### financeiro_contas_pagamentos
```sql
CREATE TABLE financeiro_contas_pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    parcela_id UUID REFERENCES financeiro_honorarios_parcelas(id),
    despesa_id UUID REFERENCES financeiro_despesas(id),
    tipo_lancamento TEXT CHECK (tipo_lancamento IN ('receita', 'despesa')),
    valor NUMERIC NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    forma_pagamento TEXT,
    comprovante_url TEXT,
    conciliado BOOLEAN DEFAULT false,
    conciliado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_despesas
```sql
CREATE TABLE financeiro_despesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    categoria TEXT,
    fornecedor TEXT,
    descricao TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    recorrente BOOLEAN DEFAULT false,
    frequencia TEXT,
    processo_id UUID REFERENCES processos(id),
    centro_custo TEXT,
    documento_fiscal TEXT,
    forma_pagamento TEXT,
    status TEXT CHECK (status IN ('pendente', 'pago', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_despesas_vencimento ON financeiro_despesas(data_vencimento);
```

### financeiro_faturamento_cobrancas
```sql
CREATE TABLE financeiro_faturamento_cobrancas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID REFERENCES financeiro_honorarios_parcelas(id) ON DELETE CASCADE,
    tipo TEXT,
    metodo TEXT,
    destinatario TEXT,
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lido BOOLEAN,
    lido_em TIMESTAMP WITH TIME ZONE,
    respondido BOOLEAN
);
```

### financeiro_receitas_recorrentes
```sql
CREATE TABLE financeiro_receitas_recorrentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id),
    descricao TEXT,
    valor_mensal NUMERIC NOT NULL,
    dia_vencimento INTEGER,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    reajuste_anual BOOLEAN DEFAULT false,
    indice_reajuste TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_contas_conciliacoes
```sql
CREATE TABLE financeiro_contas_conciliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    conta_bancaria TEXT,
    data_extrato DATE NOT NULL,
    saldo_inicial NUMERIC,
    saldo_final NUMERIC,
    total_entradas NUMERIC,
    total_saidas NUMERIC,
    conciliado BOOLEAN DEFAULT false,
    divergencias JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_contas_importacoes
```sql
CREATE TABLE financeiro_contas_importacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conciliacao_id UUID REFERENCES financeiro_contas_conciliacoes(id) ON DELETE CASCADE,
    data_lancamento DATE NOT NULL,
    descricao TEXT,
    valor NUMERIC NOT NULL,
    tipo TEXT CHECK (tipo IN ('credito', 'debito')),
    pagamento_id UUID REFERENCES financeiro_contas_pagamentos(id),
    conciliado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_provisoes
```sql
CREATE TABLE financeiro_provisoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    processo_id UUID REFERENCES processos(id),
    tipo TEXT CHECK (tipo IN ('possivel', 'provavel', 'remota')),
    valor NUMERIC NOT NULL,
    descricao TEXT,
    data_registro DATE DEFAULT CURRENT_DATE,
    data_revisao DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_honorarios_comissoes
```sql
CREATE TABLE financeiro_honorarios_comissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    honorario_id UUID REFERENCES financeiro_honorarios(id) ON DELETE CASCADE,
    beneficiario_tipo TEXT CHECK (beneficiario_tipo IN ('profile', 'terceiro')),
    beneficiario_id UUID REFERENCES profiles(id),
    beneficiario_nome TEXT,
    percentual NUMERIC NOT NULL,
    valor NUMERIC NOT NULL,
    pago BOOLEAN DEFAULT false,
    data_pagamento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### financeiro_metas
```sql
CREATE TABLE financeiro_metas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    tipo TEXT,
    periodo TEXT,
    ano INTEGER NOT NULL,
    mes INTEGER,
    valor_meta NUMERIC NOT NULL,
    valor_realizado NUMERIC DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Relatórios

### relatorios_templates
```sql
CREATE TABLE relatorios_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT,
    descricao TEXT,
    tipo_visualizacao TEXT,
    config JSONB,
    publico BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES profiles(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### relatorios_agendados
```sql
CREATE TABLE relatorios_agendados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES relatorios_templates(id) ON DELETE CASCADE,
    frequencia TEXT,
    dia_semana INTEGER,
    dia_mes INTEGER,
    hora TIME,
    destinatarios TEXT[],
    formato TEXT,
    ativo BOOLEAN DEFAULT true,
    ultimo_envio TIMESTAMP WITH TIME ZONE,
    proximo_envio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### relatorios_gerados
```sql
CREATE TABLE relatorios_gerados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES relatorios_templates(id),
    titulo TEXT NOT NULL,
    tipo TEXT,
    parametros JSONB,
    arquivo_url TEXT,
    formato TEXT,
    gerado_por UUID REFERENCES profiles(id),
    data_inicio_periodo DATE,
    data_fim_periodo DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### relatorios_compartilhados
```sql
CREATE TABLE relatorios_compartilhados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relatorio_id UUID REFERENCES relatorios_gerados(id) ON DELETE CASCADE,
    compartilhado_com UUID REFERENCES profiles(id),
    link_publico TEXT,
    expira_em TIMESTAMP WITH TIME ZONE,
    visualizacoes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### metricas_cache
```sql
CREATE TABLE metricas_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    metrica TEXT NOT NULL,
    periodo TEXT,
    data_referencia DATE NOT NULL,
    valor NUMERIC,
    valor_anterior NUMERIC,
    variacao_percentual NUMERIC,
    metadata JSONB,
    calculado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_metricas_cache ON metricas_cache(escritorio_id, categoria, metrica, data_referencia);
```

### kpis_metas
```sql
CREATE TABLE kpis_metas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    kpi TEXT NOT NULL,
    periodo TEXT,
    ano INTEGER NOT NULL,
    mes INTEGER,
    trimestre INTEGER,
    valor_meta NUMERIC NOT NULL,
    valor_realizado NUMERIC DEFAULT 0,
    percentual_atingimento NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### dashboards_personalizados
```sql
CREATE TABLE dashboards_personalizados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    layout JSONB,
    widgets JSONB,
    filtros_padrao JSONB,
    compartilhado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### analises_ia
```sql
CREATE TABLE analises_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    tipo TEXT,
    categoria TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    dados_entrada JSONB,
    resultado JSONB,
    confianca NUMERIC,
    acao_sugerida TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valido_ate TIMESTAMP WITH TIME ZONE
);
```

### nps_avaliacoes
```sql
CREATE TABLE nps_avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id),
    processo_id UUID REFERENCES processos(id),
    consulta_id UUID REFERENCES consultas(id),
    nota INTEGER CHECK (nota >= 0 AND nota <= 10),
    categoria TEXT CHECK (categoria IN ('promotor', 'neutro', 'detrator')),
    feedback TEXT,
    respondido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Documentos

### documentos
```sql
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nome_original TEXT,
    arquivo_url TEXT NOT NULL,
    arquivo_tamanho BIGINT,
    arquivo_tipo TEXT,
    hash_arquivo TEXT,
    categoria TEXT,
    tipo_documento TEXT,
    data_documento DATE,
    descricao TEXT,
    confidencial BOOLEAN DEFAULT false,
    cliente_id UUID REFERENCES clientes(id),
    processo_id UUID REFERENCES processos(id),
    consulta_id UUID REFERENCES consultas(id),
    pasta_id UUID REFERENCES pastas(id),
    criado_por UUID REFERENCES profiles(id),
    versao_numero INTEGER DEFAULT 1,
    documento_origem_id UUID REFERENCES documentos(id),
    is_versao_atual BOOLEAN DEFAULT true,
    ocr_processado BOOLEAN DEFAULT false,
    ocr_texto TEXT,
    metadata_extraido JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
CREATE INDEX idx_documentos_processo ON documentos(processo_id);
CREATE INDEX idx_documentos_pasta ON documentos(pasta_id);
CREATE INDEX idx_documentos_hash ON documentos(hash_arquivo);
```

### pastas
```sql
CREATE TABLE pastas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    pasta_pai_id UUID REFERENCES pastas(id),
    caminho TEXT,
    tipo TEXT,
    cliente_id UUID REFERENCES clientes(id),
    processo_id UUID REFERENCES processos(id),
    criado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_tags
```sql
CREATE TABLE documentos_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(documento_id, tag)
);
```

### documentos_versoes
```sql
CREATE TABLE documentos_versoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    versao_numero INTEGER NOT NULL,
    arquivo_url TEXT NOT NULL,
    modificado_por UUID REFERENCES profiles(id),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_compartilhados
```sql
CREATE TABLE documentos_compartilhados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    compartilhado_com_user UUID REFERENCES profiles(id),
    link_publico UUID,
    senha TEXT,
    permissoes TEXT[],
    expira_em TIMESTAMP WITH TIME ZONE,
    visualizacoes INTEGER DEFAULT 0,
    criado_por UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_assinaturas
```sql
CREATE TABLE documentos_assinaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    plataforma TEXT,
    plataforma_id TEXT,
    status TEXT CHECK (status IN ('pendente', 'assinado', 'cancelado', 'expirado')),
    signatarios JSONB,
    documento_assinado_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_em TIMESTAMP WITH TIME ZONE
);
```

### documentos_protocolo
```sql
CREATE TABLE documentos_protocolo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    numero_protocolo TEXT UNIQUE,
    tipo TEXT CHECK (tipo IN ('entrada', 'saida', 'interno')),
    remetente TEXT,
    destinatario TEXT,
    data_protocolo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recebido_por UUID REFERENCES profiles(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### templates_documentos
```sql
CREATE TABLE templates_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT,
    tipo_documento TEXT,
    conteudo_template TEXT,
    variaveis JSONB,
    instrucoes_ia TEXT,
    formato TEXT,
    arquivo_template_url TEXT,
    publico BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES profiles(id),
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_acessos
```sql
CREATE TABLE documentos_acessos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    ip_address TEXT,
    acao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_anotacoes
```sql
CREATE TABLE documentos_anotacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    pagina INTEGER,
    posicao JSONB,
    tipo TEXT,
    conteudo TEXT,
    cor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_permissoes
```sql
CREATE TABLE documentos_permissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    grupo TEXT,
    permissoes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### documentos_duplicatas
```sql
CREATE TABLE documentos_duplicatas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_original_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    documento_duplicata_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    similaridade NUMERIC,
    status TEXT CHECK (status IN ('potencial', 'confirmado', 'nao_duplicata')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Módulo: Centro de Comando

### centro_comando_historico
```sql
CREATE TABLE centro_comando_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    comando TEXT NOT NULL,
    comando_normalizado TEXT,
    intent TEXT,
    modulo_alvo TEXT,
    parametros JSONB,
    resultado JSONB,
    resultado_texto TEXT,
    sucesso BOOLEAN DEFAULT true,
    tempo_execucao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historico_user ON centro_comando_historico(user_id);
CREATE INDEX idx_historico_data ON centro_comando_historico(created_at DESC);
CREATE INDEX idx_historico_intent ON centro_comando_historico(intent);
```

### centro_comando_favoritos
```sql
CREATE TABLE centro_comando_favoritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    comando TEXT NOT NULL,
    icone TEXT,
    ordem INTEGER DEFAULT 0,
    categoria TEXT CHECK (categoria IN ('consulta', 'acao', 'analise')),
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_favoritos_user ON centro_comando_favoritos(user_id);
CREATE INDEX idx_favoritos_ordem ON centro_comando_favoritos(user_id, ordem);
```

### centro_comando_cache
```sql
CREATE TABLE centro_comando_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comando_hash TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    resultado JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_cache_hash ON centro_comando_cache(comando_hash);
CREATE INDEX idx_cache_expira ON centro_comando_cache(expires_at);
```

### centro_comando_contexto
```sql
CREATE TABLE centro_comando_contexto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sessao_id UUID NOT NULL,
    contexto_atual JSONB,
    ultimo_modulo TEXT,
    ultimo_comando TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contexto_user_sessao ON centro_comando_contexto(user_id, sessao_id);
CREATE INDEX idx_contexto_updated ON centro_comando_contexto(updated_at);
```

### centro_comando_sugestoes
```sql
CREATE TABLE centro_comando_sugestoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('comando', 'acao', 'insight')),
    titulo TEXT NOT NULL,
    comando TEXT,
    relevancia_score NUMERIC,
    exibido BOOLEAN DEFAULT false,
    usado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sugestoes_user ON centro_comando_sugestoes(user_id);
CREATE INDEX idx_sugestoes_relevancia ON centro_comando_sugestoes(user_id, relevancia_score DESC);
```

---

## Módulo: Centro de Comando

### centro_comando_historico
```sql
CREATE TABLE centro_comando_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    comando TEXT NOT NULL,
    comando_normalizado TEXT,
    intent TEXT,
    modulo_alvo TEXT,
    contexto_anterior JSONB,
    resultado JSONB,
    tipo_resultado TEXT CHECK (tipo_resultado IN ('lista', 'acao', 'analise', 'relatorio')),
    sucesso BOOLEAN DEFAULT true,
    tempo_execucao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historico_user ON centro_comando_historico(user_id);
CREATE INDEX idx_historico_data ON centro_comando_historico(created_at DESC);
CREATE INDEX idx_historico_comando ON centro_comando_historico USING gin(to_tsvector('portuguese', comando));
```

### centro_comando_favoritos
```sql
CREATE TABLE centro_comando_favoritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    comando TEXT NOT NULL,
    icone TEXT,
    categoria TEXT,
    ordem INTEGER DEFAULT 0,
    compartilhado_equipe BOOLEAN DEFAULT false,
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_favoritos_user ON centro_comando_favoritos(user_id);
CREATE INDEX idx_favoritos_ordem ON centro_comando_favoritos(user_id, ordem);
```

### centro_comando_cache
```sql
CREATE TABLE centro_comando_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comando_hash TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    resultado JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_cache_hash ON centro_comando_cache(comando_hash);
CREATE INDEX idx_cache_expires ON centro_comando_cache(expires_at);
```

### centro_comando_templates
```sql
CREATE TABLE centro_comando_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escritorio_id UUID REFERENCES escritorios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    comando_template TEXT NOT NULL,
    variaveis JSONB,
    categoria TEXT,
    publico BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES profiles(id),
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_escritorio ON centro_comando_templates(escritorio_id);
```

### centro_comando_sessoes
```sql
CREATE TABLE centro_comando_sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fim TIMESTAMP WITH TIME ZONE,
    comandos_count INTEGER DEFAULT 0,
    contexto_sessao JSONB,
    ativo BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessoes_user_ativo ON centro_comando_sessoes(user_id) WHERE ativo = true;
```

---

## Observações Finais

### RLS (Row Level Security)

Todas as tabelas devem ter políticas RLS habilitadas para garantir que:
- Usuários só acessem dados do próprio escritório
- Respeitem permissões granulares definidas
- Admins tenham controle total

### Índices

Os índices principais estão definidos acima, mas podem ser criados índices adicionais conforme necessidade de performance identificada em queries específicas.

### Triggers e Functions

Para cada módulo, foram listadas as Functions e Triggers necessárias. Estas devem ser implementadas em PL/pgSQL no Supabase.

### Storage

Arquivos (documentos, anexos, imagens) devem ser armazenados no Supabase Storage com buckets organizados por tipo e com políticas de acesso adequadas.

### Real-time

Habilitar Real-time subscriptions para tabelas críticas como:
- notifications
- processos_movimentacoes
- publicacoes
- eventos
- ai_chat_history

### Backup e Manutenção

- Backups automáticos diários
- Rotinas de limpeza de dados antigos (scheduled functions)
- Logs de auditoria em tabelas críticas
- Versionamento de schema
