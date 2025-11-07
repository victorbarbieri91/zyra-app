# Módulo: Publicações & Intimações (AASP)

## Funcionalidade

Integração com API da AASP para recebimento automático de publicações e intimações, com tratamento inteligente via IA para sugestão de prazos, tarefas e registro de andamentos processuais.

### Telas Principais

**Lista de Publicações**
- Grid com todas publicações recebidas da AASP
- Filtros: data, tribunal, status (pendente/processada/arquivada), processo, advogado
- Busca por palavras-chave, número processo, cliente
- Indicadores visuais por status:
  - 🔴 Pendente de análise (vermelha)
  - 🟡 Em análise pela IA (amarela)
  - 🟢 Processada (verde)
  - ⚪ Arquivada (cinza)
- Cards com resumo: pendentes, processadas hoje, prazos criados, descartadas
- Ações em lote: processar múltiplas, marcar como lida, arquivar

**Visualização de Publicação (Modo Leitura)**

Layout dividido em duas colunas:

**Coluna Esquerda - Dados da Publicação**
- Header com badges de status e prioridade
- Data da publicação/intimação
- Tribunal/Vara
- Tipo (intimação, sentença, despacho, decisão, acórdão)
- Número do processo (com link para módulo Processos)
- Cliente vinculado
- Partes do processo
- Texto completo da publicação formatado
- PDF original (quando disponível)
- Metadados da AASP

**Coluna Direita - Análise e Ações**
- Resumo executivo gerado pela IA
- Pontos principais identificados
- Tipo de decisão/despacho
- Sentimento da decisão (favorável/desfavorável/neutro)
- Próximas ações sugeridas

**Card de Prazo Detectado** (se houver prazo)
- Tipo de prazo identificado
- Fundamentação legal
- Prazo em dias úteis
- Data de início (intimação)
- Data limite calculada
- Observações

**Botões de Ação**
- Criar Prazo/Tarefa (pré-preenchido)
- Registrar Andamento
- Editar Sugestões
- Descartar Publicação
- Compartilhar com Cliente

**Tela de Tratamento com IA**

Interface wizard de 3 etapas para processar a publicação:

**Etapa 1: Análise Automática**
- IA processa o conteúdo
- Extrai informações estruturadas
- Vincula automaticamente ao processo
- Identifica prazos
- Loading com status do processamento

**Etapa 2: Revisão e Confirmação**

Apresenta formulário pré-preenchido baseado na análise:

**Se detectou PRAZO:**
```
┌─────────────────────────────────────────┐
│ Criar Prazo/Evento                      │
├─────────────────────────────────────────┤
│ Tipo: [Prazo Recursal ▼]               │
│ Descrição: [Prazo para Recurso de...] │
│ Processo: [Processo X - Auto-vinc.] ✓  │
│ Data Intimação: [02/11/2024]           │
│ Prazo: [15] dias úteis                 │
│ Data Limite: [23/11/2024] 🗓️          │
│ Responsável: [Advogado X ▼]            │
│ Lembrete: [✓] 7 dias antes            │
│            [✓] 3 dias antes            │
│            [✓] 1 dia antes             │
│                                         │
│ Observações (da IA):                   │
│ [Prazo para recurso ordinário conf.    │
│  art. 1.003 do CPC. Contagem...]       │
│                                         │
│ [Editar]  [Confirmar e Criar Prazo]   │
└─────────────────────────────────────────┘
```

**Se detectou AUDIÊNCIA/COMPROMISSO:**
```
┌─────────────────────────────────────────┐
│ Agendar Audiência                       │
├─────────────────────────────────────────┤
│ Tipo: [Audiência de Instrução ▼]      │
│ Data/Hora: [15/11/2024 às 14:00]      │
│ Local: [Vara X - Fórum Central]       │
│ Modalidade: [⚪ Presencial ⚫Virtual]  │
│ Duração estimada: [2h]                │
│                                         │
│ [Confirmar e Agendar]                  │
└─────────────────────────────────────────┘
```

**Se NÃO detectou prazo urgente:**
```
┌─────────────────────────────────────────┐
│ Registrar como Andamento                │
├─────────────────────────────────────────┤
│ [✓] Adicionar aos andamentos do proc.  │
│ [✓] Notificar cliente                  │
│ [ ] Criar tarefa de acompanhamento     │
│                                         │
│ Resumo para andamento:                 │
│ [Decisão interlocutória determinando...]│
│                                         │
│ [Registrar Andamento]                  │
└─────────────────────────────────────────┘
```

