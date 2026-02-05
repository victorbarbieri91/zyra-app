# Módulo: CentroComando

> Gerado automaticamente em: 2026-02-05
> Tabelas: 8

## Descrição
Centro de Comando e IA

---

## Tabelas

### centro_comando_sessoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| titulo | text | Não | - |
| contexto | jsonb | Não | {}::jsonb |
| ativo | boolean | Não | true |
| inicio | timestamp with time zone | Não | now() |
| fim | timestamp with time zone | Não | - |
| mensagens_count | integer | Não | 0 |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### centro_comando_historico

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| sessao_id | uuid | Não | - |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| role | text | Sim | - |
| content | text | Sim | - |
| tool_calls | jsonb | Não | - |
| tool_results | jsonb | Não | - |
| tokens_input | integer | Não | - |
| tokens_output | integer | Não | - |
| tempo_execucao_ms | integer | Não | - |
| erro | text | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `role`: role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])

---

### centro_comando_favoritos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| comando | text | Sim | - |
| descricao | text | Não | - |
| icone | text | Não | command::text |
| categoria | text | Não | geral::text |
| ordem | integer | Não | 0 |
| uso_count | integer | Não | 0 |
| ultimo_uso | timestamp with time zone | Não | - |
| compartilhado_equipe | boolean | Não | false |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### centro_comando_acoes_pendentes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| sessao_id | uuid | Não | - |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| tipo_acao | text | Sim | - |
| tabela | text | Sim | - |
| dados | jsonb | Sim | - |
| explicacao | text | Não | - |
| confirmado | boolean | Não | false |
| executado | boolean | Não | false |
| resultado | jsonb | Não | - |
| erro | text | Não | - |
| expira_em | timestamp with time zone | Não | now() |
| created_at | timestamp with time zone | Não | now() |
| confirmado_em | timestamp with time zone | Não | - |
| executado_em | timestamp with time zone | Não | - |

**Constraints**:
- `tipo_acao`: tipo_acao = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text, 'update_em_massa'::text])

---

### centro_comando_knowledge_base

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| source | text | Sim | - |
| source_path | text | Não | - |
| chunk_id | text | Sim | - |
| title | text | Sim | - |
| content | text | Sim | - |
| metadata | jsonb | Não | {}::jsonb |
| embedding | vector | Não | - |
| version | integer | Não | 1 |
| hash | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### centro_comando_memories

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| sessao_id | uuid | Não | - |
| tipo | text | Sim | - |
| entidade | text | Não | - |
| entidade_id | uuid | Não | - |
| content | text | Sim | - |
| content_resumido | text | Não | - |
| embedding | vector | Não | - |
| uso_count | integer | Não | 0 |
| ultimo_uso | timestamp with time zone | Não | - |
| relevancia_score | numeric | Não | 1.0 |
| mensagem_origem_id | uuid | Não | - |
| permanente | boolean | Não | false |
| expira_em | timestamp with time zone | Não | - |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### centro_comando_embedding_cache

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| input_hash | text | Sim | - |
| input_text | text | Sim | - |
| embedding | vector | Não | - |
| modelo | text | Não | text-embedding-3-small::text |
| uso_count | integer | Não | 1 |
| ultimo_uso | timestamp with time zone | Não | now() |
| created_at | timestamp with time zone | Não | now() |

---

### centro_comando_feedback

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| sessao_id | uuid | Não | - |
| mensagem_id | uuid | Não | - |
| tipo_feedback | text | Sim | - |
| rating | integer | Não | - |
| comentario | text | Não | - |
| user_message | text | Não | - |
| assistant_response | text | Não | - |
| tool_calls | jsonb | Não | - |
| query_executada | text | Não | - |
| resposta_esperada | text | Não | - |
| correcao_aplicada | boolean | Não | false |
| embedding | vector | Não | - |
| incorporado_conhecimento | boolean | Não | false |
| incorporado_em | timestamp with time zone | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `rating`: rating >= 1 AND rating <= 5

---

