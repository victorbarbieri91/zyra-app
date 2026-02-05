# Módulo: Cartoes

> Gerado automaticamente em: 2026-02-05
> Tabelas: 7

## Descrição
Cartões de crédito corporativos

---

## Tabelas

### cartoes_credito

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| banco | text | Não | - |
| bandeira | text | Não | - |
| ultimos_digitos | text | Não | - |
| dia_vencimento | integer | Sim | - |
| dias_antes_fechamento | integer | Sim | 7 |
| limite_total | numeric | Não | - |
| cor | text | Não | #3B82F6::text |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| observacoes | text | Não | - |

**Notas**:
- `bandeira`: Bandeira do cartão. Valores: visa, mastercard, elo, amex, hipercard, diners, outra

**Constraints**:
- `bandeira`: bandeira = ANY (ARRAY['visa'::text, 'mastercard'::text, 'elo'::text, 'amex'::text, 'hipercard'::text, 'diners'::text, 'outra'::text])
- `ultimos_digitos`: char_length(ultimos_digitos) = 4
- `dia_vencimento`: dia_vencimento >= 1 AND dia_vencimento <= 31
- `dias_antes_fechamento`: dias_antes_fechamento >= 1 AND dias_antes_fechamento <= 28

---

### cartoes_credito_despesas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| cartao_id | uuid | Sim | - |
| descricao | text | Sim | - |
| categoria | text | Sim | - |
| fornecedor | text | Não | - |
| valor_total | numeric | Sim | - |
| numero_parcelas | integer | Sim | 1 |
| valor_parcela | numeric | Sim | - |
| data_compra | date | Sim | - |
| processo_id | uuid | Não | - |
| documento_fiscal | text | Não | - |
| comprovante_url | text | Não | - |
| importado_de_fatura | boolean | Não | false |
| hash_transacao | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `categoria`: Categoria da despesa. Valores: custas, fornecedor, folha, impostos, aluguel, marketing, capacitacao, material, tecnologia, viagem, alimentacao, combustivel, assinatura, outros

**Constraints**:
- `categoria`: categoria = ANY (ARRAY['custas'::text, 'fornecedor'::text, 'folha'::text, 'impostos'::text, 'aluguel'::text, 'marketing'::text, 'capacitacao'::text, 'material'::text, 'tecnologia'::text, 'viagem'::text, 'alimentacao'::text, 'combustivel'::text, 'assinatura'::text, 'outros'::text])
- `numero_parcelas`: numero_parcelas >= 1

---

### cartoes_credito_parcelas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| despesa_id | uuid | Sim | - |
| fatura_id | uuid | Não | - |
| numero_parcela | integer | Sim | - |
| valor | numeric | Sim | - |
| mes_referencia | date | Sim | - |
| faturada | boolean | Não | false |
| created_at | timestamp with time zone | Não | now() |

---

### cartoes_credito_faturas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| cartao_id | uuid | Sim | - |
| mes_referencia | date | Sim | - |
| data_fechamento | date | Sim | - |
| data_vencimento | date | Sim | - |
| valor_total | numeric | Não | 0 |
| despesa_id | uuid | Não | - |
| status | text | Sim | aberta::text |
| pdf_url | text | Não | - |
| data_pagamento | date | Não | - |
| forma_pagamento | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `status`: Status da fatura do cartão. Valores: aberta, fechada, paga, cancelada

**Constraints**:
- `status`: status = ANY (ARRAY['aberta'::text, 'fechada'::text, 'paga'::text, 'cancelada'::text])

---

### cartoes_credito_importacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| cartao_id | uuid | Sim | - |
| fatura_id | uuid | Não | - |
| arquivo_nome | text | Sim | - |
| arquivo_url | text | Sim | - |
| status | text | Sim | pendente::text |
| transacoes_encontradas | integer | Não | 0 |
| transacoes_importadas | integer | Não | 0 |
| transacoes_duplicadas | integer | Não | 0 |
| modelo_ia | text | Não | - |
| confianca_media | integer | Não | - |
| dados_extraidos | jsonb | Não | - |
| erro_mensagem | text | Não | - |
| processado_em | timestamp with time zone | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `status`: status = ANY (ARRAY['pendente'::text, 'processando'::text, 'concluido'::text, 'erro'::text])

---

### cartoes_credito_lancamentos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| cartao_id | uuid | Sim | - |
| fatura_id | uuid | Não | - |
| descricao | text | Sim | - |
| categoria | text | Sim | - |
| fornecedor | text | Não | - |
| valor | numeric | Sim | - |
| tipo | text | Sim | - |
| parcela_numero | integer | Sim | 1 |
| parcela_total | integer | Sim | 1 |
| compra_id | uuid | Sim | - |
| data_compra | date | Sim | - |
| mes_referencia | date | Sim | - |
| recorrente_ativo | boolean | Não | true |
| recorrente_data_fim | date | Não | - |
| faturado | boolean | Não | false |
| importado_de_fatura | boolean | Não | false |
| hash_transacao | text | Não | - |
| processo_id | uuid | Não | - |
| documento_fiscal | text | Não | - |
| comprovante_url | text | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `categoria`: categoria = ANY (ARRAY['custas'::text, 'fornecedor'::text, 'folha'::text, 'impostos'::text, 'aluguel'::text, 'marketing'::text, 'capacitacao'::text, 'material'::text, 'tecnologia'::text, 'viagem'::text, 'alimentacao'::text, 'combustivel'::text, 'assinatura'::text, 'outros'::text])
- `valor`: valor > 0::numeric
- `tipo`: tipo = ANY (ARRAY['unica'::text, 'parcelada'::text, 'recorrente'::text])
- `parcela_numero`: parcela_numero >= 1
- `parcela_total`: parcela_total >= 1

---

### cartoes_credito_categorias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| value | text | Sim | - |
| label | text | Sim | - |
| ativo | boolean | Não | true |
| criado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `value`: Identificador único da categoria (slug)
- `label`: Nome de exibição da categoria (capitalizado)

---

