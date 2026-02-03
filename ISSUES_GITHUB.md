# 🐛 Issues para Criar no GitHub - Relatório de Auditoria

Este arquivo contém todas as issues encontradas no relatório de auditoria, organizadas por prioridade.

**Como usar:**
1. Acesse: https://github.com/victorbarbieri91/zyra-app/issues/new
2. Copie o título e corpo de cada issue
3. Adicione as labels sugeridas
4. Crie a issue

---

## 🔴 ISSUES CRÍTICAS (Sprint 1 - Urgente)

### Issue #1: 🔴 CRÍTICO: Implementar Supabase Realtime no Dashboard

**Labels:** `bug`, `crítico`, `ux`, `realtime`, `dashboard`

**Título:**
```
🔴 CRÍTICO: Implementar Supabase Realtime no Dashboard
```

**Corpo:**
```markdown
## 🐛 Problema

Dashboard não atualiza métricas automaticamente. Quando usuário cria processo, adiciona cliente ou lança horas, os KPIs não atualizam até dar F5.

## 📍 Localização

- **Arquivo:** `src/hooks/useDashboardMetrics.ts`
- **Módulo:** Dashboard

## 💥 Impacto

- Usuário precisa dar F5 manualmente para ver dados atualizados
- Experiência ruim e perda de produtividade
- Métricas desatualizadas podem causar decisões erradas

## ✅ Solução Sugerida

Implementar Supabase Realtime subscriptions nas tabelas críticas:

```typescript
// Adicionar em useDashboardMetrics.ts
useEffect(() => {
  if (!escritorioAtivo) return

  const channel = supabase
    .channel('dashboard-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'processos_processos',
      filter: `escritorio_id=eq.${escritorioAtivo}`
    }, () => {
      loadMetrics() // Refetch automático
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'crm_pessoas',
      filter: `escritorio_id=eq.${escritorioAtivo}`
    }, () => {
      loadMetrics()
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'financeiro_timesheet',
      filter: `escritorio_id=eq.${escritorioAtivo}`
    }, () => {
      loadMetrics()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritorioAtivo, supabase, loadMetrics])
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 1 (1 semana)

## ⏱️ Estimativa

2 dias
```

---

### Issue #2: 🔴 CRÍTICO: Remover 191 console.log de produção (Segurança)

**Labels:** `bug`, `crítico`, `segurança`, `tech-debt`

**Título:**
```
🔴 CRÍTICO: Remover 191 console.log de produção (Vazamento de dados)
```

**Corpo:**
```markdown
## 🐛 Problema

191 arquivos (51% do código) contêm console.log que expõem dados sensíveis no navegador: IDs de escritórios, user_ids, queries SQL, tokens, dados de clientes.

## 📍 Localização

**Arquivos mais problemáticos:**
- `src/app/api/escavador/publicacoes/sync/route.ts` - 15+ console.logs
- `src/hooks/useFaturamento.ts` - 8 console.logs (linhas 132, 140, 154, 274, 282, 295, 439, 474)
- `src/hooks/useDashboardMetrics.ts:369` - console.error
- `src/app/dashboard/financeiro/faturamento/page.tsx:56` - console.log expondo escritoriosSelecionados

## 💥 Impacto

- **SEGURANÇA:** Vazamento de informações confidenciais
- Facilita ataques e engenharia reversa
- Degrada performance do navegador
- Não é profissional em produção

## ✅ Solução Sugerida

**Passo 1:** Criar logger condicional

```typescript
// Criar /src/lib/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args)
    }
    // Em produção, enviar para Sentry/serviço de log
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }
  }
}
```

**Passo 2:** Substituir todos console.log por logger.log

```bash
# Find/replace global no VSCode
# Buscar: console\.(log|error|warn)
# Substituir: logger.$1
```

**Passo 3:** Adicionar import do logger em todos os arquivos

```typescript
import { logger } from '@/lib/logger'
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 1 (1 semana)

## ⏱️ Estimativa

2 dias
```

---

### Issue #3: 🔴 CRÍTICO: Adicionar validações de CPF/CNPJ em formulários

**Labels:** `bug`, `crítico`, `validação`, `crm`

**Título:**
```
🔴 CRÍTICO: Adicionar validações de CPF/CNPJ em formulários
```

**Corpo:**
```markdown
## 🐛 Problema

Formulários de cadastro de pessoa não validam CPF/CNPJ antes de salvar, permitindo dados inválidos no banco de dados.

## 📍 Localização

- **Módulo:** CRM > Pessoas
- **Arquivo:** Formulários de pessoa (inferido: `src/components/crm/PessoaWizardModal.tsx`)

## 💥 Impacto

- Dados inválidos salvos no banco
- Problemas em integrações externas (Receita Federal, CNPJ.ws, Escavador)
- Duplicatas por CPF/CNPJ digitados errados
- Processos podem ser vinculados a pessoas erradas

## ✅ Solução Sugerida

**Passo 1:** Criar arquivo de validadores

```typescript
// Criar /src/lib/validators.ts

export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return false

  // Rejeitar sequências iguais (111.111.111-11)
  if (/^(\d)\1{10}$/.test(numeros)) return false

  // Validar dígitos verificadores
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[10])) return false

  return true
}

