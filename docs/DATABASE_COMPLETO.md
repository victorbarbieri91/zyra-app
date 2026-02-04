# Documentação Completa do Banco de Dados - Zyra Legal

> **Gerado em**: Fevereiro 2026
> **Total de Tabelas**: 108
> **Total de Views**: 38
> **Total de Functions**: 231
> **Total de Migrações**: 92

---

## Visão Geral da Arquitetura

### Princípios de Segurança

1. **RLS (Row Level Security)** habilitado em TODAS as tabelas
2. **Multitenancy** via `escritorio_id` - todos os dados filtrados por escritório
3. **Grupos de Escritórios** - função `user_has_access_to_grupo()` permite acesso a escritórios do mesmo grupo
4. **Permissões granulares** via `escritorios_cargos_permissoes`

### Padrão de Nomenclatura

- **Tabelas**: `modulo_entidade` (ex: `agenda_eventos`, `financeiro_receitas`)
- **Foreign Keys**: `entidade_id` (ex: `processo_id`, `cliente_id`)
- **Timestamps**: `created_at`, `updated_at`
- **Soft Deletes**: campo `ativo` boolean ou `deleted_at`
- **Criador**: `created_by` ou `criado_por` referenciando `profiles.id`

---

## Módulos do Sistema

### 1. CORE (8 tabelas)

Gerenciamento de usuários, escritórios e permissões.

#### profiles
Perfis de usuários do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK, referencia auth.users |
| nome_completo | text | NO | - | Nome completo do usuário |
| email | text | YES | - | Email do usuário |
| oab_numero | text | YES | - | Número da OAB |
| oab_uf | text | YES | - | UF da OAB |
| cpf | text | YES | - | CPF do usuário |
| telefone | text | YES | - | Telefone |
| avatar_url | text | YES | - | URL da foto |
| escritorio_id | uuid | YES | - | FK escritorios (legado) |
| ultimo_escritorio_ativo | uuid | YES | - | Último escritório acessado |
| role | text | YES | 'advogado' | Role padrão |
| primeiro_acesso | boolean | YES | true | Flag de primeiro acesso |
| onboarding_completo | boolean | YES | false | Onboarding finalizado |
| onboarding_etapa_atual | text | YES | - | Etapa atual do onboarding |
| onboarding_completado_em | timestamptz | YES | - | Data de conclusão |
| preferencias | jsonb | YES | {...} | Preferências do usuário |
| created_at | timestamptz | YES | now() | Data de criação |
| updated_at | timestamptz | YES | now() | Data de atualização |

#### escritorios
Escritórios/empresas do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| nome | text | NO | - | Nome do escritório |
| cnpj | text | YES | - | CNPJ |
| email | text | YES | - | Email de contato |
| telefone | text | YES | - | Telefone |
| site | text | YES | - | Website |
| descricao | text | YES | - | Descrição |
| logo_url | text | YES | - | URL do logo |
| endereco | jsonb | YES | - | Endereço completo |
| config | jsonb | YES | - | Configurações |
| plano | text | YES | 'free' | Plano de assinatura |
| max_usuarios | integer | YES | 5 | Limite de usuários |
| ativo | boolean | YES | true | Escritório ativo |
| owner_id | uuid | YES | - | FK profiles (dono) |
| grupo_id | uuid | NO | - | FK escritorios (grupo) |
| setup_completo | boolean | YES | false | Setup finalizado |
| setup_etapa_atual | text | YES | - | Etapa atual do setup |
| setup_completado_em | timestamptz | YES | - | Data de conclusão |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### escritorios_usuarios
Vínculo entre usuários e escritórios (N:N).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| user_id | uuid | NO | - | FK profiles |
| escritorio_id | uuid | NO | - | FK escritorios |
| role | text | NO | - | Role no escritório |
| cargo_id | uuid | YES | - | FK escritorios_cargos |
| is_owner | boolean | YES | false | É dono do escritório |
| ativo | boolean | YES | true | Vínculo ativo |
| convidado_por | uuid | YES | - | FK profiles |
| convidado_em | timestamptz | YES | now() | Data do convite |
| ultimo_acesso | timestamptz | YES | - | Último acesso |
| salario_base | numeric | YES | 0 | Salário base |
| percentual_comissao | numeric | YES | 0 | % de comissão |
| meta_horas_mensal | integer | YES | 160 | Meta de horas/mês |
| valor_hora | numeric | YES | 0 | Valor da hora |
| created_at | timestamptz | YES | now() | - |

#### escritorios_cargos
Cargos configurados por escritório.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| nome | text | NO | - | Nome do cargo |
| descricao | text | YES | - | Descrição |
| nivel | integer | YES | - | Nível hierárquico |
| cor | text | YES | - | Cor identificadora |
| valor_hora_padrao | numeric | YES | - | Valor/hora padrão |
| ativo | boolean | YES | true | Cargo ativo |
| sistema | boolean | YES | false | Cargo do sistema |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### escritorios_cargos_permissoes
Permissões associadas a cada cargo.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| cargo_id | uuid | NO | - | FK escritorios_cargos |
| modulo | text | NO | - | Nome do módulo |
| permissao | text | NO | - | Tipo de permissão |
| ativo | boolean | YES | true | Permissão ativa |
| created_at | timestamptz | YES | now() | - |

