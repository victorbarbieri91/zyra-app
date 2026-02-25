# Relações entre Módulos — Mapa de Navegação

> Como os módulos se conectam e quando usar JOINs.

## Mapa de Relações

```
                    ┌─────────────┐
                    │  escritorios │
                    └──────┬──────┘
                           │ escritorio_id (todas as tabelas)
                           ▼
┌──────────┐    ┌──────────────────┐    ┌────────────┐
│ profiles │◄───│ processos_processos│───►│ crm_pessoas│
│(advogados)│    │   (hub central)   │    │ (clientes) │
└─────┬────┘    └────────┬─────────┘    └────────────┘
      │                  │
      │    ┌─────────────┼─────────────┐
      │    ▼             ▼             ▼
      │ ┌──────────┐ ┌──────────┐ ┌──────────────┐
      │ │ tarefas  │ │ eventos  │ │ audiencias   │
      │ └──────────┘ └──────────┘ └──────────────┘
      │         │           │             │
      │         └───────────┼─────────────┘
      │                     ▼
      │            ┌────────────────────┐
      │            │v_agenda_consolidada│ (view unificada)
      │            └────────────────────┘
      │
      ├────────► financeiro_timesheet
      │              (horas × valor_hora)
      │                    │
      │                    ▼
      │          financeiro_faturamento_faturas
      │
      └────────► financeiro_contratos_honorarios
                     (define como cobrar)
```

## JOINs Mais Comuns

### Processo com cliente e responsável
```sql
SELECT pp.numero_cnj, CONCAT(pp.autor, ' x ', pp.reu) as partes,
  c.nome_completo as cliente, p.nome_completo as responsavel
FROM processos_processos pp
LEFT JOIN crm_pessoas c ON c.id = pp.cliente_id
LEFT JOIN profiles p ON p.id = pp.responsavel_id
WHERE pp.escritorio_id = '{escritorio_id}'
```

### Tarefa com responsável
```sql
SELECT t.titulo, t.tipo, t.status, t.prioridade,
  TO_CHAR(t.data_inicio, 'DD/MM/YYYY') as data,
  p.nome_completo as responsavel
FROM agenda_tarefas t
LEFT JOIN profiles p ON p.id = t.responsavel_id
WHERE t.escritorio_id = '{escritorio_id}'
```

### Timesheet com advogado e processo
```sql
SELECT ts.data, ts.horas, ts.descricao,
  p.nome_completo as advogado,
  CONCAT(pp.autor, ' x ', pp.reu) as caso
FROM financeiro_timesheet ts
LEFT JOIN profiles p ON p.id = ts.user_id
LEFT JOIN processos_processos pp ON pp.id = ts.processo_id
WHERE ts.escritorio_id = '{escritorio_id}'
```

## Quando Usar Cada View

- **v_agenda_consolidada**: quando precisa misturar tarefas + eventos + audiências em uma lista só. Já tem responsavel_nome resolvido. SOMENTE LEITURA.
- **v_processos_dashboard**: visão resumida dos processos para dashboard. SOMENTE LEITURA.
- **v_lancamentos_prontos_faturar**: timesheet e honorários pendentes de faturamento. SOMENTE LEITURA.
- **v_prazos_vencendo**: tarefas com prazo próximo do vencimento. SOMENTE LEITURA.

## Dicas de Performance

- Para agenda do dia: preferir v_agenda_consolidada (uma query em vez de 3)
- Para listas de processos: incluir LIMIT e ORDER BY updated_at DESC
- Para buscar por nome: usar ILIKE '%termo%' (case-insensitive)
- Para datas: usar TO_CHAR com timezone 'America/Sao_Paulo'
