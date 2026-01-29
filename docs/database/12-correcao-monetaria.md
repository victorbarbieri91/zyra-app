# Módulo: Correção Monetária

**Status**: ✅ Completo
**Última atualização**: 2026-01-29
**Tabelas**: 2 tabelas
**Migration**: `20260129100001_indices_economicos_correcao_monetaria.sql`

## Visão Geral

O módulo de Correção Monetária gerencia a atualização automática de valores em processos e o reajuste sob demanda de contratos de honorários, utilizando índices econômicos do Banco Central do Brasil (BCB).

### Funcionalidades

1. **Processos**: Atualização automática mensal do valor da causa
2. **Contratos Fixos**: Reajuste sob demanda (botão) do valor do contrato
3. **Cache de Índices**: Armazenamento local dos índices do BCB
4. **Edge Function**: Sincronização mensal com a API do BCB

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINCRONIZAÇÃO MENSAL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Edge Function (sync-indices-bcb)                              │
│        │                                                        │
│        │  1. Busca índices na API BCB                          │
│        ▼                                                        │
│   ┌─────────────────┐                                          │
│   │  API BCB        │  https://api.bcb.gov.br/dados/serie/...  │
│   │  (INPC, IPCA,   │                                          │
│   │   IGP-M, SELIC) │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            │  2. Salva no cache local                          │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ indices_        │                                          │
│   │ economicos      │  Tabela de cache                         │
│   └────────┬────────┘                                          │
│            │                                                    │
│            │  3. Atualiza processos automaticamente            │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ processos_      │                                          │
│   │ processos       │  valor_atualizado = f(INPC/SELIC)        │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    REAJUSTE DE CONTRATO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Usuário clica "Aplicar Reajuste"                             │
│        │                                                        │
│        │  1. Escolhe índice (INPC padrão)                      │
│        ▼                                                        │
│   aplicar_reajuste_contrato(contrato_id, 'INPC')               │
│        │                                                        │
│        │  2. Calcula correção monetária                        │
│        ▼                                                        │
│   calcular_correcao_monetaria(valor, data_inicio, hoje)        │
│        │                                                        │
│        │  3. Atualiza contrato                                 │
│        ▼                                                        │
│   financeiro_contratos_honorarios.valor_atualizado             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tabelas

### indices_economicos

**Descrição**: Cache local dos índices econômicos do BCB. Armazena valores mensais para cálculo de correção monetária.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | YES | NULL | FK para escritorios (NULL = global) |
| `codigo_bcb` | integer | NO | - | Código da série no BCB |
| `nome` | text | NO | - | Nome do índice (INPC, IPCA, etc) |
| `competencia` | date | NO | - | Mês/ano de referência (1º dia do mês) |
| `valor` | numeric(15,8) | NO | - | Valor do índice |
| `variacao_mensal` | numeric(10,6) | YES | - | Variação % no mês |
| `fonte` | text | YES | 'bcb_api' | Fonte: bcb_api, manual |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Constraint única**: `(codigo_bcb, competencia, escritorio_id)`

**RLS**: Índices globais (escritorio_id IS NULL) são visíveis para todos.

---

### indices_economicos_config

**Descrição**: Configuração dos índices disponíveis no sistema.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `codigo_bcb` | integer | NO | - | Código BCB (UNIQUE) |
| `nome` | text | NO | - | Nome do índice |
| `descricao` | text | YES | - | Descrição do uso |
| `ativo` | boolean | YES | true | Se está ativo |
| `ordem` | integer | YES | 0 | Ordem de exibição |
| `created_at` | timestamptz | YES | now() | Data de criação |

**Dados pré-cadastrados**:

| Código BCB | Nome | Descrição |
|------------|------|-----------|
| 188 | INPC | Trabalhista, previdenciário, cível |
| 433 | IPCA | Índice oficial de inflação |
| 10764 | IPCA-E | Tabelas judiciais |
| 189 | IGP-M | Contratos e aluguéis |
| 11 | SELIC | Processos tributários |

---

## Campos Adicionados

