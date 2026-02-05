# Documentação do Agente - Zyra Legal

> Documentação automática do banco de dados para RAG do Centro de Comando.
> Gerado em: 2026-02-05

## Módulos

| # | Módulo | Descrição | Arquivo |
|---|--------|-----------|---------|
| 1 | Core | Perfis, escritórios e permissões | [01-core.md](./01-core.md) |
| 2 | CRM | Pessoas, oportunidades e funil de vendas | [02-crm.md](./02-crm.md) |
| 3 | Processos | Processos judiciais e movimentações | [03-processos.md](./03-processos.md) |
| 4 | Agenda | Eventos, tarefas e audiências | [04-agenda.md](./04-agenda.md) |
| 5 | Financeiro | Contratos, faturamento, timesheet e receitas | [05-financeiro.md](./05-financeiro.md) |
| 6 | Publicacoes | Publicações AASP e análises | [06-publicacoes.md](./06-publicacoes.md) |
| 7 | Consultivo | Consultas e pareceres jurídicos | [07-consultivo.md](./07-consultivo.md) |
| 8 | Portfolio | Produtos e projetos | [08-portfolio.md](./08-portfolio.md) |
| 9 | Cartoes | Cartões de crédito corporativos | [09-cartoes.md](./09-cartoes.md) |
| 10 | Sistema | Tags, timers e configurações | [10-sistema.md](./10-sistema.md) |
| 11 | CentroComando | Centro de Comando e IA | [11-centrocomando.md](./11-centrocomando.md) |
| 12 | Pecas | Peças processuais e teses | [12-pecas.md](./12-pecas.md) |
| 13 | Documentos | Gestão de documentos | [13-documentos.md](./13-documentos.md) |
| 14 | Integracoes | Integrações DataJud e Escavador | [14-integracoes.md](./14-integracoes.md) |
| 15 | CorrecaoMonetaria | Índices econômicos e correção monetária | [15-correcaomonetaria.md](./15-correcaomonetaria.md) |
| 16 | Relatorios | Relatórios e templates | [16-relatorios.md](./16-relatorios.md) |
| 17 | Outros | Outros | [17-outros.md](./17-outros.md) |

## Como Usar

Esta documentação é indexada automaticamente pelo sistema RAG do Centro de Comando.
Cada módulo é dividido em chunks e armazenado com embeddings para busca semântica.

## Atualização

Para atualizar a documentação:

```bash
# 1. Buscar dados via MCP Supabase (list_tables)
# 2. Executar este script com o arquivo de resultado
node scripts/process-docs.js <caminho-arquivo-tabelas>
```

Após atualizar, execute o script de seed para reindexar:

```bash
npx ts-node scripts/seed-knowledge-base.ts
```
