# Módulo: Sistema

> Gerado automaticamente em: 2026-02-05
> Tabelas: 10

## Descrição
Tags, timers e configurações

---

## Tabelas

### onboarding_steps

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| etapa | text | Sim | - |
| completada | boolean | Não | false |
| completada_em | timestamp with time zone | Não | - |
| pulada | boolean | Não | false |
| pulada_em | timestamp with time zone | Não | - |
| dados_etapa | jsonb | Não | - |
| tempo_gasto_segundos | integer | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### numeracao_sequencial

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| ultimo_numero | integer | Sim | 999 |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### tags_master

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| cor | text | Sim | - |
| contexto | text | Sim | - |
| is_predefinida | boolean | Não | false |
| ordem | integer | Não | 0 |
| ativa | boolean | Não | true |
| descricao | text | Não | - |
| icone | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |
| updated_at | timestamp with time zone | Não | now() |
| updated_by | uuid | Não | - |

**Constraints**:
- `contexto`: contexto = ANY (ARRAY['agenda'::text, 'processo'::text, 'consultivo'::text, 'documento'::text])

---

### migracao_jobs

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| modulo | text | Sim | - |
| arquivo_nome | text | Sim | - |
| arquivo_storage_path | text | Sim | - |
| mapeamento | jsonb | Sim | {}::jsonb |
| config | jsonb | Não | {}::jsonb |
| status | text | Sim | pendente::text |
| etapa_atual | text | Não | - |
| total_linhas | integer | Não | 0 |
| linhas_processadas | integer | Não | 0 |
| linhas_validas | integer | Não | 0 |
| linhas_com_erro | integer | Não | 0 |
| linhas_duplicadas | integer | Não | 0 |
| linhas_importadas | integer | Não | 0 |
| erros | jsonb | Não | []::jsonb |
| duplicatas | jsonb | Não | []::jsonb |
| campos_extras | jsonb | Não | []::jsonb |
| resultado_final | jsonb | Não | - |
| correcoes_usuario | jsonb | Não | {}::jsonb |
| iniciado_em | timestamp with time zone | Não | - |
| concluido_em | timestamp with time zone | Não | - |
| criado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| pendencias | jsonb | Não | []::jsonb |
| decisoes_pendencias | jsonb | Não | {}::jsonb |

**Notas**:
- `mapeamento`: Mapeamento de colunas: {"coluna_planilha": "campo_sistema"}
- `erros`: Array de erros: [{linha, erros[], dados}]
- `duplicatas`: Array de duplicatas: [{linha, campo, valor, existente}]
- `pendencias`: Lista de pendências que requerem decisão do usuário (cliente não encontrado, etc.)
- `decisoes_pendencias`: Decisões do usuário para cada pendência (vincular, criar, pular)

**Constraints**:
- `modulo`: modulo = ANY (ARRAY['crm'::text, 'processos'::text, 'consultivo'::text, 'agenda'::text, 'financeiro'::text])
- `status`: status = ANY (ARRAY['pendente'::text, 'processando'::text, 'validando'::text, 'aguardando_revisao'::text, 'importando'::text, 'concluido'::text, 'erro'::text, 'cancelado'::text])

---

### migracao_historico

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| job_id | uuid | Não | - |
| modulo | text | Sim | - |
| arquivo_nome | text | Sim | - |
| total_importados | integer | Sim | 0 |
| total_erros | integer | Não | 0 |
| total_duplicatas | integer | Não | 0 |
| detalhes | jsonb | Não | - |
| executado_por | uuid | Não | - |
| executado_em | timestamp with time zone | Não | now() |

---

### numeracao_modulos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| modulo | text | Sim | - |
| prefixo | text | Sim | - |
| ultimo_numero | integer | Sim | 0 |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `modulo`: modulo = ANY (ARRAY['processos'::text, 'consultivo'::text, 'honorarios'::text, 'contratos'::text, 'documentos'::text])

---

### timers_ativos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| processo_id | uuid | Não | - |
| consulta_id | uuid | Não | - |
| tarefa_id | uuid | Não | - |
| titulo | text | Sim | - |
| descricao | text | Não | - |
| hora_inicio | timestamp with time zone | Sim | now() |
| hora_pausa | timestamp with time zone | Não | - |
| segundos_acumulados | integer | Não | 0 |
| status | text | Sim | rodando::text |
| faturavel | boolean | Não | true |
| cor | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `hora_pausa`: Momento em que foi pausado (NULL se rodando)
- `segundos_acumulados`: Segundos acumulados antes de pausas (não inclui tempo atual rodando)

**Constraints**:
- `status`: status = ANY (ARRAY['rodando'::text, 'pausado'::text])

---

### dashboard_resumo_cache

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| saudacao | text | Sim | - |
| mensagem | text | Sim | - |
| gerado_por_ia | boolean | Não | false |
| dados | jsonb | Sim | {}::jsonb |
| data_referencia | date | Sim | - |
| periodo_geracao | text | Sim | - |
| gerado_em | timestamp with time zone | Não | now() |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `periodo_geracao`: Período de geração: manha (9h) ou tarde (14h)

**Constraints**:
- `periodo_geracao`: periodo_geracao = ANY (ARRAY['manha'::text, 'tarde'::text])

---

### cron_job_run_details

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| job_name | text | Sim | - |
| start_time | timestamp with time zone | Sim | now() |
| end_time | timestamp with time zone | Não | - |
| status | text | Não | running::text |
| result | jsonb | Não | - |
| error_message | text | Não | - |

---

### system_settings

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| key | text | Sim | - |
| value | text | Sim | - |
| description | text | Não | - |
| encrypted | boolean | Não | false |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

