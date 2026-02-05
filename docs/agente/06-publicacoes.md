# Módulo: Publicacoes

> Gerado automaticamente em: 2026-02-05
> Tabelas: 10

## Descrição
Publicações AASP e análises

---

## Tabelas

### publicacoes_config

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| api_url | text | Não | - |
| api_token | text | Não | - |
| webhook_url | text | Não | - |
| webhook_secret | text | Não | - |
| sync_frequencia_horas | integer | Não | 4 |
| ultima_sincronizacao | timestamp with time zone | Não | - |
| proxima_sincronizacao | timestamp with time zone | Não | - |
| ativo | boolean | Não | true |
| notificar_users | _uuid[] | Não | - |
| notificar_apenas_urgentes | boolean | Não | false |
| resumo_diario | boolean | Não | true |
| auto_vincular_por_numero | boolean | Não | true |
| auto_vincular_por_cliente | boolean | Não | true |
| tipos_alerta_imediato | _text[] | Não | ARRAY['intimacao'::text, 'sentenca'::... |
| prazo_minimo_urgencia | integer | Não | 5 |
| palavras_chave_urgencia | _text[] | Não | ARRAY['liminar'::text, 'tutela'::text... |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### publicacoes_publicacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| aasp_id | text | Não | - |
| data_publicacao | date | Sim | - |
| data_captura | timestamp with time zone | Não | now() |
| tribunal | text | Sim | - |
| vara | text | Não | - |
| tipo_publicacao | text | Sim | - |
| numero_processo | text | Não | - |
| processo_id | uuid | Não | - |
| cliente_id | uuid | Não | - |
| partes | _text[] | Não | - |
| texto_completo | text | Sim | - |
| pdf_url | text | Não | - |
| hash_conteudo | text | Não | - |
| status | text | Não | pendente::text |
| urgente | boolean | Não | false |
| source | text | Não | manual::text |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| associado_id | uuid | Não | - |
| agendamento_id | uuid | Não | - |
| agendamento_tipo | character varying | Não | - |
| duplicata_revisada | boolean | Não | false |
| source_type | text | Não | aasp::text |
| escavador_aparicao_id | text | Não | - |
| escavador_monitoramento_id | text | Não | - |
| confianca_vinculacao | numeric | Não | 1.00 |

**Notas**:
- `agendamento_id`: ID do agendamento criado a partir desta publicação (tarefa, evento ou audiência)
- `agendamento_tipo`: Tipo do agendamento: tarefa, compromisso ou audiencia
- `duplicata_revisada`: Indica se a publicação foi revisada na aba de duplicatas
- `source_type`: Fonte da publicação: aasp, escavador_termo ou manual
- `escavador_aparicao_id`: ID único da aparição no Escavador
- `escavador_monitoramento_id`: ID do monitoramento que capturou esta publicação
- `confianca_vinculacao`: Confiança da vinculação automática com processo (0.00 a 1.00)

**Constraints**:
- `tipo_publicacao`: tipo_publicacao = ANY (ARRAY['intimacao'::text, 'sentenca'::text, 'despacho'::text, 'decisao'::text, 'acordao'::text, 'citacao'::text, 'outro'::text])
- `status`: status = ANY (ARRAY['pendente'::text, 'em_analise'::text, 'processada'::text, 'arquivada'::text])
- `agendamento_tipo`: agendamento_tipo::text = ANY (ARRAY['tarefa'::character varying, 'compromisso'::character varying, 'audiencia'::character varying]::text[])
- `source_type`: source_type = ANY (ARRAY['aasp'::text, 'escavador_termo'::text, 'manual'::text])

---

### publicacoes_analises

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| publicacao_id | uuid | Sim | - |
| resumo_executivo | text | Não | - |
| tipo_decisao | text | Não | - |
| sentimento | text | Não | - |
| pontos_principais | jsonb | Não | - |
| tem_prazo | boolean | Não | false |
| tipo_prazo | text | Não | - |
| prazo_dias | integer | Não | - |
| prazo_tipo_dias | text | Não | - |
| data_intimacao | date | Não | - |
| data_limite | date | Não | - |
| fundamentacao_legal | text | Não | - |
| tem_determinacao | boolean | Não | false |
| determinacoes | jsonb | Não | - |
| requer_manifestacao | boolean | Não | false |
| acoes_sugeridas | jsonb | Não | - |
| template_sugerido | text | Não | - |
| confianca_analise | numeric | Não | - |
| metadados_extras | jsonb | Não | - |
| processado_em | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `sentimento`: sentimento = ANY (ARRAY['favoravel'::text, 'desfavoravel'::text, 'neutro'::text])
- `prazo_tipo_dias`: prazo_tipo_dias = ANY (ARRAY['uteis'::text, 'corridos'::text])

---

### publicacoes_tratamentos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| publicacao_id | uuid | Sim | - |
| processado_por | uuid | Sim | - |
| acao_tomada | text | Sim | - |
| evento_id | uuid | Não | - |
| observacoes | text | Não | - |
| editou_sugestao | boolean | Não | false |
| tempo_processamento_segundos | integer | Não | - |
| processado_em | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `acao_tomada`: acao_tomada = ANY (ARRAY['prazo_criado'::text, 'andamento_registrado'::text, 'tarefa_criada'::text, 'descartada'::text])

---

### publicacoes_historico

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| publicacao_id | uuid | Sim | - |
| user_id | uuid | Não | - |
| acao | text | Sim | - |
| detalhes | jsonb | Não | - |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `acao`: acao = ANY (ARRAY['recebida'::text, 'analisada_ia'::text, 'visualizada'::text, 'editada'::text, 'processada'::text, 'descartada'::text, 'vinculada'::text])

---

### publicacoes_sincronizacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| tipo | text | Sim | - |
| data_inicio | timestamp with time zone | Não | now() |
| data_fim | timestamp with time zone | Não | - |
| publicacoes_novas | integer | Não | 0 |
| publicacoes_atualizadas | integer | Não | 0 |
| sucesso | boolean | Não | false |
| erro_mensagem | text | Não | - |
| triggered_by | uuid | Não | - |
| associado_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['automatica'::text, 'manual'::text])

---

### publicacoes_notificacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| publicacao_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| metodo | text | Sim | - |
| enviado | boolean | Não | false |
| enviado_em | timestamp with time zone | Não | - |
| lido | boolean | Não | false |
| lido_em | timestamp with time zone | Não | - |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `metodo`: metodo = ANY (ARRAY['email'::text, 'push'::text, 'whatsapp'::text])

---

### publicacoes_associados

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| oab_numero | text | Sim | - |
| oab_uf | text | Sim | SP::text |
| aasp_chave | text | Sim | - |
| ativo | boolean | Não | true |
| ultima_sync | timestamp with time zone | Não | - |
| publicacoes_sync_count | integer | Não | 0 |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `aasp_chave`: Chave API individual do associado na AASP
- `ultima_sync`: Data/hora da última sincronização bem-sucedida
- `publicacoes_sync_count`: Total de publicações sincronizadas para este associado

---

### publicacoes_termos_escavador

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| termo | text | Sim | - |
| descricao | text | Não | - |
| variacoes | _text[] | Não | {}::text[] |
| termos_auxiliares | jsonb | Não | []::jsonb |
| origens_ids | _int4[] | Não | {}::integer[] |
| escavador_monitoramento_id | text | Não | - |
| escavador_status | text | Não | pendente::text |
| escavador_erro | text | Não | - |
| total_aparicoes | integer | Não | 0 |
| ultima_aparicao | timestamp with time zone | Não | - |
| ultima_sync | timestamp with time zone | Não | - |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Notas**:
- `termo`: Termo a ser monitorado (nome do advogado, escritório, etc)
- `variacoes`: Variações do termo (ex: João Silva, J. Silva)
- `termos_auxiliares`: Filtros adicionais no formato [["deve conter", "termo"], ["não deve conter", "termo"]]
- `origens_ids`: IDs dos diários oficiais no Escavador (vazio = todos)
- `escavador_monitoramento_id`: ID do monitoramento criado no Escavador

**Constraints**:
- `escavador_status`: escavador_status = ANY (ARRAY['pendente'::text, 'ativo'::text, 'pausado'::text, 'erro'::text, 'removido'::text])

---

### publicacoes_sync_escavador

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| termo_id | uuid | Não | - |
| tipo | text | Sim | - |
| data_inicio | timestamp with time zone | Sim | now() |
| data_fim | timestamp with time zone | Não | - |
| publicacoes_novas | integer | Não | 0 |
| publicacoes_duplicadas | integer | Não | 0 |
| publicacoes_vinculadas | integer | Não | 0 |
| sucesso | boolean | Não | - |
| erro_mensagem | text | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['manual'::text, 'automatica'::text, 'callback'::text])

---

