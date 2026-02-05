# Módulo: Financeiro

> Gerado automaticamente em: 2026-02-05
> Tabelas: 18

## Descrição
Contratos, faturamento, timesheet e receitas

---

## Tabelas

### financeiro_contratos_honorarios

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| cliente_id | uuid | Sim | - |
| numero_contrato | text | Sim | - |
| tipo_contrato | text | Sim | - |
| data_inicio | date | Sim | - |
| data_fim | date | Não | - |
| valor_total | numeric | Não | - |
| descricao | text | Não | - |
| clausulas | text | Não | - |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| forma_cobranca | text | Não | fixo::text |
| config | jsonb | Não | {}::jsonb |
| formas_pagamento | jsonb | Não | []::jsonb |
| atos | jsonb | Não | []::jsonb |
| valores_cargo | jsonb | Não | []::jsonb |
| titulo | character varying | Não | - |
| escritorio_cobranca_id | uuid | Não | - |
| horas_faturaveis | boolean | Não | true |
| grupo_clientes | jsonb | Não | - |
| reajuste_ativo | boolean | Não | false |
| valor_atualizado | numeric | Não | - |
| indice_reajuste | text | Não | INPC::text |
| data_ultimo_reajuste | date | Não | - |

**Notas**:
- `tipo_contrato`: Tipos: processo, consultoria, avulso, misto, fixo, hora, exito, recorrente, pro_bono. 
Pro-bono permite registrar horas sem cobrança.
- `forma_cobranca`: Formas: fixo, por_hora, por_etapa, misto, por_pasta, por_ato, por_cargo, pro_bono. 
Pro-bono não gera cobrança e horas registradas são automaticamente marcadas como não faturáveis.
- `config`: Configurações do contrato em JSONB: {tipo_config, valor_hora, valor_fixo, dia_cobranca, valor_por_processo, descricao_config}
- `formas_pagamento`: Formas de pagamento aceitas: [{forma, parcelas_max, taxa_percentual}]
- `atos`: Atos processuais cobrados: [{ato_tipo, valor, descricao}]
- `valores_cargo`: Valores por cargo/profissional: [{cargo, valor_hora, valor_minimo}]
- `titulo`: Título/referência do contrato para identificação rápida
- `escritorio_cobranca_id`: Escritório responsável pelo faturamento (CNPJ na nota). Se NULL, usa escritorio_id.
- `grupo_clientes`: Estrutura JSONB para grupo de clientes:
{
  "habilitado": true,
  "cliente_pagador_id": "uuid do cliente que receberá as faturas",
  "clientes": [
    { "cliente_id": "uuid", "nome": "Nome do Cliente" },
    ...
  ]
}
Quando habilitado, todos os clientes do grupo podem ter processos vinculados a este contrato,
mas a fatura será sempre emitida para o cliente_pagador_id.

**Constraints**:
- `tipo_contrato`: tipo_contrato = ANY (ARRAY['processo'::text, 'consultoria'::text, 'avulso'::text, 'misto'::text, 'fixo'::text, 'hora'::text, 'exito'::text, 'recorrente'::text, 'pro_bono'::text])
- `forma_cobranca`: forma_cobranca = ANY (ARRAY['fixo'::text, 'por_hora'::text, 'por_etapa'::text, 'misto'::text, 'por_pasta'::text, 'por_ato'::text, 'por_cargo'::text, 'pro_bono'::text])

---

### financeiro_despesas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| categoria | despesa_categoria_enum | Sim | - |
| descricao | text | Sim | - |
| valor | numeric | Sim | - |
| data_vencimento | date | Sim | - |
| data_pagamento | date | Não | - |
| status | despesa_status_enum | Sim | pendente::despesa_status_enum |
| forma_pagamento | forma_pagamento_enum | Não | - |
| fornecedor | text | Não | - |
| documento_fiscal | text | Não | - |
| conta_bancaria_id | uuid | Não | - |
| reembolsavel | boolean | Não | false |
| processo_id | uuid | Não | - |
| consulta_id | uuid | Não | - |
| faturado | boolean | Não | false |
| fatura_id | uuid | Não | - |
| comprovante_url | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| reembolso_status | text | Não | - |
| honorario_reembolso_id | uuid | Não | - |
| advogado_id | uuid | Não | - |
| reembolsado | boolean | Não | false |
| reembolso_fatura_id | uuid | Não | - |
| cliente_id | uuid | Não | - |
| recorrente | boolean | Não | false |
| config_recorrencia | jsonb | Não | - |
| despesa_pai_id | uuid | Não | - |
| parcelado | boolean | Não | false |
| numero_parcelas | integer | Não | - |
| numero_parcela | integer | Não | - |
| consultivo_id | uuid | Não | - |

