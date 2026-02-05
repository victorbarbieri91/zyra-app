# Módulo: Relatorios

> Gerado automaticamente em: 2026-02-05
> Tabelas: 2

## Descrição
Relatórios e templates

---

## Tabelas

### relatorios_templates

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| colunas | _text[] | Sim | {}::text[] |
| incluir_logo | boolean | Sim | true |
| criado_por | uuid | Não | - |
| ativo | boolean | Sim | true |
| created_at | timestamp with time zone | Sim | now() |
| updated_at | timestamp with time zone | Sim | now() |

**Notas**:
- `colunas`: Array de campos a incluir no relatorio: numero_cnj, area, status, resumo_ia, etc

---

### relatorios_gerados

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| template_id | uuid | Não | - |
| titulo | text | Sim | - |
| clientes_ids | _uuid[] | Sim | {}::uuid[] |
| processos_ids | _uuid[] | Não | {}::uuid[] |
| colunas_usadas | _text[] | Não | {}::text[] |
| resumos_ia | jsonb | Não | {}::jsonb |
| arquivo_url | text | Não | - |
| arquivo_nome | text | Não | - |
| status | text | Sim | concluido::text |
| erro_mensagem | text | Não | - |
| gerado_por | uuid | Não | - |
| andamentos_salvos | boolean | Sim | false |
| created_at | timestamp with time zone | Sim | now() |

**Notas**:
- `resumos_ia`: JSON com resumos gerados pela IA: { "processo_id": "texto do resumo" }
- `andamentos_salvos`: Se os andamentos da IA foram salvos nas movimentacoes dos processos

**Constraints**:
- `status`: status = ANY (ARRAY['gerando'::text, 'concluido'::text, 'erro'::text])

---

