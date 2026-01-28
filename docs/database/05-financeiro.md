# Módulo: Financeiro

**Status**: ✅ Completo
**Última atualização**: 2026-01-28 (Reestruturação de cartões de crédito)
**Tabelas**: 30 tabelas (incluindo cartões de crédito simplificados e mapeamento de atos)
**View de Referência**: `v_financeiro_enums` - consulte para ENUMs atualizados

## Visão Geral

O módulo Financeiro é o maior e mais complexo do sistema, gerenciando:

- **Contratos de Honorários**: Diferentes tipos de cobrança (fixo, hora, êxito, por ato)
- **Honorários**: Cobrança individual de serviços
- **Faturamento**: Faturas consolidadas com múltiplos itens
- **Timesheet**: Registro de horas trabalhadas
- **Contas Bancárias**: Gestão de contas e conciliação
- **Cartões de Crédito**: Controle de despesas e faturas de cartão
- **Despesas**: Despesas operacionais e reembolsáveis
- **Metas e Provisões**: Planejamento financeiro

## Diagrama de Relacionamentos

```
                                    crm_pessoas (cliente)
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
    financeiro_contratos_honorarios  financeiro_honorarios  financeiro_faturamento_faturas
           │                              │                       │
           ├── _config                    ├── _parcelas           ├── _itens
           ├── _formas                    ├── _comissoes          └── _cobrancas
           ├── _atos                      └── _timeline
           └── _valores_cargo
                    │
                    ▼
    financeiro_atos_processuais_tipos


                    processos_processos
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    financeiro_    financeiro_      financeiro_
    timesheet      despesas         alertas_cobranca


         financeiro_contas_bancarias
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    _lancamentos  _conciliacoes  _importacoes
        │
        ▼
    _pagamentos


              cartoes_credito
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    _faturas   _lancamentos  _importacoes
```

---

## 1. CONTRATOS DE HONORÁRIOS

### financeiro_contratos_honorarios

**Descrição**: Contratos de honorários celebrados com clientes. Define as regras de cobrança para um relacionamento de longo prazo.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK cliente_id` → `crm_pessoas.id`
- `→ financeiro_contratos_honorarios_config` via `contrato_id`
- `→ financeiro_contratos_formas` via `contrato_id`
- `→ financeiro_contratos_atos` via `contrato_id`
- `→ financeiro_contratos_valores_cargo` via `contrato_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cliente_id` | uuid | NO | - | FK para crm_pessoas |
| `numero_contrato` | text | NO | - | Número único do contrato |
| `tipo_contrato` | text | NO | - | Tipo: `contencioso`, `consultivo`, `trabalhista`, etc |
| `forma_cobranca` | text | YES | 'fixo' | Forma principal: `fixo`, `hora`, `exito`, `por_ato`, `misto` |
| `data_inicio` | date | NO | - | Data de início do contrato |
| `data_fim` | date | YES | - | Data de término (null = indeterminado) |
| `valor_total` | numeric | YES | - | Valor total (para contratos fixos) |
| `descricao` | text | YES | - | Descrição do escopo |
| `clausulas` | text | YES | - | Cláusulas especiais |
| `ativo` | boolean | YES | true | Se o contrato está ativo |
| `horas_faturaveis` | boolean | YES | true | Para contratos `misto`: define se horas são cobráveis. Usado pelo trigger de timesheet para calcular `faturavel` automaticamente |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Tipos de Contrato** (CHECK constraint):
- `processo` - Contrato para processo judicial
- `consultoria` - Consultoria jurídica
- `avulso` - Serviço avulso
- `misto` - Combinação de tipos
- `fixo` - Contrato fixo
- `hora` - Por hora trabalhada
- `exito` - Baseado em êxito
- `recorrente` - Contrato recorrente/mensal

**Formas de Cobrança** (CHECK constraint):
- `fixo` - Valor fixo
- `por_hora` - Por hora trabalhada
- `por_etapa` - Por etapa do processo
- `misto` - Combinação de formas
- `por_pasta` - Por pasta/processo
- `por_ato` - Por ato processual
- `por_cargo` - Valor por cargo/hora do profissional

---

### financeiro_contratos_honorarios_config

**Descrição**: Configurações detalhadas do contrato conforme a forma de cobrança escolhida.

**Relacionamentos**:
- `FK contrato_id` → `financeiro_contratos_honorarios.id`
- `FK escritorio_id` → `escritorios.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `contrato_id` | uuid | NO | - | FK para contrato |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo_config` | text | NO | - | Tipo: `hora`, `fixo`, `processo` |
| `valor_hora` | numeric | YES | - | Valor/hora (para tipo hora) |
| `valor_fixo` | numeric | YES | - | Valor fixo mensal (para tipo fixo) |
| `valor_por_processo` | numeric | YES | - | Valor por processo |
| `dia_cobranca` | integer | YES | - | Dia do mês para cobrança |
| `descricao` | text | YES | - | Descrição adicional |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_contratos_formas

**Descrição**: Permite contratos com múltiplas formas de cobrança (misto).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `contrato_id` | uuid | NO | - | FK para contrato |
| `forma_cobranca` | text | NO | - | Forma de cobrança |
| `ativo` | boolean | YES | true | Se está ativo |
| `ordem` | integer | YES | 0 | Ordem de exibição |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### financeiro_contratos_atos

**Descrição**: Define valores para atos processuais específicos em contratos por ato.

**Relacionamentos**:
- `FK contrato_id` → `financeiro_contratos_honorarios.id`
- `FK ato_tipo_id` → `financeiro_atos_processuais_tipos.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `contrato_id` | uuid | NO | - | FK para contrato |
| `ato_tipo_id` | uuid | NO | - | FK para tipo de ato |
| `percentual_valor_causa` | numeric | YES | - | % sobre valor da causa |
| `valor_fixo` | numeric | YES | - | Valor fixo para o ato |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### financeiro_contratos_valores_cargo

**Descrição**: Valores de hora negociados por cargo específico no contrato.

