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

### Multitenancy e Isolamento de Dados (CRÍTICO E IMPERATIVO)

**O isolamento por `escritorio_id` é a regra mais importante do sistema. NUNCA misturar dados entre escritórios.**

#### Regra Geral
- **TODAS** as queries de leitura DEVEM filtrar por `escritorio_id`
- **TODOS** os inserts DEVEM incluir `escritorio_id`
- **TODAS** as buscas em tabelas relacionadas (processos, consultas, clientes, contas bancárias, despesas, etc.) DEVEM filtrar por `escritorio_id`
- RLS policies são a última camada de segurança, mas **NÃO confiar apenas no RLS** — sempre filtrar explicitamente
- Uploads ao Storage devem usar path `{escritorio_id}/...` para isolar arquivos

#### Escritórios em Grupo (Matriz/Filial)
- Um escritório pode ter `grupo_id` apontando para o escritório matriz
- `getEscritoriosDoGrupo()` em `src/lib/supabase/escritorio-helpers.ts` retorna todos do mesmo grupo
- **Quando o contexto é grupo**: usar `.in('escritorio_id', escritoriosDoGrupo)` para consolidar dados
- **Quando o contexto é individual**: usar `.eq('escritorio_id', escritorioAtivo)` — NUNCA mostrar dados de outro escritório do grupo sem que o contexto explicitamente permita
- **Na dúvida, isolar**: sempre filtrar pelo escritório ativo. Só agregar grupo quando a funcionalidade explicitamente exigir (ex: relatório consolidado)

```typescript
// ✅ CORRETO - Filtro por escritório ativo (padrão para todas as queries)
const { data } = await supabase
  .from('processos_processos')
  .select('*')
  .eq('escritorio_id', escritorioAtivo)

// ✅ CORRETO - Contexto de grupo (apenas quando explicitamente necessário)
const escritoriosIds = escritoriosDoGrupo.map(e => e.id)
const { data } = await supabase
  .from('financeiro_despesas')
  .select('*')
  .in('escritorio_id', escritoriosIds)

// ❌ ERRADO - Nunca ignorar escritorio_id
const { data } = await supabase
  .from('processos_processos')
  .select('*') // PERIGO: pode vazar dados de outros escritórios

// ❌ ERRADO - Nunca assumir que RLS resolve tudo
// Mesmo com RLS, SEMPRE filtrar explicitamente
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
2. **Isolamento por `escritorio_id` é IMPERATIVO** - TODOS os dados DEVEM ser filtrados por escritório. Misturar dados entre escritórios é o bug mais grave possível
3. **Grupo (matriz/filial)**: escritórios podem compartilhar dados via `grupo_id`, mas APENAS quando a funcionalidade exigir explicitamente. O padrão é isolar por `escritorio_id` do escritório ativo
4. **NUNCA** expor `service_role` key no frontend
5. **NUNCA** bypassar RLS para "resolver" problemas rapidamente
6. **NUNCA** fazer queries sem filtro de `escritorio_id` (mesmo com RLS)
7. **Storage**: uploads DEVEM usar path `{escritorio_id}/...` para isolar arquivos por escritório

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

---

## Figma MCP Integration Rules

These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

### Required Figma-to-Code Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation
5. Translate the output (usually React + Tailwind) into this project's conventions, styles, and framework
6. Validate against Figma for 1:1 look and behavior before marking complete

### Implementation Rules

- Treat the Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style
- IMPORTANT: Reuse existing components from `src/components/ui/` (29 Radix UI-based components) and `src/components/shared/` instead of creating new ones
- IMPORTANT: Reuse dashboard building blocks (`MetricCard`, `InsightCard`, `TimelineItem`, `QuickActionButton`, `AlertasCard`) from `src/components/dashboard/` for any dashboard-related UI
- Use the project's design tokens from `src/lib/design-tokens.ts` and semantic system from `src/lib/design-system.ts`
- Respect existing routing, state management (Zustand), data-fetch patterns (Supabase hooks), and React Hook Form + Zod validation
- Strive for 1:1 visual parity with the Figma design
- Validate the final UI against the Figma screenshot for both look and behavior

### Component Organization

- IMPORTANT: Base UI components (Button, Card, Badge, Input, Dialog, etc.) are in `src/components/ui/` — always check here first
- Shared cross-module components (StatusBadge, EmptyState, LoadingState, PageSkeleton) are in `src/components/shared/`
- Module-specific components go in `src/components/{module}/` (e.g., `src/components/dashboard/`, `src/components/financeiro/`)
- Page components go in `src/app/dashboard/{module}/page.tsx`
- New UI components must accept a `className` prop for composition via `cn()` from `src/lib/utils.ts`
- Use `React.ReactElement` for return type annotations (NOT `JSX.Element` — React 19 + Next.js 16)

### Component Patterns

- IMPORTANT: All UI components use **CVA (Class Variance Authority)** for variant management:

```typescript
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", secondary: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
})