#### escritorios_convites
Convites para novos membros.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| email | text | NO | - | Email do convidado |
| cargo_id | uuid | YES | - | FK escritorios_cargos |
| role | text | NO | - | Role inicial |
| token | text | NO | - | Token único |
| status | text | YES | 'pendente' | Status do convite |
| convidado_por | uuid | NO | - | FK profiles |
| aceito_por | uuid | YES | - | FK profiles |
| expires_at | timestamptz | NO | - | Data de expiração |
| created_at | timestamptz | YES | now() | - |

---

### 2. CRM (2 tabelas principais)

Gestão de clientes, contatos e oportunidades.

#### crm_pessoas
Cadastro de pessoas (clientes, partes contrárias, testemunhas, etc).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| tipo_pessoa | enum | NO | 'pf' | PF ou PJ |
| tipo_cadastro | enum | NO | 'cliente' | cliente, parte_contraria, etc |
| nome_completo | text | NO | - | Nome/Razão social |
| nome_fantasia | text | YES | - | Nome fantasia |
| cpf_cnpj | text | YES | - | CPF ou CNPJ |
| email | text | YES | - | Email |
| telefone | text | YES | - | Telefone |
| cep | text | YES | - | CEP |
| logradouro | text | YES | - | Endereço |
| numero | text | YES | - | Número |
| complemento | text | YES | - | Complemento |
| bairro | text | YES | - | Bairro |
| cidade | text | YES | - | Cidade |
| uf | enum | YES | - | Estado |
| status | enum | NO | 'ativo' | Status da pessoa |
| origem | enum | YES | - | Origem do cadastro |
| indicado_por | uuid | YES | - | FK crm_pessoas |
| tags | text[] | YES | '{}' | Tags |
| observacoes | text | YES | - | Observações |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### crm_oportunidades
Funil de vendas/oportunidades.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| pessoa_id | uuid | NO | - | FK crm_pessoas |
| responsavel_id | uuid | NO | - | FK profiles |
| titulo | text | NO | - | Título da oportunidade |
| descricao | text | YES | - | Descrição |
| etapa | enum | NO | - | Etapa do funil |
| valor_estimado | numeric | YES | - | Valor estimado |
| probabilidade | integer | YES | - | % de probabilidade |
| data_previsao | date | YES | - | Previsão de fechamento |
| motivo_perda | text | YES | - | Motivo se perdida |
| indicado_por | uuid | YES | - | FK crm_pessoas |
| area_juridica | text | YES | - | Área jurídica |
| tags | text[] | YES | - | Tags |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 3. PROCESSOS (7 tabelas)

Gestão de processos judiciais.

#### processos_processos
Tabela principal de processos.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| numero_cnj | text | YES | - | Número CNJ |
| numero_pasta | text | YES | - | Número interno |
| tipo | text | NO | - | Tipo do processo |
| area | enum | NO | - | Área jurídica |
| fase | text | YES | - | Fase processual |
| instancia | text | YES | - | 1ª, 2ª, Superior |
| rito | text | YES | - | Rito processual |
| tribunal | text | YES | - | Tribunal |
| comarca | text | YES | - | Comarca |
| vara | text | YES | - | Vara |
| uf | text | YES | - | Estado |
| data_distribuicao | date | NO | - | Data de distribuição |
| cliente_id | uuid | NO | - | FK crm_pessoas |
| polo_cliente | text | NO | - | Autor/Réu |
| autor | text | YES | - | Nome do autor |
| reu | text | YES | - | Nome do réu |
| parte_contraria | text | YES | - | Parte contrária |
| responsavel_id | uuid | NO | - | FK profiles |
| colaboradores_ids | uuid[] | YES | - | Colaboradores |
| status | text | NO | 'ativo' | Status do processo |
| valor_causa | numeric | YES | - | Valor da causa |
| valor_acordo | numeric | YES | - | Valor do acordo |
| valor_condenacao | numeric | YES | - | Valor condenação |
| valor_atualizado | numeric | YES | - | Valor atualizado |
| provisao_sugerida | numeric | YES | - | Provisão sugerida |
| provisao_perda | text | YES | - | Classificação de risco |
| indice_correcao | text | YES | 'INPC' | Índice de correção |
| data_ultima_atualizacao_monetaria | date | YES | - | Última atualização |
| objeto_acao | text | YES | - | Objeto da ação |
| observacoes | text | YES | - | Observações |
| tags | text[] | YES | - | Tags |
| link_tribunal | text | YES | - | Link no tribunal |
| outros_numeros | jsonb | YES | '[]' | Outros números |
| contrato_id | uuid | YES | - | FK financeiro_contratos |
| modalidade_cobranca | text | YES | - | Modalidade de cobrança |
| consultivo_origem_id | uuid | YES | - | FK consultivo_consultas |
| escavador_monitoramento_id | integer | YES | - | ID no Escavador |
| data_transito_julgado | date | YES | - | Trânsito em julgado |
| data_arquivamento | date | YES | - | Data arquivamento |
| created_by | uuid | YES | - | FK profiles |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### processos_movimentacoes
Movimentações processuais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| processo_id | uuid | NO | - | FK processos_processos |
| data_movimento | date | NO | - | Data do movimento |
| tipo_descricao | text | YES | - | Tipo |
| descricao | text | NO | - | Descrição |
| fonte | text | YES | - | Fonte da informação |
| lida | boolean | YES | false | Foi lida |
| importante | boolean | YES | false | É importante |
| hash | text | YES | - | Hash para deduplicação |
| created_at | timestamptz | YES | now() | - |

