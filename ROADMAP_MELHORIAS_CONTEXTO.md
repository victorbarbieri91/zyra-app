# 🚀 ROADMAP DE MELHORIAS - CONTEXTO COMPLETO PARA IMPLEMENTAÇÃO

**Data:** 2025-01-08
**Objetivo:** Fornecer contexto detalhado para IA implementar melhorias no sistema Zyra Legal
**Abordagem:** Explicar O QUE precisa ser feito e POR QUE, sem fornecer código pronto

---

## 📑 ÍNDICE

1. [Visão Geral e Estado Atual](#1-visão-geral-e-estado-atual)
2. [Problemas Estruturais Críticos](#2-problemas-estruturais-críticos)
3. [Fase 0: Fundações - O Que Arrumar ANTES](#3-fase-0-fundações---o-que-arrumar-antes)
4. [Fluxo de Onboarding (Não é um Módulo)](#4-fluxo-de-onboarding-não-é-um-módulo)
5. [Melhorias por Módulo - Contexto Detalhado](#5-melhorias-por-módulo---contexto-detalhado)
6. [Ordem de Implementação e Dependências](#6-ordem-de-implementação-e-dependências)
7. [Princípios de Design e UX](#7-princípios-de-design-e-ux)

---

## 1. VISÃO GERAL E ESTADO ATUAL

### 1.1 O Sistema Hoje

O Zyra Legal é um sistema de gestão jurídica completo, mas com alguns problemas estruturais e de experiência do usuário. A arquitetura está 90% implementada no banco de dados, com 76 tabelas distribuídas em 8 módulos principais, mas há gaps críticos de segurança e UX.

**Banco de Dados:**
- ✅ 76 tabelas implementadas e funcionando
- ✅ 71 migrations aplicadas
- ✅ Sistema multi-tenancy parcialmente implementado
- ⚠️ 30 tabelas (42%) SEM isolamento por escritório (CRÍTICO)
- ❌ Nenhum sistema de primeiro acesso implementado

**Frontend:**
- ✅ Dashboard implementado como referência de design
- ✅ Módulos básicos funcionando (Agenda, Processos, CRM, Financeiro)
- ⚠️ Experiência fragmentada entre módulos
- ⚠️ Modais de criação inconsistentes
- ❌ Novo usuário fica perdido (sem onboarding)

### 1.2 Dados Reais no Sistema

O sistema está **em uso** com dados reais:
- 1 escritório ativo
- 1 usuário ativo
- 12 pessoas cadastradas no CRM
- 10 processos ativos
- 17 tarefas na agenda
- 4 contratos de honorários
- 12 registros de timesheet

**Implicação:** As mudanças devem preservar dados existentes. Migrations precisam tratar dados órfãos com cuidado.

### 1.3 Referência de Design

O módulo **Dashboard** foi estabelecido como padrão visual. Ver arquivo `DESIGN_SYSTEM.md` para:
- Paleta de cores oficial
- Tipografia padronizada
- Tamanhos de ícones
- Espaçamentos
- Componentes reutilizáveis (MetricCard, InsightCard, TimelineItem)

**Princípio:** Todos os outros módulos devem seguir o mesmo padrão visual do Dashboard.

---

## 2. PROBLEMAS ESTRUTURAIS CRÍTICOS

### 2.1 Multi-Tenancy Incompleto (SEGURANÇA)

#### O Problema

30 tabelas do sistema (42% do total) não possuem a coluna `escritorio_id`, que é fundamental para o isolamento de dados entre diferentes escritórios de advocacia.

**Por que isso é crítico:**
- **Risco de vazamento de dados:** Sem `escritorio_id`, queries podem retornar dados de outros escritórios
- **Violação de privacidade:** Advogado do Escritório A pode ver clientes do Escritório B
- **Compliance:** LGPD exige isolamento de dados entre organizações

#### Tabelas Afetadas por Módulo

**AGENDA (1 tabela):**
- `agenda_tarefas_checklist` - Itens de checklist de tarefas

**CRM (5 tabelas):**
- `crm_clientes_contatos` - Contatos de clientes
- `crm_interacoes` - Histórico de interações
- `crm_interacoes_anexos` - Anexos de interações
- `crm_oportunidades_atividades` - Atividades do funil
- `crm_relacionamentos` - Rede de relacionamentos

**PROCESSOS (2 tabelas):**
- `processos_partes` - Autor, réu, terceiros
- `processos_historico` - Log de alterações

**CONSULTIVO (6 tabelas):**
- `consultivo_analise` - Análises de consultas
- `consultivo_documentos` - Documentos anexados
- `consultivo_equipe` - Equipe alocada
- `consultivo_referencias` - Referências legais
- `consultivo_timeline` - Linha do tempo
- `consultivo_timesheet` - Horas trabalhadas

**FINANCEIRO (9 tabelas):**
- `financeiro_honorarios_parcelas` - Parcelas de contratos
- `financeiro_honorarios_timeline` - Histórico de honorários
- `financeiro_contas_lancamentos` - Lançamentos bancários
- `financeiro_contas_conciliacoes` - Conciliação de extratos
- `financeiro_contas_importacoes` - Importação de OFX
- `financeiro_faturamento_itens` - Itens de faturas
- `financeiro_faturamento_cobrancas` - Cobranças geradas
- `financeiro_contratos_honorarios_config` - Configurações de cobrança
- `financeiro_dashboard_notificacoes` - Alertas financeiros

**PUBLICAÇÕES (4 tabelas):**
- `publicacoes_analises` - IA analisando publicações
- `publicacoes_historico` - Histórico de sincronizações
- `publicacoes_notificacoes` - Notificações de DJE
- `publicacoes_tratamentos` - Tratamento de publicações

**PEÇAS (3 tabelas):**
- `pecas_relacoes` - Relações entre peças
- `pecas_templates_jurisprudencias` - Jurisprudências de templates
- `pecas_templates_teses` - Teses de templates

#### Estratégia de Correção

A correção envolve:

1. **Adicionar a coluna `escritorio_id`** em cada tabela
2. **Criar a Foreign Key** apontando para `escritorios(id)` com `ON DELETE CASCADE`
3. **Preencher dados existentes** usando JOINs para herdar o `escritorio_id` da tabela pai
   - Exemplo: `crm_interacoes` herda de `crm_pessoas` via `pessoa_id`
4. **Tornar NOT NULL** após preenchimento
5. **Criar índice** para performance
6. **Atualizar RLS Policies** para filtrar por `escritorio_id`

**Desafio Especial:** Algumas tabelas podem ter dados órfãos (sem FK válida). Decisão precisa ser tomada caso a caso:
- Atribuir ao único escritório existente? (se for ambiente single-tenant ainda)
- Deletar dados órfãos? (se forem resíduos de desenvolvimento)
- Deixar NULL temporariamente e alertar usuário?

#### Row Level Security (RLS)

Após adicionar `escritorio_id`, cada tabela precisa de uma política RLS que garanta:

```sql
-- Política padrão para TODAS as 30 tabelas:
-- "Usuários só acessam dados do(s) escritório(s) aos quais pertencem"

-- Lógica:
-- 1. Buscar user_id do usuário logado (auth.uid())
-- 2. Verificar em user_escritorios_roles quais escritórios ele tem acesso
-- 3. Filtrar escritorio_id IN (escritorios do usuário)
```

### 2.2 Ausência de Sistema de Primeiro Acesso

#### O Problema

Quando um novo advogado cria uma conta no sistema, ele é jogado diretamente no dashboard vazio, sem orientação. Não existe:
- Fluxo de boas-vindas
- Coleta de dados profissionais obrigatórios (OAB, telefone)
- **Criação obrigatória de escritório** (fundamental para o sistema funcionar)
- Tours explicativos dos módulos
- Incentivo para criar primeira tarefa/processo

**Por que isso é crítico:**
- Usuário fica perdido
- Dados essenciais ficam incompletos
- **Pior:** Sistema permite operação sem `escritorio_id` (se não for obrigatório), gerando dados órfãos

#### Conceito de Onboarding (NÃO É UM MÓDULO)

Onboarding é um **fluxo inicial sequencial** que guia o novo usuário nas primeiras ações. Deve ser:

- **Não-intrusivo:** Aparece apenas na primeira vez
- **Parcialmente obrigatório:** Algumas etapas podem ser puladas, outras não
- **Guiado:** Interface de wizard (passo a passo), não formulário gigante
- **Contexto:** Explica o "por quê" de cada informação solicitada

**Etapas Sugeridas:**

1. **Boas-vindas (opcional)** - Tela explicando o sistema, pode pular
2. **Dados Profissionais (obrigatório)** - Nome completo, OAB, telefone
3. **Criação de Escritório (OBRIGATÓRIO)** - Nome, CNPJ, endereço básico
4. **Tour rápido (opcional)** - Explicação visual do Dashboard e Agenda
5. **Primeira ação (opcional)** - Criar primeira tarefa como exemplo guiado

#### Estrutura de Dados Necessária

**Adicionar campos em `profiles`:**
- `primeiro_acesso` (boolean) - TRUE quando usuário é criado
- `onboarding_completo` (boolean) - TRUE quando finaliza todas as etapas obrigatórias
- `onboarding_etapa_atual` (text) - Para retomar de onde parou
- `onboarding_completado_em` (timestamp) - Auditoria

**Adicionar campos em `escritorios`:**
- `setup_completo` (boolean) - Escritório configurado completamente
- `setup_etapa_atual` (text) - Para rastrear progresso
- `setup_completado_em` (timestamp)

**Criar tabela `onboarding_steps`** (opcional, mas recomendado):
```
- user_id (FK profiles)
- escritorio_id (FK escritorios)
- etapa (text) - 'perfil', 'escritorio', 'tour_dashboard', etc
- completada (boolean)
- completada_em (timestamp)
- pulada (boolean) - Se usuário escolheu pular
- pulada_em (timestamp)
- dados_etapa (jsonb) - Armazenar dados específicos
- tempo_gasto_segundos (int) - Para analytics
```

**Benefícios da tabela separada:**
- Rastrear progresso granular
- Analytics de onboarding (quantos pulam cada etapa?)
- Permitir retomada exata
- A/B testing de diferentes fluxos

#### Lógica de Redirecionamento

**Fluxo desejado:**

1. Usuário cria conta → `primeiro_acesso = TRUE`, `onboarding_completo = FALSE`
2. Ao fazer login, middleware verifica `onboarding_completo`
3. Se `FALSE` → redireciona para `/onboarding` (não para `/dashboard`)
4. Durante onboarding, cada etapa completa atualiza `onboarding_steps`
5. Etapa "Criação de Escritório" é **bloqueante** - não pode pular
6. Ao finalizar todas obrigatórias → `onboarding_completo = TRUE`, `primeiro_acesso = FALSE`
7. Redireciona para `/dashboard` e nunca mais mostra onboarding

**Tratamento de Escritório:**
- Escritório é criado **durante** o onboarding, não antes
- Usuário recém-criado tem `escritorio_id = NULL` temporariamente
- Na etapa "Criar Escritório", cria o registro e atualiza `profiles.escritorio_id`
- **Crítico:** Sistema não deve permitir acesso ao dashboard sem `escritorio_id` preenchido

### 2.3 Fragmentação de Experiência

#### O Problema

Cada módulo do sistema foi desenvolvido em momentos diferentes, resultando em:
- Estilos visuais inconsistentes
- Modais de criação com padrões diferentes
- Componentes duplicados (cada módulo tem seu próprio card, badge, etc)
- Fluxos de interação diferentes para tarefas semelhantes

**Exemplo concreto:**
- **Dashboard** usa cards com gradiente, ícones 32x16px, tipografia text-2xl
- **CRM** usa cards com borda simples, ícones variados, tipografia text-xl
- **Agenda** usa balões para lista (não segue padrão de nenhum dos dois)

#### Estratégia de Correção

**1. Criar biblioteca de componentes compartilhados**

Extrair componentes bem-sucedidos do Dashboard e torná-los reutilizáveis:
- `MetricCard` - Para KPIs
- `InsightCard` - Para insights de gestão
- `TimelineItem` - Para atividades e eventos
- `QuickActionButton` - Botões de ação com variants
- `StatusBadge` - Badges de status consistentes
- `EmptyState` - Estado vazio padronizado
- `LoadingState` - Estado de carregamento

**2. Criar sistema de design constants**

Arquivo `lib/design-system.ts` com:
- Cores do sistema (não hardcoded, usar constantes)
- Gradientes predefinidos
- Tamanhos de ícone padronizados
- Espaçamentos padronizados
- Tipografia (classes Tailwind reutilizáveis)

**3. Criar wizard component reutilizável**

Todos os modais de criação devem usar o mesmo wrapper:
- `WizardWrapper` - Container principal
- `WizardStep` - Interface para definir etapas
- `useWizard` - Hook para gerenciar estado

**Benefícios:**
- Reduz código duplicado
- Garante consistência visual
- Facilita manutenção (atualiza um lugar, reflete em todos)
- Acelera desenvolvimento de novos módulos

---

## 3. FASE 0: FUNDAÇÕES - O QUE ARRUMAR ANTES

### 3.1 Por Que Fazer Essa Fase Primeiro

**Razão 1: Segurança**
- Adicionar `escritorio_id` depois do front pronto = retrabalho total
- RLS precisa estar correto antes de qualquer query

**Razão 2: Produtividade**
- Componentes compartilhados = menos código a escrever
- Wizard reutilizável = mesma lógica em todos os modais

**Razão 3: Qualidade**
- Padrões estabelecidos = menos decisões ad-hoc
- Design consistente desde o início

**Razão 4: Manutenibilidade**
- Código futuro segue os mesmos padrões
- Menos débito técnico

### 3.2 Tarefas da Fase 0

#### 3.2.1 Backend - Migrations

**Migration 1: Adicionar escritorio_id em 30 tabelas**

Para cada uma das 30 tabelas identificadas:

1. Adicionar coluna `escritorio_id UUID`
2. Popular com dados via JOIN (herdar da tabela pai)
3. Tratar dados órfãos (se houver)
4. Tornar NOT NULL
5. Criar índice
6. Atualizar/criar RLS policy

**Decisões a tomar:**
- Dados órfãos: deletar ou atribuir ao escritório único?
- Ordem de execução (tabelas dependentes por último)
- Rollback strategy se algo der errado

**Migration 2: Sistema de Onboarding**

1. Adicionar campos em `profiles` (primeiro_acesso, onboarding_completo, etc)
2. Adicionar campos em `escritorios` (setup_completo, etc)
3. Criar tabela `onboarding_steps` (opcional mas recomendado)
4. Criar funções SQL helper:
   - `initialize_onboarding(user_id, escritorio_id)` - Popula etapas padrão
   - `complete_onboarding_step(user_id, escritorio_id, etapa)` - Marca etapa completa
   - `skip_onboarding_step(user_id, escritorio_id, etapa)` - Marca etapa pulada
5. Criar view `onboarding_progress` - Progresso em percentual
6. Criar trigger para inicializar onboarding em novo usuário

**Migration 3: Categoria "Parceiro" no CRM**

Simples adição ao enum/constraint de `crm_pessoas.categoria`:
- Valores atuais: 'cliente', 'lead', 'prospect'
- Adicionar: 'parceiro'

#### 3.2.2 Frontend - Componentes Base

**Criar estrutura de pastas:**
```
src/
├── components/
│   ├── shared/          # Componentes compartilhados
│   │   ├── MetricCard.tsx
│   │   ├── InsightCard.tsx
│   │   ├── TimelineItem.tsx
│   │   ├── QuickActionButton.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingState.tsx
│   └── wizards/         # Sistema de wizard
│       ├── WizardWrapper.tsx
│       ├── WizardStep.tsx
│       ├── WizardNavigation.tsx
│       └── useWizard.tsx
├── lib/
│   └── design-system.ts  # Constantes
```

**WizardWrapper - Conceito**

Componente que encapsula toda a lógica de navegação entre etapas:
- Recebe array de `WizardStep[]`
- Gerencia `currentStep` state
- Mostra progresso visual (1/5, 2/5, etc)
- Botões "Voltar", "Avançar", "Pular" (se opcional)
- Valida cada etapa antes de avançar
- Chama callback `onComplete` ao finalizar

**Cada etapa é um componente independente:**
```typescript
interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  optional?: boolean;
  validate?: () => boolean | Promise<boolean>;
}
```

**StatusBadge - Conceito**

Componente simples para badges consistentes:
- Variants: success, warning, error, info, neutral
- Tamanho fixo (text-[10px])
- Cores conforme design system

**EmptyState - Conceito**

Para mostrar quando não há dados:
- Ícone ilustrativo
- Título descritivo
- Descrição do que fazer
- Botão de ação (opcional)

### 3.3 Checklist de Conclusão da Fase 0

**Antes de prosseguir para qualquer módulo, garantir:**

- [ ] Todas as 30 tabelas têm `escritorio_id`
- [ ] RLS policies atualizadas em todas as 30 tabelas
- [ ] Dados existentes migrados corretamente (sem órfãos)
- [ ] Sistema de onboarding completo (tabelas + funções SQL)
- [ ] Biblioteca de componentes compartilhados criada
- [ ] Design system constants criado
- [ ] WizardWrapper implementado e testado
- [ ] Todos os componentes base documentados

**Tempo estimado:** 4-6 dias (backend + frontend + testes)

---

## 4. FLUXO DE ONBOARDING (NÃO É UM MÓDULO)

### 4.1 Conceito Geral

Onboarding é um **fluxo de primeiro acesso**, não um módulo do sistema. Deve ser:
- Acionado automaticamente para novos usuários
- Sequencial e guiado (wizard)
- Parcialmente opcional (algumas etapas podem ser puladas)
- Não-repetitivo (só aparece uma vez)

### 4.2 Experiência do Usuário

**Cenário: Advogado se cadastra pela primeira vez**

1. **Cadastro** - Usuário cria conta com email/senha via Supabase Auth
2. **Redirecionamento automático** - Em vez de ir para `/dashboard`, vai para `/onboarding`
3. **Tela de boas-vindas**
   - Mensagem calorosa explicando o sistema
   - "Vamos configurar seu sistema em 3 passos simples"
   - Botão "Começar" (ou "Pular para dashboard" se quiser abortar)
4. **Etapa 1: Dados Profissionais**
   - Campo: Nome completo (pré-preenchido do cadastro, se houver)
   - Campo: Número da OAB (obrigatório para validar que é advogado)
   - Campo: UF da OAB (select com estados)
   - Campo: Telefone (para contato)
   - **Não pode pular** esta etapa
5. **Etapa 2: Criar Escritório**
   - Explicação: "Todo trabalho no sistema está vinculado a um escritório"
   - Campo: Nome do escritório (pode ser nome próprio se advogado autônomo)
   - Campo: CNPJ (opcional, para advogado autônomo pode ser CPF)
   - Campo: Endereço (opcional nesta etapa, pode completar depois)
   - **Não pode pular** esta etapa (crítico para o sistema funcionar)
6. **Etapa 3: Tour Rápido** (opcional)
   - Pequena explicação visual do Dashboard
   - Explicação visual da Agenda
   - "Você pode explorar o resto por conta própria"
   - Botão "Ver tour" ou "Pular"
7. **Finalização**
   - Mensagem de sucesso
   - "Seu sistema está pronto!"
   - Redirecionamento para `/dashboard`

### 4.3 Estrutura de Arquivos

```
src/
├── app/
│   ├── onboarding/
│   │   ├── page.tsx              # Wrapper principal do wizard
│   │   ├── layout.tsx            # Layout LIMPO (sem sidebar)
│   │   └── steps/                # Componentes de cada etapa
│   │       ├── Welcome.tsx       # Boas-vindas
│   │       ├── ProfileForm.tsx   # Dados profissionais
│   │       ├── OfficeForm.tsx    # Criar escritório
│   │       └── QuickTour.tsx     # Tour opcional
│   ├── middleware.ts             # Redirecionamento inteligente
│   └── ...
├── hooks/
│   └── useOnboarding.ts          # Lógica de state e API
```

**Layout especial:**
- Sem sidebar
- Sem header com navegação
- Fundo clean (pode ser gradiente sutil)
- Foco total no wizard

### 4.4 Lógica do Middleware

O middleware é responsável por redirecionar usuários para o onboarding quando necessário.

**Fluxo de decisão:**

```
Usuário acessa qualquer rota
  ↓
Middleware intercepta request
  ↓
Verifica autenticação
  ↓ (não autenticado)
Redireciona para /login
  ↓ (autenticado)
Busca profile.onboarding_completo
  ↓ (FALSE)
Redireciona para /onboarding
  ↓ (TRUE)
Permite acesso à rota solicitada
```

**Rotas que NÃO devem redirecionar:**
- `/login`
- `/cadastro`
- `/onboarding`
- Assets estáticos (`/_next`, `/public`, etc)

### 4.5 Dados a Coletar e Por Quê

**Dados Profissionais:**
- **Nome completo** - Para personalização e assinatura de documentos
- **OAB** - Validar que é advogado, necessário para petições
- **UF da OAB** - Diferentes regras por estado
- **Telefone** - Contato com clientes, notificações

**Dados do Escritório:**
- **Nome** - Identificação organizacional
- **CNPJ** - Para notas fiscais e contratos formais (opcional se pessoa física)
- **Endereço** - Para cabeçalho de documentos e correspondência

**Tour:**
- Não coleta dados, apenas apresenta o sistema
- Analytics: rastrear quantos fazem o tour vs pulam

### 4.6 Regras de Negócio

**Obrigatoriedade:**
- **Dados profissionais são obrigatórios** (exceto telefone, que é recomendado)
- **Criação de escritório é obrigatória** (sem isso, nada funciona)
- **Tour é opcional** (usuário pode explorar sozinho)

**Validações:**
- OAB: formato válido (XXXXX/UF)
- CNPJ: validar dígitos verificadores (se preenchido)
- Email: já validado no cadastro
- Telefone: formato brasileiro válido (se preenchido)

**Comportamento:**
- Botão "Avançar" desabilitado se validação falhar
- Mostrar erros inline, não em alerts
- Permitir voltar para etapas anteriores
- Salvar progresso automaticamente (se usuário fechar sem concluir, retoma de onde parou)

### 4.7 Após Conclusão

**O que acontece:**
1. `profiles.onboarding_completo = TRUE`
2. `profiles.primeiro_acesso = FALSE`
3. `escritorios.setup_completo = TRUE`
4. Todas as etapas marcadas como completas em `onboarding_steps`
5. Redireciona para `/dashboard`
6. Middleware nunca mais redireciona para `/onboarding`

**Dashboard após onboarding:**
- Pode mostrar dica de "primeiro acesso" no dashboard
- Sugerir criar primeiro processo ou tarefa
- Mas não forçar wizard de novo

---

## 5. MELHORIAS POR MÓDULO - CONTEXTO DETALHADO

### 5.1 MÓDULO: 📅 AGENDA

#### 5.1.1 Contexto e Problema Atual

**O que é a Agenda:**
A Agenda é o **coração operacional** do dia a dia do advogado. É onde ele visualiza:
- Tarefas (ex: revisar petição, ligar para cliente)
- Compromissos (ex: reunião com cliente)
- Audiências (ex: audiência no TJ-SP)
- Prazos processuais (ex: prazo para recurso)

**Problema atual:**
Hoje a agenda está funcional, mas com **experiência ruim**:

1. **Cards não podem ser movidos entre dias**
   - Se advogado criou tarefa para segunda, mas precisa mover para terça, tem que editar manualmente
   - Drag and drop facilitaria muito

2. **Visualização em lista usa "balões"**
   - Difícil ler informações completas
   - Não mostra a qual processo/consultivo está vinculado
   - Não tem informações de cliente

3. **Modal de detalhes é básico**
   - Apenas mostra as informações
   - Não permite ações rápidas (concluir tarefa, lançar hora no timesheet)
   - Não permite navegar para o processo vinculado

4. **Distribuição de tarefas na visualização semanal/diária está desorganizada**
   - Tarefas aparecem sobrepostas
   - Tarefas sem horário definido não aparecem ou aparecem mal

5. **Modal de criação tem scroll vertical**
   - Formulário longo em página única
   - Experiência não guiada

#### 5.1.2 Melhorias Necessárias

**Melhoria 1: Drag and Drop entre Dias**

**Objetivo:** Permitir que advogado arraste card de uma tarefa de segunda para terça.

**Como deve funcionar:**
- Visualização de semana mostra 7 colunas (dom a sáb)
- Cada dia é um "drop zone"
- Ao arrastar tarefa de um dia para outro, atualiza `data_inicio` no banco
- Deve manter o horário, apenas mudar o dia
- Feedback visual durante o drag (card semi-transparente, zona de drop destacada)

**Casos especiais:**
- Tarefa recorrente: perguntar se quer mover apenas esta ocorrência ou toda a série
- Tarefa com dependências: alertar se há conflito

**Melhoria 2: Visualização em Lista Melhorada**

**Objetivo:** Lista linear com informações completas e legíveis.

**Estrutura desejada para cada item:**
- Checkbox à esquerda (para marcar como concluída rapidamente)
- Ícone do tipo (tarefa, compromisso, audiência)
- Título da tarefa
- Badge indicando vínculo:
  - "Processo #1234 - Maria vs João" (se vinculado a processo)
  - "Consultivo #5678 - Parecer LGPD" (se vinculado a consultivo)
  - "Avulso" (se não vinculado)
- Data/hora
- Responsável (se houver)
- Botão de ações (⋮) com opções: ver detalhes, editar, excluir

**Comportamento:**
- Clicar no checkbox marca como concluída (POST para API)
- Clicar no título abre modal de detalhes
- Clicar no badge de processo/consultivo navega para a ficha
- Ordem padrão: data crescente (próximas primeiro)
- Permitir drag vertical para reorganizar prioridade (salvar ordem customizada)

**Melhoria 3: Modal de Detalhes Rico**

**Objetivo:** Tornar o modal uma central de ações, não apenas visualização.

**Seções do modal:**

1. **Header**
   - Título da tarefa (grande, destacado)
   - Badge de status (Pendente, Em andamento, Concluída, Cancelada)
   - Badge de prioridade (Alta, Média, Baixa)

2. **Informações principais**
   - Data e horário
   - Responsável
   - Cliente (se houver)
   - Vínculo (processo ou consultivo) com botão para navegar

3. **Descrição/Observações**
   - Campo de texto longo
   - Markdown support seria um plus

4. **Checklist** (se houver)
   - Lista de sub-tarefas
   - Checkbox para marcar cada uma

5. **Timeline de atividades**
   - Criado em X
   - Movido de Y para Z em W
   - Concluído em K

6. **Ações rápidas (footer)**
   - Botão destacado "Concluir Tarefa" (verde, à direita)
   - Botão "Lançar Hora" (abre mini-form para registrar tempo no timesheet)
   - Botão "Ir para Processo" (se vinculado)
   - Botão "Editar"

**Fluxo de "Concluir Tarefa":**
- Ao clicar, abre confirmação: "Deseja lançar as horas trabalhadas?"
- Se SIM: mostra campo para informar horas e descrição → salva no timesheet → marca tarefa como concluída
- Se NÃO: apenas marca como concluída

**Melhoria 4: Ajustar Visualização Semanal e Diária**

**Problema:** Hoje, tarefas aparecem sobrepostas ou mal distribuídas.

**Solução desejada:**

**Visualização Semanal:**
- 7 colunas (dias)
- Cada coluna mostra tarefas daquele dia
- Tarefas COM horário definido: aparecem no horário correto (ex: 10:00, 14:30)
- Tarefas SEM horário: aparecem no topo da coluna, em área destacada "Dia inteiro"
- Se muitas tarefas no mesmo horário: sobrepor levemente com indicador "+3"

**Visualização Diária:**
- Timeline vertical de 24h (00:00 a 23:59)
- Tarefas aparecem na hora correspondente
- Tarefas sem horário: área "Tarefas do dia" no topo
- Permitir arrastar verticalmente para ajustar horário
- Blocos de 30 minutos visíveis

**Melhoria 5: Confirmação Rápida em Lista**

**Objetivo:** Permitir marcar tarefa como concluída direto da lista, sem abrir modal.

**Como funciona:**
- Checkbox à esquerda de cada item
- Ao marcar, tarefa fica com texto riscado
- Ícone de check verde aparece
- API atualiza `status = 'concluida'`, `concluida_em = NOW()`
- Opcionalmente, perguntar "Lançar horas?" em tooltip rápido

**Melhoria 6: Reorganizar Prioridades (Drag in List)**

**Objetivo:** Permitir que advogado organize suas tarefas por prioridade visual.

**Como funciona:**
- Na visualização em lista, cada item pode ser arrastado verticalmente
- Ordem customizada é salva em campo `ordem_customizada` (integer)
- Queries respeitam essa ordem quando usuário estiver na view "Minhas tarefas"
- Não afeta visualizações por data

**Melhoria 7: Modal de Criação em Wizard**

**Objetivo:** Criar tarefa/compromisso/audiência de forma guiada, sem scroll.

**Estrutura do wizard (4-5 etapas):**

**Etapa 1: Tipo de Agendamento**
- Botões grandes: [Tarefa] [Compromisso] [Audiência]
- Cada um com ícone e descrição
- "O que você deseja agendar?"

**Etapa 2: Data e Horário**
- Calendário visual para escolher data
- Toggle "Dia inteiro" ou "Horário específico"
- Se horário específico: time pickers para início e fim

**Etapa 3: Vincular a Processo ou Consultivo** (opcional)
- Busca inteligente: "Digite número da pasta ou nome do cliente"
- Lista de sugestões
- Opção "Não vincular" (agendamento avulso)

**Etapa 4: Detalhes**
- Título (obrigatório)
- Descrição (opcional)
- Responsável (select de membros do escritório)
- Prioridade (Alta/Média/Baixa)

**Etapa 5: Checklist** (opcional, apenas para tarefas)
- "Deseja adicionar sub-tarefas?"
- Input dinâmico para adicionar itens
- Pode pular

**Ao finalizar:**
- POST para API
- Fecha wizard
- Mostra notificação de sucesso
- Atualiza lista automaticamente

#### 5.1.3 Integrações com Outros Módulos

**Processos:**
- Ao criar tarefa dentro da ficha de processo, pré-preencher `processo_id`
- "Próximos prazos" no processo busca em `agenda_tarefas` WHERE `processo_id = X`

**Consultivo:**
- Mesmo comportamento (pré-preencher `consulta_id`)

**Financeiro:**
- Botão "Lançar Hora" cria registro em `financeiro_timesheet`
- Vínculo: `tarefa_id`, `processo_id` ou `consulta_id`, horas trabalhadas, descrição

**Publicações:**
- Publicações com prazo geram automaticamente tarefa na agenda
- Tarefa tem campo `origem = 'publicacao'` e `publicacao_id`

#### 5.1.4 Checklist de Implementação

**Backend:**
- [ ] Validar que FKs entre agenda e processos/consultivo estão corretos
- [ ] Criar campo `ordem_customizada` em `agenda_tarefas`
- [ ] Criar campo `origem` e `publicacao_id` (se ainda não houver)
- [ ] API endpoint para atualizar data (drag and drop)
- [ ] API endpoint para marcar como concluída
- [ ] API endpoint para atualizar ordem customizada

**Frontend:**
- [ ] Implementar drag and drop entre dias (usar @dnd-kit)
- [ ] Refatorar visualização em lista
- [ ] Criar modal de detalhes rico
- [ ] Ajustar visualização semanal/diária
- [ ] Implementar checkbox de conclusão rápida
- [ ] Implementar drag vertical em lista
- [ ] Refatorar modal de criação (wizard)
- [ ] Integrar com timesheet (botão "Lançar Hora")

---

### 5.2 MÓDULO: ⚖️ PROCESSOS

#### 5.2.1 Contexto e Problema Atual

**O que é o módulo Processos:**
É o módulo central para gestão de processos judiciais. Inclui:
- Dados do processo (número, comarca, vara, cliente, parte contrária)
- Movimentações processuais
- Peças anexadas
- Andamentos
- Prazos

**Problema atual:**

1. **"Próximos Prazos" não está integrado com Agenda**
   - Seção existe, mas não busca dados reais das tarefas agendadas
   - Deveria mostrar automaticamente as tarefas vinculadas a este processo

2. **Não é possível criar tarefa/audiência direto da ficha**
   - Advogado precisa ir na Agenda, criar tarefa, buscar o processo para vincular
   - Deveria ter botão "+" na ficha para criar já vinculado

#### 5.2.2 Melhorias Necessárias

**Melhoria 1: Integrar "Próximos Prazos" com Agenda**

**Objetivo:** Seção "Próximos Prazos" deve buscar automaticamente tarefas e audiências vinculadas.

**Query necessária:**
- Buscar em `agenda_tarefas` WHERE `processo_id = X` AND `status != 'concluida'` ORDER BY `data_inicio` ASC
- Buscar em `agenda_audiencias` WHERE `processo_id = X` AND `data_hora >= NOW()` ORDER BY `data_hora` ASC
- Combinar e ordenar por data

**Visualização:**
- Lista de até 5 próximos prazos
- Para cada prazo:
  - Ícone (tarefa, compromisso, audiência)
  - Título
  - Data e horário
  - Tempo relativo ("em 2 dias", "amanhã", "hoje às 14h")
- Se não houver prazos: EmptyState com botão "Nova Tarefa"

**Ações:**
- Clicar no prazo: abre modal de detalhes da Agenda
- Clicar em "Nova Tarefa": abre wizard com processo já vinculado

**Melhoria 2: Botão "+" para Criar Tarefas Diretamente**

**Objetivo:** Facilitar criação de tarefas e audiências sem sair da ficha.

**Implementação:**
- Botão flutuante ou no header: "Nova Tarefa" (principal) e "Nova Audiência" (secundário)
- Ao clicar, abre o wizard da Agenda (mesmo componente)
- Diferença: `processo_id` já vem pré-preenchido
- Também pré-preencher `cliente_id` (buscar de `processos_processos.cliente_id`)

**Fluxo:**
1. Usuário está em `/dashboard/processos/[id]`
2. Clica em "Nova Tarefa"
3. Wizard abre (modal ou página)
4. Etapa "Vincular a Processo" é pulada (já está vinculado)
5. Ou mostra como informação read-only: "Vinculado a: Processo #1234"
6. Restante do fluxo é idêntico
7. Ao salvar, atualiza a seção "Próximos Prazos" automaticamente

#### 5.2.3 Checklist de Implementação

**Backend:**
- [x] FKs já corretos (feito na Fase 0)
- [ ] Garantir que queries filtram por `escritorio_id`

**Frontend:**
- [ ] Refatorar seção "Próximos Prazos"
- [ ] Query para buscar tarefas e audiências
- [ ] EmptyState quando não houver prazos
- [ ] Adicionar botão "+" na ficha
- [ ] Reutilizar wizard da Agenda com `defaultData` pré-preenchida
- [ ] Atualizar lista após criação

---

### 5.3 MÓDULO: 🗂️ CONSULTIVO

#### 5.3.1 Contexto e Problema Atual

**O que é o módulo Consultivo:**
Módulo para gestão de trabalhos jurídicos não-processuais:
- Pareceres jurídicos
- Consultas pontuais
- Contratos (elaboração e análise)
- Due diligence
- Obrigações contratuais

**Problema atual:**

1. **Numeração de pastas é separada dos processos**
   - Processos: #1001, #1002, #1003
   - Consultivos: #C001, #C002 (com prefixo)
   - Gera confusão

2. **Visualização da lista não é consistente com Processos**
   - Cada módulo tem estilo próprio

3. **Modal "Nova Consulta" tem problemas e não é guiado**
   - Formulário longo, não usa wizard

4. **Submódulos novos precisam ser implementados:**
   - Contratos
   - Obrigações
   - Banco de Cláusulas
   - Gerador de Contratos

#### 5.3.2 Melhorias Necessárias

**Melhoria 1: Unificar Numeração de Pastas**

**Objetivo:** Processos e consultivos compartilham a mesma sequência numérica.

**Como funciona hoje:**
- Tabela `processos_processos` tem campo `numero_pasta` (integer, auto-increment ou sequence)
- Tabela `consultivo_consultas` tem campo `numero_pasta` (integer, sequence própria)

**Como deve funcionar:**
- **Sequência única compartilhada:** `seq_numero_pasta`
- Ambas as tabelas usam `nextval('seq_numero_pasta')` como default
- Resultado:
  - Processo #1450
  - Consultivo #1451
  - Processo #1452
  - Consultivo #1453

**Vantagem:**
- Numeração global única facilita referência
- Evita confusão ("qual era o #1234, processo ou consultivo?")

**Implementação:**
- Criar sequence compartilhada
- Atualizar default de ambas as colunas
- Trigger ou função para garantir atomicidade

**Melhoria 2: Padronizar Visualização**

**Objetivo:** Lista de consultivos deve ter mesmo estilo da lista de processos.

**Estrutura:**
- Cards ou tabela (dependendo do layout atual de processos)
- Colunas: Número da Pasta, Cliente, Tipo de Consulta, Status, Última Atualização
- Filtros: por cliente, por status, por tipo
- Busca: por número, por cliente, por palavra-chave

**Melhoria 3: Modal "Nova Consulta" em Wizard**

**Objetivo:** Mesmo padrão de criação guiada da Agenda e CRM.

**Etapas do wizard:**

**Etapa 1: Tipo de Consultivo**
- Opções: Parecer Jurídico, Análise Contratual, Due Diligence, Consultoria Pontual, Outro
- Cada tipo pode ter campos específicos depois

**Etapa 2: Cliente**
- Busca inteligente de clientes
- Ou botão "Novo Cliente" (abre wizard do CRM em modal nested ou redireciona)

**Etapa 3: Dados Básicos**
- Título da consulta (obrigatório)
- Descrição resumida
- Área do direito (select: Cível, Trabalhista, Tributário, etc)
- Prazo para conclusão (data)

**Etapa 4: Equipe** (opcional)
- Adicionar membros do escritório responsáveis
- Definir responsável principal

**Etapa 5: Honorários** (opcional)
- Vincular a contrato de honorários existente
- Ou definir valor avulso
- Pode pular (configurar depois)

**Ao finalizar:**
- Cria registro em `consultivo_consultas`
- Redireciona para ficha da consulta

**Melhoria 4: Implementar Submódulos**

**Contexto:**
Consultivo atualmente é uma entidade monolítica. Precisa ser expandido para suportar gestão mais granular.

**Submódulo: Contratos**

**Objetivo:** Gerenciar contratos elaborados ou analisados pelo escritório.

**Estrutura de dados:**
- Tabela `consultivo_contratos` (pode já existir como `consultivo_minutas_contratuais`)
- Campos: cliente_id, tipo_contrato, data_inicio, data_fim, valor, status, arquivo_url
- Relação: consulta_id (FK para consultivo_consultas)

**Funcionalidades:**
- Listar contratos ativos/vencidos
- Visualizar detalhes
- Upload de arquivo
- Versionamento de contrato (se houver aditivos)

**Submódulo: Obrigações**

**Objetivo:** Rastrear prazos e obrigações contratuais.

**Estrutura de dados:**
- Tabela `consultivo_obrigacoes`
- Campos: contrato_id, tipo_obrigacao (pagamento, renovação, entrega), data_vencimento, status, descricao
- Integração com Agenda (criar tarefa automaticamente para obrigações futuras)

**Funcionalidades:**
- Painel de obrigações por vencer
- Alertas automáticos
- Marcar como cumprida
- Histórico de cumprimento

**Submódulo: Banco de Cláusulas**

**Objetivo:** Biblioteca pessoal de cláusulas contratuais reutilizáveis.

**Estrutura de dados:**
- Tabela `consultivo_clausulas_biblioteca` (parece já existir)
- Campos: titulo, conteudo_texto, tags, categoria, favorito

**Funcionalidades:**
- CRUD de cláusulas
- Busca por palavra-chave
- Organizar por categorias (rescisão, pagamento, garantias, etc)
- Marcar favoritos
- Exportar cláusula para Word/PDF

**Submódulo: Gerador de Contratos**

**Objetivo:** Montar contratos personalizados selecionando cláusulas do banco.

**Fluxo:**

1. Usuário clica "Gerar Contrato"
2. Wizard:
   - Etapa 1: Selecionar consulta ou cliente
   - Etapa 2: Definir partes (contratante, contratada)
   - Etapa 3: Selecionar cláusulas do banco (drag and drop para ordenar)
   - Etapa 4: Preencher variáveis (ex: [VALOR] = R$ 10.000)
   - Etapa 5: Preview e ajustes finais
3. Gera documento (HTML para visualização)
4. Opção de exportar para Word/PDF (implementação posterior)

**Estrutura de dados:**
- Tabela `consultivo_contratos_gerados`
- JSONB com estrutura: `{ clausulas: [id1, id2], variaveis: {VALOR: 10000} }`

#### 5.3.3 Checklist de Implementação

**Backend:**
- [ ] Criar sequence compartilhada para numeração
- [ ] Atualizar defaults de `numero_pasta`
- [ ] Validar estrutura das tabelas de submódulos
- [ ] Criar tabela `consultivo_obrigacoes` (se não existir)
- [ ] Criar tabela `consultivo_contratos_gerados`

**Frontend:**
- [ ] Refatorar lista de consultivos (seguir padrão de processos)
- [ ] Refatorar modal "Nova Consulta" (wizard)
- [ ] Criar página de Contratos (submódulo)
- [ ] Criar página de Obrigações (submódulo)
- [ ] Melhorar página de Banco de Cláusulas
- [ ] Implementar Gerador de Contratos (wizard)

**Futuro (não prioritário agora):**
- [ ] Exportação para Word/PDF (requer biblioteca adicional)

---

### 5.4 MÓDULO: 💼 CRM

#### 5.4.1 Contexto e Problema Atual

**O que é o módulo CRM:**
Gestão de relacionamento com clientes e potenciais clientes:
- Cadastro de pessoas (físicas e jurídicas)
- Funil de negociações (oportunidades)
- Interações (emails, ligações, reuniões)
- Relacionamentos entre pessoas

**Problema atual:**

1. **Kanban de negociações tem erros no console**
   - 7 erros do Next.js ao arrastar cards
   - Provavelmente problema com state management do @dnd-kit

2. **Modal de criação não usa wizard**
   - Formulário longo e intimidador

3. **Falta categoria "Parceiro"**
   - Hoje: cliente, lead, prospect
   - Precisa: parceiro (ex: correspondentes, peritos, outros advogados)

#### 5.4.2 Melhorias Necessárias

**Melhoria 1: Corrigir Erros do Kanban**

**Objetivo:** Kanban deve funcionar sem erros no console.

**Diagnóstico:**
- Erro comum: tentar acessar propriedades de objeto undefined durante drag
- Ou: state não sincronizado corretamente após drop

**Solução:**
- Revisar implementação do DndContext
- Garantir que `items` passados para SortableContext estão corretos
- Validar que `id` de cada card é único e imutável
- Usar `useSensors` com PointerSensor correto

**Melhoria 2: Adicionar Categoria "Parceiro"**

**Objetivo:** Permitir classificar pessoas como parceiras, não apenas clientes/leads.

**Mudanças:**

**Backend:**
- Alterar constraint/enum de `crm_pessoas.categoria` para incluir 'parceiro'

**Frontend:**
- Adicionar opção "Parceiro" nos filtros
- Adicionar opção "Parceiro" no formulário de criação/edição
- Criar visualização específica? (opcional) - "Minha Rede de Parceiros"

**Casos de uso:**
- Advogado correspondente em outro estado
- Perito que atende o escritório
- Outro advogado para indicação mútua

**Melhoria 3: Modal de Criação em Wizard**

**Objetivo:** Mesmo padrão guiado dos outros módulos.

**Etapas:**

**Etapa 1: Tipo de Pessoa**
- Botões grandes: [Pessoa Física] [Pessoa Jurídica]

**Etapa 2: Dados Básicos**
- Se física: Nome, CPF, RG
- Se jurídica: Razão Social, Nome Fantasia, CNPJ

**Etapa 3: Contato**
- Email (principal e secundário)
- Telefone (principal e secundário)
- WhatsApp (checkbox "mesmo do telefone principal")

**Etapa 4: Endereço** (opcional)
- CEP (busca automática), Logradouro, Número, Complemento, Bairro, Cidade, UF

**Etapa 5: Categoria e Observações**
- Select: Cliente, Lead, Prospect, Parceiro
- Textarea: Observações gerais

#### 5.4.3 Checklist de Implementação

**Backend:**
- [ ] Adicionar 'parceiro' ao enum de categoria
- [ ] Validar RLS policies (já corrigido na Fase 0)

**Frontend:**
- [ ] Diagnosticar e corrigir erros do Kanban
- [ ] Adicionar filtro "Parceiro"
- [ ] Refatorar modal de criação (wizard)
- [ ] Testar drag and drop no kanban

---

### 5.5 MÓDULO: 💰 FINANCEIRO

#### 5.5.1 Contexto e Problema Atual

**O que é o módulo Financeiro:**
Gestão completa das finanças do escritório:
- Receitas e despesas
- Contratos de honorários
- Timesheet (controle de horas)
- Contas bancárias
- Faturamento
- Relatórios financeiros

**Problema atual:**

1. **Botões de ação rápida não funcionam**
   - Provavelmente links quebrados ou handlers não implementados

2. **Pesquisa e filtros são básicos**
   - Não permite filtrar por período facilmente
   - Não tem navegação mês a mês

3. **Falta campo de status**
   - Receitas/despesas sem indicação de "Em aberto" vs "Quitada"

4. **Módulo de Contratos de Honorários está confuso**
   - Foca em KPIs genéricos, não na gestão dos contratos em si

5. **Modal de honorários não permite configurar regras complexas**
   - Falta lógica de cobrança por ato, por hora, fixa, híbrida

6. **Contas bancárias: cards mal configurados**
   - Hover não tem feedback visual adequado
   - Falta visualização de extrato mês a mês

7. **Relatórios Financeiros parece um dashboard**
   - Deveria ser área de geração de relatórios customizáveis (DRE, Fluxo de Caixa)

#### 5.5.2 Melhorias Necessárias

**Melhoria 1: Corrigir Botões de Ação Rápida**

**Objetivo:** Botões devem executar ações corretas.

**Identificar:**
- Quais são os botões?
- Nova Receita, Nova Despesa, Lançar Hora?
- Verificar se estão linkando para modais ou rotas corretas

**Melhoria 2: Melhorar Pesquisa e Filtros**

**Objetivo:** Facilitar navegação temporal e filtros múltiplos.

**Implementar:**
- **Navegador de período:** Botões "< Mês Anterior" e "Próximo Mês >"
- **Filtros múltiplos:** Status (todas, em aberto, quitadas), Tipo (receita, despesa), Conta bancária, Cliente
- **Busca por texto:** Descrição ou cliente
- **Ordenação:** Data, Valor, Cliente

**Melhoria 3: Adicionar Campo de Status**

**Objetivo:** Rastrear se receita/despesa foi quitada.

**Backend:**
- Adicionar coluna `status` em `financeiro_receitas` e `financeiro_despesas` (se ainda não existir)
- Valores: 'em_aberto', 'quitada', 'cancelada'
- Adicionar coluna `data_quitacao` (timestamp, nullable)

**Frontend:**
- Badge de status em cada lançamento
- Filtro por status
- Ação rápida "Marcar como Quitada" (altera status e preenche data)

**Melhoria 4: Refatorar Contratos de Honorários**

**Objetivo:** Focar na gestão dos contratos, não em KPIs.

**Estrutura de página:**

**Seção 1: Lista de Contratos Ativos**
- Cards ou tabela
- Informações: Cliente, Tipo de cobrança, Valor, Início, Status

**Seção 2: Novo Contrato**
- Botão destacado que abre wizard

**Wizard de Novo Contrato:**

**Etapa 1: Cliente**
- Busca de cliente existente
- Ou criar novo (abre wizard do CRM)

**Etapa 2: Tipo de Cobrança**
- Opções: Fixo, Por hora, Por ato, Êxito, Híbrido
- Explicação de cada tipo

**Etapa 3: Configuração da Cobrança**
- **Se Fixo:** Valor mensal, dia de vencimento
- **Se Por hora:** Valor da hora, tabela de horas (pode referenciar tabela padrão do escritório ou customizar)
- **Se Por ato:** Lista de atos e valores (ex: Contestação R$ 500, Recurso R$ 1000)
- **Se Êxito:** Percentual sobre o valor da causa ou ganho
- **Se Híbrido:** Combinar opções acima

**Etapa 4: Vigência e Condições**
- Data de início
- Data de fim (ou indeterminado)
- Condições de reajuste
- Observações

**Ao salvar:**
- Cria registro em `financeiro_contratos_honorarios`
- Cria registros em `financeiro_contratos_honorarios_config` (se houver regras complexas)

**Melhoria 5: Integração com Timesheet**

**Objetivo:** Contratos por hora devem referenciar tabela de horas padrão do escritório.

**Lógica:**
- Escritório define "Tabela de Horas Padrão" no módulo Escritório
- Exemplo: Advogado Júnior R$ 150/h, Pleno R$ 300/h, Sênior R$ 500/h
- Ao criar contrato por hora, pode usar tabela padrão ou customizar

**Quando advogado lança horas:**
- Timesheet associa tarefa → processo ou consultivo
- Processo ou consultivo → cliente
- Cliente → contrato de honorários
- Sistema calcula valor a cobrar com base na tabela

**Melhoria 6: Contas Bancárias - Melhorar Cards**

**Objetivo:** Cards com hover sutil e extrato funcional.

**Design dos cards:**
- Fundo branco, borda `border-slate-200`
- Hover: `border-[#89bcbe]`, `shadow-lg`, transição suave
- Informações: Nome da conta, Banco, Saldo atual
- Botão "Ver Extrato"

**Visualização de Extrato:**
- Modal ou página dedicada
- Navegação mês a mês
- Tabela: Data, Descrição, Valor, Saldo (acumulado)
- Filtros: Tipo (receita, despesa, transferência), Categoria

**Melhoria 7: Relatórios Financeiros - Geração de Documentos**

**Objetivo:** Transformar em área de geração de relatórios gerenciais.

**Tipos de relatórios:**

1. **DRE (Demonstração do Resultado do Exercício)**
   - Selecionar período
   - Gerar tabela: Receitas - Despesas = Resultado
   - Exportar para PDF/Excel (futuro)

2. **Fluxo de Caixa**
   - Selecionar período
   - Projeção: receitas esperadas vs despesas esperadas
   - Gráfico de barras

3. **Relatório por Cliente**
   - Selecionar cliente
   - Todos os honorários recebidos, horas trabalhadas, processos ativos

4. **DBE (Demonstrativo de Balanço do Escritório)**
   - Relatório customizável para análise interna

**Interface:**
- Não mostrar KPIs fixos
- Mostrar botões: [Gerar DRE] [Gerar Fluxo de Caixa] [Relatório por Cliente] [DBE]
- Cada botão abre wizard para configurar parâmetros
- Após gerar, mostra preview e opção de exportar

#### 5.5.3 Checklist de Implementação

**Backend:**
- [ ] Adicionar campo `status` em receitas e despesas (se não existir)
- [ ] Adicionar campo `data_quitacao`
- [ ] Validar estrutura de `financeiro_contratos_honorarios_config`
- [ ] Criar queries para relatórios (DRE, Fluxo, por Cliente)

**Frontend:**
- [ ] Corrigir botões de ação rápida
- [ ] Implementar navegador de período
- [ ] Implementar filtros múltiplos
- [ ] Adicionar badge de status
- [ ] Refatorar página de Contratos de Honorários
- [ ] Criar wizard de Novo Contrato
- [ ] Melhorar cards de Contas Bancárias
- [ ] Implementar visualização de extrato
- [ ] Refatorar Relatórios Financeiros
- [ ] Implementar geração de DRE, Fluxo de Caixa, etc

---

### 5.6 MÓDULO: 🏢 ESCRITÓRIO

#### 5.6.1 Contexto e Problema Atual

**O que é o módulo Escritório:**
Área administrativa do sistema, onde se gerencia:
- Membros da equipe
- Cargos e remunerações
- Permissões de acesso
- Configurações do escritório
- Logotipo
- Plano e limites

**Problema atual:**

1. **Página parece um dashboard, não painel administrativo**
   - KPIs de performance não fazem sentido aqui

2. **Falta gestão granular de usuários**
   - Adicionar membros, definir cargos, remuneração, permissões

3. **Controle de permissões é individual**
   - Deveria ser por cargo (mais escalável)

4. **Falta opção de upload de logotipo**
   - Campo existe no banco, mas não tem UI

5. **"Plano e limites" está na página principal**
   - Deveria estar no submenu do usuário

6. **Falta suporte a múltiplos escritórios**
   - Advogado pode ter mais de um escritório, precisa poder alternar

#### 5.6.2 Melhorias Necessárias

**Melhoria 1: Remover KPIs e Insights**

**Objetivo:** Transformar em painel puramente administrativo.

**Remover:**
- Seção de performance
- Notificações rápidas (se houver)
- Insights de gestão
- Configurações rápidas genéricas

**Melhoria 2: Gestão de Membros**

**Objetivo:** CRUD completo de membros da equipe.

**Estrutura de dados:**
- Tabela `user_escritorios_roles` (parece já existir)
- Campos: user_id, escritorio_id, role, cargo, remuneracao, data_entrada, ativo

**Funcionalidades:**

**Listar Membros Ativos:**
- Cards ou tabela
- Informações: Nome, Cargo, Email, Telefone, Data de entrada
- Ações: Editar, Desativar

**Adicionar Novo Membro:**
- Wizard:
  - Etapa 1: Buscar usuário existente (por email) ou convidar novo (envia email)
  - Etapa 2: Definir cargo (select ou criar novo)
  - Etapa 3: Definir remuneração (opcional)
  - Etapa 4: Definir permissões (baseado no cargo, mas pode customizar)

**Convites Pendentes:**
- Mostrar lista de emails convidados que ainda não aceitaram
- Opção de reenviar ou cancelar convite

**Melhoria 3: Cargos e Permissões**

**Objetivo:** Gerenciar permissões por cargo, não individualmente.

**Estrutura de dados:**
- Tabela `escritorio_cargos`
- Campos: escritorio_id, nome, descricao, permissoes (jsonb)

**Permissões por módulo:**
```json
{
  "dashboard": { "visualizar": true },
  "crm": { "visualizar": true, "criar": true, "editar": true, "excluir": false },
  "processos": { "visualizar": true, "criar": true, "editar": true, "excluir": false },
  "agenda": { "visualizar": true, "criar": true, "editar": true, "excluir": true },
  "financeiro": { "visualizar": false, "criar": false, "editar": false, "excluir": false },
  "consultivo": { "visualizar": true, "criar": true, "editar": true, "excluir": false },
  "escritorio": { "visualizar": false, "criar": false, "editar": false, "excluir": false }
}
```

**Cargos sugeridos:**
- Owner (todas as permissões)
- Advogado Sênior (quase todas, exceto Escritório)
- Advogado Júnior (sem Financeiro e Escritório)
- Assistente Jurídico (visualizar maioria, criar/editar alguns)
- Estagiário (visualizar apenas)

**Interface:**
- Página de Cargos (lista, criar, editar)
- Ao criar cargo, checkboxes para cada permissão por módulo
- Ao adicionar membro, seleciona cargo (permissões são herdadas)

**Melhoria 4: Upload de Logotipo**

**Objetivo:** Permitir que escritório faça upload do logo.

**Implementação:**
- Input de arquivo (accept: image/*)
- Preview ao selecionar
- Upload para Supabase Storage (bucket `escritorios-logos`)
- Salvar URL em `escritorios.logo_url`
- Exibir logo em:
  - Header do sistema (opcional)
  - Cabeçalho de relatórios
  - Documentos gerados

**Melhoria 5: Mover "Plano e Limites" para Submenu do Usuário**

**Objetivo:** Informações de plano são do usuário, não do painel de escritório.

**Implementação:**
- Criar rota `/configuracoes/plano` ou similar
- Acessível via menu dropdown do avatar do usuário (canto superior direito)
- Mostrar:
  - Plano atual (Free, Pro, Enterprise)
  - Limites (usuários, processos, armazenamento)
  - Uso atual vs limite
  - Opção de upgrade (se aplicável)

**Melhoria 6: Suporte a Múltiplos Escritórios**

**Objetivo:** Advogado pode pertencer a vários escritórios e alternar entre eles.

**Conceito:**
- Advogado autônomo cria "Escritório A"
- Depois é convidado para "Escritório B" de um colega
- Precisa poder alternar entre os dois

**Estrutura de dados:**
- `profiles.ultimo_escritorio_ativo` - Rastreia qual está usando no momento
- `user_escritorios_roles` - Relacionamento N:N (usuário pode estar em vários escritórios)

**UI:**
- Dropdown no header (ao lado do nome do usuário ou logo)
- "Escritório atual: [Nome]"
- Opção "Trocar de escritório" - lista outros escritórios aos quais pertence
- Ao trocar:
  - Atualiza `ultimo_escritorio_ativo`
  - Recarrega dashboard com dados do novo escritório
  - TODOS os dados do sistema passam a ser daquele escritório (RLS filtra por `escritorio_id`)

**Criar Novo Escritório:**
- Opção no mesmo dropdown: "Criar novo escritório"
- Abre wizard similar ao onboarding (nome, CNPJ, endereço)
- Ao criar, torna-se owner do novo escritório
- Pode alternar entre escritórios a qualquer momento

**Isolamento de Dados:**
- **CRÍTICO:** Ao trocar de escritório, sistema deve "zerar" visão
- Processos, clientes, tarefas, tudo muda
- Mas dados não são excluídos, apenas filtrados por `escritorio_id`

#### 5.6.3 Checklist de Implementação

**Backend:**
- [ ] Criar tabela `escritorio_cargos` (se não existir)
- [ ] Criar tabela `escritorio_convites` (para rastrear convites pendentes)
- [ ] Validar estrutura de `user_escritorios_roles`
- [ ] Criar API para upload de logo (Supabase Storage)
- [ ] Criar função SQL para trocar de escritório (`switch_escritorio`)

**Frontend:**
- [ ] Remover KPIs e insights da página de Escritório
- [ ] Criar seção de Membros Ativos
- [ ] Criar wizard de Adicionar Membro
- [ ] Criar página de Cargos
- [ ] Implementar upload de logotipo
- [ ] Mover "Plano e Limites" para submenu do usuário
- [ ] Criar dropdown de Trocar Escritório
- [ ] Implementar wizard de Criar Novo Escritório
- [ ] Garantir que RLS filtra corretamente ao trocar

---

## 6. ORDEM DE IMPLEMENTAÇÃO E DEPENDÊNCIAS

### 6.1 Grafo de Dependências

```
FASE 0: Fundações (BLOQUEADOR)
    ├── Migrations de escritorio_id (30 tabelas)
    ├── Sistema de onboarding
    ├── Biblioteca de componentes
    └── WizardWrapper

    ↓

FLUXO DE ONBOARDING (logo após Fase 0)
    ├── Middleware de redirecionamento
    ├── Páginas de onboarding
    └── Hooks e lógica

    ↓

FASE 1: CRM (BASE para todos)
    ├── Corrigir Kanban
    ├── Adicionar categoria Parceiro
    └── Wizard de criação

    ↓

FASE 2A: PROCESSOS (paralelo)          FASE 2B: AGENDA (paralelo)
    ├── Integrar próximos prazos        ├── Drag and drop
    └── Botão "+" criar tarefa          ├── Modal de detalhes
                                        ├── Wizard de criação
                                        └── Visualização em lista

    ↓

FASE 3A: CONSULTIVO (paralelo)         FASE 3B: FINANCEIRO (paralelo)
    ├── Unificar numeração              ├── Corrigir botões
    ├── Wizard de criação               ├── Campo de status
    ├── Submódulo Contratos             ├── Wizard de honorários
    ├── Submódulo Obrigações            ├── Melhorar contas bancárias
    ├── Banco de Cláusulas              └── Refatorar relatórios
    └── Gerador de Contratos

    ↓

FASE 4: ESCRITÓRIO
    ├── Remover KPIs
    ├── Gestão de membros
    ├── Cargos e permissões
    ├── Upload de logo
    ├── Múltiplos escritórios
    └── Mover "Plano e Limites"

    ↓

FASE 5: AJUSTES FINAIS
    ├── Dashboard (se necessário)
    ├── Testes E2E
    └── Documentação
```

### 6.2 Justificativa da Ordem

**FASE 0 primeiro:**
- Sem multi-tenancy correto = risco de segurança
- Sem componentes base = retrabalho constante
- Sem wizard = cada módulo implementa modal diferente

**Onboarding logo após:**
- Define primeiro contato do usuário
- Garante criação obrigatória de escritório
- Evita dados órfãos

**CRM como base:**
- Tabela `crm_pessoas` é referenciada por:
  - Processos (cliente)
  - Consultivo (cliente)
  - Financeiro (cliente em contratos)
  - Agenda (evento com cliente)
- Se CRM não estiver correto, todos os outros módulos terão problema

**Processos e Agenda em paralelo:**
- Processos cria tarefas na agenda
- Agenda mostra tarefas de processos
- Dependência mútua, mas implementável em paralelo se houver 2 devs
- Ou sequencial se 1 dev apenas

**Consultivo e Financeiro em paralelo:**
- Não têm dependência direta entre si
- Ambos dependem de CRM
- Podem ser feitos simultaneamente

**Escritório por último:**
- Depende de todos os módulos existirem (permissões são sobre módulos)
- Upload de logo usado em documentos gerados (que serão implementados durante o caminho)

### 6.3 Tempo Estimado por Fase

| Fase | Descrição | Tempo Estimado | Prioridade |
|------|-----------|----------------|-----------|
| **Fase 0** | Fundações (migrations + componentes) | 4-6 dias | 🔴 CRÍTICA |
| **Onboarding** | Fluxo de primeiro acesso | 3-4 dias | 🔴 CRÍTICA |
| **Fase 1** | CRM | 3-4 dias | 🔴 ALTA |
| **Fase 2A** | Processos | 2-3 dias | 🔴 ALTA |
| **Fase 2B** | Agenda | 4-5 dias | 🔴 ALTA |
| **Fase 3A** | Consultivo | 5-6 dias | 🟡 MÉDIA |
| **Fase 3B** | Financeiro | 5-6 dias | 🟡 MÉDIA |
| **Fase 4** | Escritório | 4-5 dias | 🟡 MÉDIA |
| **Fase 5** | Ajustes finais | 2-3 dias | 🟢 BAIXA |

**Total:** 32-42 dias úteis (~6-8 semanas)

Se trabalho paralelo (2 devs):
- Fases 2A + 2B simultâneas: economiza 2-3 dias
- Fases 3A + 3B simultâneas: economiza 5-6 dias
- **Total com paralelismo:** ~25-33 dias (~5-6 semanas)

---

## 7. PRINCÍPIOS DE DESIGN E UX

### 7.1 Consistência Visual

**Todos os módulos devem seguir o padrão estabelecido no Dashboard.**

Ver `DESIGN_SYSTEM.md` para referência completa.

**Checklist ao implementar qualquer tela:**
- [ ] Cores: usar paleta oficial (#34495e, #46627f, #89bcbe, etc)
- [ ] Tipografia: text-2xl para KPIs, text-sm para cards, text-xs para labels
- [ ] Ícones: 32x16px para KPIs, 28x14px para timeline
- [ ] Espaçamento: gap-6 entre seções, gap-4 entre cards
- [ ] Componentes: usar MetricCard, InsightCard, TimelineItem, etc
- [ ] Bordas: border-slate-200, rounded-lg
- [ ] Sombras: shadow-sm padrão, shadow-lg hover

### 7.2 Padrões de Interação

**Modais de Criação:**
- SEMPRE usar WizardWrapper
- Etapas curtas e focadas (1 objetivo por etapa)
- Progresso visual (1/5, 2/5, etc)
- Validação antes de avançar
- Permitir voltar
- Botão "Pular" se opcional

**Listas:**
- Informações completas visíveis (não esconder em hover)
- Ações em botão ⋮ ou botões dedicados
- EmptyState quando vazio (com ação para criar)
- Filtros e busca sempre visíveis
- Paginação ou infinite scroll para listas longas

**Formulários:**
- Labels claros e descritivos
- Placeholders com exemplos
- Validação inline (não esperar submit)
- Erros em vermelho, sucessos em verde
- Botão principal destacado (gradiente azul)

### 7.3 Feedback ao Usuário

**Loading States:**
- Skeleton screens (não apenas spinners)
- Indicadores de progresso para operações longas
- Mensagens descritivas ("Salvando processo...", não apenas "Aguarde")

**Notificações:**
- Toast no canto superior direito
- Sucesso: verde, ícone de check
- Erro: vermelho, ícone de alerta
- Info: azul, ícone de info
- Duração: 3-5 segundos (ou dismiss manual)

**Confirmações:**
- Ações destrutivas sempre pedem confirmação (excluir, cancelar)
- Modal de confirmação: "Tem certeza? Esta ação não pode ser desfeita"
- Botão de confirmar em vermelho para destrutivas

### 7.4 Responsividade

**Mobile-first:**
- Layout deve funcionar em mobile (320px+)
- Tablet (768px+)
- Desktop (1024px+)

**Adaptações:**
- Sidebar: colapsa em mobile (hamburguer menu)
- Grids: 1 coluna em mobile, 2-3 em tablet, 3-4 em desktop
- Modais: fullscreen em mobile, centered em desktop
- Tabelas: scroll horizontal em mobile ou cards alternativos

### 7.5 Acessibilidade

**Básicos:**
- Contraste adequado (WCAG AA no mínimo)
- Foco visível em elementos interativos
- Labels em todos os inputs
- Alt text em imagens
- Navegação por teclado (Tab, Enter, Esc)

**ARIA:**
- Roles apropriados (button, dialog, menu)
- aria-label quando necessário
- aria-describedby para hints
- aria-live para notificações

---

## 8. APÊNDICE

### 8.1 Referências de Arquivos

- `DESIGN_SYSTEM.md` - Padrões visuais estabelecidos no Dashboard
- `AUDITORIA_BANCO_DADOS.md` - Análise completa do banco de dados
- `CLAUDE.md` - Documentação geral do projeto
- `ROADMAP.md` - Roadmap original (se houver)

### 8.2 Tecnologias Utilizadas

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- PostgreSQL (banco de dados)

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui (componentes base)
- @dnd-kit (drag and drop)
- date-fns (manipulação de datas)
- Lucide React (ícones)

**Outros:**
- n8n (automações, futuro)
- Claude AI via MCP (integrações IA)

### 8.3 Convenções de Código

**Nomenclatura:**
- Componentes: PascalCase (ex: `MetricCard.tsx`)
- Hooks: camelCase com prefixo use (ex: `useOnboarding.ts`)
- Funções: camelCase (ex: `completeTask`)
- Constantes: UPPER_SNAKE_CASE (ex: `MAX_FILE_SIZE`)
- Variáveis: camelCase (ex: `currentStep`)

**Estrutura de arquivos:**
```
src/
├── app/                # Next.js App Router
├── components/         # Componentes reutilizáveis
├── hooks/              # Custom hooks
├── lib/                # Utilidades e helpers
├── types/              # TypeScript types
└── styles/             # CSS global
```

**Comentários:**
- Comentar "por quê", não "o quê"
- JSDoc para funções complexas
- TODO: marcar itens pendentes

---

**FIM DO DOCUMENTO**

---

**IMPORTANTE:**
Este é um documento de **contexto e orientação**. A IA implementadora deve:
1. Ler e entender completamente cada seção
2. Fazer perguntas se algo não estiver claro
3. Implementar seguindo os princípios, não copiando código
4. Adaptar soluções ao contexto real do código existente
5. Manter consistência com o que já está implementado

**Próximos Passos:**
1. Revisar este documento com o time
2. Priorizar fases conforme recursos disponíveis
3. Começar pela Fase 0 (obrigatório)
4. Implementar módulo por módulo, testando cada um antes de prosseguir