export function validarCNPJ(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return false
  if (/^(\d)\1{13}$/.test(numeros)) return false

  // Validar dígitos verificadores
  let tamanho = numeros.length - 2
  let nums = numeros.substring(0, tamanho)
  const digitos = numeros.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(nums[tamanho - i]) * pos--
    if (pos < 2) pos = 9
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos[0])) return false

  tamanho = tamanho + 1
  nums = numeros.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(nums[tamanho - i]) * pos--
    if (pos < 2) pos = 9
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos[1])) return false

  return true
}

export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
```

**Passo 2:** Aplicar nos formulários

```typescript
import { validarCPF, validarCNPJ, validarEmail } from '@/lib/validators'

// No formulário
const handleSubmit = () => {
  if (tipo === 'fisica' && !validarCPF(cpf)) {
    toast.error('CPF inválido')
    return
  }

  if (tipo === 'juridica' && !validarCNPJ(cnpj)) {
    toast.error('CNPJ inválido')
    return
  }

  if (!validarEmail(email)) {
    toast.error('Email inválido')
    return
  }

  // Continuar com salvamento
}
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 1 (1 semana)

## ⏱️ Estimativa

2 dias
```

---

### Issue #4: 🔴 CRÍTICO: Implementar Realtime no Timesheet (aprovações)

**Labels:** `bug`, `crítico`, `ux`, `realtime`, `financeiro`

**Título:**
```
🔴 CRÍTICO: Implementar Realtime no Timesheet (aprovações)
```

**Corpo:**
```markdown
## 🐛 Problema

Quando gestor aprova/rejeita horas de um colaborador, a lista não atualiza para outros usuários em tempo real. Colaboradores não veem status de aprovação até dar F5.

## 📍 Localização

- **Arquivo:** `src/app/dashboard/financeiro/timesheet/page.tsx`
- **Módulo:** Financeiro > Timesheet

## 💥 Impacto

- Colaboradores não veem status de aprovação atualizado
- Gestor pode aprovar duplicado por não ver que já aprovou
- Confusão sobre o que está pendente
- Experiência ruim para time distribuído

## ✅ Solução Sugerida

```typescript
// Adicionar no useEffect de timesheet
useEffect(() => {
  if (!escritoriosSelecionados.length) return

  const channel = supabase
    .channel('timesheet-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'financeiro_timesheet',
      filter: `escritorio_id=in.(${escritoriosSelecionados.join(',')})`
    }, () => {
      loadTimesheets() // Refetch quando houver mudança
      toast.info('Timesheet atualizado')
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritoriosSelecionados, supabase])
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 1 (1 semana)

## ⏱️ Estimativa

1 dia
```

---

### Issue #5: 🔴 CRÍTICO: Implementar Realtime em Processos e Movimentações

**Labels:** `bug`, `crítico`, `ux`, `realtime`, `processos`

**Título:**
```
🔴 CRÍTICO: Implementar Realtime em Processos e Movimentações
```

