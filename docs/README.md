# Documentação Zyra Legal

Esta documentação serve como referência completa para o desenvolvimento orientado por IA do sistema Zyra Legal. O objetivo é fornecer contexto suficiente para que qualquer alteração seja feita com conhecimento completo da estrutura e dependências do sistema.

## Estrutura da Documentação

```
docs/
├── README.md                    # Este arquivo - índice geral
├── DATABASE.md                  # Visão geral do banco de dados
├── database/                    # Documentação detalhada por módulo
│   ├── 01-core.md              # Tabelas core (profiles, escritorios)
│   ├── 02-crm.md               # Módulo CRM
│   ├── 03-processos.md         # Módulo Processos
│   ├── 04-agenda.md            # Módulo Agenda
│   ├── 05-financeiro.md        # Módulo Financeiro
│   ├── 06-consultivo.md        # Módulo Consultivo
│   ├── 07-publicacoes.md       # Módulo Publicações
│   ├── 08-documentos.md        # Módulo Documentos
│   ├── 09-pecas.md             # Módulo Peças/Templates
│   ├── 10-centro-comando.md    # Centro de Comando IA
│   ├── 11-portfolio.md         # Gestão de Portfolio
│   ├── 12-integracoes.md       # DataJud, Escavador, etc
│   └── 13-sistema.md           # Migração, Numeração, Tags
├── modules/                     # Estrutura dos módulos frontend
│   ├── 01-dashboard.md
│   ├── 02-crm.md
│   ├── 03-processos.md
│   ├── 04-agenda.md
│   ├── 05-financeiro.md
│   ├── 06-consultivo.md
│   ├── 07-publicacoes.md
│   └── 08-configuracoes.md
└── pages/                       # Documentação página por página
    ├── dashboard/
    ├── crm/
    ├── processos/
    ├── agenda/
    ├── financeiro/
    ├── consultivo/
    ├── publicacoes/
    └── configuracoes/
```

## Plano de Execução

### Fase 1: Banco de Dados (Prioridade Alta)
Documentar todas as tabelas, colunas, relacionamentos e RLS policies.

| Módulo | Tabelas | Status | Arquivo |
|--------|---------|--------|---------|
| Core (profiles, escritorios) | 8 | ✅ Completo | [01-core.md](database/01-core.md) |
| CRM | 10 | ⬜ Pendente | |
| Processos | 6 | ✅ Completo | [03-processos.md](database/03-processos.md) |
| Agenda | 8 | ⬜ Pendente | |
| Financeiro + Cartões | 30 | ✅ Completo | [05-financeiro.md](database/05-financeiro.md) |
| Consultivo | 12 | ⬜ Pendente | |
| Publicações | 8 | ⬜ Pendente | |
| Documentos | 1 | ⬜ Pendente | |
| Peças/Templates | 7 | ⬜ Pendente | |
| Centro de Comando | 4 | ⬜ Pendente | |
| Portfolio | 11 | ⬜ Pendente | |
| Integrações | 3 | ⬜ Pendente | |
| Sistema | 7 | ⬜ Pendente | |
| **Total** | **~114** | **3/13** | |

### Fase 2: Módulos Frontend
Documentar a estrutura de cada módulo, componentes e hooks.

| Módulo | Páginas | Status |
|--------|---------|--------|
| Dashboard | ~3 | ⬜ Pendente |
| CRM | ~5 | ⬜ Pendente |
| Processos | ~6 | ⬜ Pendente |
| Agenda | ~4 | ⬜ Pendente |
| Financeiro | ~8 | ⬜ Pendente |
| Consultivo | ~4 | ⬜ Pendente |
| Publicações | ~3 | ⬜ Pendente |
| Configurações | ~5 | ⬜ Pendente |

### Fase 3: Páginas Detalhadas
Para cada página, documentar:
- Propósito e funcionalidades
- Componentes utilizados
- Hooks e estado
- Tabelas do banco acessadas
- Fluxos de dados

## Como Usar Esta Documentação

### Para Desenvolvimento
1. Antes de modificar qualquer arquivo, consulte a documentação do módulo
2. Verifique as dependências e relacionamentos
3. Após alterações, atualize a documentação correspondente

### Para o Claude Code
O CLAUDE.md foi atualizado para referenciar esta documentação. O Claude deve:
1. Consultar `docs/database/` antes de modificar queries ou schemas
2. Consultar `docs/modules/` antes de modificar componentes
3. Consultar `docs/pages/` para contexto específico de cada página
4. Atualizar a documentação após fazer alterações

## Convenções

### Status
- ⬜ Pendente
- 🔄 Em Progresso
- ✅ Completo
- ⚠️ Precisa Revisão

### Formato de Documentação de Tabela
```markdown
## nome_tabela

**Descrição**: Breve descrição do propósito da tabela

**Relacionamentos**:
- `FK tabela_pai.id` → Esta é uma tabela filha de...
- `→ tabela_filha` via campo_id

**Colunas**:
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|

**RLS Policies**:
- policy_name: descrição

**Índices**:
- idx_name (colunas)

**Triggers**:
- trigger_name: descrição
```

### Formato de Documentação de Página
```markdown
## /caminho/da/pagina

**Arquivo**: `src/app/caminho/page.tsx`

**Descrição**: O que esta página faz

**Componentes**:
- ComponenteA - descrição
- ComponenteB - descrição

**Hooks**:
- useHookA - descrição

**Tabelas Acessadas**:
- tabela1 (leitura/escrita)
- tabela2 (leitura)

**Fluxos Principais**:
1. Fluxo de carregamento inicial
2. Fluxo de criação/edição
3. etc

**Dependências**:
- Arquivos que esta página importa
- Arquivos que dependem desta página
```

## Manutenção

Esta documentação deve ser mantida atualizada. Sempre que:
- Criar uma nova tabela → Documentar em `docs/database/`
- Criar uma nova página → Documentar em `docs/pages/`
- Modificar estrutura → Atualizar documentação correspondente
- Remover funcionalidade → Remover documentação obsoleta

---

**Última atualização**: 2025-01-21
**Responsável**: Equipe de Desenvolvimento