**Relacionamentos**:
- `FK contrato_id` → `financeiro_contratos_honorarios.id`
- `FK cargo_id` → `escritorios_cargos.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `contrato_id` | uuid | NO | - | FK para contrato |
| `cargo_id` | uuid | NO | - | FK para cargo |
| `valor_hora_negociado` | numeric | NO | - | Valor/hora específico |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### financeiro_atos_processuais_tipos

**Descrição**: Catálogo de tipos de atos processuais para cobrança por ato.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `area_juridica` | text | NO | - | Área: civil, trabalhista, etc |
| `codigo` | text | NO | - | Código interno |
| `nome` | text | NO | - | Nome do ato |
| `descricao` | text | YES | - | Descrição detalhada |
| `percentual_padrao` | numeric | YES | - | % padrão sobre valor causa |
| `valor_fixo_padrao` | numeric | YES | - | Valor fixo padrão |
| `ordem` | integer | YES | 0 | Ordem de exibição |
| `ativo` | boolean | YES | true | Se está ativo |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Exemplos de Atos**:
- Petição Inicial
- Contestação
- Audiência de Conciliação
- Audiência de Instrução
- Recurso de Apelação
- Sentença

---

## 2. HONORÁRIOS

### financeiro_honorarios

**Descrição**: Honorários individuais a serem cobrados. Pode estar vinculado a processo, consulta, ou ser avulso.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK cliente_id` → `crm_pessoas.id`
- `FK processo_id` → `processos_processos.id` (opcional)
- `FK consulta_id` → `consultivo_consultas.id` (opcional)
- `FK responsavel_id` → `profiles.id`
- `FK fatura_id` → `financeiro_faturamento_faturas.id` (quando faturado)
- `→ financeiro_honorarios_parcelas` via `honorario_id`
- `→ financeiro_honorarios_comissoes` via `honorario_id`
- `→ financeiro_honorarios_timeline` via `honorario_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cliente_id` | uuid | NO | - | FK para cliente |
| `processo_id` | uuid | YES | - | FK para processo (opcional) |
| `consulta_id` | uuid | YES | - | FK para consulta (opcional) |
| `fatura_id` | uuid | YES | - | FK para fatura (quando faturado) |
| `numero_interno` | text | NO | - | Número sequencial interno |
| `tipo_honorario` | text | NO | - | Tipo: `fixo`, `hora`, `exito`, `misto` |
| `descricao` | text | NO | - | Descrição do serviço |
| `valor_total` | numeric | NO | - | Valor total |
| `parcelado` | boolean | YES | false | Se é parcelado |
| `numero_parcelas` | integer | YES | 1 | Número de parcelas |
| `responsavel_id` | uuid | NO | - | Advogado responsável |
| `status` | text | NO | 'rascunho' | Status do honorário |
| `etapas_valores` | jsonb | YES | - | Valores por etapa (êxito) |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Status possíveis** (CHECK constraint):
- `rascunho` - Em elaboração
- `aprovado` - Aprovado, aguardando faturamento/pagamento
- `faturado` - Incluído em fatura
- `cancelado` - Cancelado

**Estrutura do JSONB `etapas_valores`** (para êxito):
```json
{
  "acordo": { "percentual": 20, "valor_estimado": 10000 },
  "sentenca": { "percentual": 25, "valor_estimado": 12500 },
  "recurso": { "percentual": 30, "valor_estimado": 15000 }
}
```

---

### financeiro_honorarios_parcelas

**Descrição**: Parcelas de um honorário quando parcelado.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `honorario_id` | uuid | NO | - | FK para honorário |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `numero_parcela` | integer | NO | - | Número da parcela (1, 2, 3...) |
| `valor` | numeric | NO | - | Valor da parcela |
| `data_vencimento` | date | NO | - | Data de vencimento |
| `data_pagamento` | date | YES | - | Data efetiva do pagamento |
| `valor_pago` | numeric | YES | - | Valor efetivamente pago |
| `status` | text | NO | 'pendente' | Status: `pendente`, `pago`, `atrasado`, `cancelado` |
| `forma_pagamento` | text | YES | - | PIX, boleto, transferência, etc |
| `dias_atraso` | integer | YES | 0 | Dias em atraso |
| `juros_aplicados` | numeric | YES | 0 | Valor de juros |
| `observacoes` | text | YES | - | Observações |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_honorarios_comissoes

**Descrição**: Comissões sobre honorários para advogados.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `honorario_id` | uuid | NO | - | FK para honorário |
| `user_id` | uuid | NO | - | FK para advogado que recebe |
| `pagamento_id` | uuid | YES | - | FK para pagamento (quando pago) |
| `valor_base` | numeric | NO | - | Valor base para cálculo |
| `percentual` | numeric | NO | - | Percentual de comissão |
| `valor_comissao` | numeric | NO | - | Valor calculado da comissão |
| `status` | text | NO | 'pendente' | Status: `pendente`, `pago` |
| `data_pagamento` | date | YES | - | Data do pagamento |
| `observacoes` | text | YES | - | Observações |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### financeiro_honorarios_timeline

**Descrição**: Histórico de eventos do honorário para auditoria.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `honorario_id` | uuid | NO | - | FK para honorário |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `evento` | text | NO | - | Tipo de evento |
| `dados` | jsonb | YES | - | Dados do evento |
| `user_id` | uuid | YES | - | Quem realizou |
| `created_at` | timestamptz | YES | now() | Data do evento |

**Eventos possíveis**:
- `criado` - Honorário criado
- `editado` - Dados alterados
- `parcela_paga` - Pagamento de parcela
- `status_alterado` - Mudança de status
- `faturado` - Incluído em fatura
- `cobranca_enviada` - Email de cobrança

---

## 3. FATURAMENTO

### financeiro_faturamento_faturas

**Descrição**: Faturas consolidadas enviadas aos clientes.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK cliente_id` → `crm_pessoas.id`
- `FK cancelada_por` → `profiles.id`
- `→ financeiro_faturamento_itens` via `fatura_id`
- `→ financeiro_faturamento_cobrancas` via `fatura_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `numero_fatura` | text | NO | - | Número sequencial |
| `cliente_id` | uuid | NO | - | FK para cliente |
| `data_emissao` | date | NO | CURRENT_DATE | Data de emissão |
| `data_vencimento` | date | NO | - | Data de vencimento |
| `valor_total` | numeric | NO | 0 | Valor total da fatura |
| `descricao` | text | YES | - | Descrição geral |
| `observacoes` | text | YES | - | Observações internas |
| `forma_pagamento_preferencial` | text | YES | - | PIX, boleto, etc |
| `parcelado` | boolean | YES | false | Se é parcelado |
| `numero_parcelas` | integer | YES | - | Número de parcelas |
| `pdf_url` | text | YES | - | URL do PDF gerado |
| `status` | text | NO | 'rascunho' | Status da fatura |
| `enviada_em` | timestamptz | YES | - | Quando foi enviada |
| `paga_em` | timestamptz | YES | - | Quando foi paga |
| `cancelada_em` | timestamptz | YES | - | Quando foi cancelada |
| `cancelada_por` | uuid | YES | - | Quem cancelou |
| `motivo_cancelamento` | text | YES | - | Motivo do cancelamento |
| `gerada_automaticamente` | boolean | YES | false | Se foi gerada por agendamento |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Status possíveis** (CHECK constraint):
- `rascunho` - Em elaboração
- `emitida` - Emitida, aguardando envio
- `enviada` - Enviada ao cliente
- `paga` - Totalmente paga
- `atrasada` - Pagamento atrasado
- `cancelada` - Cancelada