**Opções sempre disponíveis:**
- ✏️ Editar informações sugeridas
- 📋 Adicionar observações
- 🗑️ Descartar publicação (com motivo)
- ⏭️ Processar depois

**Etapa 3: Confirmação**
- Feedback visual do que foi criado
- Links para prazo/tarefa/andamento criados
- Opção de processar próxima publicação
- Ou voltar para lista

### Configurações da Integração AASP

**Credenciais API**
- URL da API AASP
- Token de autenticação
- OABs monitoradas (automático pelos advogados cadastrados)
- Webhook para notificações em tempo real

**Sincronização**
- Sincronização automática a cada X horas
- Sincronização manual (botão)
- Histórico de sincronizações
- Status da última sincronização
- Logs de erros

**Notificações**
- Quais usuários recebem alertas de novas publicações
- Métodos: email, push, WhatsApp
- Apenas publicações urgentes ou todas
- Resumo diário

**Regras de Processamento**
- Auto-vincular por número de processo
- Auto-vincular por nome de cliente
- Tipos de publicação que geram alerta imediato
- Prazos mínimos para alerta (ex: < 5 dias)

### Funcionalidades Especiais

**Vinculação Automática**
- Identifica número CNJ no texto
- Busca processo correspondente no sistema
- Se encontrar: vincula automaticamente
- Se não encontrar: sugere criar processo ou vincular manualmente

**Análise Inteligente de Conteúdo**
- Identifica tipo de ato (sentença, decisão, despacho, intimação)
- Extrai prazo se houver
- Identifica fundamentação legal
- Detecta se há determinações/ordens
- Analisa se é favorável/desfavorável
- Extrai datas mencionadas
- Identifica necessidade de manifestação

**Cálculo Automático de Prazos**
- Identifica prazo em dias úteis
- Considera feriados e suspensões
- Calcula data limite
- Valida com tabela de prazos processuais
- Alerta se prazo já está vencido

**Detecção de Urgência**
- Prazos < 5 dias: urgente
- Palavras-chave de urgência (liminar, tutela, etc)
- Intimações pessoais
- Determinações judiciais
- Alerta diferenciado para publicações urgentes

**Histórico de Tratamento**
- Todas ações realizadas sobre a publicação
- Quem processou e quando
- Prazo criado (link)
- Andamento registrado (link)
- Observações adicionadas
- Edições feitas

**Sugestões de Template**
- IA sugere template de petição baseada no tipo de publicação
- Ex: Intimação de sentença → Template de recurso
- Link direto para gerar peça no módulo Processos

### Integrações com IA

**Via Chat do Dashboard**
- "Mostre publicações pendentes"
- "Há intimações urgentes?"
- "Processe publicação do processo X"
- "Quais publicações ainda não foram analisadas?"
- "Liste prazos criados a partir de publicações esta semana"
- "Sincronize com AASP agora"

**Automações com n8n**
- Sincronização periódica com API AASP
- Ao receber nova publicação:
  - Analisa via IA
  - Vincula ao processo
  - Notifica responsável
  - Se prazo urgente: alerta imediato
- Cria rascunho de prazo/tarefa
- Envia notificação personalizada

**Análise Completa via IA**
1. Extração de dados estruturados
2. Identificação de tipo e conteúdo
3. Análise de prazos e determinações
4. Sugestão de ações
5. Geração de resumo executivo
6. Pré-preenchimento de formulários

**Sugestões Proativas**
- "Nova intimação no processo X com prazo de 5 dias. Processar agora?"
- "3 publicações pendentes há mais de 24h. Deseja processar em lote?"
- "Detectei sentença no processo Y. Deseja gerar minuta de recurso?"
- "Publicação indica audiência. Já foi agendada?"


## Banco de Dados

### Tabelas Necessárias

