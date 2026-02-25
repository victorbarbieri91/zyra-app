# Knowledge Base do Agente - Zyra Legal

> Regras de negócio, workflows e conhecimento de domínio para o RAG do Centro de Comando.
> Estrutura de tabelas (colunas, tipos, constraints) é obtida dinamicamente via tool `descobrir_estrutura`.
> Atualizado em: 2026-02-25

## Arquivos

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | [01-workflows.md](./01-workflows.md) | Passo a passo: criar tarefa, evento, processo, reagendar, etc. |
| 2 | [02-regras-negocio.md](./02-regras-negocio.md) | Regras não deriváveis do schema: contratos, faturamento, CRM vs profiles |
| 3 | [03-glossario.md](./03-glossario.md) | Termos jurídicos e mapeamento linguagem natural → tabelas |
| 4 | [04-relacoes.md](./04-relacoes.md) | Mapa de relações entre módulos, JOINs comuns |
| 5 | [05-views-queries.md](./05-views-queries.md) | Views disponíveis, padrões de query SQL |
| 6 | [06-erros-comuns.md](./06-erros-comuns.md) | Erros frequentes e como evitá-los, autocorreção |

## Arquitetura de Conhecimento

O agente usa 3 fontes de informação:

1. **Estrutura do banco** → tool `descobrir_estrutura` (sempre atual, consulta direto do banco)
2. **Regras de negócio** → Knowledge Base RAG (estes arquivos, indexados com embeddings)
3. **Preferências do usuário** → Memórias cross-sessão (aprendidas automaticamente)

## Atualização

Para reindexar a knowledge base após editar estes arquivos:

```bash
npx ts-node scripts/seed-knowledge-base.ts
```
