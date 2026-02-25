# Módulo: Agenda

> Gerado automaticamente em: 2026-02-05
> Tabelas: 10

## Descrição
Eventos, tarefas e audiências

---

## Tabelas

### agenda_eventos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Não | - |
| titulo | text | Sim | - |
| tipo | text | Não | compromisso::text |
| data_inicio | timestamp with time zone | Sim | - |
| data_fim | timestamp with time zone | Não | - |
| dia_inteiro | boolean | Não | false |
| local | text | Não | - |
| descricao | text | Não | - |
| cliente_id | uuid | Não | - |
| processo_id | uuid | Não | - |
| criado_por | uuid | Não | auth.uid() |
| responsavel_id | uuid | Não | - |
| status | text | Não | agendado::text |
| recorrencia_id | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| consultivo_id | uuid | Não | - |

**Notas**:
- `consultivo_id`: FK para consultivo_consultas - NULL se não vinculado

**Constraints**:
- `tipo`: tipo = 'compromisso'::text
- `status`: status = ANY (ARRAY['agendado'::text, 'realizado'::text, 'cancelado'::text, 'remarcado'::text])

---

### agenda_tarefas

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| titulo | text | Sim | - |
| descricao | text | Não | - |
| tipo | text | Sim | outro::text |
| prioridade | text | Não | media::text |
| status | text | Não | pendente::text |
| data_inicio | date | Sim | - |
| data_fim | date | Não | - |
| data_conclusao | timestamp with time zone | Não | - |
| responsavel_id | uuid | Não | - |
| criado_por | uuid | Não | auth.uid() |
| prazo_dias_uteis | boolean | Não | true |
| prazo_data_limite | date | Não | - |
| recorrencia_id | uuid | Não | - |
| cor | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| processo_id | uuid | Não | - |
| consultivo_id | uuid | Não | - |
| horario_planejado_dia | time without time zone | Não | - |
| duracao_planejada_minutos | integer | Não | - |

**Notas**:
- `data_inicio`: Data de execução planejada da tarefa (sem horário)
- `data_fim`: Data limite/prazo fatal da tarefa (sem horário)
- `responsavel_id`: DEPRECATED: Usar agenda_tarefas_responsaveis
- `processo_id`: FK para processos_processos - NULL se não vinculado
- `consultivo_id`: FK para consultivo_consultas - NULL se não vinculado
- `horario_planejado_dia`: Horário planejado para visualização na grade diária (opcional)
- `duracao_planejada_minutos`: Duração estimada em minutos para visualização na grade diária (opcional)

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['prazo_processual'::text, 'acompanhamento'::text, 'follow_up'::text, 'administrativo'::text, 'outro'::text, 'fixa'::text])
- `prioridade`: prioridade = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text])
- `status`: status = ANY (ARRAY['pendente'::text, 'em_andamento'::text, 'em_pausa'::text, 'concluida'::text, 'cancelada'::text])

---

### agenda_audiencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| processo_id | uuid | Não | - |
| titulo | text | Sim | - |
| data_hora | timestamp with time zone | Sim | - |
| duracao_minutos | integer | Não | 60 |
| tipo_audiencia | text | Sim | - |
| modalidade | text | Sim | - |
| tribunal | text | Não | - |
| comarca | text | Não | - |
| vara | text | Não | - |
| forum | text | Não | - |
| sala | text | Não | - |
| endereco | text | Não | - |
| link_virtual | text | Não | - |
| plataforma | text | Não | - |
| responsavel_id | uuid | Não | - |
| criado_por | uuid | Não | auth.uid() |
| status | text | Não | agendada::text |
| resultado_tipo | text | Não | - |
| resultado_descricao | text | Não | - |
| preparativos_checklist | jsonb | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| consultivo_id | uuid | Não | - |
| descricao | text | Não | - |
| juiz | text | Não | - |
| promotor | text | Não | - |
| advogado_contrario | text | Não | - |
| cor | text | Não | #10B981::text |

**Notas**:
- `consultivo_id`: FK para consultivo_consultas - NULL se não vinculado
- `descricao`: Descrição detalhada da audiência
- `juiz`: Nome do juiz responsável
- `promotor`: Nome do promotor (se aplicável)
- `advogado_contrario`: Nome do advogado da parte contrária
- `cor`: Cor para exibição na agenda (hex code)

**Constraints**:
- `tipo_audiencia`: tipo_audiencia = ANY (ARRAY['inicial'::text, 'instrucao'::text, 'conciliacao'::text, 'julgamento'::text, 'una'::text, 'outra'::text])
- `modalidade`: modalidade = ANY (ARRAY['presencial'::text, 'virtual'::text])
- `status`: status = ANY (ARRAY['agendada'::text, 'realizada'::text, 'cancelada'::text, 'adiada'::text, 'remarcada'::text])
- `resultado_tipo`: resultado_tipo = ANY (ARRAY['acordo'::text, 'sentenca'::text, 'adiamento'::text, 'outro'::text])

---

### agenda_recorrencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| template_nome | text | Sim | - |
| template_descricao | text | Não | - |
| entidade_tipo | text | Sim | - |
| template_dados | jsonb | Sim | - |
| regra_frequencia | text | Sim | - |
| regra_intervalo | integer | Não | 1 |
| regra_dia_mes | integer | Não | - |
| regra_dias_semana | _int4[] | Não | - |
| regra_mes | integer | Não | - |
| regra_hora | time without time zone | Não | 09:00:00::time without time zone |
| ativo | boolean | Não | true |
| data_inicio | date | Sim | - |
| data_fim | date | Não | - |
| proxima_execucao | date | Não | - |
| ultima_execucao | date | Não | - |
| total_criados | integer | Não | 0 |
| criado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `entidade_tipo`: entidade_tipo = ANY (ARRAY['tarefa'::text, 'evento'::text])
- `regra_frequencia`: regra_frequencia = ANY (ARRAY['diaria'::text, 'semanal'::text, 'mensal'::text, 'anual'::text])
- `regra_dia_mes`: regra_dia_mes >= 1 AND regra_dia_mes <= 31
- `regra_mes`: regra_mes >= 1 AND regra_mes <= 12

---

### agenda_tarefas_tags

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| tarefa_id | uuid | Sim | - |
| tag_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

---

### agenda_eventos_tags

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| evento_id | uuid | Sim | - |
| tag_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

---

### agenda_audiencias_tags

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| audiencia_id | uuid | Sim | - |
| tag_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

---

### agenda_tarefas_responsaveis

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| tarefa_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| atribuido_em | timestamp with time zone | Não | now() |
| atribuido_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

---

### agenda_audiencias_responsaveis

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| audiencia_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| atribuido_em | timestamp with time zone | Não | now() |
| atribuido_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

---

### agenda_eventos_responsaveis

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| evento_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| atribuido_em | timestamp with time zone | Não | now() |
| atribuido_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

---