interface Props extends VariantProps<typeof componentVariants> {
  className?: string
}
```

- Card components use composition pattern: `<Card>` → `<CardHeader>` → `<CardTitle>` / `<CardDescription>` → `<CardContent>` → `<CardFooter>`
- Icons use `LucideIcon` type from `lucide-react` for generic icon props
- Color scheme objects encapsulate related colors: `{ iconBg, iconColor, textColor, borderColor }`
- Gradient mapping via pre-defined objects: `kpi1` through `kpi4`

### Color System

IMPORTANT: Never hardcode hex colors directly — use the project's token system.

**Primary Palette** (from `src/lib/design-tokens.ts`):
| Token | Hex | Usage |
|-------|-----|-------|
| `colors.primary` | `#34495e` | Titles, dark gradients, primary text |
| `colors.tertiary` | `#46627f` | Subtitles, secondary text, medium gradients |
| `colors.secondary` | `#89bcbe` | Icon highlights, special borders (Agenda) |
| `colors.background.light` | `#aacfd0` | Light backgrounds, light gradients |
| Accent | `#1E3A8A` | Action buttons, important links |

**Tailwind Custom Colors** (from `tailwind.config.ts`):
- `teal-50` through `teal-700` — brand teal/aqua scale
- `slate-50` through `slate-900` — neutral hierarchy

**Pre-defined Gradients**:
```
kpi1: from-[#34495e] to-[#46627f]  (dark, white text)
kpi2: from-[#46627f] to-[#6c757d]  (medium, white text)
kpi3: from-[#89bcbe] to-[#aacfd0]  (light, dark text)
kpi4: from-[#aacfd0] to-[#cbe2e2]  (lightest, dark text)
```

**Status Colors** (from `design-system.ts` `colorVariants`):
- Success: `emerald` (green-500/600)
- Warning: `amber` (amber-500/600)
- Error: `red` (red-50/200/600)
- Info: `blue` / `teal`
- Neutral: `slate`

**Financial Backgrounds**: `#f0f9f9`, `#e8f5f5`

### Typography Scale

From `src/lib/design-system.ts`:

| Token | Class | Size | Usage |
|-------|-------|------|-------|
| `pageHeader` | `text-2xl font-semibold` | 24px | Page headers, KPI values |
| `cardTitle` | `text-base font-semibold` | 16px | Main card titles |
| `cardTitleSmall` | `text-sm font-semibold` | 14px | Secondary card titles |
| `content` | `text-sm` | 14px | Body text, content |
| `label` | `text-xs font-medium` | 12px | Labels, trends, subtitles |
| `description` | `text-[11px]` | 11px | Insight descriptions |
| `badge` | `text-[10px] font-medium` | 10px | Badges, minimal details |

**Font Weights**: `normal` (400), `medium` (500), `semibold` (600), `bold` (700)

### Icon Size Standards

| Context | Container | Icon | Example |
|---------|-----------|------|---------|
| KPI Cards | `w-8 h-8` (32px) | `w-4 h-4` (16px) | MetricCard icon |
| Timeline | `w-7 h-7` (28px) | `w-3.5 h-3.5` (14px) | TimelineItem icon |
| Button highlight | — | `w-4 h-4` (16px) | QuickActionButton highlight |
| Button normal | — | `w-3.5 h-3.5` (14px) | QuickActionButton default |

### Spacing System

| Token | Class | Size | Usage |
|-------|-------|------|-------|
| `sectionGap` | `gap-6` | 24px | Between major sections |
| `cardGap` | `gap-4` | 16px | Between cards in a grid |
| `buttonGap` | `gap-2.5` | 10px | Between buttons |
| `button` | `py-2.5 px-3` | — | Standard button padding |
| Card header | `pb-2 pt-3 px-6` | — | CardHeader padding |
| Card content | `p-6 pt-0` | — | CardContent padding |

### Border & Shadow Standards

- Default border: `border-slate-200`
- Highlight border: `border-[#89bcbe]`
- Border radius: `rounded-lg` (8px)
- Card shadow: `shadow-sm` (rest) → `shadow-lg` (hover)
- Highlight shadow: `shadow-xl`