**Notas**:
- `categoria`: Categoria da despesa. Inclui: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, cartao_credito, comissao, honorarios_perito, oficial_justica, correios, cartorio, copia, deslocamento, hospedagem, publicacao, certidao, protesto, outra, outros
- `status`: Status da despesa. Valores: pendente, pago, cancelado
- `forma_pagamento`: Forma de pagamento. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito
- `conta_bancaria_id`: Conta bancária de onde o valor saiu/sairá. Obrigatório ao marcar como pago.
- `reembolsavel`: Se esta despesa pode ser reembolsada pelo cliente
- `advogado_id`: Para despesas de categoria "comissao": ID do advogado que recebe a comissão
- `reembolsado`: Se esta despesa já foi reembolsada (incluída em fatura)
- `reembolso_fatura_id`: ID da fatura onde esta despesa foi incluída como reembolso
- `recorrente`: Se esta despesa é recorrente (gera novas despesas automaticamente)
- `config_recorrencia`: Configuração de recorrência: {frequencia, dia_vencimento, data_inicio, data_fim, gerar_automatico, ultima_geracao}
- `despesa_pai_id`: ID da despesa original que gerou as parcelas
- `parcelado`: Se a despesa é parcelada
- `numero_parcelas`: Total de parcelas
- `numero_parcela`: Número da parcela atual (1, 2, 3...)
- `consultivo_id`: ID do consultivo vinculado a esta despesa

**Constraints**:
- `reembolso_status`: reembolso_status IS NULL OR (reembolso_status = ANY (ARRAY['pendente'::text, 'faturado'::text, 'pago'::text]))

---

### financeiro_timesheet

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| processo_id | uuid | Não | - |
| consulta_id | uuid | Não | - |
| data_trabalho | date | Sim | - |
| horas | numeric | Sim | - |
| atividade | text | Sim | - |
| faturavel | boolean | Não | true |
| faturado | boolean | Não | false |
| fatura_id | uuid | Não | - |
| faturado_em | timestamp with time zone | Não | - |
| aprovado | boolean | Não | false |
| aprovado_por | uuid | Não | - |
| aprovado_em | timestamp with time zone | Não | - |
| reprovado | boolean | Não | false |
| reprovado_por | uuid | Não | - |
| reprovado_em | timestamp with time zone | Não | - |
| justificativa_reprovacao | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| hora_inicio | timestamp with time zone | Não | - |
| hora_fim | timestamp with time zone | Não | - |
| tarefa_id | uuid | Não | - |
| origem | text | Não | manual::text |
| editado | boolean | Não | false |
| editado_em | timestamp with time zone | Não | - |
| editado_por | uuid | Não | - |
| faturavel_auto | boolean | Não | - |
| consultivo_id | uuid | Não | - |
| ato_tipo_id | uuid | Não | - |
| faturavel_manual | boolean | Não | false |

**Notas**:
- `origem`: Origem do registro: manual, timer ou retroativo
- `consultivo_id`: ID do consultivo vinculado a este registro de timesheet
- `ato_tipo_id`: Referência ao tipo de ato processual (para contratos por_ato com modo hora)

**Constraints**:
- `horas`: horas > 0::numeric
- `origem`: origem = ANY (ARRAY['manual'::text, 'timer'::text, 'retroativo'::text])

---