---

### financeiro_faturamento_itens

**Descrição**: Itens individuais de uma fatura (horas, honorários, despesas).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `fatura_id` | uuid | NO | - | FK para fatura |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo_item` | text | NO | - | Tipo: `timesheet`, `honorario`, `despesa`, `avulso` |
| `descricao` | text | NO | - | Descrição do item |
| `processo_id` | uuid | YES | - | FK para processo (opcional) |
| `consulta_id` | uuid | YES | - | FK para consulta (opcional) |
| `quantidade` | numeric | YES | - | Quantidade (horas, unidades) |
| `valor_unitario` | numeric | YES | - | Valor unitário |
| `valor_total` | numeric | NO | - | Valor total do item |
| `timesheet_ids` | jsonb | YES | - | IDs dos timesheets incluídos |
| `referencia_id` | uuid | YES | - | ID do item original (honorario, despesa) |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### financeiro_faturamento_cobrancas

**Descrição**: Registro de cobranças/lembretes enviados.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo_cobranca` | text | NO | - | Tipo: `lembrete`, `cobranca`, `vencimento` |
| `parcela_id` | uuid | YES | - | FK para parcela (se aplicável) |
| `fatura_id` | uuid | YES | - | FK para fatura (se aplicável) |
| `destinatario_email` | text | NO | - | Email do destinatário |
| `assunto` | text | NO | - | Assunto do email |
| `mensagem` | text | YES | - | Corpo do email |
| `enviado_em` | timestamptz | YES | now() | Data de envio |

---

### financeiro_faturamento_agendamentos

**Descrição**: Agendamentos automáticos de faturamento por cliente.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cliente_id` | uuid | NO | - | FK para cliente |
| `ativo` | boolean | YES | true | Se está ativo |
| `dia_faturamento` | integer | NO | - | Dia do mês para gerar fatura |
| `dia_vencimento` | integer | NO | - | Dia do mês para vencimento |
| `incluir_timesheet` | boolean | YES | true | Incluir horas trabalhadas |
| `incluir_honorarios` | boolean | YES | true | Incluir honorários pendentes |
| `incluir_despesas` | boolean | YES | false | Incluir despesas reembolsáveis |
| `envio_automatico_email` | boolean | YES | true | Enviar por email automaticamente |
| `observacoes_padrao` | text | YES | - | Observações padrão na fatura |
| `proxima_execucao` | date | YES | - | Data da próxima execução |
| `ultima_execucao` | date | YES | - | Data da última execução |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

## 4. TIMESHEET

### financeiro_timesheet

**Descrição**: Registro de horas trabalhadas pelos advogados.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK user_id` → `profiles.id`
- `FK processo_id` → `processos_processos.id` (opcional)
- `FK consulta_id` → `consultivo_consultas.id` (opcional)
- `FK tarefa_id` → `agenda_tarefas.id` (opcional)
- `FK fatura_id` → `financeiro_faturamento_faturas.id` (quando faturado)
- `FK aprovado_por` → `profiles.id`
- `FK reprovado_por` → `profiles.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `user_id` | uuid | NO | - | FK para advogado |
| `processo_id` | uuid | YES | - | FK para processo |
| `consulta_id` | uuid | YES | - | FK para consulta |
| `tarefa_id` | uuid | YES | - | FK para tarefa |
| `data_trabalho` | date | NO | - | Data do trabalho |
| `hora_inicio` | timestamptz | YES | - | Início (do timer) |
| `hora_fim` | timestamptz | YES | - | Fim (do timer) |
| `horas` | numeric | NO | - | Total de horas |
| `atividade` | text | NO | - | Descrição da atividade |
| `origem` | text | YES | 'manual' | Origem: `manual`, `timer` |
| `faturavel` | boolean | YES | true | Se pode ser faturado (calculado automaticamente pelo trigger) |
| `faturavel_auto` | boolean | YES | NULL | Se `faturavel` foi calculado automaticamente (true) ou definido manualmente (false) |
| `faturado` | boolean | YES | false | Se já foi faturado |
| `fatura_id` | uuid | YES | - | FK para fatura |
| `faturado_em` | timestamptz | YES | - | Data do faturamento |
| `aprovado` | boolean | YES | false | Se foi aprovado |
| `aprovado_por` | uuid | YES | - | Quem aprovou |
| `aprovado_em` | timestamptz | YES | - | Data da aprovação |
| `reprovado` | boolean | YES | false | Se foi reprovado |
| `reprovado_por` | uuid | YES | - | Quem reprovou |
| `reprovado_em` | timestamptz | YES | - | Data da reprovação |
| `justificativa_reprovacao` | text | YES | - | Motivo da reprovação |
| `editado` | boolean | YES | false | Se foi editado após criação |
| `editado_em` | timestamptz | YES | - | Data da edição |
| `editado_por` | uuid | YES | - | Quem editou |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

## 5. CONTAS BANCÁRIAS

### financeiro_contas_bancarias

**Descrição**: Contas bancárias do escritório.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `banco` | text | NO | - | Nome do banco |
| `agencia` | text | NO | - | Número da agência |
| `numero_conta` | text | NO | - | Número da conta |
| `tipo_conta` | text | NO | - | Tipo: `corrente`, `poupanca`, `digital` |
| `titular` | text | NO | - | Nome do titular |
| `saldo_inicial` | numeric | NO | 0 | Saldo inicial |
| `saldo_atual` | numeric | NO | 0 | **DEPRECATED** - Use `calcular_saldo_conta(id)` |
| `conta_principal` | boolean | YES | false | Se é a conta principal |
| `data_abertura` | date | YES | - | Data de abertura |
| `ativa` | boolean | YES | true | Se está ativa |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Função para cálculo de saldo**:
```sql
-- Calcula saldo dinamicamente: saldo_inicial + receitas_pagas - despesas_pagas + transf_entrada - transf_saida
SELECT calcular_saldo_conta(conta_id);
```

---

### financeiro_transferencias

**Descrição**: Transferências internas entre contas bancárias do escritório. Cada registro representa uma transferência única. Na view `v_extrato_financeiro`, cada transferência aparece como dois registros: uma saída na conta de origem e uma entrada na conta de destino.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `conta_origem_id` | uuid | NO | - | FK para conta de origem |
| `conta_destino_id` | uuid | NO | - | FK para conta de destino |
| `valor` | numeric(15,2) | NO | - | Valor da transferência (deve ser > 0) |
| `data_transferencia` | date | NO | CURRENT_DATE | Data da transferência |
| `descricao` | text | YES | - | Descrição opcional |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `created_by` | uuid | YES | - | FK para profiles |

**Constraints**:
- `transferencia_contas_diferentes`: conta_origem_id != conta_destino_id

---

### financeiro_extrato_bancario

**Descrição**: Tabela para **consolidação bancária** APENAS. Usada para importar extratos bancários (OFX/CSV) e comparar com os lançamentos do sistema. **NÃO** é usada para controle diário - o controle diário é feito via `financeiro_receitas`, `financeiro_despesas` e `financeiro_transferencias`.

**⚠️ IMPORTANTE**: Esta tabela foi renomeada de `financeiro_contas_lancamentos`. O nome antigo era confuso pois sugeria que era usada para lançamentos diários, quando na verdade é apenas para consolidação com extrato bancário.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `conta_bancaria_id` | uuid | NO | - | FK para conta bancária |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo` | text | NO | - | Tipo: `entrada`, `saida`, `transferencia` |
| `valor` | numeric | NO | - | Valor do lançamento |
| `data_lancamento` | date | NO | CURRENT_DATE | Data do lançamento |
| `descricao` | text | NO | - | Descrição |
| `categoria` | text | YES | - | Categoria do lançamento |
| `origem_tipo` | text | NO | - | Origem: `pagamento`, `despesa`, `transferencia`, `manual` |
| `origem_id` | uuid | YES | - | ID do registro de origem |
| `transferencia_id` | uuid | YES | - | ID da transferência (para transferências) |
| `saldo_apos_lancamento` | numeric | NO | - | Saldo após este lançamento |
| `comprovante_url` | text | YES | - | URL do comprovante |
| `conciliado` | boolean | YES | false | Se foi conciliado |
| `conciliado_em` | timestamptz | YES | - | Data da conciliação |
| `observacoes` | text | YES | - | Observações |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_contas_conciliacoes