#### processos_historico
Histórico de alterações do processo.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| processo_id | uuid | NO | - | FK processos_processos |
| user_id | uuid | YES | - | FK profiles |
| tipo | text | NO | - | Tipo de alteração |
| campo | text | YES | - | Campo alterado |
| valor_anterior | text | YES | - | Valor anterior |
| valor_novo | text | YES | - | Valor novo |
| descricao | text | YES | - | Descrição |
| created_at | timestamptz | YES | now() | - |

#### processos_depositos
Depósitos judiciais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| processo_id | uuid | NO | - | FK processos_processos |
| tipo | text | NO | - | Tipo do depósito |
| valor | numeric | NO | - | Valor depositado |
| data_deposito | date | NO | - | Data do depósito |
| banco | text | YES | - | Banco |
| agencia | text | YES | - | Agência |
| conta | text | YES | - | Conta |
| guia_numero | text | YES | - | Número da guia |
| status | text | NO | 'ativo' | Status |
| valor_levantado | numeric | YES | - | Valor levantado |
| data_levantamento | date | YES | - | Data levantamento |
| observacoes | text | YES | - | Observações |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 4. AGENDA (11 tabelas)

Sistema de eventos, tarefas e audiências.

#### agenda_eventos
Eventos/compromissos.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | YES | - | FK escritorios |
| titulo | text | NO | - | Título |
| tipo | text | YES | 'compromisso' | Tipo do evento |
| data_inicio | timestamptz | NO | - | Data/hora início |
| data_fim | timestamptz | YES | - | Data/hora fim |
| dia_inteiro | boolean | YES | false | Evento de dia inteiro |
| local | text | YES | - | Local |
| descricao | text | YES | - | Descrição |
| cliente_id | uuid | YES | - | FK crm_pessoas |
| processo_id | uuid | YES | - | FK processos_processos |
| consultivo_id | uuid | YES | - | FK consultivo_consultas |
| responsavel_id | uuid | YES | - | FK profiles |
| criado_por | uuid | YES | auth.uid() | FK profiles |
| status | text | YES | 'agendado' | Status |
| recorrencia_id | uuid | YES | - | FK agenda_recorrencias |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### agenda_tarefas
Tarefas com prazo.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| titulo | text | NO | - | Título |
| descricao | text | YES | - | Descrição |
| tipo | text | NO | 'outro' | Tipo da tarefa |
| prioridade | text | YES | 'media' | Prioridade |
| status | text | YES | 'pendente' | Status |
| data_inicio | date | NO | - | Data início |
| data_fim | date | YES | - | Data fim |
| prazo_data_limite | date | YES | - | Data limite |
| prazo_dias_uteis | boolean | YES | true | Prazo em dias úteis |
| data_conclusao | timestamptz | YES | - | Data de conclusão |
| responsavel_id | uuid | YES | - | FK profiles |
| criado_por | uuid | YES | auth.uid() | FK profiles |
| processo_id | uuid | YES | - | FK processos_processos |
| consultivo_id | uuid | YES | - | FK consultivo_consultas |
| recorrencia_id | uuid | YES | - | FK agenda_recorrencias |
| cor | text | YES | - | Cor |
| horario_planejado_dia | time | YES | - | Horário planejado |
| duracao_planejada_minutos | integer | YES | - | Duração planejada |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### agenda_audiencias
Audiências judiciais.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| processo_id | uuid | YES | - | FK processos_processos |
| consultivo_id | uuid | YES | - | FK consultivo_consultas |
| titulo | text | NO | - | Título |
| data_hora | timestamptz | NO | - | Data e hora |
| duracao_minutos | integer | YES | 60 | Duração em minutos |
| tipo_audiencia | text | NO | - | Tipo (instrução, conciliação, etc) |
| modalidade | text | NO | - | Presencial/Virtual |
| tribunal | text | YES | - | Tribunal |
| comarca | text | YES | - | Comarca |
| vara | text | YES | - | Vara |
| forum | text | YES | - | Fórum |
| sala | text | YES | - | Sala |
| endereco | text | YES | - | Endereço |
| link_virtual | text | YES | - | Link da audiência virtual |
| plataforma | text | YES | - | Plataforma (Zoom, Teams, etc) |
| responsavel_id | uuid | YES | - | FK profiles |
| criado_por | uuid | YES | auth.uid() | FK profiles |
| status | text | YES | 'agendada' | Status |
| resultado_tipo | text | YES | - | Tipo do resultado |
| resultado_descricao | text | YES | - | Descrição do resultado |
| juiz | text | YES | - | Nome do juiz |
| promotor | text | YES | - | Nome do promotor |
| advogado_contrario | text | YES | - | Advogado contrário |
| preparativos_checklist | jsonb | YES | - | Checklist de preparação |
| observacoes | text | YES | - | Observações |
| descricao | text | YES | - | Descrição |
| cor | text | YES | '#10B981' | Cor |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### agenda_recorrencias
Configuração de recorrência para eventos/tarefas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| tipo_entidade | text | NO | - | evento/tarefa |
| frequencia | text | NO | - | diaria/semanal/mensal/anual |
| intervalo | integer | YES | 1 | Intervalo entre repetições |
| dias_semana | integer[] | YES | - | Dias da semana |
| dia_mes | integer | YES | - | Dia do mês |
| mes_ano | integer | YES | - | Mês do ano |
| data_inicio | date | NO | - | Data de início |
| data_fim | date | YES | - | Data de fim |
| num_ocorrencias | integer | YES | - | Número de ocorrências |
| ocorrencias_geradas | integer | YES | 0 | Já geradas |
| ativo | boolean | YES | true | Ativo |
| criado_por | uuid | YES | - | FK profiles |
| template_dados | jsonb | YES | - | Dados do template |
| proxima_execucao | date | YES | - | Próxima execução |
| ultima_execucao | date | YES | - | Última execução |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 5. FINANCEIRO (19 tabelas)