### financeiro_faturamento_faturas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| numero_fatura | text | Sim | - |
| cliente_id | uuid | Sim | - |
| data_emissao | date | Sim | CURRENT_DATE |
| data_vencimento | date | Sim | - |
| valor_total | numeric | Sim | 0 |
| descricao | text | Não | - |
| observacoes | text | Não | - |
| forma_pagamento_preferencial | text | Não | - |
| parcelado | boolean | Não | false |
| numero_parcelas | integer | Não | - |
| pdf_url | text | Não | - |
| status | text | Sim | rascunho::text |
| enviada_em | timestamp with time zone | Não | - |
| paga_em | timestamp with time zone | Não | - |
| cancelada_em | timestamp with time zone | Não | - |
| cancelada_por | uuid | Não | - |
| motivo_cancelamento | text | Não | - |
| gerada_automaticamente | boolean | Não | false |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| itens | jsonb | Não | []::jsonb |
| cobrancas | jsonb | Não | []::jsonb |
| config_agendamento | jsonb | Não | - |
| escritorio_cobranca_id | uuid | Não | - |

**Notas**:
- `forma_pagamento_preferencial`: Forma de pagamento preferencial. Valores: dinheiro, pix, ted, boleto, cartao_credito, cartao_debito
- `status`: Status da fatura. Valores: rascunho, emitida, enviada, paga, atrasada, cancelada
- `itens`: Itens da fatura em JSONB: [{tipo, receita_id, timesheet_ids, despesa_id, descricao, valor, horas, valor_hora, processo_id}]
- `cobrancas`: Histórico de cobranças: [{data, tipo, canal, mensagem, resposta}]
- `config_agendamento`: Configuração de geração automática: {recorrente, frequencia, dia_geracao, proximo_agendamento}
- `escritorio_cobranca_id`: Escritório que emitiu a fatura (CNPJ). Herdado do contrato ou definido manualmente.

**Constraints**:
- `forma_pagamento_preferencial`: forma_pagamento_preferencial IS NULL OR (forma_pagamento_preferencial = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'ted'::text, 'boleto'::text, 'cartao_credito'::text, 'cartao_debito'::text]))
- `status`: status = ANY (ARRAY['rascunho'::text, 'emitida'::text, 'enviada'::text, 'paga'::text, 'atrasada'::text, 'cancelada'::text])

---

### financeiro_contas_bancarias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| banco | text | Sim | - |
| agencia | text | Não | - |
| numero_conta | text | Não | - |
| tipo_conta | text | Sim | - |
| titular | text | Não | - |
| saldo_inicial | numeric | Sim | 0 |
| saldo_atual | numeric | Sim | 0 |
| conta_principal | boolean | Não | false |
| data_abertura | date | Não | - |
| ativa | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `tipo_conta`: Tipo da conta: corrente, poupanca, investimento, caixa
- `saldo_atual`: DEPRECATED: Use a função calcular_saldo_conta(id) ou a view v_contas_bancarias_saldo.
Esta coluna será removida em versão futura.

**Constraints**:
- `tipo_conta`: tipo_conta = ANY (ARRAY['corrente'::text, 'poupanca'::text, 'investimento'::text, 'caixa'::text])

---

### financeiro_extrato_bancario

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| conta_bancaria_id | uuid | Sim | - |
| tipo | text | Sim | - |
| valor | numeric | Sim | - |
| data_lancamento | date | Sim | CURRENT_DATE |
| descricao | text | Sim | - |
| categoria | text | Não | - |
| origem_tipo | text | Sim | - |
| origem_id | uuid | Não | - |
| transferencia_id | uuid | Não | - |
| saldo_apos_lancamento | numeric | Sim | - |
| comprovante_url | text | Não | - |
| conciliado | boolean | Não | false |
| conciliado_em | timestamp with time zone | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Notas**:
- `tipo`: Tipo do lançamento. Valores: entrada, saida, transferencia_entrada, transferencia_saida
- `origem_tipo`: Origem do lançamento. Valores: pagamento, despesa, transferencia, manual
- `origem_id`: ID polimórfico - pode referenciar financeiro_receitas, financeiro_despesas, etc. baseado no campo origem_tipo

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'transferencia_entrada'::text, 'transferencia_saida'::text])
- `valor`: valor > 0::numeric
- `origem_tipo`: origem_tipo = ANY (ARRAY['pagamento'::text, 'despesa'::text, 'transferencia'::text, 'manual'::text])

---

