# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive legal system integrated with AI, designed for law firms. It uses Supabase for backend, Claude AI via MCP servers for intelligent features, n8n for workflow automation, and features an AI-first conversational interface called "Centro de Comando" (Command Center).

## Technology Stack

- **Backend**: Supabase (PostgreSQL + Edge Functions + Real-time)
- **AI Integration**: Claude AI via MCP servers (Supabase, Context7, Playwright, Magic)
- **Automation**: n8n for workflows and agents
- **Frontend**: React/Next.js (to be implemented)
- **Database**: PostgreSQL with comprehensive schema across 11 modules

## Key Architecture Principles

1. **AI-First Design**: Every functionality is accessible through the Centro de Comando conversational interface (Ctrl/Cmd + K shortcut)
2. **Real-time Updates**: Use Supabase subscriptions for notifications, process movements, publications, events
3. **Modular Architecture**: Each module is independent but integrated through shared data structures
4. **Automation Priority**: Use Supabase triggers and functions for background tasks

## Database Structure

The system uses PostgreSQL with 100+ tables organized across modules:
- Authentication & Profiles (`profiles`, `escritorios`)
- Dashboard (`dashboard_metrics`, `ai_chat_history`, `notifications`)
- CRM (`clientes`, `interacoes`)
- Agenda (`eventos`, `eventos_prazos`, `feriados`)
- Processes (`processos`, `processos_movimentacoes`, `processos_pecas`)
- Consultivo (`consultas`, `consultas_analise`, `templates_pareceres`)
- Publications (`publicacoes`, `publicacoes_analise_ia`, `aasp_config`)
- Financial (`honorarios`, `timesheet`, `pagamentos`)
- Reports (`relatorios_templates`, `metricas_cache`)
- Documents (`documentos`, `pastas`, `templates_documentos`)
- Command Center (`centro_comando_historico`, `centro_comando_favoritos`)

## Common Development Commands

### Supabase Setup
```bash
# Initialize Supabase project
npx supabase init

# Start local Supabase
npx supabase start

# Generate TypeScript types from database
npx supabase gen types typescript --local > types/database.types.ts

# Run migrations
npx supabase migration up

# Deploy Edge Functions
npx supabase functions deploy [function-name]
```

### Frontend Development (React/Next.js)
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run specific test file
npm test -- [test-file-path]
```

## Module Implementation Order

When implementing features, follow this priority order:
1. **Login + Cadastro**: Authentication foundation
2. **Dashboard**: Core metrics and navigation hub
3. **CRM**: Client management base
4. **Processos**: Core legal process management
5. **Agenda**: Calendar and deadlines
6. **Centro de Comando**: AI conversational interface
7. **Publicações**: AASP integration for official publications
8. **Financeiro**: Financial management
9. **Consultivo**: Legal consultations
10. **Documentos**: Document management
11. **Relatórios**: Analytics and reports

## AI Integration Points

### MCP Servers Configuration
The system uses multiple MCP servers for different capabilities:
- **Supabase MCP**: Database operations and queries
- **Context7 MCP**: Context management
- **Playwright MCP**: Web scraping for publications
- **Magic MCP**: UI component generation

### Centro de Comando (Command Center)
The conversational AI interface that processes natural language commands:
- Accessible via Ctrl/Cmd + K from any screen
- Processes commands like: "Show processes with deadlines this week"
- Maintains context across sessions
- Caches frequent queries for performance

### AI Analysis Features
- **Publication Analysis**: Automatic analysis of official publications to extract deadlines and required actions
- **Process Analysis**: Risk assessment and strategy suggestions
- **Document OCR**: Text extraction and metadata parsing
- **Smart Templates**: AI-powered document generation

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

## Real-time Subscriptions

Enable real-time for these critical tables:
```javascript
// Example subscription setup
const subscription = supabase
  .from('notifications')
  .on('INSERT', payload => {
    // Handle new notification
  })
  .subscribe()
```

## Security Considerations

- All tables must have Row Level Security (RLS) policies
- Users only access data from their own `escritorio_id`
- Sensitive data (API tokens, passwords) stored encrypted
- Document access controlled through `documentos_permissoes` table

## Performance Optimizations

1. **Caching Strategy**:
   - Use `metricas_cache` for dashboard metrics
   - Cache command results in `centro_comando_cache`
   - 15-minute TTL for most cached data

2. **Database Indexes**:
   - Primary indexes on foreign keys and commonly queried fields
   - Full-text search indexes for document and process search
   - Partial indexes for status-based queries

3. **Lazy Loading**:
   - Paginate large lists (processes, documents)
   - Virtual scrolling for timelines and activity feeds
   - Load module data on-demand

## Testing Approach

- Unit tests for utility functions and business logic
- Integration tests for Supabase Edge Functions
- E2E tests for critical user flows (login, process creation, payment)
- Mock AI responses for consistent testing

## Error Handling

- Graceful fallbacks when AI services are unavailable
- Queue failed AASP synchronizations for retry
- Log all Centro de Comando errors with context
- User-friendly error messages with suggested actions