**Corpo:**
```markdown
## 🐛 Problema

Lista de processos não atualiza quando há nova movimentação via Escavador ou DataJud. Advogados não veem novas citações/intimações até dar F5.

## 📍 Localização

- **Arquivo:** `src/app/dashboard/processos/page.tsx`
- **Módulo:** Processos

## 💥 Impacto

- **RISCO CRÍTICO:** Advogados podem perder prazos por não ver intimações novas
- Movimentações importantes passam despercebidas
- Necessário F5 constante para verificar atualizações

## ✅ Solução Sugerida

```typescript
// Adicionar subscription em processos
useEffect(() => {
  if (!escritorioId) return

  const channel = supabase
    .channel('processos-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'processos_processos',
      filter: `escritorio_id=eq.${escritorioId}`
    }, () => {
      loadProcessos()
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'processos_movimentacoes'
    }, (payload) => {
      // Notificar usuário de nova movimentação
      toast.info('Nova movimentação processual', {
        description: 'Clique para visualizar',
        action: {
          label: 'Ver',
          onClick: () => {/* abrir processo */}
        }
      })
      loadProcessos()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritorioId, supabase])
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

3 dias
```

---

### Issue #6: 🔴 CRÍTICO: CRM - Lista de pessoas não atualiza após criar

**Labels:** `bug`, `crítico`, `ux`, `crm`

**Título:**
```
🔴 CRÍTICO: CRM - Lista de pessoas não atualiza após criar nova pessoa
```

**Corpo:**
```markdown
## 🐛 Problema

Após salvar nova pessoa no modal wizard, a lista não refetch automaticamente. Usuário precisa dar F5 para ver pessoa criada.

## 📍 Localização

- **Arquivo:** `src/app/dashboard/crm/pessoas/page.tsx:586-591`
- **Módulo:** CRM > Pessoas

## 💥 Impacto

- Usuário não vê pessoa recém-criada
- Dúvida se salvou corretamente
- Precisa F5 manualmente

## ✅ Solução Sugerida

```typescript
// Melhorar tratamento após insert (linha 586)
try {
  const { error } = await supabase
    .from('crm_pessoas')
    .insert(insertData);

  if (error) throw error;

  toast.success('Pessoa cadastrada com sucesso!')
  await fetchPessoas() // Aguardar refresh
  setWizardModalOpen(false)
} catch (error) {
  console.error('Erro ao salvar pessoa:', error);
  toast.error('Erro ao salvar pessoa. Tente novamente.');
}
```

**Opcionalmente:** Adicionar subscription para outros usuários verem em tempo real

```typescript
useEffect(() => {
  const channel = supabase
    .channel('pessoas-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'crm_pessoas',
      filter: `escritorio_id=eq.${escritorioAtivo}`
    }, () => {
      fetchPessoas()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritorioAtivo])
```

## 📊 Prioridade

🔴 **CRÍTICO** - Sprint 1 (1 semana)

## ⏱️ Estimativa

4 horas
```

---

## 🟡 ISSUES MÉDIAS (Sprint 2 - Importante)

### Issue #7: 🟡 MÉDIO: Implementar React Query para cache de queries

**Labels:** `enhancement`, `performance`, `tech-debt`

**Título:**
```
🟡 MÉDIO: Implementar React Query para cache de queries
```

**Corpo:**
```markdown
## 🚀 Melhoria

Atualmente não há sistema de cache. Queries são refeitas toda vez, desperdiçando recursos e causando lentidão.

## 📍 Localização

- **Global:** Todos os hooks que fazem queries Supabase
- **Prioridade:** `useDashboardMetrics`, `useFaturamento`, `useProcessos`, `usePessoas`

## 💥 Impacto

- Queries repetidas desnecessárias
- Dashboard lento
- Consumo desnecessário do banco
- UX ruim (loading frequente)

## ✅ Solução Sugerida

**Passo 1:** Instalar React Query

```bash
npm install @tanstack/react-query
```

**Passo 2:** Configurar provider

```typescript
// src/app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Passo 3:** Migrar hooks

```typescript
// Antes
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  return { metrics, loading }
}

// Depois
import { useQuery } from '@tanstack/react-query'

export function useDashboardMetrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', escritorioAtivo],
    queryFn: loadMetrics,
    staleTime: 5 * 60 * 1000,
  })

  return { metrics, loading: isLoading }
}
```

## 📊 Prioridade

🟡 **MÉDIO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

3 dias
```

---

### Issue #8: 🟡 MÉDIO: Adicionar React.memo em componentes de lista

**Labels:** `enhancement`, `performance`

**Título:**
```
🟡 MÉDIO: Adicionar React.memo em componentes de lista para evitar re-renders
```

**Corpo:**
```markdown
## 🚀 Melhoria

Componentes de lista (cards, itens) re-renderizam desnecessariamente quando parent atualiza, causando lentidão em listas grandes.

## 📍 Localização

**Componentes prioritários:**
- `MetricCard` (dashboard)
- `InsightCard` (dashboard)
- `ProcessoCard` (processos)
- `PessoaCard` (crm)
- Outros componentes de lista

## 💥 Impacto

- Lentidão em listas grandes (100+ itens)
- CPU desperdiçada
- UX ruim em scroll

## ✅ Solução Sugerida

```typescript
// Antes
export default function ProcessoCard({ processo, onClick }: Props) {
  return (
    <div onClick={onClick}>
      {/* JSX */}
    </div>
  )
}

