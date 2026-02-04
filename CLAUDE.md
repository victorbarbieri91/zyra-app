# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive legal system integrated with AI, designed for law firms. It uses Supabase for backend, Claude AI via MCP servers for intelligent features, n8n for workflow automation, and features an AI-first conversational interface called "Centro de Comando" (Command Center).

## Technology Stack

- **Backend**: Supabase (PostgreSQL + Edge Functions + Real-time)
- **AI Integration**: Claude AI via MCP servers (Supabase, Context7, Playwright, Magic)
- **Automation**: n8n for workflows and agents
- **Frontend**: Next.js 16.1.1 + React 19.2.0 + TypeScript 5.9.3
  - Tailwind CSS 3.4.17 com design system customizado
  - Radix UI para componentes base
  - Zustand para state management
  - React Hook Form + Zod para validação
- **Database**: PostgreSQL com ~116 tabelas organizadas em 14 módulos

## Key Architecture Principles

1. **AI-First Design**: Every functionality is accessible through the Centro de Comando conversational interface (Ctrl/Cmd + K shortcut)
2. **Real-time Updates**: Use Supabase subscriptions for notifications, process movements, publications, events
3. **Modular Architecture**: Each module is independent but integrated through shared data structures
4. **Automation Priority**: Use Supabase triggers and functions for background tasks

---

## ⚠️ REGRAS CRÍTICAS DE DESENVOLVIMENTO

### MCP Supabase é OBRIGATÓRIO

**SEMPRE usar MCP Supabase para TODAS operações de banco de dados:**
- Consultar estrutura de tabelas (NUNCA assumir, sempre verificar)
- Criar e aplicar migrações
- Deployar Edge Functions
- Consultar dados para debug
- Verificar RLS policies

**Se MCP Supabase não estiver funcionando:**
1. **PARAR** imediatamente
2. **COMUNICAR** ao usuário o problema
3. **AGUARDAR** instruções antes de tentar alternativas
4. **NUNCA** usar psql, SQL direto, ou Supabase CLI sem autorização explícita

### Abordagem de Resolução de Problemas

**NUNCA fazer "remendos" ou workarounds:**
- Não contornar erros apenas para "funcionar"
- Não ignorar mensagens de erro ou warnings
- Não criar soluções que mascaram problemas reais

**SEMPRE considerar antes de qualquer mudança:**
1. **Segurança**: A mudança pode causar vazamento de dados?
2. **Multitenancy**: O filtro por `escritorio_id` está correto?
3. **Estrutura global**: A mudança afeta outras funcionalidades?
4. **RLS Policies**: As permissões estão corretas?

**Quando encontrar problema complexo:**
1. **PARAR** e analisar a situação completa
2. **COMUNICAR** ao usuário o que foi encontrado
3. **DISCUTIR** opções de solução
4. **IMPLEMENTAR** apenas após alinhamento

---

## Database Structure

O sistema usa PostgreSQL com ~116 tabelas organizadas em 14 módulos:

| Módulo | Tabelas | Doc | Descrição |
|--------|---------|-----|-----------|
| Core | 8 | ✅ | profiles, escritorios, permissões, convites |
| CRM | 10 | 🔄 | pessoas, interações, oportunidades, funil |
| Processos | 7 | ✅ | processos, partes, movimentações, histórico |
| Agenda | 8 | 🔄 | eventos, tarefas, audiências, recorrências |
| Financeiro | 30+ | ✅ | contratos, faturamento, timesheet, cartões |
| Consultivo | 12 | 🔄 | consultas, pareceres, templates |
| Publicações | 8 | 🔄 | publicações AASP, análises, sincronização |
| Peças | 7 | 🔄 | templates, teses, jurisprudências |
| Centro de Comando | 4 | 🔄 | histórico, sessões, cache |
| Portfolio | 11 | 🔄 | produtos, projetos, métricas |
| Integrações | 3 | 🔄 | DataJud, Escavador |
| Sistema | 7 | 🔄 | tags, numeração, migração |
| Correção Monetária | 2 | ✅ | índices econômicos |

**Migrações**: 92 arquivos em `supabase/migrations/`

**Edge Functions** (12 funções em `supabase/functions/`):
- `aasp-sync` - Sincronização publicações AASP
- `centro-comando-ia` - Interface AI conversacional
- `dashboard-insights-ia` - Geração de insights
- `dashboard-resumo-ia` - Resumo diário AI
- `migracao-processar` - Processamento de migrações
- `processar-fatura-cartao` - Faturas de cartão
- `process-recorrencias` - Eventos recorrentes
- `publicacoes-analisar` - Análise de publicações
- `publicacoes-sync-auto` - Sync automático
- `relatorios-resumo-ia` - Resumo de relatórios
- `sync-indices-bcb` - Índices econômicos BCB

