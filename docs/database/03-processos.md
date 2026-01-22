# Módulo: Processos

**Status**: ✅ Completo
**Última atualização**: 2025-01-21
**Tabelas**: 6 tabelas

## Visão Geral

O módulo de Processos é o núcleo do sistema jurídico, responsável por gerenciar todos os processos judiciais e administrativos do escritório. Inclui gestão de movimentações, histórico de alterações, depósitos judiciais, estratégias processuais e jurisprudências relacionadas.

## Diagrama de Relacionamentos

```
processos_processos (principal)
    │
    ├──► processos_movimentacoes (1:N)
    │        └── Movimentações do tribunal/manuais
    │
    ├──► processos_historico (1:N)
    │        └── Auditoria de alterações
    │
    ├──► processos_depositos (1:N)
    │        └── Depósitos judiciais
    │
    ├──► processos_estrategia (1:N, versionado)
    │        └── Estratégias processuais
    │
    └──► processos_jurisprudencias (1:N)
             └── Jurisprudências relacionadas

Relacionamentos externos:
    ├── FK escritorios.id (multitenancy)
    ├── FK crm_pessoas.id (cliente)
    ├── FK profiles.id (responsável, created_by)
    └── FK financeiro_contratos_honorarios.id (contrato)
```

---

## Tabelas

### processos_processos

