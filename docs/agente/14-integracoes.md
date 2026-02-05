# Módulo: Integracoes

> Gerado automaticamente em: 2026-02-05
> Tabelas: 3

## Descrição
Integrações DataJud e Escavador

---

## Tabelas

### datajud_consultas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| numero_cnj | text | Sim | - |
| tribunal | text | Não | - |
| dados_normalizados | jsonb | Sim | - |
| consultado_em | timestamp with time zone | Sim | now() |
| expira_em | timestamp with time zone | Sim | - |
| user_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

---

### escavador_config

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| callback_url | text | Não | - |
| callback_token | text | Não | - |
| creditos_usados_mes | integer | Não | 0 |
| ultimo_reset_creditos | timestamp with time zone | Não | now() |
| monitoramento_ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### escavador_cache

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| numero_cnj | character varying | Sim | - |
| dados_capa | jsonb | Sim | - |
| dados_movimentacoes | jsonb | Não | - |
| dados_partes | jsonb | Não | - |
| consultado_em | timestamp with time zone | Não | now() |
| expira_em | timestamp with time zone | Não | now() |

---