**Descrição**: Registros de conciliação bancária.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `conta_bancaria_id` | uuid | NO | - | FK para conta bancária |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `periodo_inicio` | date | NO | - | Início do período |
| `periodo_fim` | date | NO | - | Fim do período |
| `saldo_inicial` | numeric | NO | - | Saldo no início |
| `saldo_final` | numeric | NO | - | Saldo no final |
| `total_entradas` | numeric | YES | 0 | Total de entradas |
| `total_saidas` | numeric | YES | 0 | Total de saídas |
| `divergencias` | integer | YES | 0 | Número de divergências |
| `observacoes` | text | YES | - | Observações |
| `realizada_em` | timestamptz | YES | now() | Data da conciliação |
| `realizada_por` | uuid | YES | - | Quem realizou |

---

### financeiro_contas_importacoes

**Descrição**: Lançamentos importados de extratos bancários (OFX/CSV).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `conta_bancaria_id` | uuid | NO | - | FK para conta bancária |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `data_lancamento` | date | NO | - | Data do lançamento |
| `tipo` | text | NO | - | Tipo: credito, debito |
| `valor` | numeric | NO | - | Valor |
| `descricao` | text | NO | - | Descrição do extrato |
| `documento` | text | YES | - | Número do documento |
| `conciliado` | boolean | YES | false | Se foi conciliado |
| `conciliado_com_id` | uuid | YES | - | ID do lançamento conciliado |
| `importado_em` | timestamptz | YES | now() | Data da importação |

---

### financeiro_contas_pagamentos

**Descrição**: Registro centralizado de pagamentos recebidos/efetuados.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo_pagamento` | text | NO | - | Tipo: `recebimento`, `pagamento` |
| `valor` | numeric | NO | - | Valor |
| `data_pagamento` | date | NO | CURRENT_DATE | Data do pagamento |
| `forma_pagamento` | text | NO | - | PIX, boleto, transferência, etc |
| `conta_bancaria_id` | uuid | YES | - | FK para conta bancária |
| `honorario_parcela_id` | uuid | YES | - | FK para parcela de honorário |
| `despesa_id` | uuid | YES | - | FK para despesa |
| `fatura_id` | uuid | YES | - | FK para fatura |
| `comprovante_url` | text | YES | - | URL do comprovante |
| `observacoes` | text | YES | - | Observações |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

### v_extrato_financeiro (VIEW)

**Descrição**: View unificada do extrato financeiro do escritório. Consolida receitas, faturas, despesas e transferências em uma única consulta, permitindo visualização do fluxo de caixa completo.

**Tipos de movimento**:
- `receita` - Receitas avulsas (sem cliente vinculado)
- `despesa` - Despesas operacionais
- `transferencia_saida` - Saída de transferência entre contas
- `transferencia_entrada` - Entrada de transferência entre contas
- Faturas aparecem como `receita` com `origem = 'fatura'`

**Colunas retornadas**:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | ID do registro original |
| `escritorio_id` | uuid | FK para escritorios |
| `tipo_movimento` | text | `receita`, `despesa`, `transferencia_saida`, `transferencia_entrada` |
| `status` | text | `efetivado`, `pendente`, `vencido`, `parcial`, `cancelado` |
| `origem` | text | `honorario`, `fatura`, `despesa`, `cartao_credito`, `transferencia` |
| `categoria` | text | Categoria do lançamento |
| `descricao` | text | Descrição do lançamento |
| `valor` | numeric | Valor do lançamento |
| `valor_pago` | numeric | Valor já pago (para pagamentos parciais) |
| `data_referencia` | date | Data de referência para ordenação |
| `data_vencimento` | date | Data de vencimento |
| `data_efetivacao` | date | Data em que foi efetivado |
| `entidade` | text | Cliente, fornecedor ou conta (para transferências) |
| `conta_bancaria_id` | uuid | FK para conta bancária vinculada |
| `conta_bancaria_nome` | text | Nome da conta (Banco - Número) |
| `origem_id` | uuid | ID na tabela de origem |
| `processo_id` | uuid | FK para processo (se aplicável) |
| `cliente_id` | uuid | FK para cliente (se aplicável) |

**Exemplo de uso**:
```sql
-- Listar extrato completo do mês atual
SELECT * FROM v_extrato_financeiro
WHERE escritorio_id = 'xxx'
  AND data_referencia >= date_trunc('month', CURRENT_DATE)