Sistema financeiro completo.

#### financeiro_contratos_honorarios
Contratos de honorários.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| cliente_id | uuid | NO | - | FK crm_pessoas |
| escritorio_cobranca_id | uuid | YES | - | FK escritorios |
| numero_contrato | text | NO | - | Número do contrato |
| titulo | varchar | YES | - | Título |
| tipo_contrato | text | NO | - | Tipo do contrato |
| forma_cobranca | text | YES | 'fixo' | fixo/hora/ato/pasta/exito |
| data_inicio | date | NO | - | Data de início |
| data_fim | date | YES | - | Data de fim |
| valor_total | numeric | YES | - | Valor total |
| valor_atualizado | numeric | YES | - | Valor atualizado |
| descricao | text | YES | - | Descrição |
| clausulas | text | YES | - | Cláusulas |
| ativo | boolean | YES | true | Contrato ativo |
| horas_faturaveis | boolean | YES | true | Horas são faturáveis |
| config | jsonb | YES | '{}' | Configurações |
| formas_pagamento | jsonb | YES | '[]' | Formas de pagamento |
| atos | jsonb | YES | '[]' | Configuração de atos |
| valores_cargo | jsonb | YES | '[]' | Valores por cargo |
| grupo_clientes | jsonb | YES | - | Grupo de clientes |
| reajuste_ativo | boolean | YES | false | Reajuste automático |
| indice_reajuste | text | YES | 'INPC' | Índice de reajuste |
| data_ultimo_reajuste | date | YES | - | Último reajuste |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### financeiro_receitas
Receitas (honorários, parcelas, etc).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| cliente_id | uuid | YES | - | FK crm_pessoas |
| processo_id | uuid | YES | - | FK processos_processos |
| consulta_id | uuid | YES | - | FK consultivo_consultas |
| contrato_id | uuid | YES | - | FK financeiro_contratos |
| fatura_id | uuid | YES | - | FK financeiro_faturamento_faturas |
| tipo | enum | NO | - | honorario/parcela/avulso/saldo |
| categoria | enum | NO | - | Categoria |
| descricao | text | NO | - | Descrição |
| valor | numeric | NO | - | Valor |
| valor_pago | numeric | YES | 0 | Valor já pago |
| data_vencimento | date | NO | - | Vencimento |
| data_pagamento | date | YES | - | Data do pagamento |
| status | enum | NO | 'pendente' | Status |
| dias_atraso | integer | YES | 0 | Dias em atraso |
| parcelado | boolean | YES | false | É parcelado |
| parcela_atual | integer | YES | - | Parcela atual |
| total_parcelas | integer | YES | - | Total de parcelas |
| forma_pagamento | enum | YES | - | Forma de pagamento |
| conta_bancaria_id | uuid | YES | - | FK financeiro_contas_bancarias |
| comprovante_url | text | YES | - | URL do comprovante |
| observacoes | text | YES | - | Observações |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### financeiro_despesas
Despesas do escritório.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| processo_id | uuid | YES | - | FK processos_processos |
| consultivo_id | uuid | YES | - | FK consultivo_consultas |
| cliente_id | uuid | YES | - | FK crm_pessoas |
| categoria | enum | NO | - | Categoria |
| descricao | text | NO | - | Descrição |
| valor | numeric | NO | - | Valor |
| data_vencimento | date | NO | - | Vencimento |
| data_pagamento | date | YES | - | Data pagamento |
| status | enum | NO | 'pendente' | Status |
| fornecedor | text | YES | - | Fornecedor |
| forma_pagamento | enum | YES | - | Forma de pagamento |
| conta_bancaria_id | uuid | YES | - | FK financeiro_contas_bancarias |
| comprovante_url | text | YES | - | URL do comprovante |
| reembolsavel | boolean | YES | false | Reembolsável |
| reembolsado | boolean | YES | false | Foi reembolsado |
| reembolso_fatura_id | uuid | YES | - | FK da fatura de reembolso |
| recorrente | boolean | YES | false | É recorrente |
| recorrencia_config | jsonb | YES | - | Config de recorrência |
| observacoes | text | YES | - | Observações |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### financeiro_timesheet
Registro de horas trabalhadas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| user_id | uuid | NO | - | FK profiles |
| processo_id | uuid | YES | - | FK processos_processos |
| consulta_id | uuid | YES | - | FK consultivo_consultas |
| consultivo_id | uuid | YES | - | FK consultivo_consultas |
| tarefa_id | uuid | YES | - | FK agenda_tarefas |
| ato_tipo_id | uuid | YES | - | FK financeiro_atos_processuais_tipos |
| data_trabalho | date | NO | - | Data do trabalho |
| hora_inicio | timestamptz | YES | - | Hora início |
| hora_fim | timestamptz | YES | - | Hora fim |
| horas | numeric | NO | - | Total de horas |
| atividade | text | NO | - | Descrição da atividade |
| origem | text | YES | 'manual' | manual/timer |
| faturavel | boolean | YES | true | É faturável |
| faturavel_auto | boolean | YES | - | Faturável automático |
| faturavel_manual | boolean | YES | false | Faturável manual |
| faturado | boolean | YES | false | Foi faturado |
| fatura_id | uuid | YES | - | FK da fatura |
| faturado_em | timestamptz | YES | - | Data do faturamento |
| aprovado | boolean | YES | false | Foi aprovado |
| aprovado_por | uuid | YES | - | FK profiles |
| aprovado_em | timestamptz | YES | - | Data da aprovação |
| reprovado | boolean | YES | false | Foi reprovado |
| reprovado_por | uuid | YES | - | FK profiles |
| reprovado_em | timestamptz | YES | - | Data da reprovação |
| justificativa_reprovacao | text | YES | - | Justificativa |
| editado | boolean | YES | false | Foi editado |
| editado_em | timestamptz | YES | - | Data da edição |
| editado_por | uuid | YES | - | FK profiles |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### financeiro_faturamento_faturas
Faturas emitidas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| escritorio_cobranca_id | uuid | YES | - | FK escritorios |
| numero_fatura | text | NO | - | Número da fatura |
| cliente_id | uuid | NO | - | FK crm_pessoas |
| data_emissao | date | NO | CURRENT_DATE | Data de emissão |
| data_vencimento | date | NO | - | Vencimento |
| valor_total | numeric | NO | 0 | Valor total |
| descricao | text | YES | - | Descrição |
| observacoes | text | YES | - | Observações |
| forma_pagamento_preferencial | text | YES | - | Forma preferencial |
| parcelado | boolean | YES | false | É parcelado |
| numero_parcelas | integer | YES | - | Número de parcelas |
| itens | jsonb | YES | '[]' | Itens da fatura |
| cobrancas | jsonb | YES | '[]' | Histórico de cobranças |
| config_agendamento | jsonb | YES | - | Config de agendamento |
| pdf_url | text | YES | - | URL do PDF |
| status | text | NO | 'rascunho' | Status |
| enviada_em | timestamptz | YES | - | Data de envio |
| paga_em | timestamptz | YES | - | Data de pagamento |
| cancelada_em | timestamptz | YES | - | Data de cancelamento |
| cancelada_por | uuid | YES | - | FK profiles |
| motivo_cancelamento | text | YES | - | Motivo |
| gerada_automaticamente | boolean | YES | false | Gerada auto |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### financeiro_contas_bancarias
Contas bancárias.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| banco | text | NO | - | Nome do banco |
| agencia | text | YES | - | Agência |
| numero_conta | text | NO | - | Número da conta |
| tipo_conta | text | YES | 'corrente' | Tipo |
| titular | text | YES | - | Titular |
| saldo_inicial | numeric | YES | 0 | Saldo inicial |
| saldo_atual | numeric | YES | 0 | Saldo atual |
| conta_principal | boolean | YES | false | É a principal |
| data_abertura | date | YES | - | Data de abertura |
| ativa | boolean | YES | true | Conta ativa |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 6. PUBLICAÇÕES (10 tabelas)