**Descrição**: Tabela principal que armazena todos os processos judiciais e administrativos do escritório. Contém informações completas sobre o processo, partes envolvidas, valores e status.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK cliente_id` → `crm_pessoas.id` (cliente do escritório)
- `FK responsavel_id` → `profiles.id` (advogado responsável)
- `FK created_by` → `profiles.id` (quem criou)
- `FK contrato_id` → `financeiro_contratos_honorarios.id` (contrato vinculado)
- `→ processos_movimentacoes` via `processo_id`
- `→ processos_historico` via `processo_id`
- `→ processos_depositos` via `processo_id`
- `→ processos_estrategia` via `processo_id`
- `→ processos_jurisprudencias` via `processo_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |
| `created_by` | uuid | YES | - | FK para profiles.id (criador) |
| `numero_cnj` | text | YES | - | Número CNJ do processo judicial (opcional para processos administrativos) |
| `numero_pasta` | text | YES | - | Número interno da pasta (gerado automaticamente) |
| `tipo` | text | NO | - | Tipo do processo (judicial, administrativo, etc.) |
| `area` | text | NO | - | Área jurídica (cível, trabalhista, etc.) |
| `fase` | text | YES | - | Fase processual atual |
| `instancia` | text | YES | - | Instância atual (1ª, 2ª, Superior, etc.) |
| `rito` | text | YES | - | Rito processual (ordinário, sumário, etc.) |
| `tribunal` | text | YES | - | Tribunal onde tramita |
| `comarca` | text | YES | - | Comarca/Foro |
| `vara` | text | YES | - | Vara judicial |
| `uf` | text | YES | - | Unidade federativa (2 letras) |
| `data_distribuicao` | date | NO | - | Data de distribuição do processo |
| `cliente_id` | uuid | NO | - | FK para crm_pessoas - cliente do escritório |
| `polo_cliente` | text | NO | - | Polo do cliente: ativo (autor) ou passivo (réu) |
| `autor` | text | YES | - | Nome do autor do processo |
| `reu` | text | YES | - | Nome do réu do processo |
| `parte_contraria` | text | YES | - | Nome da parte contrária (texto livre) |
| `responsavel_id` | uuid | NO | - | FK para profiles.id (advogado responsável) |
| `colaboradores_ids` | uuid[] | YES | - | Array de IDs dos colaboradores |
| `status` | text | NO | 'ativo' | Status: ativo, suspenso, arquivado, encerrado |
| `valor_causa` | numeric | YES | - | Valor da causa |
| `valor_acordo` | numeric | YES | - | Valor do acordo (se houver) |
| `valor_condenacao` | numeric | YES | - | Valor da condenação (se houver) |
| `valor_atualizado` | numeric | YES | - | Valor atualizado do processo |
| `provisao_sugerida` | numeric | YES | - | Valor sugerido para provisão |
| `objeto_acao` | text | YES | - | Descrição do objeto da ação |
| `observacoes` | text | YES | - | Observações gerais |
| `tags` | text[] | YES | - | Tags para categorização |
| `data_transito_julgado` | date | YES | - | Data do trânsito em julgado |
| `data_arquivamento` | date | YES | - | Data de arquivamento |
| `link_tribunal` | text | YES | - | URL para acesso direto ao processo no tribunal |
| `contrato_id` | uuid | YES | - | FK para contrato de honorários vinculado |
| `modalidade_cobranca` | text | YES | - | Modalidade de cobrança do processo |
| `outros_numeros` | jsonb | YES | '[]' | Números alternativos (administrativo, INSS, etc.). Formato: [{"tipo": "Administrativo", "numero": "123/2024"}] |
| `escavador_monitoramento_id` | integer | YES | - | ID do monitoramento no Escavador API |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Ver processos do escritório` | SELECT | Usuários veem processos do seu escritório |
| `Usuarios podem ver processos do seu escritorio` | SELECT | Função user_tem_acesso_processo_direto() |
| `Criar processos` | INSERT | Usuários criam no seu escritório |
| `Usuarios podem criar processos no seu escritorio` | INSERT | Função user_tem_acesso_processo_direto() |
| `Atualizar processos` | UPDATE | Função user_pode_editar_processo() |
| `Usuarios podem editar processos do seu escritorio` | UPDATE | Função user_tem_acesso_processo_direto() |
| `Dono e socio podem excluir processos` | DELETE | Apenas dono/sócio podem excluir |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_processos_pkey` | id | Chave primária |
| `processos_processos_escritorio_id_numero_cnj_key` | escritorio_id, numero_cnj | UNIQUE - CNJ único por escritório |
| `processos_processos_escritorio_id_numero_pasta_key` | escritorio_id, numero_pasta | UNIQUE - Pasta única por escritório |
| `idx_processos_escritorio` | escritorio_id | Filtro por escritório |
| `idx_processos_numero_cnj` | numero_cnj | Busca por CNJ |
| `idx_processos_numero_pasta` | numero_pasta | Busca por pasta |
| `idx_processos_cliente` | cliente_id | Filtro por cliente |
| `idx_processos_responsavel` | responsavel_id | Filtro por responsável |
| `idx_processos_status` | status (parcial: ativo, suspenso) | Filtro por status ativos |
| `idx_processos_area` | area, status | Filtro por área e status |
| `idx_processos_uf` | uf | Filtro por estado |
| `idx_processos_data_distribuicao` | data_distribuicao | Filtro por data |
| `idx_processos_contrato` | contrato_id (parcial: NOT NULL) | Processos com contrato |
| `idx_processos_modalidade` | contrato_id, modalidade_cobranca | Filtro por modalidade |
| `idx_processos_processos_link_tribunal` | link_tribunal (parcial: NOT NULL) | Processos com link |
| `idx_processos_escavador_monitoramento` | escavador_monitoramento_id (parcial) | Monitoramento Escavador |
| `idx_processos_search` | GIN full-text (numero_cnj, numero_pasta, objeto_acao, observacoes) | Busca textual |

**Triggers**:

| Nome | Evento | Função | Descrição |
|------|--------|--------|-----------|
| `processos_gerar_numero_pasta` | BEFORE INSERT | gerar_numero_pasta() | Gera número de pasta automaticamente |
| `processos_validate_cnj` | BEFORE INSERT/UPDATE | validate_numero_cnj() | Valida formato do número CNJ |
| `processos_updated_at` | BEFORE UPDATE | update_processos_updated_at() | Atualiza updated_at |
| `processos_historico_auto` | AFTER INSERT/UPDATE | registrar_historico_processo() | Registra alterações no histórico |
| `trigger_validar_modalidade` | BEFORE INSERT/UPDATE | validar_modalidade_processo() | Valida modalidade de cobrança |

---

### processos_movimentacoes