### financeiro_metas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| tipo_meta | text | Sim | - |
| descricao | text | Sim | - |
| valor_meta | numeric | Sim | - |
| valor_realizado | numeric | Não | 0 |
| percentual_atingido | numeric | Não | 0 |
| data_inicio | date | Sim | - |
| data_fim | date | Sim | - |
| ativa | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo_meta`: tipo_meta = ANY (ARRAY['receita'::text, 'despesa'::text, 'lucro'::text])
- `valor_meta`: valor_meta > 0::numeric

---

### financeiro_provisoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| tipo | text | Sim | - |
| descricao | text | Sim | - |
| valor_mensal | numeric | Sim | - |
| valor_acumulado | numeric | Não | 0 |
| data_inicio | date | Sim | - |
| data_prevista_pagamento | date | Não | - |
| ativa | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['ferias'::text, '13_salario'::text, 'impostos'::text, 'outros'::text])
- `valor_mensal`: valor_mensal > 0::numeric

---

### financeiro_receitas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| tipo | receita_tipo_enum | Sim | - |
| cliente_id | uuid | Não | - |
| processo_id | uuid | Não | - |
| consulta_id | uuid | Não | - |
| contrato_id | uuid | Não | - |
| fatura_id | uuid | Não | - |
| receita_pai_id | uuid | Não | - |
| numero_parcela | integer | Não | - |
| receita_origem_id | uuid | Não | - |
| descricao | text | Sim | - |
| categoria | receita_categoria_enum | Sim | - |
| valor | numeric | Sim | - |
| data_competencia | date | Sim | - |
| data_vencimento | date | Sim | - |
| data_pagamento | date | Não | - |
| status | receita_status_enum | Sim | pendente::receita_status_enum |
| valor_pago | numeric | Não | 0 |
| forma_pagamento | forma_pagamento_enum | Não | - |
| conta_bancaria_id | uuid | Não | - |
| recorrente | boolean | Não | false |
| config_recorrencia | jsonb | Não | - |
| parcelado | boolean | Não | false |
| numero_parcelas | integer | Não | 1 |
| dias_atraso | integer | Não | 0 |
| juros_aplicados | numeric | Não | 0 |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |
| updated_by | uuid | Não | - |
| responsavel_id | uuid | Não | - |
| consultivo_id | uuid | Não | - |

**Notas**:
- `tipo`: Tipo do lançamento: honorario (principal), parcela (de um parcelado), avulso (receita avulsa), saldo (de pagamento parcial)
- `receita_pai_id`: Para parcelas: referência ao honorário principal que gerou esta parcela
- `receita_origem_id`: Para saldos: referência à receita original que gerou este saldo (pagamento parcial)
- `status`: Status: pendente, pago, parcial (pagamento parcial), atrasado, cancelado, faturado
- `conta_bancaria_id`: Conta bancária onde o valor foi/será creditado. Obrigatório ao marcar como pago.
- `config_recorrencia`: Configuração de recorrência em JSONB: frequencia, dia_vencimento, data_inicio, data_fim, gerar_automatico, ultima_geracao
- `created_by`: Usuário que criou a receita
- `updated_by`: Usuário que atualizou por último
- `responsavel_id`: Responsável pelo recebimento
- `consultivo_id`: ID do consultivo vinculado a esta receita

**Constraints**:
- `valor`: valor > 0::numeric
- `numero_parcelas`: numero_parcelas >= 1

---

### financeiro_reconciliacao

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| conta_bancaria_id | uuid | Sim | - |
| mes_referencia | date | Sim | - |
| saldo_inicial_banco | numeric | Não | - |
| saldo_final_banco | numeric | Não | - |
| saldo_calculado | numeric | Não | - |
| diferenca | numeric | Não | - |
| status | text | Sim | pendente::text |
| conciliado_em | timestamp with time zone | Não | - |
| conciliado_por | uuid | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| importacoes | jsonb | Não | []::jsonb |

**Notas**:
- `importacoes`: Histórico de importações de extrato: [{arquivo_nome, arquivo_url, formato, status, itens_encontrados, itens_importados, itens_duplicados, erro_mensagem, processado_em, created_at}]

**Constraints**:
- `status`: status = ANY (ARRAY['pendente'::text, 'em_andamento'::text, 'conciliado'::text])

---

### financeiro_reconciliacao_itens

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| reconciliacao_id | uuid | Sim | - |
| data_transacao | date | Sim | - |
| descricao_banco | text | Sim | - |
| valor | numeric | Sim | - |
| tipo | text | Sim | - |
| fitid | text | Não | - |
| memo | text | Não | - |
| checknum | text | Não | - |
| receita_id | uuid | Não | - |
| despesa_id | uuid | Não | - |
| status | text | Sim | pendente::text |
| hash_transacao | text | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['credito'::text, 'debito'::text])
- `status`: status = ANY (ARRAY['pendente'::text, 'vinculado'::text, 'ignorado'::text, 'manual'::text])

---

### financeiro_atos_processuais_tipos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| area_juridica | character varying | Sim | - |
| codigo | character varying | Sim | - |
| nome | character varying | Sim | - |
| descricao | text | Não | - |
| percentual_padrao | numeric | Não | - |
| valor_fixo_padrao | numeric | Não | - |
| ordem | integer | Não | 0 |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `area_juridica`: civel, trabalhista, tributaria, familia, criminal, previdenciaria, consumidor
- `percentual_padrao`: Percentual padrão do valor da causa
- `valor_fixo_padrao`: Valor fixo padrão alternativo ao percentual

---

### financeiro_transferencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| conta_origem_id | uuid | Sim | - |
| conta_destino_id | uuid | Sim | - |
| valor | numeric | Sim | - |
| data_transferencia | date | Sim | CURRENT_DATE |
| descricao | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

**Constraints**:
- `valor`: valor > 0::numeric

---

### financeiro_alertas_cobranca

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| processo_id | uuid | Sim | - |
| movimentacao_id | uuid | Não | - |
| ato_tipo_id | uuid | Não | - |
| tipo_alerta | text | Sim | ato_processual::text |
| titulo | text | Sim | - |
| descricao | text | Não | - |
| valor_sugerido | numeric | Não | - |
| status | text | Sim | pendente::text |
| receita_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| resolvido_em | timestamp with time zone | Não | - |
| resolvido_por | uuid | Não | - |
| justificativa_ignorado | text | Não | - |

**Constraints**:
- `tipo_alerta`: tipo_alerta = ANY (ARRAY['ato_processual'::text, 'prazo_vencido'::text, 'mensal'::text, 'manual'::text])
- `status`: status = ANY (ARRAY['pendente'::text, 'cobrado'::text, 'ignorado'::text])

---

### financeiro_mapeamento_atos_movimentacao

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| ato_tipo_id | uuid | Sim | - |
| palavras_chave | _text[] | Sim | {}::text[] |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### financeiro_fechamentos_pasta

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| contrato_id | uuid | Sim | - |
| cliente_id | uuid | Sim | - |
| competencia | date | Sim | - |
| qtd_processos | integer | Sim | 0 |
| valor_unitario | numeric | Sim | - |
| valor_total | numeric | Sim | - |
| processos | jsonb | Sim | []::jsonb |
| status | text | Sim | pendente::text |
| fatura_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| aprovado_em | timestamp with time zone | Não | - |
| aprovado_por | uuid | Não | - |
| faturado_em | timestamp with time zone | Não | - |

**Constraints**:
- `status`: status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'faturado'::text, 'cancelado'::text])

---

### financeiro_alertas_limite_contrato

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| contrato_id | uuid | Sim | - |
| cliente_id | uuid | Sim | - |
| limite_meses | integer | Sim | - |
| meses_cobrados | integer | Sim | - |
| titulo | text | Sim | - |
| mensagem | text | Sim | - |
| status | text | Sim | pendente::text |
| created_at | timestamp with time zone | Não | now() |
| resolvido_em | timestamp with time zone | Não | - |
| resolvido_por | uuid | Não | - |

**Constraints**:
- `status`: status = ANY (ARRAY['pendente'::text, 'renovado'::text, 'encerrado'::text])

---

### financeiro_horas_acumuladas_ato

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| contrato_id | uuid | Sim | - |
| processo_id | uuid | Sim | - |
| ato_tipo_id | uuid | Sim | - |
| horas_totais | numeric | Sim | 0 |
| horas_faturaveis | numeric | Sim | 0 |
| horas_excedentes | numeric | Sim | 0 |
| status | text | Sim | em_andamento::text |
| finalizado_em | timestamp with time zone | Não | - |
| receita_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `status`: status = ANY (ARRAY['em_andamento'::text, 'finalizado'::text, 'faturado'::text])

---