Monitoramento de publicações oficiais (AASP, DJE, etc).

#### publicacoes_publicacoes
Publicações capturadas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| aasp_id | text | YES | - | ID no AASP |
| escavador_aparicao_id | text | YES | - | ID no Escavador |
| escavador_monitoramento_id | text | YES | - | ID monitoramento |
| data_publicacao | date | NO | - | Data da publicação |
| data_captura | timestamptz | YES | now() | Data de captura |
| tribunal | text | NO | - | Tribunal |
| vara | text | YES | - | Vara |
| tipo_publicacao | text | NO | - | Tipo |
| numero_processo | text | YES | - | Número do processo |
| processo_id | uuid | YES | - | FK processos_processos |
| cliente_id | uuid | YES | - | FK crm_pessoas |
| associado_id | uuid | YES | - | FK publicacoes_associados |
| partes | text[] | YES | - | Partes identificadas |
| texto_completo | text | NO | - | Texto da publicação |
| pdf_url | text | YES | - | URL do PDF |
| hash_conteudo | text | YES | - | Hash para deduplicação |
| status | text | YES | 'pendente' | Status |
| urgente | boolean | YES | false | É urgente |
| source | text | YES | 'manual' | Fonte |
| source_type | text | YES | 'aasp' | Tipo de fonte |
| agendamento_id | uuid | YES | - | ID do agendamento criado |
| agendamento_tipo | varchar | YES | - | Tipo do agendamento |
| duplicata_revisada | boolean | YES | false | Duplicata revisada |
| confianca_vinculacao | numeric | YES | 1.00 | Confiança da vinculação |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### publicacoes_analises
Análise de IA das publicações.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| publicacao_id | uuid | NO | - | FK publicacoes_publicacoes |
| resumo_executivo | text | YES | - | Resumo |
| tipo_decisao | text | YES | - | Tipo da decisão |
| sentimento | text | YES | - | Positivo/Negativo/Neutro |
| pontos_principais | jsonb | YES | - | Pontos principais |
| tem_prazo | boolean | YES | false | Tem prazo |
| tipo_prazo | text | YES | - | Tipo do prazo |
| prazo_dias | integer | YES | - | Prazo em dias |
| prazo_tipo_dias | text | YES | - | Úteis/Corridos |
| data_intimacao | date | YES | - | Data de intimação |
| data_limite | date | YES | - | Data limite |
| fundamentacao_legal | jsonb | YES | - | Fundamentação |
| tem_determinacao | boolean | YES | false | Tem determinação |
| determinacoes | jsonb | YES | - | Determinações |
| requer_manifestacao | boolean | YES | false | Requer manifestação |
| acoes_sugeridas | jsonb | YES | - | Ações sugeridas |
| template_sugerido | text | YES | - | Template sugerido |
| confianca_analise | numeric | YES | - | Confiança da análise |
| metadados_extras | jsonb | YES | - | Metadados extras |
| processado_em | timestamptz | YES | - | Data do processamento |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 7. CONSULTIVO (2 tabelas)