### Modais e Uso de Espaço

**REGRA**: Modais devem usar o espaço da tela de forma inteligente, sempre priorizando evitar scroll vertical desnecessário. Use layouts mais largos (2 colunas, grids) para distribuir o conteúdo horizontalmente, mantendo responsividade para telas menores.

- **Modais de detalhes/visualização**: usar `sm:max-w-2xl lg:max-w-3xl` e layout em 2 colunas (`grid grid-cols-1 md:grid-cols-2`) para aproveitar o espaço e evitar scroll
- **Modais de formulário simples**: `sm:max-w-md` ou `sm:max-w-lg` é suficiente
- **Modais de formulário complexo**: usar `sm:max-w-2xl` com seções bem organizadas
- **Sempre responsivo**: usar `grid-cols-1` como fallback para mobile e breakpoints (`md:`, `lg:`) para telas maiores
- **Evitar scroll vertical**: distribuir informações em colunas lado a lado sempre que possível

### Grid Layout Patterns

```tsx
// 12-column dashboard layout (responsive)
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
  <div className="xl:col-span-3">Left panel</div>
  <div className="xl:col-span-5">Center panel</div>
  <div className="xl:col-span-4">Right panel</div>
</div>

// KPI cards 2x2
<div className="grid grid-cols-2 gap-4">...</div>

// Quick action buttons (8 columns)
<div className="grid grid-cols-8 gap-2.5">...</div>
```

### Hover & Interaction Patterns

- Card hover: `shadow-sm` → `shadow-lg` transition
- Group hover for action reveal: `group hover:bg-slate-50` parent + `opacity-0 group-hover:opacity-100 transition-opacity` child
- Button hover: Background opacity change or color shift
- IMPORTANT: Always use `cn()` from `@/lib/utils` for conditional/merged class names

### Formatting Utilities

When translating Figma text that represents formatted data, use existing formatters:

| Data Type | Function | Import |
|-----------|----------|--------|
| Currency (BRL) | `formatCurrency(value)` | `@/lib/utils` |
| Decimal hours | `formatHoras(hours, 'curto')` | `@/lib/utils` |
| Date (dd/MM/yyyy) | `formatBrazilDate(date)` | `@/lib/timezone` |
| Date long | `formatBrazilDateLong(date)` | `@/lib/timezone` |
| DateTime | `formatBrazilDateTime(date)` | `@/lib/timezone` |
| Time | `formatBrazilTime(date)` | `@/lib/timezone` |
| Invoice text | `formatDescricaoFatura(text)` | `@/lib/utils` |

### Import Conventions

- IMPORTANT: Use `@/` path alias for all imports (maps to `src/`)
- Group imports: React → Third-party → Internal components → Hooks → Utils → Types
- Supabase client: `import { createSupabaseClient } from '@/lib/supabase/client'`
- IMPORTANT: Never `import { createClient } from '@supabase/supabase-js'` directly
- Icons: `import { IconName } from 'lucide-react'`

### Asset Handling

- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- IMPORTANT: DO NOT install new icon packages — use `lucide-react` (already installed) for all icons
- IMPORTANT: DO NOT use or create placeholders if a localhost source is provided
- Store downloaded static assets in `public/` directory
- SVG icons should be Lucide components when possible, otherwise save as SVG in `public/`

### Accessibility Standards

- All interactive elements must have `aria-label` or visible label text
- Color is never the sole indicator — always pair with text or icons
- Keyboard navigation supported for all interactive elements (Radix UI handles this for base components)
- Use semantic HTML (`button`, `a`, `nav`, `main`, `section`)

### Checklist for Figma Implementation

Before marking a Figma implementation as complete:

- [ ] Ran `get_design_context` + `get_screenshot` from Figma MCP
- [ ] Reused existing `src/components/ui/` and `src/components/shared/` components
- [ ] Used design tokens from `src/lib/design-tokens.ts` / `src/lib/design-system.ts`
- [ ] Applied correct typography scale and font weights
- [ ] Used correct icon sizes (KPI: 32/16px, Timeline: 28/14px)
- [ ] Applied correct spacing (gap-6 sections, gap-4 cards, gap-2.5 buttons)
- [ ] Used `cn()` for class merging, CVA for variants
- [ ] Hover states and transitions match design
- [ ] Mobile responsiveness handled (12-column grid with breakpoints)
- [ ] Visual parity validated against Figma screenshot
- [ ] No hardcoded hex colors — all from token system
- [ ] `className` prop accepted for composition
- [ ] Multitenancy: any data queries filter by `escritorio_id`