# Visão Geral do Banco de Dados

O Zyra Legal utiliza PostgreSQL via Supabase com ~115 tabelas organizadas em módulos funcionais.

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL + RLS + Triggers + Functions + Real-time + Storage      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│  Core   │                 │  CRM    │                 │Processos│
│profiles │◄───────────────►│clientes │◄───────────────►│processos│
│escritór.│                 │pessoas  │                 │partes   │
└─────────┘                 └─────────┘                 └─────────┘
    │                             │                             │
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│Financ.  │◄───────────────►│ Agenda  │◄───────────────►│Publicaç.│
│contratos│                 │ eventos │                 │analises │
│faturas  │                 │ tarefas │                 │config   │
└─────────┘                 └─────────┘                 └─────────┘
```

## Tabelas por Módulo

### 1. Core (Autenticação e Escritórios) - 8 tabelas
Tabelas fundamentais do sistema que são referenciadas por quase todos os outros módulos.

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuários (estende auth.users) |
| `escritorios` | Escritórios de advocacia |
| `escritorios_usuarios` | Vínculo usuário-escritório |
| `escritorios_usuarios_ativo` | Escritório ativo do usuário |
| `escritorios_cargos` | Cargos dentro do escritório |
| `escritorios_cargos_permissoes` | Permissões por cargo |
| `escritorios_permissoes` | Permissões do sistema |
| `escritorios_convites` | Convites para novos usuários |
| `user_escritorios_roles` | Roles de usuário por escritório |

**Arquivo detalhado**: [database/01-core.md](database/01-core.md)

### 2. CRM - 10 tabelas
Gestão de clientes, contatos, oportunidades e interações.

| Tabela | Descrição |
|--------|-----------|
| `crm_pessoas` | Cadastro central de pessoas (física/jurídica) |
| `crm_clientes_contatos` | Contatos dos clientes |
| `crm_clientes_contatos_backup` | Backup de contatos |
| `crm_clientes_backup` | Backup de clientes |
| `crm_interacoes` | Histórico de interações |
| `crm_interacoes_anexos` | Anexos das interações |
| `crm_oportunidades` | Pipeline de vendas |
| `crm_oportunidades_atividades` | Atividades das oportunidades |
| `crm_funil_etapas` | Etapas do funil de vendas |
| `crm_relacionamentos` | Relações entre pessoas |

**Arquivo detalhado**: [database/02-crm.md](database/02-crm.md)

### 3. Processos - 7 tabelas
Gestão de processos judiciais.

| Tabela | Descrição |
|--------|-----------|
| `processos_processos` | Processos judiciais |
| `processos_partes` | Partes do processo |
| `processos_movimentacoes` | Movimentações processuais |
| `processos_historico` | Histórico de alterações |
| `processos_depositos` | Depósitos judiciais |
| `processos_estrategia` | Estratégias do processo |
| `processos_jurisprudencias` | Jurisprudências vinculadas |

**Arquivo detalhado**: [database/03-processos.md](database/03-processos.md)

### 4. Agenda - 8 tabelas
Gestão de eventos, tarefas, audiências e prazos.

| Tabela | Descrição |
|--------|-----------|
| `agenda_eventos` | Eventos gerais |
| `agenda_eventos_tags` | Tags dos eventos |
| `agenda_tarefas` | Tarefas |
| `agenda_tarefas_tags` | Tags das tarefas |
| `agenda_tarefas_checklist` | Checklist das tarefas |
| `agenda_audiencias` | Audiências |
| `agenda_audiencias_tags` | Tags das audiências |
| `agenda_recorrencias` | Configuração de recorrência |

**Arquivo detalhado**: [database/04-agenda.md](database/04-agenda.md)

### 5. Financeiro - 25 tabelas
Gestão financeira completa: contratos, honorários, faturamento, contas.

| Tabela | Descrição |
|--------|-----------|
| `financeiro_contratos_honorarios` | Contratos de honorários |
| `financeiro_contratos_honorarios_config` | Configurações de contratos |
| `financeiro_contratos_formas` | Formas de cobrança |
| `financeiro_contratos_atos` | Atos vinculados a contratos |
| `financeiro_contratos_valores_cargo` | Valores por cargo |
| `financeiro_contratos_import_raw` | Importação de contratos |
| `financeiro_honorarios` | Honorários recebidos |
| `financeiro_honorarios_parcelas` | Parcelamento de honorários |
| `financeiro_honorarios_comissoes` | Comissões sobre honorários |
| `financeiro_honorarios_timeline` | Timeline de honorários |
| `financeiro_despesas` | Despesas do escritório |
| `financeiro_faturamento_faturas` | Faturas emitidas |
| `financeiro_faturamento_itens` | Itens das faturas |
| `financeiro_faturamento_cobrancas` | Cobranças |
| `financeiro_faturamento_agendamentos` | Agendamentos de faturamento |
| `financeiro_contas_bancarias` | Contas bancárias |
| `financeiro_contas_lancamentos` | Lançamentos bancários |
| `financeiro_contas_conciliacoes` | Conciliações bancárias |
| `financeiro_contas_importacoes` | Importação de extratos |
| `financeiro_contas_pagamentos` | Pagamentos |
| `financeiro_timesheet` | Registro de horas |
| `financeiro_metas` | Metas financeiras |
| `financeiro_provisoes` | Provisões |
| `financeiro_receitas_recorrentes` | Receitas recorrentes |
| `financeiro_alertas_cobranca` | Alertas de cobrança |
| `financeiro_atos_processuais_tipos` | Tipos de atos processuais |
| `financeiro_dashboard_metricas` | Cache de métricas |
| `financeiro_dashboard_notificacoes` | Notificações do dashboard |

**Arquivo detalhado**: [database/05-financeiro.md](database/05-financeiro.md)

### 6. Cartões de Crédito - 5 tabelas
Gestão de cartões corporativos e faturas.

| Tabela | Descrição |
|--------|-----------|
| `cartoes_credito` | Cartões cadastrados |
| `cartoes_credito_faturas` | Faturas dos cartões |
| `cartoes_credito_despesas` | Despesas do cartão |
| `cartoes_credito_parcelas` | Parcelas das despesas |
| `cartoes_credito_importacoes` | Histórico de importações |

**Arquivo detalhado**: [database/05-financeiro.md](database/05-financeiro.md)

### 7. Consultivo - 12 tabelas
Módulo de consultas jurídicas e pareceres.

| Tabela | Descrição |
|--------|-----------|
| `consultivo_consultas` | Consultas jurídicas |
| `consultivo_analise` | Análises das consultas |
| `consultivo_documentos` | Documentos das consultas |
| `consultivo_equipe` | Equipe designada |
| `consultivo_referencias` | Referências bibliográficas |
| `consultivo_tags` | Tags das consultas |
| `consultivo_timeline` | Timeline das consultas |
| `consultivo_timesheet` | Horas trabalhadas |
| `consultivo_templates_pareceres` | Templates de pareceres |
| `consultivo_clausulas_biblioteca` | Biblioteca de cláusulas |
| `consultivo_minutas_contratuais` | Minutas contratuais |
| `consultivo_precedentes_internos` | Precedentes internos |

**Arquivo detalhado**: [database/06-consultivo.md](database/06-consultivo.md)

### 8. Publicações - 8 tabelas
Monitoramento de publicações oficiais (AASP, DJE).

| Tabela | Descrição |
|--------|-----------|
| `publicacoes_publicacoes` | Publicações capturadas |
| `publicacoes_analises` | Análises IA das publicações |
| `publicacoes_config` | Configurações de monitoramento |
| `publicacoes_sincronizacoes` | Log de sincronizações |
| `publicacoes_tratamentos` | Tratamentos das publicações |
| `publicacoes_notificacoes` | Notificações enviadas |
| `publicacoes_historico` | Histórico de alterações |
| `publicacoes_associados` | Associados monitorados |

**Arquivo detalhado**: [database/07-publicacoes.md](database/07-publicacoes.md)

### 9. Documentos - 1 tabela
Sistema de gestão de documentos.

| Tabela | Descrição |
|--------|-----------|
| `documentos_tags` | Tags dos documentos |

**Arquivo detalhado**: [database/08-documentos.md](database/08-documentos.md)

### 10. Peças Jurídicas - 7 tabelas
Templates e peças processuais.

| Tabela | Descrição |
|--------|-----------|
| `pecas_pecas` | Peças jurídicas |
| `pecas_templates` | Templates de peças |
| `pecas_teses` | Teses jurídicas |
| `pecas_jurisprudencias` | Jurisprudências |
| `pecas_relacoes` | Relações entre peças |
| `pecas_templates_teses` | Vínculo template-tese |
| `pecas_templates_jurisprudencias` | Vínculo template-jurisp. |

**Arquivo detalhado**: [database/09-pecas.md](database/09-pecas.md)

### 11. Centro de Comando - 4 tabelas
Interface conversacional com IA.

| Tabela | Descrição |
|--------|-----------|
| `centro_comando_historico` | Histórico de conversas |
| `centro_comando_sessoes` | Sessões de chat |
| `centro_comando_favoritos` | Comandos favoritos |
| `centro_comando_acoes_pendentes` | Ações pendentes |

**Arquivo detalhado**: [database/10-centro-comando.md](database/10-centro-comando.md)

### 12. Portfolio - 11 tabelas
Gestão de produtos e projetos.

| Tabela | Descrição |
|--------|-----------|
| `portfolio_produtos` | Produtos/serviços |
| `portfolio_produtos_fases` | Fases dos produtos |
| `portfolio_produtos_checklist` | Checklist das fases |
| `portfolio_produtos_precos` | Tabela de preços |
| `portfolio_produtos_recursos` | Recursos necessários |
| `portfolio_produtos_versoes` | Versionamento |
| `portfolio_produtos_equipe_papeis` | Papéis da equipe |
| `portfolio_projetos` | Projetos em execução |
| `portfolio_projetos_fases` | Fases dos projetos |
| `portfolio_projetos_fases_checklist` | Checklist das fases |
| `portfolio_projetos_equipe` | Equipe do projeto |
| `portfolio_projetos_aprendizados` | Lições aprendidas |
| `portfolio_metricas` | Métricas de portfolio |

**Arquivo detalhado**: [database/11-portfolio.md](database/11-portfolio.md)

### 13. Integrações - 3 tabelas
Integrações externas (DataJud, Escavador).

| Tabela | Descrição |
|--------|-----------|
| `datajud_consultas` | Consultas ao DataJud |
| `escavador_config` | Configuração Escavador |
| `escavador_cache` | Cache de consultas |

**Arquivo detalhado**: [database/12-integracoes.md](database/12-integracoes.md)

### 14. Sistema - 7 tabelas
Tabelas de suporte do sistema.

| Tabela | Descrição |
|--------|-----------|
| `tags_master` | Tags globais |
| `timers_ativos` | Timers em execução |
| `onboarding_steps` | Passos do onboarding |
| `numeracao_modulos` | Configuração de numeração |
| `numeracao_sequencial` | Sequências numéricas |
| `migracao_jobs` | Jobs de migração |
| `migracao_historico` | Histórico de migrações |
| `dashboard_resumo_cache` | Cache do dashboard |

**Arquivo detalhado**: [database/13-sistema.md](database/13-sistema.md)

## Relacionamentos Principais

```
profiles ◄──────────────────────────────────────────────────┐
    │                                                        │
    └──► escritorios_usuarios ◄──► escritorios              │
                │                      │                     │
                │                      ├──► crm_pessoas     │
                │                      │        │            │
                │                      │        └──► processos_processos
                │                      │                 │
                │                      │                 ├──► processos_partes
                │                      │                 ├──► processos_movimentacoes
                │                      │                 └──► agenda_tarefas
                │                      │                          │
                │                      ├──► financeiro_contratos ◄┘
                │                      │        │
                │                      │        └──► financeiro_honorarios
                │                      │
                │                      └──► publicacoes_config
                │
                └──► agenda_eventos
```

## Policies RLS

Todas as tabelas seguem o padrão de RLS baseado em `escritorio_id`:

```sql
-- Padrão SELECT
CREATE POLICY "select_policy" ON tabela
FOR SELECT TO authenticated
USING (escritorio_id IN (
  SELECT escritorio_id FROM escritorios_usuarios
  WHERE user_id = auth.uid()
));

-- Padrão INSERT
CREATE POLICY "insert_policy" ON tabela
FOR INSERT TO authenticated
WITH CHECK (escritorio_id IN (
  SELECT escritorio_id FROM escritorios_usuarios
  WHERE user_id = auth.uid()
));
```

## Convenções de Nomenclatura

- **Tabelas**: `modulo_entidade` (ex: `agenda_eventos`)
- **Foreign Keys**: `entidade_id` (ex: `processo_id`)
- **Timestamps**: `created_at`, `updated_at`
- **Soft Delete**: `deleted_at` ou `ativo` boolean
- **Usuário criador**: `created_by` (referencia `profiles.id`)

---

**Última atualização**: 2025-01-21