**Descrição**: Registra todas as movimentações processuais, tanto importadas automaticamente (DataJud, Escavador) quanto inseridas manualmente. Permite acompanhamento detalhado do andamento.

**Relacionamentos**:
- `FK processo_id` → `processos_processos.id`
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK lida_por` → `profiles.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `processo_id` | uuid | NO | - | FK para processos_processos |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `data_movimento` | timestamptz | NO | - | Data/hora da movimentação |
| `tipo_codigo` | text | YES | - | Código do tipo de movimento (TPU) |
| `tipo_descricao` | text | YES | - | Descrição do tipo de movimento |
| `descricao` | text | NO | - | Descrição resumida da movimentação |
| `conteudo_completo` | text | YES | - | Texto completo/inteiro teor |
| `origem` | text | NO | 'manual' | Origem: manual, datajud, escavador, publicacao |
| `importante` | boolean | YES | false | Marcada como importante |
| `lida` | boolean | YES | false | Foi lida pelo usuário |
| `lida_por` | uuid | YES | - | FK para profiles.id - quem leu |
| `lida_em` | timestamptz | YES | - | Data/hora da leitura |
| `comentarios` | text | YES | - | Comentários internos |
| `created_at` | timestamptz | YES | now() | Data de criação |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Ver movimentações` | SELECT | user_tem_acesso_processo() |
| `Usuarios podem ver movimentacoes dos seus processos` | SELECT | user_tem_acesso_movimentacao() |
| `Criar movimentações` | INSERT | user_tem_acesso_processo() |
| `Usuarios podem criar movimentacoes nos seus processos` | INSERT | user_tem_acesso_movimentacao() |
| `Atualizar movimentações` | UPDATE | user_tem_acesso_processo() |
| `Usuarios podem editar movimentacoes dos seus processos` | UPDATE | user_tem_acesso_movimentacao() |
| `Usuarios podem excluir movimentacoes dos seus processos` | DELETE | user_tem_acesso_movimentacao() |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_movimentacoes_pkey` | id | Chave primária |
| `idx_processos_movimentacoes_processo` | processo_id | Filtro por processo |
| `idx_processos_movimentacoes_escritorio` | escritorio_id | Filtro por escritório |
| `idx_processos_movimentacoes_data` | data_movimento DESC | Ordenação por data |
| `idx_movimentacoes_processo_data` | processo_id, data_movimento DESC | Movimentações recentes por processo |
| `idx_movimentacoes_lida` | processo_id, lida (parcial: lida=false) | Movimentações não lidas |
| `idx_processos_movimentacoes_nao_lidas` | processo_id, lida (parcial: lida=false) | Movimentações não lidas |

**Triggers**:

| Nome | Evento | Função | Descrição |
|------|--------|--------|-----------|
| `processos_notificar_movimentacao` | AFTER INSERT | notificar_nova_movimentacao() | Cria notificação para nova movimentação |
| `trigger_alerta_movimentacao` | AFTER INSERT | gerar_alerta_cobranca_movimentacao() | Gera alerta de cobrança se aplicável |

---

### processos_historico

**Descrição**: Tabela de auditoria que registra automaticamente todas as alterações feitas nos processos. Permite rastrear quem alterou o quê e quando.

**Relacionamentos**:
- `FK processo_id` → `processos_processos.id`
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK user_id` → `profiles.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `processo_id` | uuid | NO | - | FK para processos_processos |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `acao` | text | NO | - | Tipo de ação: criacao, alteracao, exclusao |
| `descricao` | text | NO | - | Descrição da alteração |
| `campo_alterado` | text | YES | - | Nome do campo alterado |
| `valor_anterior` | text | YES | - | Valor antes da alteração |
| `valor_novo` | text | YES | - | Valor após a alteração |
| `user_id` | uuid | YES | - | FK para profiles.id - quem alterou |
| `user_nome` | text | YES | - | Nome do usuário (desnormalizado) |
| `created_at` | timestamptz | YES | now() | Data da alteração |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Users can access their escritorio data` | ALL | user_has_access_to_escritorio() |
| `Ver histórico` | SELECT | user_tem_acesso_processo() |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_historico_pkey` | id | Chave primária |
| `idx_processos_historico_processo` | processo_id, created_at DESC | Histórico por processo |
| `idx_processos_historico_escritorio` | escritorio_id | Filtro por escritório |

