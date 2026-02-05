# Módulo: Documentos

> Gerado automaticamente em: 2026-02-05
> Tabelas: 2

## Descrição
Gestão de documentos

---

## Tabelas

### documentos_tags

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| documento_id | uuid | Sim | - |
| tag_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

---

### documentos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| processo_id | uuid | Não | - |
| consulta_id | uuid | Não | - |
| nome | text | Sim | - |
| tipo | text | Não | - |
| tamanho | bigint | Não | 0 |
| mime_type | text | Não | - |
| storage_path | text | Não | - |
| descricao | text | Não | - |
| categoria | text | Não | - |
| tags | _text[] | Não | - |
| versao | integer | Não | 1 |
| versao_anterior_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

---