### Em processos_processos

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `indice_correcao` | text | 'INPC' | Índice usado (INPC, IPCA, SELIC, etc) |
| `data_ultima_atualizacao_monetaria` | date | NULL | Data da última atualização |
| `valor_atualizado` | numeric | - | (já existia) Valor corrigido |

**Lógica de índice padrão**:
- Área **Tributário** → SELIC
- Todas as demais → INPC

### Em financeiro_contratos_honorarios

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `valor_atualizado` | numeric(15,2) | NULL | Valor após reajuste |
| `indice_reajuste` | text | 'INPC' | Índice usado no reajuste |
| `data_ultimo_reajuste` | date | NULL | Data do último reajuste |

---

## Funções SQL

### obter_codigo_bcb(nome_indice text)

Retorna o código BCB para um nome de índice.

```sql
SELECT obter_codigo_bcb('INPC');  -- Retorna 188
SELECT obter_codigo_bcb('SELIC'); -- Retorna 11
```

### obter_indice_padrao_processo(area text)

Retorna o índice padrão para uma área do processo.

```sql
SELECT obter_indice_padrao_processo('tributario'); -- Retorna 'SELIC'
SELECT obter_indice_padrao_processo('civel');      -- Retorna 'INPC'
```

### calcular_correcao_monetaria(valor, data_inicial, data_final, indice)

Calcula a correção monetária de um valor entre duas datas.

**Parâmetros**:
- `p_valor_original` (numeric): Valor a corrigir
- `p_data_inicial` (date): Data base
- `p_data_final` (date): Data final
- `p_indice` (text): Nome do índice (default: 'INPC')

**Retorno** (TABLE):
- `valor_corrigido`: Valor após correção
- `fator_correcao`: Fator multiplicador
- `indice_inicial`: Valor do índice na data inicial
- `indice_final`: Valor do índice na data final
- `competencia_inicial`: Mês/ano inicial
- `competencia_final`: Mês/ano final

**Exemplo**:
```sql
SELECT * FROM calcular_correcao_monetaria(
  100000.00,           -- R$ 100.000,00
  '2020-01-15',        -- Data inicial
  '2024-01-15',        -- Data final
  'INPC'               -- Índice
);

-- Resultado exemplo:
-- valor_corrigido: 125430.00
-- fator_correcao: 1.25430000
-- indice_inicial: 5234.56
-- indice_final: 6567.89
```

### atualizar_valor_processo(processo_id uuid)

Atualiza o valor corrigido de um processo específico.

**Retorno** (jsonb):
```json
{
  "success": true,
  "processo_id": "...",
  "valor_original": 100000,
  "valor_atualizado": 125430,
  "fator_correcao": 1.2543,
  "indice": "INPC",
  "data_inicial": "2020-01-15",
  "data_final": "2024-01-15"
}
```

### atualizar_valores_processos_escritorio(escritorio_id uuid)

Atualiza todos os processos ativos de um escritório.

**Retorno** (jsonb):
```json
{
  "success": true,
  "escritorio_id": "...",
  "total_processos": 150,
  "atualizados": 145,
  "erros": 5,
  "data_execucao": "2024-01-15T10:30:00Z"
}
```

### aplicar_reajuste_contrato(contrato_id uuid, indice text)

Aplica reajuste em contrato de honorários (sob demanda).

**Parâmetros**:
- `p_contrato_id` (uuid): ID do contrato
- `p_indice` (text): Índice a usar (default: 'INPC')

**Retorno** (jsonb):
```json
{
  "success": true,
  "contrato_id": "...",
  "valor_anterior": 5000,
  "valor_atualizado": 5650,
  "fator_correcao": 1.13,
  "indice": "INPC",
  "data_base": "2023-01-01",
  "data_reajuste": "2024-01-15"
}
```

### importar_indice_bcb(codigo, nome, competencia, valor, variacao)

Importa ou atualiza índice do BCB (usada pela Edge Function).

---

## Views

### v_processos_correcao_monetaria

Processos com informações de correção monetária.