Consultas jurídicas consultivas.

#### consultivo_consultas
Consultas jurídicas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | uuid_generate_v4() | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| numero | text | YES | - | Número da consulta |
| titulo | text | NO | - | Título |
| descricao | text | YES | - | Descrição |
| area | text | NO | - | Área jurídica |
| cliente_id | uuid | NO | - | FK crm_pessoas |
| responsavel_id | uuid | NO | - | FK profiles |
| contrato_id | uuid | YES | - | FK financeiro_contratos |
| prioridade | text | NO | 'media' | Prioridade |
| prazo | date | YES | - | Prazo |
| status | enum | NO | 'ativo' | Status |
| anexos | jsonb | YES | '[]' | Anexos |
| andamentos | jsonb | YES | '[]' | Andamentos |
| created_by | uuid | YES | - | FK profiles |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 8. CARTÕES DE CRÉDITO (7 tabelas)

Gestão de cartões de crédito corporativos.

#### cartoes_credito
Cartões cadastrados.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| nome | text | NO | - | Nome/apelido do cartão |
| bandeira | text | YES | - | Bandeira |
| ultimos_digitos | text | YES | - | Últimos 4 dígitos |
| limite | numeric | YES | - | Limite |
| dia_fechamento | integer | NO | - | Dia do fechamento |
| dia_vencimento | integer | NO | - | Dia do vencimento |
| titular | text | YES | - | Titular |
| ativo | boolean | YES | true | Cartão ativo |
| cor | text | YES | - | Cor identificadora |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 9. PORTFOLIO (12 tabelas)

Produtos e projetos jurídicos padronizados.

#### portfolio_produtos
Produtos jurídicos.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| codigo | text | NO | - | Código único |
| nome | text | NO | - | Nome do produto |
| descricao | text | YES | - | Descrição técnica |
| descricao_comercial | text | YES | - | Descrição comercial |
| area_juridica | text | NO | - | Área jurídica |
| categoria | text | YES | - | Categoria |
| tags | text[] | YES | - | Tags |
| icone | text | YES | - | Ícone |
| cor | text | YES | - | Cor |
| status | text | YES | 'rascunho' | Status |
| visivel_catalogo | boolean | YES | false | Visível no catálogo |
| duracao_estimada_dias | integer | YES | - | Duração estimada |
| complexidade | text | YES | - | Complexidade |
| versao_atual | integer | YES | 1 | Versão atual |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### portfolio_projetos
Projetos em execução.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| produto_id | uuid | YES | - | FK portfolio_produtos |
| produto_versao | integer | YES | - | Versão do produto |
| codigo | text | NO | - | Código único |
| nome | text | NO | - | Nome do projeto |
| cliente_id | uuid | NO | - | FK crm_pessoas |
| responsavel_id | uuid | NO | - | FK profiles |
| processo_id | uuid | YES | - | FK processos_processos |
| status | text | NO | 'planejamento' | Status |
| progresso_percentual | integer | YES | 0 | % de progresso |
| data_inicio | date | YES | - | Data de início |
| data_prevista_conclusao | date | YES | - | Previsão de conclusão |
| data_conclusao | date | YES | - | Data de conclusão |
| valor_negociado | numeric | YES | - | Valor negociado |
| resultado | text | YES | - | Resultado |
| observacoes | text | YES | - | Observações |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