## Documentação do Sistema

**IMPORTANTE**: Antes de modificar qualquer parte do sistema, consulte a documentação em `docs/`.

### Estrutura da Documentação

```
docs/
├── README.md                    # Índice geral e plano de execução
├── DATABASE.md                  # Visão geral do banco de dados
├── TEMPLATE_DATABASE.md         # Template para documentar módulos DB
├── TEMPLATE_PAGE.md             # Template para documentar páginas
├── database/                    # Documentação detalhada por módulo
│   ├── 01-core.md              # ✅ Profiles, escritórios, permissões
│   ├── 02-crm.md               # Clientes, oportunidades
│   ├── 03-processos.md         # Processos judiciais
│   ├── 04-agenda.md            # Eventos, tarefas, audiências
│   ├── 05-financeiro.md        # ✅ Contratos, honorários, faturamento, cartões
│   └── ...
├── modules/                     # Estrutura dos módulos frontend
└── pages/                       # Documentação página por página
```

### Fluxo de Desenvolvimento Orientado

1. **Antes de modificar**: Consulte `docs/database/XX-modulo.md` para entender a estrutura
2. **Durante desenvolvimento**: Verifique relacionamentos e dependências
3. **Após modificar**: Atualize a documentação correspondente

### Consulta Rápida por Módulo

| Módulo | Banco de Dados | Frontend |
|--------|----------------|----------|
| Core | `docs/database/01-core.md` | `docs/modules/auth.md` |
| CRM | `docs/database/02-crm.md` | `docs/modules/02-crm.md` |
| Processos | `docs/database/03-processos.md` | `docs/modules/03-processos.md` |
| Agenda | `docs/database/04-agenda.md` | `docs/modules/04-agenda.md` |
| Financeiro | `docs/database/05-financeiro.md` | `docs/modules/05-financeiro.md` |

### Regras para o Claude Code

1. **SEMPRE** usar MCP Supabase para verificar estrutura de tabelas antes de qualquer operação
2. **SEMPRE** consultar a documentação antes de fazer alterações em tabelas ou queries
3. **SEMPRE** verificar relacionamentos entre tabelas antes de modificar schemas
4. **SEMPRE** atualizar a documentação após fazer alterações estruturais
5. **NUNCA** assumir estrutura de tabela - verificar via MCP Supabase
6. **NUNCA** fazer migrações ou alterações de schema sem usar MCP Supabase

## Estrutura de Código Atual

```
src/
├── app/                           # 18+ rotas implementadas
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Redirect para /login
│   ├── dashboard/                 # Área principal
│   │   ├── layout.tsx            # Layout com Sidebar, Header, Contexts
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── agenda/               # Calendário e eventos
│   │   ├── centro-comando/       # Interface AI conversacional
│   │   ├── consultivo/           # Consultas jurídicas
│   │   ├── crm/                  # CRM (funil, pessoas)
│   │   ├── escritorio/           # Configurações do escritório
│   │   ├── financeiro/           # 8 submódulos financeiros
│   │   ├── migracao/             # Wizard de importação
│   │   ├── pecas-teses/          # Templates e jurisprudências
│   │   ├── portfolio/            # Produtos e projetos
│   │   ├── processos/            # Gestão de processos
│   │   └── publicacoes/          # Publicações AASP
│   └── api/                       # API routes (server)
│
├── components/                    # 60+ componentes
│   ├── ui/                        # Design system (Radix UI)
│   ├── agenda/                    # Componentes de agenda
│   ├── centro-comando/            # Chat AI
│   ├── dashboard/                 # KPIs, insights, timeline
│   ├── financeiro/                # Modais financeiros
│   ├── layout/                    # Sidebar, Header
│   ├── processos/                 # Timeline, wizard
│   └── shared/                    # StatusBadge, EmptyState
│
├── hooks/                         # 49 hooks customizados
│   ├── useDashboard*.ts          # 5 hooks para dashboard
│   ├── useProcesso*.ts           # Hooks de processos
│   ├── useAgenda.ts, useTarefas.ts, useAudiencias.ts
│   ├── useFaturamento.ts, useContratosHonorarios.ts
│   ├── useCentroComando.ts
│   └── useEscritorioAtivo.ts
│
├── contexts/                      # React Contexts
│   ├── AuthContext.tsx           # Autenticação
│   ├── EscritorioContext.tsx     # Escritório ativo
│   └── TimerContext.tsx          # Timer de trabalho
│
├── lib/                           # Utilitários
│   ├── supabase/                 # Client e helpers
│   ├── timezone.ts               # OBRIGATÓRIO para datas
│   ├── datajud/                  # Integração DataJud
│   ├── escavador/                # Integração Escavador
│   └── constants/                # Enums e constantes
│
└── types/                         # TypeScript types

supabase/
├── migrations/                    # 92 migrações
└── functions/                     # 12 Edge Functions
```

