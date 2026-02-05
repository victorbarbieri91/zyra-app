# Módulo: Portfolio

> Gerado automaticamente em: 2026-02-05
> Tabelas: 13

## Descrição
Produtos e projetos

---

## Tabelas

### portfolio_produtos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| codigo | text | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| descricao_comercial | text | Não | - |
| area_juridica | text | Sim | - |
| categoria | text | Não | - |
| tags | _text[] | Não | {}::text[] |
| icone | text | Não | - |
| cor | text | Não | - |
| imagem_url | text | Não | - |
| status | text | Sim | rascunho::text |
| visivel_catalogo | boolean | Não | false |
| duracao_estimada_dias | integer | Não | - |
| complexidade | text | Não | - |
| versao_atual | integer | Não | 1 |
| created_at | timestamp with time zone | Sim | now() |
| updated_at | timestamp with time zone | Sim | now() |
| created_by | uuid | Não | - |

**Constraints**:
- `area_juridica`: area_juridica = ANY (ARRAY['tributario'::text, 'societario'::text, 'trabalhista'::text, 'civel'::text, 'outro'::text])
- `status`: status = ANY (ARRAY['rascunho'::text, 'ativo'::text, 'inativo'::text, 'arquivado'::text])
- `complexidade`: complexidade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text])

---

### portfolio_produtos_fases

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| produto_id | uuid | Sim | - |
| ordem | integer | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| duracao_estimada_dias | integer | Não | - |
| prazo_tipo | text | Não | dias_uteis::text |
| fase_dependencia_id | uuid | Não | - |
| criar_evento_agenda | boolean | Não | false |
| evento_titulo_template | text | Não | - |
| evento_descricao_template | text | Não | - |
| cor | text | Não | - |
| icone | text | Não | - |
| created_at | timestamp with time zone | Sim | now() |

**Constraints**:
- `prazo_tipo`: prazo_tipo = ANY (ARRAY['dias_corridos'::text, 'dias_uteis'::text])

---

### portfolio_produtos_checklist

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| fase_id | uuid | Sim | - |
| ordem | integer | Sim | - |
| item | text | Sim | - |
| obrigatorio | boolean | Não | false |
| criar_tarefa | boolean | Não | false |
| tarefa_prazo_dias | integer | Não | - |
| created_at | timestamp with time zone | Sim | now() |

---

### portfolio_produtos_equipe_papeis

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| produto_id | uuid | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| obrigatorio | boolean | Não | false |
| quantidade_minima | integer | Não | 1 |
| habilidades_requeridas | _text[] | Não | {}::text[] |
| created_at | timestamp with time zone | Sim | now() |

---

### portfolio_produtos_precos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| produto_id | uuid | Sim | - |
| tipo | text | Sim | - |
| valor_fixo | numeric | Não | - |
| valor_minimo | numeric | Não | - |
| valor_maximo | numeric | Não | - |
| valor_hora | numeric | Não | - |
| horas_estimadas | numeric | Não | - |
| percentual_exito | numeric | Não | - |
| valores_por_fase | jsonb | Não | - |
| nome_opcao | text | Não | - |
| descricao | text | Não | - |
| ativo | boolean | Não | true |
| padrao | boolean | Não | false |
| created_at | timestamp with time zone | Sim | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['fixo'::text, 'faixa'::text, 'por_fase'::text, 'hora'::text, 'exito'::text])

---

### portfolio_produtos_recursos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| produto_id | uuid | Sim | - |
| tipo | text | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| arquivo_url | text | Não | - |
| arquivo_nome | text | Não | - |
| arquivo_tipo | text | Não | - |
| fase_id | uuid | Não | - |
| created_at | timestamp with time zone | Sim | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['template'::text, 'checklist'::text, 'modelo'::text, 'referencia'::text, 'material_apoio'::text])

---

### portfolio_produtos_versoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| produto_id | uuid | Sim | - |
| versao | integer | Sim | - |
| snapshot | jsonb | Sim | - |
| alteracoes | text | Não | - |
| motivo | text | Não | - |
| created_at | timestamp with time zone | Sim | now() |
| created_by | uuid | Não | - |

---

