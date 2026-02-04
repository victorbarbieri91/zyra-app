# Migrações do Banco de Dados

## Estrutura

```
migrations/
├── README.md              # Este arquivo
├── _archive/              # Migrações históricas (92 arquivos)
└── [novas migrações]      # Apenas novas migrações a partir de agora
```

## Histórico

As **92 migrações originais** estão arquivadas em `_archive/`. Elas representam a evolução do banco de dados desde janeiro de 2025 até fevereiro de 2026.

**IMPORTANTE**: Essas migrações já foram aplicadas em produção. A pasta `_archive/` serve apenas como histórico/documentação.

## Para Novos Ambientes

Se você precisa criar o banco do zero (ambiente de desenvolvimento novo):

1. Use o Supabase Dashboard para criar o projeto
2. Execute o schema consolidado disponível em `docs/DATABASE_COMPLETO.md`
3. Ou restaure de um backup de produção

## Criando Novas Migrações

Use o padrão de nomenclatura:

```
YYYYMMDDHHMMSS_descricao_em_snake_case.sql
```

Exemplo:
```
20260205100000_add_nova_coluna_processos.sql
```

### Via MCP Supabase (Recomendado)

```
mcp__supabase__apply_migration({
  name: "add_nova_coluna_processos",
  query: "ALTER TABLE processos_processos ADD COLUMN nova_coluna text;"
})
```

### Boas Práticas

1. **Uma migração por mudança lógica** - Não misturar alterações de módulos diferentes
2. **Sempre reversível** - Pensar em como desfazer se necessário
3. **Testar localmente** - Usar Supabase local antes de aplicar em produção
4. **RLS obrigatório** - Toda nova tabela DEVE ter RLS habilitado
5. **Documentar** - Atualizar `docs/DATABASE_COMPLETO.md` após mudanças estruturais

## Migrações Arquivadas

Total: 92 arquivos em `_archive/`

Período: Janeiro 2025 - Fevereiro 2026

Módulos cobertos:
- Core (profiles, escritorios, permissões)
- CRM (pessoas, oportunidades)
- Processos (processos, movimentações, depósitos)
- Agenda (eventos, tarefas, audiências, recorrências)
- Financeiro (contratos, receitas, despesas, timesheet, faturamento)
- Publicações (AASP, Escavador, análises)
- Consultivo (consultas)
- Cartões de Crédito
- Portfolio (produtos, projetos)
- Sistema (tags, timers, centro de comando)

## Última Migração Aplicada

```
20260202210000_fix_get_valor_hora_efetivo_usar_valor_contrato.sql
```