### 10. SISTEMA (7 tabelas)

Tabelas de suporte do sistema.

#### tags_master
Sistema de tags global.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| nome | text | NO | - | Nome da tag |
| cor | text | YES | - | Cor (hex) |
| cor_texto | text | YES | - | Cor do texto |
| categoria | text | YES | - | Categoria |
| modulo | text | NO | - | Módulo |
| descricao | text | YES | - | Descrição |
| ativo | boolean | YES | true | Tag ativa |
| sistema | boolean | YES | false | Tag do sistema |
| ordem | integer | YES | 0 | Ordem de exibição |
| created_by | uuid | YES | - | FK profiles |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

#### timers_ativos
Timers de trabalho em andamento.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | uuid | NO | - | PK |
| escritorio_id | uuid | NO | - | FK escritorios |
| user_id | uuid | NO | - | FK profiles |
| processo_id | uuid | YES | - | FK processos_processos |
| consulta_id | uuid | YES | - | FK consultivo_consultas |
| tarefa_id | uuid | YES | - | FK agenda_tarefas |
| titulo | text | NO | - | Título |
| descricao | text | YES | - | Descrição |
| hora_inicio | timestamptz | NO | - | Hora de início |
| hora_pausa | timestamptz | YES | - | Hora da pausa |
| segundos_acumulados | integer | YES | 0 | Segundos acumulados |
| status | text | YES | 'rodando' | Status |
| faturavel | boolean | YES | true | É faturável |
| cor | text | YES | - | Cor |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

---

## Views Principais

O sistema possui **38 views** para consultas otimizadas:

### Views de Agenda
- `v_agenda_consolidada` - Consolida tarefas, eventos e audiências

### Views de Dashboard
- `v_processos_dashboard` - Métricas de processos
- `v_publicacoes_dashboard` - Métricas de publicações
- `v_dashboard_financeiro_metricas` - Métricas financeiras

### Views de Processos
- `v_processos_com_movimentacoes` - Processos com última movimentação
- `v_processos_criticos` - Processos com movimentações importantes não lidas

### Views de Publicações
- `v_publicacoes_pendentes` - Publicações pendentes de análise
- `v_publicacoes_urgentes` - Publicações com prazo curto
- `v_publicacoes_completas` - View completa com análises

### Views Financeiras
- `v_contas_receber_pagar` - Contas a receber e pagar
- `v_lancamentos_prontos_faturar` - Itens prontos para faturamento
- `v_faturas_geradas` - Faturas com detalhes
- `v_timesheet_aprovacao` - Timesheet para aprovação
- `v_receitas_por_contrato` - Receitas agrupadas por contrato
- `v_saldos_contas_bancarias` - Saldos das contas

---

## Functions Principais

O sistema possui **231 functions**. As principais são:

### Autenticação e Permissões
- `user_has_access_to_grupo(escritorio_id)` - Verifica acesso ao grupo
- `user_belongs_to_escritorio(escritorio_id)` - Verifica vínculo com escritório
- `has_permission(modulo, permissao)` - Verifica permissão específica
- `get_my_permissions()` - Retorna permissões do usuário

### Financeiro
- `gerar_fatura_v3(...)` - Gera fatura com itens
- `receber_receita(...)` - Registra recebimento
- `aprovar_timesheet(...)` - Aprova lançamentos de timesheet
- `calcular_correcao_monetaria(...)` - Calcula correção monetária
- `get_valor_hora_efetivo(contrato_id, user_id)` - Retorna valor/hora efetivo

### Processos
- `create_processo(...)` - Cria processo com validações
- `add_movimentacao(...)` - Adiciona movimentação
- `atualizar_valor_processo(...)` - Atualiza valores com correção monetária

### Agenda
- `processar_recorrencias_diarias()` - Processa recorrências
- `calcular_data_prazo(...)` - Calcula prazo considerando dias úteis

### Triggers Importantes
- `gerar_hash_movimentacao` - Gera hash para deduplicação
- `trigger_atualizar_horas_acumuladas_ato` - Atualiza horas por ato
- `trigger_gerar_parcelas_receita` - Gera parcelas automaticamente
- `auto_seed_tags_for_new_escritorio` - Cria tags padrão para novo escritório

---

## Padrão de RLS (Row Level Security)

Todas as tabelas seguem o padrão:

```sql
-- SELECT: Acesso ao grupo
CREATE POLICY "select_policy" ON tabela
  FOR SELECT USING (user_has_access_to_grupo(escritorio_id));

-- INSERT: Verificação no with_check
CREATE POLICY "insert_policy" ON tabela
  FOR INSERT WITH CHECK (user_has_access_to_grupo(escritorio_id));

-- UPDATE: Acesso ao grupo + condições adicionais
CREATE POLICY "update_policy" ON tabela
  FOR UPDATE USING (user_has_access_to_grupo(escritorio_id) AND ...);

-- DELETE: Acesso ao grupo + condições adicionais
CREATE POLICY "delete_policy" ON tabela
  FOR DELETE USING (user_has_access_to_grupo(escritorio_id) AND ...);
```

