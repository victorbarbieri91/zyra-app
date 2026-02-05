# Módulo: Pecas

> Gerado automaticamente em: 2026-02-05
> Tabelas: 7

## Descrição
Peças processuais e teses

---

## Tabelas

### pecas_templates

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| categoria | text | Sim | - |
| area | text | Sim | - |
| tipo_processo | text | Não | - |
| estrutura | jsonb | Não | []::jsonb |
| variaveis | jsonb | Não | []::jsonb |
| conteudo_template | text | Não | - |
| uso_count | integer | Não | 0 |
| ativo | boolean | Não | true |
| criado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `categoria`: categoria = ANY (ARRAY['peticao_inicial'::text, 'contestacao'::text, 'recurso'::text, 'apelacao'::text, 'agravo'::text, 'embargos'::text, 'replica'::text, 'impugnacao'::text, 'alegacoes_finais'::text, 'memoriais'::text, 'contrarrazoes'::text, 'habeas_corpus'::text, 'mandado_seguranca'::text, 'outro'::text])
- `area`: area = ANY (ARRAY['civel'::text, 'trabalhista'::text, 'tributaria'::text, 'familia'::text, 'criminal'::text, 'consumidor'::text, 'empresarial'::text, 'previdenciaria'::text, 'administrativa'::text, 'outra'::text])
- `tipo_processo`: tipo_processo = ANY (ARRAY['conhecimento'::text, 'execucao'::text, 'cautelar'::text])

---

### pecas_teses

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| titulo | text | Sim | - |
| resumo | text | Não | - |
| area | text | Sim | - |
| subtema | text | Não | - |
| texto_completo | text | Não | - |
| fundamentacao | text | Não | - |
| tags | _text[] | Não | ARRAY[]::text[] |
| uso_count | integer | Não | 0 |
| ativa | boolean | Não | true |
| criado_por | uuid | Não | - |
| atualizado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `area`: area = ANY (ARRAY['civel'::text, 'trabalhista'::text, 'tributaria'::text, 'familia'::text, 'criminal'::text, 'consumidor'::text, 'empresarial'::text, 'previdenciaria'::text, 'administrativa'::text, 'outra'::text])

---

### pecas_jurisprudencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| tribunal | text | Sim | - |
| tipo | text | Sim | - |
| numero_acordao | text | Não | - |
| numero_processo | text | Não | - |
| data_julgamento | date | Não | - |
| data_publicacao | date | Não | - |
| orgao_julgador | text | Não | - |
| relator | text | Não | - |
| ementa | text | Não | - |
| texto_completo | text | Não | - |
| temas | _text[] | Não | ARRAY[]::text[] |
| tags | _text[] | Não | ARRAY[]::text[] |
| link_inteiro_teor | text | Não | - |
| link_consulta | text | Não | - |
| adicionado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['acordao'::text, 'decisao_monocratica'::text, 'sumula'::text, 'outro'::text])

---

### pecas_pecas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| processo_id | uuid | Não | - |
| template_id | uuid | Não | - |
| tipo_peca | text | Sim | - |
| titulo | text | Sim | - |
| conteudo | text | Não | - |
| versao | integer | Não | 1 |
| versao_anterior_id | uuid | Não | - |
| arquivo_url | text | Não | - |
| status | text | Não | rascunho::text |
| data_protocolo | timestamp with time zone | Não | - |
| numero_protocolo | text | Não | - |
| criado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `status`: status = ANY (ARRAY['rascunho'::text, 'finalizada'::text, 'protocolada'::text])

---

### pecas_relacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| peca_id | uuid | Sim | - |
| tipo_relacao | text | Sim | - |
| tese_id | uuid | Não | - |
| jurisprudencia_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `tipo_relacao`: tipo_relacao = ANY (ARRAY['tese'::text, 'jurisprudencia'::text])

---

### pecas_templates_teses

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| template_id | uuid | Sim | - |
| tese_id | uuid | Sim | - |
| ordem | integer | Não | 0 |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

---

### pecas_templates_jurisprudencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| template_id | uuid | Sim | - |
| jurisprudencia_id | uuid | Sim | - |
| ordem | integer | Não | 0 |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

---