## Padrões de Código Obrigatórios

### Uso do Supabase Client

```typescript
// ✅ CORRETO - Usar hooks existentes quando disponíveis
const { data, loading } = useDashboardMetrics()
const { processos } = useProcessos()

// ✅ CORRETO - Quando precisar de query customizada
import { createSupabaseClient } from '@/lib/supabase/client'
const supabase = createSupabaseClient()
const { data } = await supabase.from('tabela').select('*')

// ❌ ERRADO - Nunca criar cliente manualmente
import { createClient } from '@supabase/supabase-js'
```

### Multitenancy (CRÍTICO)

```typescript
// Todas as queries DEVEM filtrar por escritorio_id
// RLS policies aplicam automaticamente, mas VERIFICAR em queries manuais

// ✅ CORRETO
const { data } = await supabase
  .from('processos_processos')
  .select('*')
  .eq('escritorio_id', escritorioId)

// ❌ ERRADO - Nunca ignorar escritorio_id
const { data } = await supabase
  .from('processos_processos')
  .select('*') // PERIGO: pode vazar dados de outros escritórios
```

### Reutilização de Hooks

**Antes de criar novo código, verificar hooks existentes:**

| Categoria | Hooks Disponíveis |
|-----------|-------------------|
| Dashboard | `useDashboardMetrics`, `useDashboardAgenda`, `useDashboardPerformance`, `useDashboardPublicacoes`, `useDashboardResumoIA` |
| Processos | `useProcessos`, `useProcessoDetalhes`, `useProcessoMovimentacoes` |
| Agenda | `useAgenda`, `useTarefas`, `useAudiencias`, `useEventos` |
| Financeiro | `useFaturamento`, `useContratosHonorarios`, `useReceitas`, `useTimesheetEntry` |
| CRM | `useCrmPessoas`, `useCrmOportunidades` |
| Sistema | `useTags`, `useTimers`, `useGlobalSearch`, `useEscritorioAtivo` |

## Common Development Commands

### Frontend Development
```bash
npm run dev          # Servidor de desenvolvimento (porta 4000)
npm run build        # Build de produção
npm run lint         # Verificar código
```

### Operações de Banco de Dados (via MCP Supabase)

**IMPORTANTE**: Todas as operações de banco devem usar MCP Supabase, não CLI.

```
# Usar MCP Supabase para:
✅ Verificar estrutura de tabelas → mcp__supabase__list_tables
✅ Executar queries              → mcp__supabase__execute_sql
✅ Criar migrações               → mcp__supabase__apply_migration
✅ Listar migrações              → mcp__supabase__list_migrations
✅ Deploy Edge Functions         → mcp__supabase__deploy_edge_function
✅ Gerar TypeScript types        → mcp__supabase__generate_typescript_types
✅ Ver logs                      → mcp__supabase__get_logs
✅ Verificar segurança          → mcp__supabase__get_advisors

# NUNCA usar diretamente sem autorização:
❌ psql ou conexão SQL direta
❌ npx supabase ... (CLI)
❌ Queries via curl/fetch para banco
```

### Quando MCP Supabase não funcionar

1. **NÃO** tentar alternativas automaticamente
2. **COMUNICAR** ao usuário: "MCP Supabase não está respondendo"
3. **AGUARDAR** instruções do usuário
4. O usuário vai verificar configuração ou autorizar alternativa

## Status de Implementação dos Módulos

| Módulo | Status | Observações |
|--------|--------|-------------|
| Login + Cadastro | ✅ | Auth completo com Supabase |
| Dashboard | ✅ | KPIs, insights AI, resumo diário, métricas |
| CRM | ✅ | Kanban, funil de vendas, gestão de pessoas |
| Processos | ✅ | CRUD completo, timeline, análise, pasta digital |
| Agenda | ✅ | Calendário, drag-drop, recorrência, audiências |
| Centro de Comando | ✅ | Interface AI conversacional (Ctrl+K) |
| Publicações | ✅ | AASP sync, análise automática de publicações |
| Financeiro | ✅ | 8 submódulos: contratos, faturamento, timesheet, cartões, contas bancárias |
| Consultivo | ✅ | Consultas, pareceres, templates |
| Peças e Teses | ✅ | Templates, jurisprudências, banco de teses |
| Portfolio | ✅ | Produtos, projetos, métricas |
| Escritório | ✅ | Configurações, equipe, convites, permissões |
| Migração | ✅ | Wizard de importação de dados |
| Documentos | 🔄 | Parcialmente implementado |
| Relatórios | 🔄 | Em desenvolvimento |