ORDER BY data_referencia DESC;

-- Filtrar apenas transferências
SELECT * FROM v_extrato_financeiro
WHERE tipo_movimento IN ('transferencia_saida', 'transferencia_entrada');
```

---

## 6. DESPESAS

### financeiro_despesas

**Descrição**: Despesas do escritório (operacionais e reembolsáveis).

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK processo_id` → `processos_processos.id` (opcional)
- `FK consulta_id` → `consultivo_consultas.id` (opcional)
- `FK conta_bancaria_id` → `financeiro_contas_bancarias.id`
- `FK fatura_id` → `financeiro_faturamento_faturas.id` (quando faturado)

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `categoria` | text | NO | - | Categoria da despesa |
| `descricao` | text | NO | - | Descrição |
| `valor` | numeric | NO | - | Valor |
| `data_vencimento` | date | NO | - | Data de vencimento |
| `data_pagamento` | date | YES | - | Data efetiva do pagamento |
| `status` | text | NO | 'pendente' | Status: `pendente`, `pago`, `cancelado` |
| `forma_pagamento` | text | YES | - | Forma de pagamento |
| `fornecedor` | text | YES | - | Nome do fornecedor |
| `documento_fiscal` | text | YES | - | Número da NF |
| `conta_bancaria_id` | uuid | YES | - | Conta de pagamento |
| `reembolsavel` | boolean | YES | false | Se é reembolsável |
| `reembolso_status` | text | YES | - | Status: `pendente`, `faturado`, `pago` |
| `honorario_reembolso_id` | uuid | YES | - | Honorário de reembolso |
| `processo_id` | uuid | YES | - | Processo relacionado |
| `consulta_id` | uuid | YES | - | Consulta relacionada |
| `faturado` | boolean | YES | false | Se foi faturado ao cliente |
| `fatura_id` | uuid | YES | - | FK para fatura |
| `comprovante_url` | text | YES | - | URL do comprovante |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Categorias** (CHECK constraint):
- `custas` - Custas processuais
- `fornecedor` - Pagamento a fornecedores
- `folha` - Folha de pagamento/salários
- `impostos` - Impostos e tributos
- `aluguel` - Aluguel do escritório
- `marketing` - Marketing e publicidade
- `capacitacao` - Treinamentos e cursos
- `material` - Material de escritório
- `tecnologia` - Software e hardware
- `viagem` - Viagens e deslocamentos
- `alimentacao` - Refeições e alimentação
- `combustivel` - Combustível
- `assinatura` - Assinaturas e mensalidades
- `cartao_credito` - Fatura de cartão de crédito
- `outros` - Outros

---

## 7. CARTÕES DE CRÉDITO

> **Reestruturação**: Em 2026-01-28, as tabelas `cartoes_credito_despesas` e `cartoes_credito_parcelas` foram unificadas em `cartoes_credito_lancamentos`, simplificando o modelo de 5 para 4 tabelas e adicionando suporte para 3 tipos de transações.

### cartoes_credito

**Descrição**: Cartões de crédito corporativos cadastrados.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `nome` | text | NO | - | Nome identificador do cartão |
| `banco` | text | YES | - | Banco emissor |
| `bandeira` | text | YES | - | Visa, Master, etc |
| `ultimos_digitos` | text | YES | - | Últimos 4 dígitos |
| `dia_vencimento` | integer | NO | - | Dia de vencimento da fatura |
| `dias_antes_fechamento` | integer | NO | 7 | Dias antes do vencimento para fechamento |
| `limite_total` | numeric | YES | - | Limite do cartão |
| `cor` | text | YES | '#3B82F6' | Cor para UI |
| `ativo` | boolean | YES | true | Se está ativo |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### cartoes_credito_lancamentos

**Descrição**: Lançamentos do cartão de crédito. Substitui as antigas tabelas `cartoes_credito_despesas` e `cartoes_credito_parcelas`, unificando-as em uma única tabela com suporte a 3 tipos de transação.

**Tipos de Lançamento**:
- `unica` - Compra avulsa, aparece uma vez na fatura
- `parcelada` - Compra parcelada em X vezes, gera X registros com mesmo `compra_id`
- `recorrente` - Assinatura mensal (Netflix, Spotify), gera automaticamente em meses futuros

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK cartao_id` → `cartoes_credito.id`
- `FK fatura_id` → `cartoes_credito_faturas.id` (quando faturado)
- `FK processo_id` → `processos_processos.id` (opcional)

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cartao_id` | uuid | NO | - | FK para cartão |
| `fatura_id` | uuid | YES | - | FK para fatura (quando faturado) |
| `descricao` | text | NO | - | Descrição da compra |
| `categoria` | text | NO | - | Categoria da despesa |
| `fornecedor` | text | YES | - | Estabelecimento/Fornecedor |
| `valor` | numeric(15,2) | NO | - | Valor do lançamento (parcela) |
| `tipo` | text | NO | - | Tipo: `unica`, `parcelada`, `recorrente` |
| `parcela_numero` | integer | YES | 1 | Número da parcela (1, 2, 3...) |
| `parcela_total` | integer | YES | 1 | Total de parcelas |
| `compra_id` | uuid | YES | - | Agrupa parcelas da mesma compra |
| `data_compra` | date | NO | - | Data da compra original |
| `mes_referencia` | date | NO | - | Mês de faturamento (primeiro dia) |
| `recorrente_ativo` | boolean | YES | true | Se recorrente ainda está ativo |
| `recorrente_data_fim` | date | YES | - | Data de cancelamento do recorrente |
| `faturado` | boolean | YES | false | Se está em uma fatura |
| `importado_de_fatura` | boolean | YES | false | Se veio de importação PDF |
| `hash_transacao` | text | YES | - | Hash para evitar duplicidade |
| `processo_id` | uuid | YES | - | Processo relacionado |
| `documento_fiscal` | text | YES | - | Número do documento |
| `comprovante_url` | text | YES | - | URL do comprovante |
| `observacoes` | text | YES | - | Observações |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Índices**:
- `idx_lancamentos_cartao` - Por cartão
- `idx_lancamentos_mes` - Por mês de referência
- `idx_lancamentos_compra` - Por compra_id (para agrupar parcelas)
- `idx_lancamentos_fatura` - Por fatura