**Colunas**:
- Dados do processo (id, numero_cnj, etc)
- `valor_causa`: Valor original
- `valor_atualizado`: Valor corrigido
- `variacao_percentual`: % de variação
- `indice_correcao`: Índice usado
- `data_ultima_atualizacao_monetaria`
- `cliente_nome`

### v_contratos_reajuste

Contratos fixos com informações de reajuste.

**Colunas**:
- Dados do contrato
- `valor_original`: Valor inicial
- `valor_atualizado`: Valor reajustado
- `variacao_percentual`: % de variação
- `valor_vigente`: COALESCE(atualizado, original)
- `indice_reajuste`
- `data_ultimo_reajuste`

---

## Edge Function: sync-indices-bcb

### Descrição

Sincroniza índices econômicos do BCB para o cache local.

### URL

```
POST /functions/v1/sync-indices-bcb
```

### Parâmetros (body JSON, opcional)

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `atualizar_processos` | boolean | true | Se deve atualizar processos após sync |
| `escritorio_id` | uuid | null | Atualizar apenas este escritório |

### Resposta

```json
{
  "success": true,
  "indices": [
    {
      "codigo": 188,
      "nome": "INPC",
      "registros_importados": 24,
      "ultimo_mes": "01/12/2024"
    }
  ],
  "total_importados": 120,
  "processos_atualizados": 450,
  "duracao_ms": 3500,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Agendamento Recomendado

Executar via **pg_cron** ou serviço externo:

```sql
-- Exemplo com pg_cron (dia 15 de cada mês, às 3h)
SELECT cron.schedule(
  'sync-indices-bcb',
  '0 3 15 * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJETO.supabase.co/functions/v1/sync-indices-bcb',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Uso no Frontend

### Visualizar Valor Atualizado do Processo

```typescript
// Em ProcessoDetail.tsx ou similar
const { data: processo } = await supabase
  .from('processos_processos')
  .select('valor_causa, valor_atualizado, indice_correcao, data_ultima_atualizacao_monetaria')
  .eq('id', processoId)
  .single()

// Exibir
<div>
  <p>Valor da Causa: {formatCurrency(processo.valor_causa)}</p>
  <p>Valor Atualizado: {formatCurrency(processo.valor_atualizado)}</p>
  <p>Índice: {processo.indice_correcao}</p>
  <p>Atualizado em: {formatDate(processo.data_ultima_atualizacao_monetaria)}</p>
</div>
```

### Mudar Índice do Processo

```typescript
const alterarIndice = async (processoId: string, novoIndice: string) => {
  // Atualizar índice
  await supabase
    .from('processos_processos')
    .update({ indice_correcao: novoIndice })
    .eq('id', processoId)

  // Recalcular valor
  const { data } = await supabase.rpc('atualizar_valor_processo', {
    p_processo_id: processoId
  })

  return data
}
```

### Aplicar Reajuste em Contrato

```typescript
const aplicarReajuste = async (contratoId: string, indice: string = 'INPC') => {
  const { data, error } = await supabase.rpc('aplicar_reajuste_contrato', {
    p_contrato_id: contratoId,
    p_indice: indice
  })

  if (error) throw error

  if (data.success) {
    toast.success(`Reajuste aplicado! Novo valor: ${formatCurrency(data.valor_atualizado)}`)
  } else {
    toast.error(data.error)
  }

  return data
}
```

---

## Fórmula de Cálculo

A correção monetária é calculada pela fórmula:

```
Valor Corrigido = Valor Original × (Índice Final / Índice Inicial)
```

Onde:
- **Índice Inicial**: Valor do índice no mês da data base
- **Índice Final**: Valor do índice no mês atual (ou data final)

**Exemplo prático**:
- Valor Original: R$ 100.000,00
- Data Base: Janeiro/2020 (INPC = 5234.56)
- Data Final: Janeiro/2024 (INPC = 6567.89)
- Fator: 6567.89 / 5234.56 = 1.2548
- Valor Corrigido: 100.000 × 1.2548 = R$ 125.480,00

---

## Histórico de Alterações

| Data | Descrição | Migration |
|------|-----------|-----------|
| 2026-01-29 | Criação do módulo | 20260129100001_indices_economicos_correcao_monetaria.sql |
