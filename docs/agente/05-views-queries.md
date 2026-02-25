# Views e Queries Comuns

> Padrões de consulta que o agente deve usar como base.

## Views Disponíveis (SOMENTE LEITURA)

### v_agenda_consolidada
Unifica agenda_tarefas + agenda_eventos + agenda_audiencias em uma lista.
Campos úteis: tipo_entidade, titulo, descricao, data_inicio, data_fim, status, prioridade, responsavel_nome, processo_numero, todos_responsaveis.
Já resolve nomes de responsáveis — não precisa de JOIN com profiles.

### v_processos_dashboard
Resumo dos processos para exibição rápida.
Inclui dados do cliente e responsável já resolvidos.

### v_lancamentos_prontos_faturar
Timesheet e honorários que ainda não foram faturados.
Útil para responder "o que tenho para faturar?" ou "horas não faturadas".

### v_prazos_vencendo
Tarefas com prazo próximo do vencimento.
Útil para alertas de prazos processuais urgentes.

## Padrões de Query

### Agenda do dia
```sql
SELECT titulo, tipo_entidade as tipo, status, prioridade,
  TO_CHAR(data_inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') as horario,
  responsavel_nome
FROM v_agenda_consolidada
WHERE escritorio_id = '{escritorio_id}'
  AND data_inicio::date = CURRENT_DATE
ORDER BY data_inicio LIMIT 20
```

### Tarefas pendentes do usuário
```sql
SELECT t.titulo, t.tipo, t.prioridade,
  TO_CHAR(t.prazo_data_limite, 'DD/MM/YYYY') as prazo,
  t.status
FROM agenda_tarefas t
WHERE t.escritorio_id = '{escritorio_id}'
  AND (t.responsavel_id = '{user_id}' OR '{user_id}' = ANY(t.responsaveis_ids))
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY t.prazo_data_limite ASC NULLS LAST LIMIT 20
```

### Processos ativos
```sql
SELECT pp.numero_cnj, CONCAT(pp.autor, ' x ', pp.reu) as partes,
  pp.area, pp.fase, pp.status, p.nome_completo as responsavel
FROM processos_processos pp
LEFT JOIN profiles p ON p.id = pp.responsavel_id
WHERE pp.escritorio_id = '{escritorio_id}' AND pp.status = 'ativo'
ORDER BY pp.updated_at DESC LIMIT 20
```

### Buscar usuário por nome (para obter UUID)
```sql
SELECT id, nome_completo FROM profiles
WHERE escritorio_id = '{escritorio_id}' AND nome_completo ILIKE '%nome%'
```

### Buscar cliente por nome
```sql
SELECT id, nome_completo, tipo_pessoa, email, telefone FROM crm_pessoas
WHERE escritorio_id = '{escritorio_id}' AND nome_completo ILIKE '%nome%'
```

### Horas do mês (timesheet)
```sql
SELECT ts.data, ts.horas, ts.descricao,
  CONCAT(pp.autor, ' x ', pp.reu) as caso
FROM financeiro_timesheet ts
LEFT JOIN processos_processos pp ON pp.id = ts.processo_id
WHERE ts.escritorio_id = '{escritorio_id}'
  AND ts.user_id = '{user_id}'
  AND ts.data >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY ts.data DESC
```

### Tarefas vencidas (prazos perdidos)
```sql
SELECT t.titulo, t.tipo, t.prioridade,
  TO_CHAR(t.prazo_data_limite, 'DD/MM/YYYY') as prazo_vencido,
  p.nome_completo as responsavel
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
WHERE t.escritorio_id = '{escritorio_id}'
  AND t.prazo_data_limite < CURRENT_DATE
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY t.prazo_data_limite ASC LIMIT 20
```

## Regras de Formatação

- NUNCA mostrar UUIDs ao usuário
- NUNCA SELECT * — sempre colunas específicas
- Datas: formato brasileiro dd/MM/yyyy ou dd/MM HH:mm
- Valores monetários: R$ com 2 casas decimais
- Prioridades com emoji: alta=vermelho, media=azul, baixa=branco
- Status com emoji: concluida=check, pendente=ampulheta, em_andamento=seta, cancelada=X
