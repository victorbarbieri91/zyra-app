# Módulo: Dashboard

## Funcionalidade

Centro de comando do sistema com métricas principais de todos os módulos e acesso rápido ao Centro de Comando (módulo dedicado de IA).

### Layout Implementado

**Estrutura Principal (3 Colunas Responsivas)**
- **Coluna Esquerda (3/12 = 25%)**: Agenda + Contexto pessoal + Atividades
- **Coluna Central (5/12 = 42%)**: Resumo IA + Performance + Publicações
- **Coluna Direita (4/12 = 33%)**: KPIs + Insights de gestão
- Header com título "Dashboard" + data atual
- Ações Rápidas em card horizontal separado (8 botões)
- Espaçamento padrão: gap-6 entre seções
- Acesso rápido ao Centro de Comando via atalho (Ctrl/Cmd + K)

**Coluna Esquerda: Agenda e Contexto Pessoal**

**1. Agenda de Hoje** (COM DESTAQUE - borda teal)
- Card com destaque visual: border-[#89bcbe] + gradient background
- Mini-calendário com compromissos de hoje
- Lista cronológica:
  - Horário | Título do evento
  - Tipo (audiência, reunião, prazo) com badge colorido
  - Cliente/Processo relacionado
  - Botões de ação rápida quando aplicável
- Máximo 4-5 itens visíveis com ScrollArea
- Botão "Ver →" no header para agenda completa

**2. Seus Números do Mês**
- Horas Faturadas (barra de progresso verde + % da meta)
- Receita Gerada (barra de progresso verde + valor atual vs meta)
- Horas Não Cobráveis (barra de progresso cinza + descrição "Atividades internas e administrativas")
- **Removido**: warning de horas não faturadas
- **Removido**: botão "Faturar Agora"

**3. Atividade Recente** (Timeline)
- Stream de atividades do escritório
- Últimas 5 ações relevantes:
  - Pagamentos recebidos (ícone DollarSign, cor emerald)
  - Publicações novas (ícone Bell, cor blue)
  - Consultas concluídas (ícone CheckCircle2, cor teal)
  - Peças protocoladas (ícone FileText, cor purple)
  - Novos clientes (ícone Users, cor blue)
- Timestamp relativo (há 5 min, há 1h)
- Ações rápidas inline quando aplicável
- Botão "Ver →" no header
- Componente: TimelineItem com ícones 28px

**Coluna Central: Resumo IA + Performance + Publicações**

**1. Resumo do Dia (Gerado por IA)**
- Card com gradient background from-white to-slate-50/30
- Ícone Sparkles em badge teal com gradient
- Saudação personalizada: "Bom dia, Advogado!"
- Timestamp: "Gerado há 5 minutos"
- Resumo natural do que tem para hoje:
  - Compromissos e audiências (3 audiências agendadas)
  - Prazos importantes (2 prazos)
  - Status da agenda (65% ocupada)
  - Horas não faturadas (15h - oportunidade R$ 7.500)
  - Mensagem motivacional com emoji
- Botões: "Atualizar" | "Ver Detalhes →"

**2. Performance Geral** (Sistema de Tabs)

**Tab "Equipe":**
- Barras horizontais com horas faturadas
- Cada advogado com nome + horas
- Cores: gradiente do sistema (#34495e, #46627f, #89bcbe, #aacfd0)
- Total consolidado no final
- Tom colaborativo, não competitivo

**Tab "Por Área":**
- Cards com área jurídica + quantidade processos
- Barras de progresso por receita
- Cores por área usando paleta do sistema
- Receita formatada ao lado

**Tab "Financeiro":**
- 2 cards no topo: "Total a Receber" e "Taxa Inadimplência"
- Background: gradient from-[#f0f9f9] to-[#e8f5f5]
- Top 5 Clientes por receita
- Valores formatados discretamente

**3. Publicações Recentes**
- Lista de publicações com processo, tipo, conteúdo, prazo
- Cards urgentes: bg-red-50 border-red-200
- Cards normais: bg-slate-50 hover:bg-slate-100
- Estrutura:
  - Processo número + Tipo (intimação, despacho, sentença, citação)
  - Conteúdo descritivo
  - Badge de prazo (dias restantes)
- Botão "Ver Todas →" no header

**Coluna Direita: KPIs + Insights**

**1. Ações Rápidas** (Seção horizontal ANTES das colunas)
- Card horizontal com título "Ações Rápidas" (text-sm)
- Grid 8 colunas com botões:
  - **[Comando IA]** (botão gradient destacado #34495e to #46627f)
  - [+ Processo] [+ Cliente] [+ Consulta] [+ Documento]
  - [Registrar Horas] [Despesa] [Relatórios]
- **Removido**: botão "Buscar"
- Componente: QuickActionButton
  - Highlight: py-2.5 px-3, ícone 16px, text-xs
  - Normal: py-2.5 px-3, ícone 14px, text-[11px]
- Atalho global: Ctrl/Cmd + K (abre Centro de Comando)

**2. KPIs Principais** (Grid 2x2)
- 4 cards compactos usando MetricCard component
- Cores: gradientes do sistema (kpi1, kpi2, kpi3, kpi4)
- **KPI 1 - Processos Ativos**: gradient #34495e to #46627f
  - Valor: 47 | Trend: +8 esta semana
- **KPI 2 - Clientes Ativos**: gradient #46627f to #6c757d
  - Valor: 124 | Trend: +12 este mês
- **KPI 3 - Casos Consultivos**: gradient #89bcbe to #aacfd0
  - Valor: 18 | Subtitle: "aguardando resposta"
  - **Renomeado de**: "Consultas Abertas"
- **KPI 4 - Faturamento Mês**: gradient #aacfd0 to #cbe2e2
  - Valor: R$ 8.500,00 | Subtitle: "pagamentos confirmados"
  - **Renomeado de**: "Recebido Hoje"

Tamanhos MetricCard:
- Container ícone: w-8 h-8
- Ícone: w-4 h-4
- Título: text-xs
- Valor: text-2xl
- Trend/Subtitle: text-xs

**3. Insights de Gestão** (IA)
- Card com 3 insights usando InsightCard component
- Tipos: oportunidade (emerald), destaque (teal), alerta (amber)
- Estrutura de cada insight:
  - Badge tipo (text-[10px], h-4)
  - Título (text-xs, font-semibold)
  - Descrição (text-[11px], leading-snug)
  - Botão ação opcional (text-[10px])
- Ícones: 28px container, 14px ícone
- Exemplos:
  - "Existem 45h não faturadas" (oportunidade)
  - "Taxa de conversão em 78%" (destaque)
  - "5 contratos vencem em 30 dias" (alerta)

**Componentes Removidos:**
- ❌ Metas (Semanais/Mensais/Anuais)
- ❌ Para Acompanhar
- ❌ KPI "A Receber"

### Acesso ao Centro de Comando

**Atalho Global:**
- Tecla: `Ctrl/Cmd + K` de qualquer tela
- Abre módulo Centro de Comando
- Foco automático no input
- Pronto para receber comando

**Botão no Dashboard:**
- Botão destacado "🤖 Centro de Comando" 
- Na seção de Ações Rápidas
- Sempre visível e acessível

**Navegação:**
- Item no menu lateral
- Acesso direto ao módulo dedicado

### Integração com Centro de Comando

O Dashboard está integrado ao módulo Centro de Comando, onde todas as capacidades de IA estão centralizadas:

**Exemplos de comandos disponíveis:**

**1. Consultas e Pesquisas**
- "Mostre processos do cliente João Silva"
- "Quais audiências tenho amanhã?"
- "Quanto recebi em honorários este mês?"
- "Há publicações não lidas do processo X?"
- "Lista clientes inativos há mais de 60 dias"

**2. Execução de Tarefas**
- "Crie novo processo para cliente ABC"
- "Agende reunião com Maria para sexta às 14h"
- "Marque todas publicações como lidas"
- "Gere relatório mensal de honorários"
- "Envie lembrete de prazo para equipe"

**3. Navegação Inteligente**
- "Abra o processo número XXX"
- "Vá para agenda da próxima semana"
- "Mostre documentos do cliente Y"
- "Exiba financeiro de outubro"

**4. Análises e Insights**
- "Qual minha taxa de sucesso em processos trabalhistas?"
- "Identifique clientes com risco de inadimplência"
- "Analise produtividade da equipe este mês"
- "Sugira otimizações no fluxo processual"

**5. Agendamentos e Automações**
- "Lembre-me de ligar para cliente X amanhã"
- "Configure alerta para prazos recursais"
- "Agende envio semanal de relatório por email"

**Acesso:** Botão destacado no Dashboard ou `Ctrl/Cmd + K` de qualquer tela

**Sugestões Contextuais**

Dashboard oferece sugestões baseadas em contexto (via Centro de Comando):
- Hora do dia: "Bom dia! Aqui está sua agenda de hoje"
- Itens pendentes: "Você tem 3 prazos nos próximos dias"
- Módulo atual: "Posso ajudar a criar um novo processo?"
- Histórico de uso: "Costuma gerar relatórios às sextas. Deseja gerar agora?"
- Oportunidades: "Existem 12h não faturadas. Gostaria de revisar?"

**Shortcuts de Comando**

Usuário pode usar prefixos para comandos diretos:
- `/processo` - Ações relacionadas a processos
- `/agenda` - Ações de calendário
- `/cliente` - Gestão de clientes
- `/financeiro` - Consultas financeiras
- `/relatorio` - Geração de relatórios
- `/help` - Ajuda e tutorial

### Integrações com IA

**MCP Servers Utilizados**
- **Supabase MCP**: Consultas e operações no banco
- **Context7 MCP**: Contexto sobre entidades jurídicas
- **Playwright MCP**: Automações web (consultas processuais)
- **Magic MCP**: Integrações adicionais

**Agentes n8n**
- **Agente de Busca**: Processa consultas complexas
- **Agente de Execução**: Realiza tarefas no sistema
- **Agente de Análise**: Gera insights e recomendações
- **Agente de Agendamento**: Gerencia tarefas futuras

**Fluxo de Processamento IA**

1. Usuário envia mensagem no chat
2. Frontend envia para Supabase Function `process_ai_command`
3. Function identifica intenção (busca, ação, análise)
4. Roteia para agente n8n apropriado ou executa via MCP
5. Agente processa e retorna resposta estruturada
6. Function formata resposta e retorna para chat
7. Interface exibe resposta + ações disponíveis

### Notificações em Tempo Real

Dashboard usa Supabase Real-time para notificações discretas:
- Novas movimentações processuais
- Publicações recebidas
- Lembretes de compromissos
- Pagamentos confirmados
- Mensagens da equipe

**Apresentação:**
- Toast no canto superior direito
- Slide suave, não-intrusivo
- Auto-dismiss após 5 segundos (exceto ações requeridas)
- Badge com contador nos ícones de módulo
- Som discreto opcional (configurável)
- Tom informativo, nunca alarmista

**Exemplos:**
- "💰 Pagamento recebido: Cliente Silva - R$ 5.000"
- "📄 Nova publicação no processo #1234"
- "⏰ Audiência em 30 minutos"
- "✅ Consulta aprovada pelo revisor"

### Princípios de Design Implementados

**Paleta de Cores Sistema:**
- Primária escura: `#34495e` (títulos, textos importantes)
- Primária média: `#46627f` (subtítulos, bordas)
- Primária teal: `#89bcbe` (destaques, ícones)
- Primária clara: `#aacfd0` (backgrounds suaves)
- Azul profundo: `#1E3A8A` (accent)
- Backgrounds: `#f0f9f9`, `#e8f5f5` (suaves para cards financeiros)
- Cinzas: `#6c757d`, `#adb5bd` (textos secundários)
- Neutros Tailwind: slate-50, slate-100, slate-200 (bordas e backgrounds)

**Estados e Feedback:**
- Sucesso/Positivo: emerald (green-500, green-600)
- Alerta/Atenção: amber (amber-500, amber-600)
- Urgente: red (red-50, red-200, red-600 para publicações)
- Informativo: blue, teal

**Tipografia Padronizada:**
- Header página: text-2xl (Dashboard)
- Data página: text-sm
- Títulos de card: text-sm a text-base
- Subtítulos/labels: text-xs
- Valores KPI: text-2xl (font-semibold)
- Conteúdo normal: text-xs a text-sm
- Detalhes pequenos: text-[10px] a text-[11px]
- Font weights: normal (400), medium (500), semibold (600), bold (700)

**Ícones Padronizados:**
- KPI cards: container 32px (w-8 h-8), ícone 16px (w-4 h-4)
- Timeline items: container 28px (w-7 h-7), ícone 14px (w-3.5 h-3.5)
- Insights: container 28px (w-7 h-7), ícone 14px (w-3.5 h-3.5)
- Botões highlight: ícone 16px (w-4 h-4)
- Botões normais: ícone 14px (w-3.5 h-3.5)

**Espaçamento Padronizado:**
- Entre seções principais: gap-6
- Entre cards grid: gap-4
- Entre botões ações rápidas: gap-2 a gap-2.5
- Padding cards header: pb-2, pt-3 a pt-4
- Padding cards content: pt-2, pb-3 a pb-4
- Gaps internos componentes: gap-1.5 a gap-3

**Componentes Reutilizáveis:**
- `MetricCard`: KPIs com gradientes, suporta trend e subtitle
- `InsightCard`: Insights com badge tipo, ícone, título, descrição, ação
- `TimelineItem`: Atividades com ícone colorido, título, descrição, tempo
- `QuickActionButton`: Botões ação com variante highlight e default

**Visual:**
- Gradientes do sistema nos KPIs (não cores vibrantes demais)
- Hierarquia visual clara - importante maior, detalhes menores
- Espaçamento equilibrado - dashboard "respira"
- Tipografia limpa - números legíveis em text-2xl
- Barras de progresso em vez de gráficos complexos
- Ícones discretos e proporcionais
- Cards com sombra suave: shadow-sm, shadow-lg
- Bordas sutis: border-slate-200

**Tom de Voz:**
- Informativo, não alarmista
- "Aguardando resposta" em vez de "Atrasado!"
- "Oportunidade" em vez de "Você deve!"
- "Sugestão" em vez de "Ação necessária!"
- Linguagem profissional e respeitosa

**UX:**
- Máximo de ações em 1 clique
- Hover states suaves
- ScrollArea para listas longas
- Feedback visual imediato
- Responsivo (xl:col-span para desktop, mobile stack)
- Botões "Ver →" para navegação

## Banco de Dados

### Tabelas Necessárias

**dashboard_metrics** (cache de métricas)
```
- id (uuid, PK)
- user_id (uuid, FK profiles, nullable) - null se for métrica do escritório
- escritorio_id (uuid, FK escritorios)
- categoria (text: 'pessoal', 'kpi', 'performance', 'insights')
- subcategoria (text, nullable) - ex: 'equipe', 'area', 'financeiro'
- metrica (text) - nome da métrica
- valor (numeric, nullable)
- valor_meta (numeric, nullable)
- percentual (numeric, nullable)
- dados_extras (jsonb, nullable) - dados adicionais estruturados
- periodo (text: 'hoje', 'semana', 'mes', 'ano')
- updated_at (timestamp)
```

**dashboard_resumo_dia** (resumos gerados por IA)
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- data (date)
- resumo_texto (text) - texto natural gerado pela IA
- metadados (jsonb) - dados estruturados usados para gerar
- gerado_em (timestamp)
```

**dashboard_insights** (insights de gestão)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios)
- tipo (text: 'oportunidade', 'alerta', 'destaque', 'sugestao')
- titulo (text)
- descricao (text)
- acao_sugerida (text, nullable)
- link_acao (text, nullable) - URL para ação
- prioridade (integer) - ordem de exibição
- dados_suporte (jsonb) - dados que embasam o insight
- gerado_em (timestamp)
- valido_ate (timestamp)
- visualizado (boolean)
```

**ai_chat_history**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- session_id (uuid) - agrupa conversas
- role (text: 'user' ou 'assistant')
- content (text)
- metadata (jsonb) - contexto, módulo origem, etc
- created_at (timestamp)
```

**ai_commands_log**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- command (text) - comando original do usuário
- intent (text) - intenção identificada
- action_taken (text) - ação executada
- result (jsonb) - resultado da ação
- success (boolean)
- execution_time_ms (integer)
- created_at (timestamp)
```

**user_shortcuts**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- name (text) - nome do atalho
- command (text) - comando a executar
- icon (text, nullable)
- favorito (boolean)
- created_at (timestamp)
```

**notifications**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- tipo (text: 'prazo', 'publicacao', 'financeiro', etc)
- titulo (text)
- mensagem (text)
- metadata (jsonb) - dados adicionais
- link (text, nullable) - link para módulo/item
- lida (boolean)
- created_at (timestamp)
```

### Functions

**get_dashboard_metrics(user_id uuid)**
- Retorna métricas estruturadas para as 3 colunas:
  - **Pessoal**: horas faturadas, taxa utilização, receita, metas
  - **KPIs**: processos, clientes, consultas, financeiro
  - **Performance**: equipe, por área, top clientes
  - **Agenda**: compromissos de hoje
  - **Pendências**: publicações, consultas, prazos, horas não faturadas
- Executa queries otimizadas em paralelo
- Cache de 5 minutos
- Retorna objeto JSON estruturado

**gerar_resumo_dia_ia(user_id uuid)**
- Analisa agenda, prazos, compromissos do dia
- Verifica horas não faturadas
- Avalia carga de trabalho
- Gera texto natural e personalizado
- Tom profissional e motivacional
- Retorna resumo em texto + metadados
- Cache até próxima atualização manual

**gerar_insights_gestao_ia(escritorio_id uuid)**
- Analisa dados consolidados do escritório
- Identifica oportunidades de crescimento
- Detecta áreas mais/menos rentáveis
- Alerta sobre contratos vencendo
- Analisa performance da equipe
- Sugere ações baseadas em dados
- Gera 3-5 insights priorizados
- Tom construtivo e informativo
- Atualizado a cada 6 horas

**get_performance_equipe(escritorio_id uuid, periodo text)**
- Retorna dados de performance por advogado
- Horas faturadas, taxa utilização, receita
- Agrupado por período (semana/mês/ano)
- Ordenado por horas faturadas (sem ranking agressivo)
- Inclui meta coletiva e progresso

**get_performance_area(escritorio_id uuid)**
- Distribuição de processos por área
- Receita por área
- Análise de concentração
- Retorna dados para visualização

**process_ai_command(user_id uuid, message text)**
- Processa comando do usuário via IA
- Identifica intenção e rota para handler apropriado
- Registra em ai_commands_log
- Retorna resposta estruturada

**create_notification(user_id uuid, tipo text, dados jsonb)**
- Cria notificação
- Envia via Real-time channel
- Pode disparar mensagem no chat de IA

**get_unread_notifications(user_id uuid)**
- Retorna notificações não lidas
- Ordenadas por prioridade e data

### Triggers

**refresh_dashboard_metrics**
- Dispara quando há mudanças relevantes em outros módulos
- Atualiza cache de métricas
- Notifica frontend via Real-time

**auto_chat_suggestions**
- Após certos eventos, cria sugestão proativa no chat
- Ex: "Nova movimentação no processo X. Deseja visualizar?"

### Scheduled Functions (Cron Jobs)

**daily_metrics_refresh**
- Roda todo dia às 6h
- Recalcula métricas para cache
- Gera resumo do dia para cada usuário
- Gera insights de gestão para cada escritório
- Limpa cache antigo

**send_daily_briefing**
- Roda às 7h30
- Envia resumo diário opcional por email
- Para usuários que habilitaram
- Inclui agenda + pendências + insights

**refresh_dashboard_realtime**
- Roda a cada 5 minutos
- Atualiza KPIs em tempo real
- Notificações de novos eventos
- Mantém dashboard atualizado
