# Módulo: CRM

> Gerado automaticamente em: 2026-02-05
> Tabelas: 2

## Descrição
Pessoas, oportunidades e funil de vendas

---

## Tabelas

### crm_pessoas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| nome_completo | text | Sim | - |
| nome_fantasia | text | Não | - |
| cpf_cnpj | text | Não | - |
| indicado_por | uuid | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| telefone | text | Não | - |
| email | text | Não | - |
| cep | text | Não | - |
| logradouro | text | Não | - |
| numero | text | Não | - |
| complemento | text | Não | - |
| bairro | text | Não | - |
| cidade | text | Não | - |
| tags | _text[] | Não | {}::text[] |
| tipo_pessoa | tipo_pessoa_enum | Sim | pf::tipo_pessoa_enum |
| tipo_cadastro | tipo_cadastro_enum | Sim | cliente::tipo_cadastro_enum |
| status | status_pessoa_enum | Sim | ativo::status_pessoa_enum |
| origem | origem_crm_enum | Não | - |
| uf | uf_enum | Não | - |

**Notas**:
- `cpf_cnpj`: CPF para PF (11 dígitos) ou CNPJ para PJ (14 dígitos)
- `tags`: Array de tags para segmentação

---

### crm_oportunidades

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| pessoa_id | uuid | Sim | - |
| titulo | text | Sim | - |
| descricao | text | Não | - |
| valor_estimado | numeric | Não | - |
| probabilidade | integer | Não | - |
| responsavel_id | uuid | Sim | - |
| indicado_por | uuid | Não | - |
| tags | _text[] | Não | {}::text[] |
| data_abertura | date | Sim | CURRENT_DATE |
| data_prevista_fechamento | date | Não | - |
| data_fechamento | date | Não | - |
| valor_fechado | numeric | Não | - |
| created_at | timestamp with time zone | Sim | now() |
| updated_at | timestamp with time zone | Sim | now() |
| etapa | etapa_oportunidade_enum | Sim | lead::etapa_oportunidade_enum |
| origem | origem_crm_enum | Não | - |
| area_juridica | area_juridica_enum | Não | - |
| motivo_perda | motivo_perda_enum | Não | - |
| interacoes | jsonb | Não | []::jsonb |

**Constraints**:
- `probabilidade`: probabilidade >= 0 AND probabilidade <= 100

---