### portfolio_projetos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| produto_id | uuid | Sim | - |
| produto_versao | integer | Sim | - |
| cliente_id | uuid | Sim | - |
| codigo | text | Sim | - |
| nome | text | Sim | - |
| processo_id | uuid | Não | - |
| contrato_id | uuid | Não | - |
| preco_selecionado_id | uuid | Não | - |
| valor_negociado | numeric | Não | - |
| status | text | Sim | em_andamento::text |
| progresso_percentual | integer | Não | 0 |
| data_inicio | date | Não | - |
| data_prevista_conclusao | date | Não | - |
| data_conclusao | date | Não | - |
| resultado | text | Não | - |
| observacoes_resultado | text | Não | - |
| responsavel_id | uuid | Sim | - |
| observacoes | text | Não | - |
| tags | _text[] | Não | {}::text[] |
| created_at | timestamp with time zone | Sim | now() |
| updated_at | timestamp with time zone | Sim | now() |
| created_by | uuid | Não | - |

**Constraints**:
- `status`: status = ANY (ARRAY['rascunho'::text, 'em_andamento'::text, 'pausado'::text, 'concluido'::text, 'cancelado'::text])
- `progresso_percentual`: progresso_percentual >= 0 AND progresso_percentual <= 100
- `resultado`: resultado = ANY (ARRAY['sucesso'::text, 'parcial'::text, 'insucesso'::text])

---

### portfolio_projetos_fases

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| projeto_id | uuid | Sim | - |
| fase_produto_id | uuid | Não | - |
| ordem | integer | Sim | - |
| nome | text | Sim | - |
| descricao | text | Não | - |
| status | text | Sim | pendente::text |
| progresso_percentual | integer | Não | 0 |
| data_inicio_prevista | date | Não | - |
| data_fim_prevista | date | Não | - |
| data_inicio_real | date | Não | - |
| data_fim_real | date | Não | - |
| evento_agenda_id | uuid | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Sim | now() |
| updated_at | timestamp with time zone | Sim | now() |

**Constraints**:
- `status`: status = ANY (ARRAY['pendente'::text, 'em_andamento'::text, 'concluida'::text, 'pulada'::text])
- `progresso_percentual`: progresso_percentual >= 0 AND progresso_percentual <= 100

---

### portfolio_projetos_fases_checklist

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| fase_projeto_id | uuid | Sim | - |
| checklist_produto_id | uuid | Não | - |
| ordem | integer | Sim | - |
| item | text | Sim | - |
| obrigatorio | boolean | Não | false |
| concluido | boolean | Não | false |
| concluido_em | timestamp with time zone | Não | - |
| concluido_por | uuid | Não | - |
| tarefa_id | uuid | Não | - |
| created_at | timestamp with time zone | Sim | now() |

---

### portfolio_projetos_equipe

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| projeto_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| papel_id | uuid | Não | - |
| papel_nome | text | Sim | - |
| pode_editar | boolean | Não | true |
| recebe_notificacoes | boolean | Não | true |
| created_at | timestamp with time zone | Sim | now() |

---

### portfolio_projetos_aprendizados

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| projeto_id | uuid | Sim | - |
| tipo | text | Sim | - |
| titulo | text | Sim | - |
| conteudo | text | Sim | - |
| categoria | text | Não | - |
| impacto | text | Não | - |
| fase_projeto_id | uuid | Não | - |
| aplicar_ao_produto | boolean | Não | false |
| aplicado_ao_produto | boolean | Não | false |
| aplicado_em | timestamp with time zone | Não | - |
| tags | _text[] | Não | {}::text[] |
| created_at | timestamp with time zone | Sim | now() |
| created_by | uuid | Não | - |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['nota_livre'::text, 'problema'::text, 'solucao'::text, 'melhoria'::text, 'licao_aprendida'::text])
- `impacto`: impacto = ANY (ARRAY['baixo'::text, 'medio'::text, 'alto'::text])

---

### portfolio_metricas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| produto_id | uuid | Não | - |
| periodo | text | Sim | - |
| ano | integer | Não | - |
| mes | integer | Não | - |
| total_execucoes | integer | Não | 0 |
| execucoes_concluidas | integer | Não | 0 |
| execucoes_em_andamento | integer | Não | 0 |
| execucoes_canceladas | integer | Não | 0 |
| taxa_sucesso | numeric | Não | - |
| duracao_media_dias | numeric | Não | - |
| duracao_minima_dias | integer | Não | - |
| duracao_maxima_dias | integer | Não | - |
| receita_total | numeric | Não | 0 |
| receita_media | numeric | Não | - |
| total_aprendizados | integer | Não | 0 |
| calculado_em | timestamp with time zone | Sim | now() |

**Constraints**:
- `periodo`: periodo = ANY (ARRAY['total'::text, 'ano'::text, 'mes'::text])

---