## AI Integration Points

### MCP Servers Configuration

| MCP Server | Uso | Prioridade |
|------------|-----|------------|
| **Supabase MCP** | TODAS operações de banco de dados | ⚠️ OBRIGATÓRIO |
| **Magic MCP** | Geração de UI components (21st.dev) | Opcional |
| **Playwright MCP** | Web scraping para publicações | Quando necessário |
| **Context7 MCP** | Context management | Quando necessário |

**Regra do Supabase MCP:**
- Configurado via `.mcp.json` no projeto
- Se não funcionar → **PARAR e comunicar ao usuário**
- Nunca usar alternativas sem autorização explícita

### Centro de Comando (Command Center)
Interface AI conversacional para comandos em linguagem natural:
- Acessível via **Ctrl/Cmd + K** de qualquer tela
- Edge Function: `centro-comando-ia`
- Processa comandos como: "Mostrar processos com prazo essa semana"
- Mantém contexto entre sessões
- Cache de queries frequentes

### Edge Functions AI
- `centro-comando-ia` - Processamento de comandos
- `dashboard-insights-ia` - Geração de insights do dashboard
- `dashboard-resumo-ia` - Resumo diário automático
- `publicacoes-analisar` - Análise de publicações oficiais
- `relatorios-resumo-ia` - Resumo de relatórios

## Design System - Padrões Implementados

**IMPORTANTE:** Todos os módulos devem seguir os padrões estabelecidos no Dashboard. Ver DESIGN_SYSTEM.md para referência completa.

### Paleta de Cores Oficial
```
Principais:
- #34495e - Títulos, textos importantes, gradientes escuros
- #46627f - Subtítulos, textos secundários
- #89bcbe - Ícones destaque, bordas especiais (ex: Agenda)
- #aacfd0 - Backgrounds suaves, gradientes claros
- #1E3A8A - Accent (botões, links importantes)
- #f0f9f9, #e8f5f5 - Backgrounds cards financeiros

Neutros Tailwind:
- slate-50, slate-100 - Backgrounds gerais
- slate-200 - Bordas padrão de cards
- slate-600, slate-700 - Textos

Estados:
- emerald (green-500/600) - Sucesso, positivo
- amber (amber-500/600) - Alerta, atenção
- red (red-50/200/600) - Urgente, erro
- blue, teal - Informativo
```

### Tipografia Padronizada
```
text-2xl - Header página, valores KPI (24px)
text-base - Títulos card principais (16px)
text-sm - Títulos card padrão, conteúdo (14px)
text-xs - Labels, subtítulos, trends (12px)
text-[11px] - Descrições insights
text-[10px] - Badges, detalhes mínimos

Pesos: normal (400), medium (500), semibold (600), bold (700)
```

### Ícones Padronizados
```
KPI Cards: container w-8 h-8 (32px), ícone w-4 h-4 (16px)
Timeline/Insights: container w-7 h-7 (28px), ícone w-3.5 h-3.5 (14px)
Botões Highlight: w-4 h-4 (16px)
Botões Normal: w-3.5 h-3.5 (14px)
```

### Espaçamento Padrão
```
gap-6 - Entre seções principais (24px)
gap-4 - Entre cards em grid (16px)
gap-2.5 - Entre botões (10px)
py-2.5 px-3 - Padding botões
pb-2 pt-3/pt-4 - Card headers
pt-2 pb-3/pb-4 - Card content
```

### Componentes Reutilizáveis
- `MetricCard` - KPIs com gradientes
- `InsightCard` - Insights de gestão com badges
- `TimelineItem` - Atividades/eventos com ícones coloridos
- `QuickActionButton` - Botões de ação com variant highlight/default

**Ver DESIGN_SYSTEM.md e 02-dashboard.md para detalhes completos**

## Security Considerations

### Regras de Segurança Obrigatórias

1. **RLS (Row Level Security) é OBRIGATÓRIO** em TODAS as tabelas
2. **Multitenancy via `escritorio_id`** - TODOS os dados filtrados por escritório
3. **NUNCA** expor `service_role` key no frontend
4. **NUNCA** bypassar RLS para "resolver" problemas rapidamente
5. **NUNCA** fazer queries sem filtro de `escritorio_id` (mesmo com RLS)