**Funções Relacionadas**:

| Função | Descrição |
|--------|-----------|
| `criar_lancamento_cartao(...)` | Cria lançamento único, parcelado ou recorrente |
| `gerar_lancamentos_recorrentes(cartao_id, mes_referencia)` | Gera lançamentos recorrentes para um mês |
| `cancelar_lancamento_recorrente(compra_id, data_fim)` | Cancela uma assinatura recorrente |
| `reativar_lancamento_recorrente(compra_id)` | Reativa uma assinatura cancelada |
| `obter_lancamentos_mes_cartao(cartao_id, mes_referencia)` | Lista lançamentos de um mês |

---

### cartoes_credito_faturas

**Descrição**: Faturas mensais dos cartões.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cartao_id` | uuid | NO | - | FK para cartão |
| `mes_referencia` | date | NO | - | Mês de referência (primeiro dia) |
| `data_fechamento` | date | NO | - | Data de fechamento |
| `data_vencimento` | date | NO | - | Data de vencimento |
| `valor_total` | numeric | YES | 0 | Valor total da fatura |
| `despesa_id` | uuid | YES | - | FK para despesa criada |
| `status` | text | NO | 'aberta' | Status: `aberta`, `fechada`, `paga` |
| `pdf_url` | text | YES | - | URL do PDF da fatura |
| `data_pagamento` | date | YES | - | Data do pagamento |
| `forma_pagamento` | text | YES | - | Forma de pagamento |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### cartoes_credito_importacoes

**Descrição**: Histórico de importações de faturas de cartão (PDF/CSV).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cartao_id` | uuid | NO | - | FK para cartão |
| `fatura_id` | uuid | YES | - | FK para fatura criada |
| `arquivo_nome` | text | NO | - | Nome do arquivo |
| `arquivo_url` | text | NO | - | URL do arquivo |
| `status` | text | NO | 'pendente' | Status: `pendente`, `processando`, `concluido`, `erro` |
| `transacoes_encontradas` | integer | YES | 0 | Total de transações encontradas |
| `transacoes_importadas` | integer | YES | 0 | Total importadas |
| `transacoes_duplicadas` | integer | YES | 0 | Total de duplicadas ignoradas |
| `modelo_ia` | text | YES | - | Modelo de IA usado |
| `confianca_media` | integer | YES | - | Confiança média (0-100) |
| `dados_extraidos` | jsonb | YES | - | Dados brutos extraídos |
| `erro_mensagem` | text | YES | - | Mensagem de erro |
| `processado_em` | timestamptz | YES | - | Data do processamento |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

## 8. AUXILIARES

### financeiro_metas

**Descrição**: Metas financeiras do escritório.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo_meta` | text | NO | - | Tipo: `receita`, `despesa`, `lucro`, `horas` |
| `descricao` | text | NO | - | Descrição da meta |
| `valor_meta` | numeric | NO | - | Valor da meta |
| `valor_realizado` | numeric | YES | 0 | Valor realizado |
| `percentual_atingido` | numeric | YES | 0 | % atingido |
| `data_inicio` | date | NO | - | Data de início |
| `data_fim` | date | NO | - | Data de término |
| `ativa` | boolean | YES | true | Se está ativa |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_provisoes

**Descrição**: Provisões para despesas futuras (13º, férias, impostos).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo` | text | NO | - | Tipo: `13_salario`, `ferias`, `imposto`, `outro` |
| `descricao` | text | NO | - | Descrição |
| `valor_mensal` | numeric | NO | - | Valor a provisionar por mês |
| `valor_acumulado` | numeric | YES | 0 | Valor acumulado |
| `data_inicio` | date | NO | - | Data de início |
| `data_prevista_pagamento` | date | YES | - | Data prevista de uso |
| `ativa` | boolean | YES | true | Se está ativa |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_receitas_recorrentes

**Descrição**: Receitas recorrentes (mensalidades de clientes).

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `cliente_id` | uuid | NO | - | FK para cliente |
| `descricao` | text | NO | - | Descrição |
| `valor` | numeric | NO | - | Valor mensal |
| `dia_vencimento` | integer | NO | - | Dia do vencimento |
| `ativo` | boolean | YES | true | Se está ativo |
| `data_inicio` | date | NO | - | Data de início |
| `data_fim` | date | YES | - | Data de término |
| `proximo_faturamento` | date | YES | - | Próxima data de faturamento |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_alertas_cobranca

**Descrição**: Alertas automáticos de cobrança baseados em movimentações processuais.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `processo_id` | uuid | NO | - | FK para processo |
| `movimentacao_id` | uuid | YES | - | FK para movimentação |
| `ato_tipo_id` | uuid | YES | - | FK para tipo de ato |
| `tipo_alerta` | text | NO | - | Tipo: `ato_processual`, `prazo`, `audiencia` |
| `titulo` | text | NO | - | Título do alerta |
| `descricao` | text | YES | - | Descrição |
| `valor_sugerido` | numeric | YES | - | Valor sugerido para cobrança |
| `status` | text | YES | 'pendente' | Status: `pendente`, `cobrado`, `ignorado` |
| `honorario_id` | uuid | YES | - | FK para honorário criado |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `resolvido_em` | timestamptz | YES | - | Data de resolução |
| `resolvido_por` | uuid | YES | - | Quem resolveu |
| `justificativa_ignorado` | text | YES | - | Motivo de ignorar |

---

### financeiro_mapeamento_atos_movimentacao

**Descrição**: Mapeamento entre tipos de atos processuais e palavras-chave para detecção automática a partir de movimentações.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK ato_tipo_id` → `financeiro_atos_processuais_tipos.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `ato_tipo_id` | uuid | NO | - | FK para tipo de ato |
| `palavras_chave` | text[] | NO | - | Lista de palavras-chave para detectar o ato |
| `ativo` | boolean | YES | true | Se está ativo |
| `created_at` | timestamptz | YES | now() | Data de criação |

**Constraint única**: `(escritorio_id, ato_tipo_id)`