**publicacoes**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- aasp_id (text, unique) - ID da publicação na AASP
- data_publicacao (date)
- data_captura (timestamp)
- tribunal (text)
- vara (text, nullable)
- tipo_publicacao (text: 'intimacao', 'sentenca', 'despacho', 'decisao', 'acordao')
- numero_processo (text)
- processo_id (uuid, FK processos, nullable) - vinculado automaticamente
- cliente_id (uuid, FK clientes, nullable)
- partes (text[])
- texto_completo (text)
- pdf_url (text, nullable)
- hash_conteudo (text) - para deduplicação
- status (text: 'pendente', 'em_analise', 'processada', 'arquivada')
- urgente (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

**publicacoes_analise_ia**
```
- id (uuid, PK)
- publicacao_id (uuid, FK publicacoes, unique)
- resumo_executivo (text) - resumo gerado pela IA
- tipo_decisao (text, nullable)
- sentimento (text: 'favoravel', 'desfavoravel', 'neutro', nullable)
- pontos_principais (jsonb) - array de pontos chave
- tem_prazo (boolean)
- tipo_prazo (text, nullable)
- prazo_dias (integer, nullable)
- prazo_tipo_dias (text: 'uteis', 'corridos', nullable)
- data_intimacao (date, nullable)
- data_limite (date, nullable)
- fundamentacao_legal (text, nullable)
- tem_determinacao (boolean)
- determinacoes (jsonb, nullable) - array de determinações
- requer_manifestacao (boolean)
- acoes_sugeridas (jsonb) - array de ações sugeridas
- template_sugerido (text, nullable) - template de petição sugerido
- confianca_analise (numeric) - score de confiança da análise
- metadados_extras (jsonb)
- processado_em (timestamp)
```

**publicacoes_tratamento**
```
- id (uuid, PK)
- publicacao_id (uuid, FK publicacoes)
- processado_por (uuid, FK profiles)
- acao_tomada (text: 'prazo_criado', 'andamento_registrado', 'tarefa_criada', 'descartada')
- evento_id (uuid, FK eventos, nullable) - se criou prazo/tarefa
- observacoes (text, nullable)
- editou_sugestao (boolean) - se editou o que a IA sugeriu
- tempo_processamento_segundos (integer)
- processado_em (timestamp)
```

**publicacoes_historico**
```
- id (uuid, PK)
- publicacao_id (uuid, FK publicacoes)
- user_id (uuid, FK profiles, nullable)
- acao (text: 'recebida', 'analisada_ia', 'visualizada', 'editada', 'processada', 'descartada')
- detalhes (jsonb, nullable)
- created_at (timestamp)
```

**aasp_sync_log**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- tipo (text: 'automatica', 'manual')
- data_inicio (timestamp)
- data_fim (timestamp, nullable)
- publicacoes_novas (integer)
- publicacoes_atualizadas (integer)
- sucesso (boolean)
- erro_mensagem (text, nullable)
- triggered_by (uuid, FK profiles, nullable)
```

**aasp_config**
```
- id (uuid, PK)
- escritorio_id (uuid, FK, unique)
- api_url (text)
- api_token (text, encrypted)
- webhook_url (text, nullable)
- webhook_secret (text, nullable)
- sync_frequencia_horas (integer)
- ultima_sincronizacao (timestamp, nullable)
- proxima_sincronizacao (timestamp, nullable)
- notificar_users (uuid[], nullable) - array de user_ids
- notificar_apenas_urgentes (boolean)
- ativo (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

**publicacoes_notificacoes**
```
- id (uuid, PK)
- publicacao_id (uuid, FK publicacoes)
- user_id (uuid, FK profiles)
- metodo (text: 'email', 'push', 'whatsapp')
- enviado (boolean)
- enviado_em (timestamp, nullable)
- lido (boolean)
- lido_em (timestamp, nullable)
```

### Views

**v_publicacoes_pendentes**
```
Publicações com status 'pendente' ou 'em_analise'
Com dados da análise IA
Ordenadas por urgência e data
Para dashboard e lista principal
```

**v_publicacoes_urgentes**
```
Publicações urgentes não processadas
Prazos < 5 dias ou palavras-chave de urgência
Para alertas
```

**v_publicacoes_dashboard**
```
Métricas consolidadas:
- Total pendentes
- Processadas hoje
- Prazos criados
- Taxa de processamento
- Tempo médio de tratamento
```

**v_publicacoes_completas**
```
Join de publicacoes + analise_ia + tratamento
Todos dados consolidados
Para visualização detalhada
```

### Functions

**sync_aasp_publications()**
- Conecta na API da AASP
- Busca novas publicações
- Para cada publicação:
  - Verifica se já existe (por aasp_id)
  - Se nova: cria registro
  - Tenta vincular processo automaticamente
  - Agenda análise via IA
- Registra log de sincronização
- Retorna quantidade de novas publicações

**analisar_publicacao_ia(publicacao_id uuid)**
- Busca texto da publicação
- Envia para IA analisar:
  - Extrai dados estruturados
  - Identifica prazos
  - Calcula datas
  - Gera resumo
  - Sugere ações
- Salva análise em publicacoes_analise_ia
- Atualiza status da publicação
- Se urgente: cria notificação imediata
- Retorna análise

**vincular_processo_auto(publicacao_id uuid)**
- Extrai número CNJ do texto
- Busca processo correspondente
- Se encontrar: vincula
- Também busca por nome do cliente
- Retorna processo_id ou null

**criar_prazo_de_publicacao(publicacao_id uuid, dados_ajustados jsonb)**
- Busca dados da publicação e análise
- Mescla com dados_ajustados (se usuário editou)
- Cria evento de prazo na agenda
- Vincula ao processo
- Atualiza publicacao status = 'processada'
- Registra em publicacoes_tratamento
- Retorna evento_id

**registrar_andamento_publicacao(publicacao_id uuid, notificar_cliente boolean)**
- Busca publicação
- Cria movimentação no processo
- Se notificar_cliente: agenda notificação
- Atualiza publicacao status = 'processada'
- Registra em publicacoes_tratamento
- Retorna movimentacao_id

**descartar_publicacao(publicacao_id uuid, motivo text)**
- Atualiza status = 'arquivada'
- Registra motivo em publicacoes_tratamento
- Registra no histórico
- Retorna confirmação

**get_publicacao_completa(publicacao_id uuid)**
- Retorna publicação com todos dados relacionados
- Análise IA
- Histórico de ações
- Tratamento (se processada)
- Processo vinculado (se houver)
- Para visualização completa

**sugerir_template_peticao(publicacao_id uuid)**
- Analisa tipo de publicação
- Busca templates apropriados
- Retorna sugestão de template
- Para facilitar criação de petição

### Triggers

**new_publicacao_webhook**
- Quando nova publicação é inserida
- Se veio via webhook (campo source)
- Dispara análise IA imediatamente
- Notifica usuários configurados

**publicacao_analisada**
- Após análise IA salva
- Se detectou prazo urgente (< 5 dias)
- Cria notificação de alta prioridade
- Envia alerta imediato

**publicacao_vinculada**
- Quando processo_id é preenchido
- Notifica responsável do processo
- Cria entrada no histórico

**update_publicacao_status**
- Ao mudar status
- Registra no histórico
- Atualiza métricas

### Scheduled Functions

**sync_aasp_scheduled**
- Roda conforme frequência configurada (ex: a cada 4 horas)
- Para cada escritório ativo:
  - Executa sync_aasp_publications()
  - Atualiza proxima_sincronizacao
- Trata erros e registra logs

**analisar_publicacoes_pendentes**
- Roda a cada 30 minutos
- Busca publicações com status 'pendente'
- Ainda sem análise IA
- Processa em lote (até 10 por vez)
- Atualiza para 'em_analise' → analisa → 'processada' ou erro

**alertar_publicacoes_nao_processadas**
- Roda 2x ao dia (9h e 17h)
- Publicações há mais de 24h sem processar
- Envia alerta para responsáveis
- Escalona se urgente e > 48h

**limpar_notificacoes_antigas**
- Roda semanalmente
- Remove notificações > 90 dias
- Mantém base limpa

### RLS

- Usuários veem publicações do próprio escritório
- Podem processar publicações de processos que têm acesso
- Podem marcar como lida/arquivada publicações relevantes
- Admins veem e processam todas publicações do escritório
- Logs de sincronização: apenas admins

### Integração com API AASP

**Endpoints a serem consumidos:**
- GET /publicacoes - lista publicações
- GET /publicacao/{id} - detalhes de uma publicação
- GET /publicacoes/novas - apenas novas desde última sync
- POST /webhook - receber notificações em tempo real

**Webhook da AASP:**
- Configurar URL no sistema da AASP
- Receber notificação imediata de nova publicação
- Validar assinatura/secret
- Processar e inserir no banco
- Disparar análise IA

**Autenticação:**
- Bearer Token armazenado em aasp_config
- Refresh automático se expirar
- Logs de falhas de autenticação