**Uso no Sistema**:
- Populado automaticamente pelo trigger `processos_historico_auto`
- Exibido na timeline de alterações do processo
- Usado para auditoria e compliance

---

### processos_depositos

**Descrição**: Gerencia depósitos judiciais vinculados aos processos, incluindo depósitos recursais, penhoras e outros valores depositados em juízo.

**Relacionamentos**:
- `FK processo_id` → `processos_processos.id`
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK created_by` → `profiles.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `processo_id` | uuid | NO | - | FK para processos_processos |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `tipo` | text | NO | - | Tipo: recursal, penhora, garantia, caução, outros |
| `descricao` | text | YES | - | Descrição do depósito |
| `valor` | numeric | NO | - | Valor depositado |
| `data_deposito` | date | NO | - | Data do depósito |
| `banco` | text | YES | - | Banco onde foi depositado |
| `agencia` | text | YES | - | Agência bancária |
| `conta` | text | YES | - | Número da conta |
| `numero_guia` | text | YES | - | Número da guia de depósito |
| `status` | text | NO | 'ativo' | Status: ativo, levantado, convertido |
| `data_levantamento` | date | YES | - | Data do levantamento |
| `valor_levantado` | numeric | YES | - | Valor efetivamente levantado |
| `observacoes` | text | YES | - | Observações adicionais |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |
| `created_by` | uuid | YES | - | FK para profiles.id |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Usuarios podem ver depositos do proprio escritorio` | SELECT | Baseado em escritorio_id |
| `Usuarios podem inserir depositos no proprio escritorio` | INSERT | Baseado em escritorio_id |
| `Usuarios podem atualizar depositos do proprio escritorio` | UPDATE | Baseado em escritorio_id |
| `Usuarios podem deletar depositos do proprio escritorio` | DELETE | Baseado em escritorio_id |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_depositos_pkey` | id | Chave primária |
| `idx_depositos_processo` | processo_id | Filtro por processo |
| `idx_depositos_escritorio` | escritorio_id | Filtro por escritório |
| `idx_depositos_status` | status | Filtro por status |
| `idx_depositos_tipo` | tipo | Filtro por tipo |

**Triggers**:

| Nome | Evento | Função | Descrição |
|------|--------|--------|-----------|
| `set_updated_at_depositos` | BEFORE UPDATE | update_updated_at_column() | Atualiza updated_at |

---

### processos_estrategia

**Descrição**: Armazena a estratégia processual detalhada, incluindo análise SWOT, teses jurídicas, próximos passos e parâmetros de acordo. Suporta versionamento para manter histórico de estratégias.