A função `user_has_access_to_grupo(escritorio_id)` verifica se o usuário:
1. Pertence ao escritório especificado OU
2. Pertence a outro escritório do mesmo grupo (grupo_id)

---

## Enums do Sistema

### Área Jurídica
```sql
CREATE TYPE area_juridica_enum AS ENUM (
  'civel', 'trabalhista', 'tributario', 'previdenciario',
  'criminal', 'consumidor', 'ambiental', 'familia',
  'empresarial', 'administrativo', 'outros'
);
```

### Status de Receita
```sql
CREATE TYPE receita_status_enum AS ENUM (
  'pendente', 'pago', 'parcial', 'atrasado', 'cancelado'
);
```

### Tipo de Receita
```sql
CREATE TYPE receita_tipo_enum AS ENUM (
  'honorario', 'parcela', 'avulso', 'saldo', 'reembolso'
);
```

### Status de Despesa
```sql
CREATE TYPE despesa_status_enum AS ENUM (
  'pendente', 'pago', 'cancelado'
);
```

### Forma de Pagamento
```sql
CREATE TYPE forma_pagamento_enum AS ENUM (
  'dinheiro', 'pix', 'transferencia', 'boleto',
  'cartao_credito', 'cartao_debito', 'cheque', 'deposito'
);
```

---

## Índices Importantes

Os principais índices criados para performance:

```sql
-- Processos
CREATE INDEX idx_processos_escritorio ON processos_processos(escritorio_id);
CREATE INDEX idx_processos_cliente ON processos_processos(cliente_id);
CREATE INDEX idx_processos_status ON processos_processos(status);
CREATE INDEX idx_processos_numero_cnj ON processos_processos(numero_cnj);

-- Movimentações
CREATE INDEX idx_movimentacoes_processo ON processos_movimentacoes(processo_id);
CREATE INDEX idx_movimentacoes_data ON processos_movimentacoes(data_movimento);

-- Agenda
CREATE INDEX idx_eventos_escritorio ON agenda_eventos(escritorio_id);
CREATE INDEX idx_eventos_data ON agenda_eventos(data_inicio);
CREATE INDEX idx_tarefas_escritorio ON agenda_tarefas(escritorio_id);
CREATE INDEX idx_tarefas_status ON agenda_tarefas(status);

-- Financeiro
CREATE INDEX idx_receitas_escritorio ON financeiro_receitas(escritorio_id);
CREATE INDEX idx_receitas_status ON financeiro_receitas(status);
CREATE INDEX idx_receitas_vencimento ON financeiro_receitas(data_vencimento);
CREATE INDEX idx_timesheet_escritorio ON financeiro_timesheet(escritorio_id);
CREATE INDEX idx_timesheet_user ON financeiro_timesheet(user_id);

-- Publicações
CREATE INDEX idx_publicacoes_escritorio ON publicacoes_publicacoes(escritorio_id);
CREATE INDEX idx_publicacoes_status ON publicacoes_publicacoes(status);
CREATE INDEX idx_publicacoes_processo ON publicacoes_publicacoes(processo_id);
```

---

## Diagrama de Relacionamentos Principais

```
profiles ─────────────────────────┐
    │                             │
    ├── escritorios_usuarios ─────┼── escritorios
    │                             │       │
    │                             │       ├── escritorios_cargos
    │                             │       │       └── escritorios_cargos_permissoes
    │                             │       │
    │                             │       └── escritorios_convites
    │                             │
    └─────────────────────────────┼── crm_pessoas
                                  │       │
                                  │       ├── crm_oportunidades
                                  │       │
                                  │       └── processos_processos
                                  │               │
                                  │               ├── processos_movimentacoes
                                  │               ├── processos_depositos
                                  │               ├── processos_historico
                                  │               │
                                  │               ├── agenda_eventos
                                  │               ├── agenda_tarefas
                                  │               ├── agenda_audiencias
                                  │               │
                                  │               ├── financeiro_receitas
                                  │               ├── financeiro_despesas
                                  │               ├── financeiro_timesheet
                                  │               │
                                  │               └── publicacoes_publicacoes
                                  │                       └── publicacoes_analises
                                  │
                                  ├── financeiro_contratos_honorarios
                                  │       └── financeiro_faturamento_faturas
                                  │
                                  ├── consultivo_consultas
                                  │
                                  └── tags_master
```

---

## Changelog de Migrações Recentes

As últimas migrações aplicadas (92 total):

1. `20260202210000_fix_get_valor_hora_efetivo_usar_valor_contrato.sql`
2. `20260201_add_faturavel_manual_timesheet.sql`
3. `20260131_fix_v_lancamentos_prontos_faturar.sql`
4. `20260130_add_consultivo_id_to_timesheet.sql`
5. `20260129_add_indices_economicos_config.sql`

---

> **Nota**: Esta documentação é gerada automaticamente e deve ser atualizada sempre que houver alterações estruturais no banco de dados.