// Depois
import { memo } from 'react'

const ProcessoCard = memo(function ProcessoCard({ processo, onClick }: Props) {
  return (
    <div onClick={onClick}>
      {/* JSX */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison se necessário
  return prevProps.processo.id === nextProps.processo.id
})

export default ProcessoCard
```

## 📊 Prioridade

🟡 **MÉDIO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

2 dias
```

---

### Issue #9: 🟡 MÉDIO: Corrigir dependências de useEffect em hooks

**Labels:** `bug`, `tech-debt`

**Título:**
```
🟡 MÉDIO: Corrigir dependências de useEffect em 15+ hooks
```

**Corpo:**
```markdown
## 🐛 Problema

Múltiplos hooks têm useEffect com dependências incorretas, podendo causar bugs sutis, re-renders desnecessários ou falhas em recarregar dados.

## 📍 Localização

**Hook mais crítico:**
- `src/hooks/usePrazos.ts:114-136` - `loadPrazos` não está nas deps

**Outros hooks afetados:**
- Múltiplos hooks com funções não memoizadas nas deps
- useEffect que depende de funções não estáveis

## 💥 Impacto

- Warnings no console
- Comportamento inconsistente
- Possíveis race conditions
- Dados não recarregam quando deveriam

## ✅ Solução Sugerida

```typescript
// ❌ Problema (usePrazos.ts:114)
useEffect(() => {
  loadPrazos()

  const channel = supabase.channel('prazos-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'eventos_prazos'
    }, () => {
      loadPrazos()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritorioId]) // ⚠️ loadPrazos não está nas deps!

// ✅ Correção
const loadPrazos = useCallback(async () => {
  // ... código existente
}, [escritorioId, supabase])

useEffect(() => {
  loadPrazos()

  const channel = supabase.channel('prazos-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'eventos_prazos'
    }, () => {
      loadPrazos()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [escritorioId, loadPrazos, supabase])
```

## 📊 Prioridade

🟡 **MÉDIO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

2 dias
```

---

### Issue #10: 🟡 MÉDIO: Adicionar índices no banco para buscas (GIN trigram)

**Labels:** `enhancement`, `performance`, `database`

**Título:**
```
🟡 MÉDIO: Adicionar índices GIN para buscas ILIKE em processos e pessoas
```

**Corpo:**
```markdown
## 🚀 Melhoria

Buscas textuais em processos e pessoas estão lentas por falta de índices adequados. Queries ILIKE sem índice fazem full table scan.

## 📍 Localização

- **Processos:** `src/app/dashboard/processos/page.tsx:207-208`
- **CRM:** `src/app/dashboard/crm/pessoas/page.tsx:88-90`

## 💥 Impacto

- Busca lenta em bases com 1000+ registros
- Timeout em bases muito grandes
- CPU/memória alta no Supabase

## ✅ Solução Sugerida

```sql
-- Criar migration: supabase/migrations/YYYYMMDDHHMMSS_add_search_indices.sql

-- Habilitar extensão trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice para busca em processos
CREATE INDEX idx_processos_search_gin
ON processos_processos
USING gin (
  (numero_cnj || ' ' || numero_pasta || ' ' || parte_contraria) gin_trgm_ops
);

-- Índice para busca em pessoas
CREATE INDEX idx_pessoas_search_gin
ON crm_pessoas
USING gin (
  (nome_completo || ' ' || email || ' ' || cpf_cnpj) gin_trgm_ops
);

-- Índice para foreign keys (se não existir)
CREATE INDEX IF NOT EXISTS idx_processos_escritorio
ON processos_processos(escritorio_id);

CREATE INDEX IF NOT EXISTS idx_pessoas_escritorio
ON crm_pessoas(escritorio_id);
```

**Resultado esperado:**
- Buscas 10-50x mais rápidas
- Suporte a bases com 100k+ registros

## 📊 Prioridade

🟡 **MÉDIO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

2 dias (incluindo testes de performance)
```

---

### Issue #11: 🟡 MÉDIO: Adicionar tratamento de erros consistente em queries

**Labels:** `bug`, `tech-debt`

**Título:**
```
🟡 MÉDIO: Adicionar tratamento de erros consistente em todas as queries
```

**Corpo:**
```markdown
## 🐛 Problema

Muitas queries não verificam `if (error)` antes de usar `data`, causando quebras silenciosas da aplicação.

## 📍 Localização

- **Exemplo:** `src/app/dashboard/processos/page.tsx:231-232`
- **Global:** Múltiplos arquivos

## 💥 Impacto

- Aplicação quebra silenciosamente
- Usuário não sabe o que aconteceu
- Difícil debugar problemas

## ✅ Solução Sugerida

**Padrão a seguir em TODAS as queries:**

```typescript
// ❌ Problema
const { data, error } = await supabase.from('processos').select()
setProcessos(data || []) // Não verifica error!

// ✅ Correção
const { data, error } = await supabase.from('processos').select()

if (error) {
  console.error('Erro ao carregar processos:', error)
  toast.error('Erro ao carregar processos. Tente novamente.')
  return // ou throw
}

setProcessos(data || [])
```

**Criar helper para padronizar:**

```typescript
// /src/lib/supabase-helpers.ts
export async function handleSupabaseQuery<T>(
  query: Promise<{ data: T | null; error: PostgrestError | null }>,
  errorMessage: string
): Promise<T | null> {
  const { data, error } = await query

  if (error) {
    console.error(errorMessage, error)
    toast.error(errorMessage)
    return null
  }

  return data
}

// Uso
const processos = await handleSupabaseQuery(
  supabase.from('processos').select(),
  'Erro ao carregar processos'
)

if (!processos) return
```

## 📊 Prioridade

🟡 **MÉDIO** - Sprint 2 (2 semanas)

## ⏱️ Estimativa

2 dias
```

---

## 🟢 ISSUES BAIXAS (Sprint 3 - Limpeza)

### Issue #12: 🟢 BAIXO: Resolver 13 TODOs pendentes no código

**Labels:** `tech-debt`, `documentation`

**Título:**
```
🟢 BAIXO: Resolver 13 TODOs pendentes no código
```

**Corpo:**
```markdown
## 🧹 Tech Debt

Existem 13 TODOs espalhados pelo código que precisam ser implementados ou removidos.

## 📍 Lista Completa

```typescript
// src/hooks/useEscritorioMembros.ts:199
// TODO: Enviar email de convite novamente

// src/components/processos/ProcessoFinanceiro.tsx:306
// TODO: Abrir modal de honorário pré-preenchido

// src/components/processos/ProcessoWizard.tsx:496
// TODO: Aqui chamaria a function create_processo() do Supabase

// src/components/processos/ProcessoResumo.tsx:894, 899
// TODO: Abrir modal de honorário
// TODO: Abrir modal de despesa

// src/app/dashboard/processos/page.tsx:128
// TODO: Se precisar abrir wizard automaticamente via ?novo=true

// src/app/dashboard/consultivo/[id]/page.tsx:828, 832
// TODO: Implementar modal de despesa
// TODO: Implementar modal de honorario

// src/app/dashboard/processos/[id]/page.tsx:137, 157-159
// TODO: buscar nomes dos colaboradores
// TODO: buscar da tabela de documentos
// TODO: buscar da tabela de estratégias
// TODO: buscar da tabela de jurisprudências

// src/app/dashboard/financeiro/layout.tsx:52
// TODO: Reativar quando implementar relatórios

// src/app/dashboard/crm/pessoas/novo/page.tsx:38
// TODO: Implementar salvamento no Supabase

// src/components/onboarding/ProfileForm.tsx:128
// TODO: Implementar upload de avatar

// src/components/migracao/steps/StepValidacao.tsx:140
// TODO: Mostrar erro e permitir retry
```

## ✅ Ação

Para cada TODO:
1. Criar issue específica se for feature importante
2. Implementar se for rápido (<1h)
3. Remover se não for mais relevante

## 📊 Prioridade

🟢 **BAIXO** - Sprint 3 (1 semana)

## ⏱️ Estimativa

2 dias
```

---

### Issue #13: 🟢 BAIXO: Configurar ESLint estrito e remover código não utilizado

**Labels:** `tech-debt`, `tooling`

**Título:**
```
🟢 BAIXO: Configurar ESLint estrito e remover código não utilizado
```

**Corpo:**
```markdown
## 🧹 Tech Debt

Código contém imports não utilizados, variáveis não usadas e outros problemas que ESLint pode detectar.

## ✅ Solução

**Passo 1:** Configurar ESLint estrito

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-console": ["warn", {
      "allow": ["warn", "error"]
    }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**Passo 2:** Executar e corrigir

```bash
npm run lint -- --fix
```

**Passo 3:** Configurar pre-commit hooks

```bash
npm install -D husky lint-staged

npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 📊 Prioridade

🟢 **BAIXO** - Sprint 3 (1 semana)

## ⏱️ Estimativa

1 dia
```

---

### Issue #14: 🟢 BAIXO: Otimizar bundle com code splitting e lazy loading

**Labels:** `enhancement`, `performance`

**Título:**
```
🟢 BAIXO: Otimizar bundle com code splitting e lazy loading
```

**Corpo:**
```markdown
## 🚀 Melhoria

Bundle inicial é grande. Implementar code splitting agressivo e lazy loading de rotas pesadas.

## ✅ Solução

**Lazy loading de componentes pesados:**

```typescript
import dynamic from 'next/dynamic'

// Modais pesados
const ProcessoWizard = dynamic(() => import('@/components/processos/ProcessoWizard'), {
  loading: () => <Loader2 className="animate-spin" />
})

// Gráficos (Recharts)
const FaturamentoChart = dynamic(() => import('@/components/charts/FaturamentoChart'), {
  ssr: false
})

// Módulos completos
const ConsultivoModule = dynamic(() => import('./consultivo/page'), {
  loading: () => <LoadingSkeleton />
})
```

**Code splitting de libs:**

```typescript
// Importar apenas o necessário
import { format } from 'date-fns/format'
import { addDays } from 'date-fns/addDays'

// Em vez de
import * as dateFns from 'date-fns'
```

**Análise de bundle:**

```bash
npm run build
npx @next/bundle-analyzer
```

## 📊 Resultado Esperado

- Bundle inicial 40% menor
- Tempo de carregamento 30% mais rápido
- Melhor Core Web Vitals

## 📊 Prioridade

🟢 **BAIXO** - Sprint 3 (1 semana)

## ⏱️ Estimativa

2 dias
```

---

## 📊 RESUMO DAS ISSUES

### Por Prioridade

| Prioridade | Quantidade | Sprint |
|------------|------------|--------|
| 🔴 Crítico | 6 issues | Sprint 1 (1 semana) |
| 🟡 Médio | 5 issues | Sprint 2 (2 semanas) |
| 🟢 Baixo | 3 issues | Sprint 3 (1 semana) |
| **TOTAL** | **14 issues** | **4 semanas** |

### Por Categoria

| Categoria | Issues |
|-----------|--------|
| Realtime/UX | 4 |
| Segurança | 1 |
| Validação | 1 |
| Performance | 4 |
| Tech Debt | 4 |

### Estimativa Total

- **Sprint 1 (Crítico):** ~6 dias de trabalho
- **Sprint 2 (Médio):** ~13 dias de trabalho
- **Sprint 3 (Baixo):** ~5 dias de trabalho
- **TOTAL:** ~24 dias de trabalho (1 dev) ou ~12 dias (2 devs)

---

## 🎯 ORDEM RECOMENDADA DE CRIAÇÃO

1. Issue #2 - Console.log (Segurança) 🔴
2. Issue #3 - Validações CPF/CNPJ 🔴
3. Issue #1 - Realtime Dashboard 🔴
4. Issue #4 - Realtime Timesheet 🔴
5. Issue #6 - CRM Lista atualização 🔴
6. Issue #5 - Realtime Processos 🔴
7. Issue #7 - React Query 🟡
8. Issue #8 - React.memo 🟡
9. Issue #10 - Índices banco 🟡
10. Issue #9 - useEffect deps 🟡
11. Issue #11 - Tratamento erros 🟡
12. Issue #12 - TODOs 🟢
13. Issue #13 - ESLint 🟢
14. Issue #14 - Bundle 🟢

---

## 📝 NOTA FINAL

Este arquivo contém 14 issues priorizadas do relatório de auditoria completo. Existem outros 73+ problemas menores documentados no relatório principal que podem ser convertidos em issues posteriormente conforme necessário.

Para criar as issues:
1. Copie título e corpo de cada issue acima
2. Cole no GitHub Issues
3. Adicione as labels sugeridas
4. Ajuste milestone/assignee conforme necessário

**Relatório completo:** Ver output do agente de auditoria acima.