---

### financeiro_dashboard_metricas

**Descrição**: Cache de métricas do dashboard financeiro.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `user_id` | uuid | YES | - | FK para usuário (se individual) |
| `escritorio_id` | uuid | YES | - | FK para escritorios |
| `categoria` | text | NO | - | Categoria da métrica |
| `subcategoria` | text | YES | - | Subcategoria |
| `metrica` | text | NO | - | Nome da métrica |
| `valor` | numeric | YES | - | Valor atual |
| `valor_meta` | numeric | YES | - | Valor da meta |
| `percentual` | numeric | YES | - | Percentual |
| `dados_extras` | jsonb | YES | - | Dados adicionais |
| `periodo` | text | YES | - | Período de referência |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

---

### financeiro_dashboard_notificacoes

**Descrição**: Notificações do módulo financeiro.

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `user_id` | uuid | YES | - | FK para usuário destinatário |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `tipo` | text | NO | - | Tipo da notificação |
| `titulo` | text | NO | - | Título |
| `mensagem` | text | YES | - | Mensagem |
| `metadata` | jsonb | YES | - | Dados adicionais |
| `link` | text | YES | - | Link para ação |
| `lida` | boolean | YES | false | Se foi lida |
| `created_at` | timestamptz | YES | now() | Data de criação |

---

## Uso no Sistema