### Ao Encontrar Erro de Permissão

```
1. Verificar se RLS policy existe para a tabela
2. Verificar se o usuário tem escritorio_id correto
3. Verificar se a policy cobre a operação (SELECT/INSERT/UPDATE/DELETE)
4. NUNCA desabilitar RLS como "solução"
5. Se não conseguir resolver → comunicar ao usuário
```

### Checklist de Segurança para Novas Features

- [ ] RLS policy criada para novas tabelas?
- [ ] Filtro por `escritorio_id` em todas as queries?
- [ ] Dados sensíveis (tokens, senhas) criptografados?
- [ ] Permissões verificadas no frontend E backend?
- [ ] Nenhuma chave de API exposta no código cliente?

### Políticas RLS Existentes (verificar via MCP)

Use `mcp__supabase__get_advisors` com `type: "security"` para verificar:
- Tabelas sem RLS
- Políticas mal configuradas
- Potenciais vazamentos de dados

## Performance e Boas Práticas

### Caching
- `metricas_cache` para dashboard metrics
- `centro_comando_cache` para queries frequentes
- TTL de 15 minutos para maioria dos caches

### Paginação
- Listas grandes (processos, documentos) devem ser paginadas
- Usar `limit` e `offset` nas queries

### Error Handling
- Sempre tratar erros de forma explícita
- Fallbacks quando serviços AI estão indisponíveis
- Mensagens de erro amigáveis ao usuário

---

## Sistema de Timezone

**IMPORTANTE**: Todo o sistema está configurado para usar o **timezone de Brasília (America/Sao_Paulo)** em todas as operações.

### Configuração

```env
# .env.local
NEXT_PUBLIC_TIMEZONE=America/Sao_Paulo
```

### Módulo Centralizado

Todas as operações de timezone estão em `src/lib/timezone.ts`.

### Arquitetura

- **Database**: Armazena datas em UTC (via `timestamptz`)
- **API**: Envia/recebe datas em UTC (ISO 8601)
- **Frontend**: Converte e exibe tudo em horário de Brasília

### Funções Principais

#### Exibição (Frontend → Usuário)

```typescript
import {
  formatBrazilDate,          // dd/MM/yyyy
  formatBrazilDateTime,      // dd/MM/yyyy às HH:mm
  formatBrazilDateLong,      // dd de MMMM de yyyy
  formatBrazilTime           // HH:mm
} from '@/lib/timezone'

// Exemplos
formatBrazilDateTime(date) // "12/01/2025 às 14:30"
formatBrazilDateLong(date) // "12 de janeiro de 2025"
```

#### Envio ao Database (Frontend → Backend)

```typescript
import { formatDateForDB, formatDateTimeForDB } from '@/lib/timezone'

// Para campos DATE (sem hora)
data_inicio: formatDateForDB("2025-01-20")

// Para campos TIMESTAMPTZ (com hora)
data_hora: formatDateTimeForDB(new Date())
```

#### Parse de Strings

```typescript
import { parseDateInBrazil, toBrazilTime } from '@/lib/timezone'

// Parse string no contexto de Brasília
const date = parseDateInBrazil("2025-01-20", "yyyy-MM-dd")

// Converter UTC para Brasília
const dateInBrazil = toBrazilTime(utcDateString)
```

### ✅ Boas Práticas

```typescript
// ✅ BOM - Usa funções de timezone
{formatBrazilDateTime(tarefa.data_inicio)}

// ✅ BOM - Formata para DB
const { data } = await supabase
  .from('agenda_tarefas')
  .insert({
    data_inicio: formatDateForDB(selectedDate)
  })

// ✅ BOM - Parse correto
const date = parseDateInBrazil("2025-01-20")
```

### ❌ O que NÃO fazer

```typescript
// ❌ RUIM - pode causar erro de timezone
const date = new Date("2025-01-20")

// ❌ RUIM - usa timezone do navegador
date.toLocaleString('pt-BR')

// ❌ RUIM - não garante timezone
format(new Date(dateString), "dd/MM/yyyy")
```

### Resolução de Problemas

**Problema**: Data aparece um dia antes

**Causa**: Usando `new Date('YYYY-MM-DD')` que interpreta como UTC

**Solução**: Use `parseDateInBrazil("YYYY-MM-DD")`

---

**Problema**: Hora errada ao salvar

**Causa**: Enviando string sem conversão de timezone

**Solução**: Use `formatDateForDB()` ou `formatDateTimeForDB()`