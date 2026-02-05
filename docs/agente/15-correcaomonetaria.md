# Módulo: CorrecaoMonetaria

> Gerado automaticamente em: 2026-02-05
> Tabelas: 2

## Descrição
Índices econômicos e correção monetária

---

## Tabelas

### indices_economicos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Não | - |
| codigo_bcb | integer | Sim | - |
| nome | text | Sim | - |
| competencia | date | Sim | - |
| valor | numeric | Sim | - |
| variacao_mensal | numeric | Não | - |
| fonte | text | Não | bcb_api::text |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### indices_economicos_config

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| codigo_bcb | integer | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| ativo | boolean | Não | true |
| ordem | integer | Não | 0 |
| created_at | timestamp with time zone | Não | now() |

---