### Hooks Principais

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useHonorarios` | `src/hooks/useHonorarios.ts` | CRUD de honorários |
| `useFaturas` | `src/hooks/useFaturas.ts` | CRUD de faturas |
| `useTimesheet` | `src/hooks/useTimesheet.ts` | Registro de horas |
| `useContasBancarias` | `src/hooks/useContasBancarias.ts` | Gestão de contas |
| `useCartoesCredito` | `src/hooks/useCartoesCredito.ts` | Gestão de cartões |
| `useDespesas` | `src/hooks/useDespesas.ts` | CRUD de despesas |
| `useFinanceiroMetricas` | `src/hooks/useFinanceiroMetricas.ts` | Métricas do dashboard |

### Páginas Principais

| Página | Rota | Descrição |
|--------|------|-----------|
| Dashboard Financeiro | `/dashboard/financeiro` | Visão geral |
| Receitas e Despesas | `/dashboard/financeiro/receitas-despesas` | Fluxo de caixa |
| Honorários | `/dashboard/financeiro/honorarios` | Gestão de honorários |
| Faturamento | `/dashboard/financeiro/faturamento` | Gestão de faturas |
| Timesheet | `/dashboard/financeiro/timesheet` | Registro de horas |
| Contratos | `/dashboard/financeiro/contratos` | Contratos de honorários |
| Cartões | `/dashboard/financeiro/cartoes` | Cartões de crédito |

---

## 14. LÓGICA DE COBRANÇA AUTOMÁTICA

### Determinação Automática de Cobrabilidade de Horas

O sistema calcula automaticamente se um registro de timesheet é cobrável (`faturavel`) baseado no tipo de contrato vinculado ao processo/consulta:

| Forma de Cobrança | Horas Cobráveis | Explicação |
|-------------------|-----------------|------------|
| `por_hora` | ✅ Sim | Fatura horas aprovadas |
| `por_cargo` | ✅ Sim | Fatura horas × valor do cargo |
| `fixo` | ❌ Não | Valor fixo mensal automático |
| `por_pasta` | ❌ Não | Valor por processo ativo |
| `por_ato` | ❌ Não | Cobra via atos processuais |
| `por_etapa` | ❌ Não | Cobra por etapa do processo |
| `misto` | ⚙️ Configurável | Usa campo `horas_faturaveis` do contrato |

### Funções

#### calcular_faturavel_timesheet(p_processo_id, p_consulta_id)
Calcula se horas são cobráveis baseado no contrato vinculado.

**Retorno**: `boolean` (true = cobrável, false = interno)

#### get_tarefa_faturavel(p_tarefa_id)
Calcula cobrabilidade para horas registradas a partir de uma tarefa.

**Retorno**: `boolean`

#### converter_alerta_em_receita(p_alerta_id, p_valor, p_descricao, p_user_id)
Converte um alerta de cobrança pendente em receita de honorário.

**Retorno**: `uuid` (ID da receita criada)

#### ignorar_alerta_cobranca(p_alerta_id, p_justificativa, p_user_id)
Ignora um alerta de cobrança com justificativa opcional.

**Retorno**: `boolean`

#### criar_alerta_cobranca_manual(p_processo_id, p_ato_tipo_id, p_valor_sugerido, p_titulo, p_descricao)
Cria um alerta de cobrança manualmente.

**Retorno**: `uuid` (ID do alerta criado)

### Triggers

#### trg_timesheet_set_faturavel
- **Tabela**: `financeiro_timesheet`
- **Evento**: BEFORE INSERT
- **Ação**: Calcula e define `faturavel` e `faturavel_auto = true` automaticamente

#### trg_movimentacao_detectar_ato
- **Tabela**: `processos_movimentacoes`
- **Evento**: AFTER INSERT
- **Ação**: Detecta atos processuais cobráveis a partir de palavras-chave e cria alertas de cobrança automáticos

### Views

#### v_alertas_cobranca_pendentes
Lista alertas pendentes com dados enriquecidos (processo, cliente, ato, movimentação).

#### v_historico_cobrancas_processo
Lista histórico de cobranças (receitas de honorário) por processo.

#### v_timesheet_aprovacao
View atualizada com campos adicionais:
- `faturavel_auto`: indica se foi calculado automaticamente
- `forma_cobranca_contrato`: forma de cobrança do contrato vinculado

---

## Notas de Implementação

### Padrões Seguidos
- Todos os valores monetários são `numeric` (não usar `float`)
- Datas de pagamento são sempre `date` (não `timestamptz`)
- Status seguem enums consistentes
- Histórico/timeline para auditoria em tabelas críticas

### Pontos de Atenção
- Ao registrar pagamento, atualizar `saldo_atual` da conta bancária
- Ao faturar timesheet, marcar como `faturado = true`
- Ao cancelar fatura, reverter status dos itens vinculados
- Comissões são calculadas automaticamente baseadas em `escritorios_usuarios.percentual_comissao`
- **Timesheet**: `faturavel` é calculado automaticamente pelo trigger - não passar no INSERT
- **Contratos misto**: usar campo `horas_faturaveis` para definir se horas são cobráveis
- **Alertas de cobrança**: criados automaticamente pelo trigger quando movimentação contém palavras-chave mapeadas

### Triggers Importantes
- `atualizar_saldo_conta` - Atualiza saldo após lançamento
- `gerar_parcelas_honorario` - Gera parcelas ao criar honorário parcelado
- `atualizar_valor_fatura` - Recalcula total ao adicionar/remover itens
- `criar_despesa_fatura_cartao` - Cria despesa ao fechar fatura de cartão
- `trg_timesheet_set_faturavel` - Calcula `faturavel` automaticamente baseado no contrato
- `trg_movimentacao_detectar_ato` - Detecta atos cobráveis a partir de movimentações

---

## Referência de ENUMs Padronizados

**IMPORTANTE**: Consulte a view `v_financeiro_enums` no banco de dados para a referência completa e sempre atualizada.

### Formas de Pagamento

Usado em: `financeiro_contas_pagamentos`, `financeiro_despesas`, `financeiro_honorarios_parcelas`, `financeiro_faturamento_faturas`

| Valor | Descrição |
|-------|-----------|
| `dinheiro` | Pagamento em dinheiro |
| `pix` | Transferência PIX |
| `ted` | Transferência TED |
| `boleto` | Boleto bancário |
| `cartao_credito` | Cartão de crédito |
| `cartao_debito` | Cartão de débito |

### Categorias de Despesa

#### Categorias Gerais
Usado em: `financeiro_despesas`, `cartoes_credito_despesas`

| Valor | Descrição |
|-------|-----------|
| `custas` | Custas processuais |
| `fornecedor` | Pagamento a fornecedores |
| `folha` | Folha de pagamento |
| `impostos` | Impostos e tributos |
| `aluguel` | Aluguel do escritório |
| `marketing` | Marketing e publicidade |
| `capacitacao` | Treinamentos e cursos |
| `material` | Material de escritório |
| `tecnologia` | Software e hardware |
| `viagem` | Viagens e deslocamentos |
| `alimentacao` | Refeições e alimentação |
| `combustivel` | Combustível |
| `assinatura` | Assinaturas e mensalidades |
| `cartao_credito` | Fatura de cartão (apenas `financeiro_despesas`) |
| `outros` | Outros |

#### Categorias de Custas Processuais (Reembolsáveis)
Usado em: `financeiro_despesas` (quando vinculado a processo)

| Valor | Descrição |
|-------|-----------|
| `honorarios_perito` | Honorários de Perito |
| `oficial_justica` | Oficial de Justiça |
| `correios` | Correios / Envios |
| `cartorio` | Cartório |
| `copia` | Cópias / Impressões |
| `deslocamento` | Deslocamento / Transporte |
| `hospedagem` | Hospedagem |
| `publicacao` | Publicação |
| `certidao` | Certidões |
| `protesto` | Protesto |
| `outra` | Outra Despesa |

### Status por Entidade

| Entidade | Valores |
|----------|---------|
| `financeiro_despesas` | `pendente`, `pago`, `cancelado` |
| `financeiro_honorarios` | `rascunho`, `aprovado`, `faturado`, `cancelado` |
| `financeiro_honorarios_parcelas` | `pendente`, `pago`, `atrasado`, `cancelado` |
| `financeiro_faturamento_faturas` | `rascunho`, `emitida`, `enviada`, `paga`, `atrasada`, `cancelada` |
| `cartoes_credito_faturas` | `aberta`, `fechada`, `paga`, `cancelada` |
| `cartoes_credito_importacoes` | `pendente`, `processando`, `concluido`, `erro` |

### Tipos e Formas

| Campo | Tabela | Valores |
|-------|--------|---------|
| `tipo_honorario` | `financeiro_honorarios` | `fixo`, `hora`, `exito`, `misto` |
| `tipo_contrato` | `financeiro_contratos_honorarios` | `processo`, `consultoria`, `avulso`, `misto`, `fixo`, `hora`, `exito`, `recorrente` |
| `forma_cobranca` | `financeiro_contratos_*` | `fixo`, `por_hora`, `por_etapa`, `misto`, `por_pasta`, `por_ato`, `por_cargo` |
| `tipo_conta` | `financeiro_contas_bancarias` | `corrente`, `poupanca`, `digital` |
| `tipo` | `financeiro_contas_lancamentos` | `entrada`, `saida`, `transferencia_entrada`, `transferencia_saida` |
| `origem_tipo` | `financeiro_contas_lancamentos` | `pagamento`, `despesa`, `transferencia`, `manual` |
| `bandeira` | `cartoes_credito` | `visa`, `mastercard`, `elo`, `amex`, `hipercard`, `diners`, `outra` |

---

## Histórico de Alterações

| Data | Descrição | Migration |
|------|-----------|-----------|
| 2024-XX-XX | Estrutura inicial | (migration inicial) |
| 2025-01-21 | Módulo de cartões de crédito | 20250121000001_cartoes_credito_tables.sql |
| 2025-01-21 | Funções de cartões de crédito | 20250121000002_cartoes_credito_functions.sql |
| 2025-01-21 | RLS de cartões de crédito | 20250121000003_cartoes_credito_rls.sql |
| 2025-01-21 | Padronização de ENUMs | 20250121000004_padronizar_enums_financeiro.sql |
| 2026-01-28 | Reestruturação: cartoes_credito_lancamentos | 20260128000001_cartoes_credito_lancamentos.sql |

### Migração 2026-01-28: Reestruturação de Cartões

**Objetivo**: Simplificar de 5 para 4 tabelas e adicionar suporte a lançamentos recorrentes.

**Mudanças**:
- `cartoes_credito_despesas` + `cartoes_credito_parcelas` → `cartoes_credito_lancamentos`
- Novo campo `tipo`: `unica`, `parcelada`, `recorrente`
- Novo campo `compra_id`: agrupa parcelas da mesma compra
- Novo campo `recorrente_ativo`: controla assinaturas ativas

**Novas Funções**:
- `criar_lancamento_cartao()` - Cria lançamentos com suporte a 3 tipos
- `gerar_lancamentos_recorrentes()` - Auto-gera recorrentes ao navegar meses
- `cancelar_lancamento_recorrente()` - Cancela assinaturas
- `reativar_lancamento_recorrente()` - Reativa assinaturas canceladas

**Dados migrados**: Todos os dados de `despesas` + `parcelas` foram migrados para `lancamentos` preservando o histórico.