**Relacionamentos**:
- `FK processo_id` → `processos_processos.id`
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK elaborado_por` → `profiles.id`
- `FK revisado_por` → `profiles.id`
- `FK versao_anterior_id` → `processos_estrategia.id` (auto-referência para versionamento)

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `processo_id` | uuid | NO | - | FK para processos_processos |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `resumo_caso` | text | YES | - | Resumo executivo do caso |
| `objetivo_principal` | text | YES | - | Objetivo principal da estratégia |
| `pontos_fortes` | jsonb | YES | - | Análise SWOT - pontos fortes |
| `pontos_fracos` | jsonb | YES | - | Análise SWOT - pontos fracos |
| `oportunidades` | jsonb | YES | - | Análise SWOT - oportunidades |
| `ameacas` | jsonb | YES | - | Análise SWOT - ameaças |
| `teses_principais` | text[] | YES | - | Teses jurídicas principais |
| `teses_subsidiarias` | text[] | YES | - | Teses jurídicas subsidiárias |
| `fundamentos_legais` | text[] | YES | - | Fundamentos legais aplicáveis |
| `estrategia_texto` | text | YES | - | Descrição detalhada da estratégia |
| `proximos_passos` | jsonb | YES | - | Lista de próximos passos a executar |
| `documentos_necessarios` | jsonb | YES | - | Documentos necessários para a estratégia |
| `provas_a_produzir` | jsonb | YES | - | Provas a serem produzidas |
| `riscos_identificados` | jsonb | YES | - | Riscos identificados |
| `plano_contingencia` | text | YES | - | Plano B caso estratégia principal falhe |
| `possibilidade_acordo` | boolean | YES | - | Há possibilidade de acordo? |
| `parametros_acordo` | jsonb | YES | - | Parâmetros aceitáveis para acordo |
| `versao` | integer | YES | 1 | Número da versão |
| `versao_anterior_id` | uuid | YES | - | FK para versão anterior |
| `is_versao_atual` | boolean | YES | true | É a versão vigente? |
| `elaborado_por` | uuid | YES | - | FK para profiles.id - autor |
| `revisado_por` | uuid | YES | - | FK para profiles.id - revisor |
| `data_revisao` | timestamptz | YES | - | Data da revisão |
| `aprovado` | boolean | YES | false | Estratégia foi aprovada? |
| `data_aprovacao` | timestamptz | YES | - | Data da aprovação |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Ver estratégia` | SELECT | user_tem_acesso_processo() |
| `Ver estratégias` | SELECT | user_tem_acesso_processo() |
| `Gerenciar estratégias` | ALL | user_pode_editar_processo() |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_estrategia_pkey` | id | Chave primária |
| `idx_processos_estrategia_processo` | processo_id | Filtro por processo |

**Triggers**:

| Nome | Evento | Função | Descrição |
|------|--------|--------|-----------|
| `processos_estrategia_updated_at` | BEFORE UPDATE | update_processos_updated_at() | Atualiza updated_at |

---

### processos_jurisprudencias

**Descrição**: Armazena jurisprudências relacionadas aos processos, seja para fundamentação de peças ou análise estratégica. Suporta busca manual e importação automática.

**Relacionamentos**:
- `FK processo_id` → `processos_processos.id`
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK adicionado_por` → `profiles.id`
- `FK peca_id` → (peças onde foi citada)

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `processo_id` | uuid | NO | - | FK para processos_processos |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `tribunal` | text | NO | - | Tribunal de origem (STF, STJ, TRT, etc.) |
| `tipo` | text | YES | - | Tipo: acordao, sumula, decisao_monocratica |
| `numero_acordao` | text | YES | - | Número do acórdão |
| `numero_processo` | text | YES | - | Número do processo de origem |
| `data_julgamento` | date | YES | - | Data do julgamento |
| `data_publicacao` | date | YES | - | Data de publicação |
| `orgao_julgador` | text | YES | - | Órgão julgador (Turma, Seção, etc.) |
| `relator` | text | YES | - | Nome do relator |
| `ementa` | text | NO | - | Ementa da decisão |
| `decisao` | text | YES | - | Dispositivo da decisão |
| `texto_completo` | text | YES | - | Inteiro teor do acórdão |
| `resultado` | text | YES | - | Resultado: provido, desprovido, parcial |
| `relevancia` | text | YES | 'media' | Relevância: alta, media, baixa |
| `similaridade_score` | numeric | YES | - | Score de similaridade com o caso (0-100) |
| `teses_aplicadas` | text[] | YES | - | Teses jurídicas aplicadas |
| `temas_relacionados` | text[] | YES | - | Temas relacionados |
| `aplicada_em_peca` | boolean | YES | false | Foi aplicada em alguma peça? |
| `peca_id` | uuid | YES | - | FK para peça onde foi citada |
| `citada_em_analise` | boolean | YES | false | Foi citada em análise? |
| `link_inteiro_teor` | text | YES | - | URL para inteiro teor |
| `link_consulta` | text | YES | - | URL para consulta no tribunal |
| `tags` | text[] | YES | - | Tags para categorização |
| `observacoes` | text | YES | - | Observações internas |
| `metadata` | jsonb | YES | - | Metadados adicionais |
| `fonte` | text | YES | 'manual' | Fonte: manual, ia_sugestao, importacao |
| `adicionado_por` | uuid | YES | - | FK para profiles.id |
| `created_at` | timestamptz | YES | now() | Data de criação |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Ver jurisprudências` | SELECT | user_tem_acesso_processo() |
| `Gerenciar jurisprudências` | ALL | user_pode_editar_processo() |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `processos_jurisprudencias_pkey` | id | Chave primária |
| `idx_processos_juris_processo` | processo_id | Filtro por processo |

---

## Funções Auxiliares

### user_tem_acesso_processo(processo_id uuid)

**Descrição**: Verifica se o usuário tem acesso de leitura ao processo.

**Retorno**: boolean

**Lógica**: Verifica se o processo pertence a um escritório ao qual o usuário tem acesso.

### user_pode_editar_processo(processo_id uuid)

**Descrição**: Verifica se o usuário pode editar o processo.

**Retorno**: boolean

**Lógica**: Verifica acesso ao escritório e permissões de edição.

### user_tem_acesso_processo_direto(escritorio_id uuid)

**Descrição**: Verifica acesso direto ao escritório do processo.

**Retorno**: boolean

### user_tem_acesso_movimentacao(processo_id uuid)

**Descrição**: Verifica se o usuário tem acesso às movimentações do processo.

**Retorno**: boolean

### gerar_numero_pasta()

**Descrição**: Gera automaticamente o número de pasta para novos processos.

**Formato**: ANO/SEQUENCIAL (ex: 2025/001)

### validate_numero_cnj()

**Descrição**: Valida o formato do número CNJ conforme padrão nacional.

**Formato**: NNNNNNN-DD.AAAA.J.TR.OOOO

### registrar_historico_processo()

**Descrição**: Registra automaticamente alterações no histórico do processo.

### notificar_nova_movimentacao()

**Descrição**: Cria notificação para o responsável quando há nova movimentação.

### gerar_alerta_cobranca_movimentacao()

**Descrição**: Gera alerta de cobrança quando movimentação dispara evento financeiro.

### validar_modalidade_processo()

**Descrição**: Valida se a modalidade de cobrança é compatível com o contrato vinculado.

---

## Notas de Implementação

### Padrões Seguidos
- Todas as tabelas têm `escritorio_id` para multitenancy
- RLS baseado em funções reutilizáveis (`user_tem_acesso_*`, `user_pode_editar_*`)
- Triggers para automação (histórico, validação, notificações)
- Índices otimizados para queries mais comuns

### Gestão de Partes
A gestão de partes foi simplificada na tabela principal:
- `cliente_id` + `polo_cliente`: Cliente do escritório e seu polo
- `autor` + `reu`: Nomes das partes (texto livre)
- `parte_contraria`: Nome da parte oposta ao cliente

**Nota**: A tabela `processos_partes` foi removida por redundância (migration: remover_processos_partes).

### Integração com Escavador
- Campo `escavador_monitoramento_id` vincula ao monitoramento externo
- Movimentações com `origem = 'escavador'` são importadas automaticamente
- Índice parcial otimiza busca por processos monitorados

### Versionamento de Estratégias
- `processos_estrategia` suporta múltiplas versões por processo
- `is_versao_atual = true` indica a versão vigente
- `versao_anterior_id` cria cadeia de histórico

### Pontos de Atenção
- `numero_cnj` é único por escritório (pode haver mesmo CNJ em escritórios diferentes)
- `numero_pasta` é gerado automaticamente, não deve ser editado manualmente
- Alterações em `processos_processos` disparam registro automático em `processos_historico`
- Novas movimentações geram notificações e podem disparar alertas de cobrança

### Melhorias Futuras
- [ ] Integração direta com DataJud para movimentações
- [ ] OCR de petições para extração automática de dados
- [ ] Sugestão automática de jurisprudências por IA
- [ ] Timeline unificada com agenda e financeiro

---

## Histórico de Alterações

| Data | Descrição | Migration |
|------|-----------|-----------|
| 2025-01-21 | Documentação inicial | - |
| 2025-01-21 | Remoção de processos_partes | remover_processos_partes |
