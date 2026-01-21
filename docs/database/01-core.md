# Módulo: Core (Autenticação e Escritórios)

**Status**: ✅ Completo
**Última atualização**: 2025-01-21
**Tabelas**: 8 tabelas

## Visão Geral

O módulo Core contém as tabelas fundamentais do sistema que são referenciadas por praticamente todos os outros módulos. Inclui:

- **Autenticação**: Perfis de usuários estendendo `auth.users` do Supabase
- **Multitenancy**: Escritórios e vínculos usuário-escritório
- **Permissões**: Sistema de cargos e permissões granulares
- **Onboarding**: Controle de primeiro acesso e setup

## Diagrama de Relacionamentos

```
auth.users (Supabase)
    │
    └──► profiles
            │
            ├──► escritorios_usuarios ◄──┬──► escritorios
            │        │                   │         │
            │        │                   │         └──► escritorios_cargos
            │        │                   │                    │
            │        └──► escritorios_usuarios_ativo          └──► escritorios_cargos_permissoes
            │        │
            │        └──► escritorios_permissoes
            │
            └──► escritorios_convites
```

## Tabelas

---

### profiles

**Descrição**: Perfil de usuário que estende a tabela `auth.users` do Supabase. Armazena dados adicionais do usuário como nome, OAB, preferências e estado de onboarding.

**Relacionamentos**:
- `PK id` = `auth.users.id` (1:1 com tabela de autenticação)
- `FK escritorio_id` → `escritorios.id` (DEPRECATED - usar escritorios_usuarios)
- `FK ultimo_escritorio_ativo` → `escritorios.id`
- `→ escritorios_usuarios` via `user_id`
- `→ escritorios_convites` via `convidado_por`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | - | PK = auth.users.id |
| `nome_completo` | text | NO | - | Nome completo do usuário |
| `email` | text | YES | - | Email (sync com auth.users) |
| `cpf` | text | YES | - | CPF do usuário |
| `oab_numero` | text | YES | - | Número da OAB |
| `oab_uf` | text | YES | - | UF da OAB |
| `telefone` | text | YES | - | Telefone de contato |
| `avatar_url` | text | YES | - | URL do avatar |
| `escritorio_id` | uuid | YES | - | **DEPRECATED** - FK para escritorios |
| `role` | text | YES | 'advogado' | Role padrão |
| `ultimo_escritorio_ativo` | uuid | YES | - | Último escritório acessado |
| `primeiro_acesso` | boolean | YES | true | Se é o primeiro acesso |
| `onboarding_completo` | boolean | YES | false | Se completou onboarding |
| `onboarding_etapa_atual` | text | YES | - | Etapa atual do onboarding |
| `onboarding_completado_em` | timestamptz | YES | - | Quando completou |
| `preferencias` | jsonb | YES | {...} | Preferências do usuário |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Estrutura do JSONB `preferencias`**:
```json
{
  "sidebar_aberta": false,
  "agenda_view_padrao": "month"
}
```

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `Users can view own profile` | SELECT | Usuário vê apenas seu próprio perfil |
| `Users can update own profile` | UPDATE | Usuário atualiza apenas seu próprio perfil |

**Uso no Sistema**:
- `useAuth()` hook - dados do usuário logado
- Header do sistema - avatar e nome
- Configurações pessoais
- Toda operação de criação registra `created_by`

---

### escritorios

**Descrição**: Escritórios de advocacia. Entidade central para multitenancy - todos os dados do sistema são filtrados por `escritorio_id`.

**Relacionamentos**:
- `FK owner_id` → `profiles.id`
- `→ escritorios_usuarios` via `escritorio_id`
- `→ escritorios_cargos` via `escritorio_id`
- `→ escritorios_convites` via `escritorio_id`
- `→ crm_pessoas` via `escritorio_id`
- `→ processos_processos` via `escritorio_id`
- `→ (todas as tabelas do sistema)` via `escritorio_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `nome` | text | NO | - | Nome do escritório |
| `cnpj` | text | YES | - | CNPJ do escritório |
| `descricao` | text | YES | - | Descrição/sobre |
| `telefone` | text | YES | - | Telefone principal |
| `email` | text | YES | - | Email principal |
| `site` | text | YES | - | Website |
| `logo_url` | text | YES | - | URL do logo |
| `endereco` | jsonb | YES | - | Endereço completo |
| `config` | jsonb | YES | - | Configurações do escritório |
| `plano` | text | YES | 'free' | Plano: free, pro, enterprise |
| `max_usuarios` | integer | YES | 5 | Limite de usuários |
| `ativo` | boolean | YES | true | Se está ativo |
| `owner_id` | uuid | YES | - | FK dono do escritório |
| `setup_completo` | boolean | YES | false | Se completou setup |
| `setup_etapa_atual` | text | YES | - | Etapa atual do setup |
| `setup_completado_em` | timestamptz | YES | - | Quando completou setup |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Estrutura do JSONB `endereco`**:
```json
{
  "cep": "01310-100",
  "rua": "Av. Paulista",
  "numero": "1000",
  "complemento": "Sala 101",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "uf": "SP"
}
```

**Estrutura do JSONB `config`**:
```json
{
  "modulos_ativos": ["crm", "processos", "financeiro"],
  "integrações": {
    "aasp": { "ativo": true, "login": "..." }
  }
}
```

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `escritorios_select_policy` | SELECT | Usuários veem escritórios que pertencem |
| `escritorios_update_policy` | UPDATE | Owners podem atualizar |

**Uso no Sistema**:
- `useEscritorio()` hook - escritório ativo
- Sidebar - seletor de escritório
- Configurações do escritório
- Base para todas as queries (filtro por escritorio_id)

---

### escritorios_usuarios

**Descrição**: Tabela de vínculo N:N entre usuários e escritórios. Permite que um usuário pertença a múltiplos escritórios com diferentes roles e cargos.

**Relacionamentos**:
- `FK user_id` → `profiles.id`
- `FK escritorio_id` → `escritorios.id`
- `FK cargo_id` → `escritorios_cargos.id`
- `FK convidado_por` → `profiles.id`
- `→ escritorios_usuarios_ativo` via `user_id + escritorio_id`
- `→ escritorios_permissoes` via `usuario_escritorio_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `user_id` | uuid | NO | - | FK para profiles |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `role` | text | NO | - | Role: admin, advogado, estagiario, secretaria |
| `cargo_id` | uuid | YES | - | FK para cargo específico |
| `is_owner` | boolean | YES | false | Se é o dono do escritório |
| `ativo` | boolean | YES | true | Se o vínculo está ativo |
| `convidado_por` | uuid | YES | - | Quem convidou |
| `convidado_em` | timestamptz | YES | now() | Quando foi convidado |
| `ultimo_acesso` | timestamptz | YES | - | Último acesso neste escritório |
| `salario_base` | numeric | YES | 0 | Salário base (financeiro) |
| `percentual_comissao` | numeric | YES | 0 | % de comissão |
| `meta_horas_mensal` | integer | YES | 160 | Meta de horas/mês |
| `valor_hora` | numeric | YES | 0 | Valor da hora |
| `created_at` | timestamptz | YES | now() | Data de criação |

**Índices**:

| Nome | Colunas | Descrição |
|------|---------|-----------|
| `idx_eu_user` | user_id | Busca por usuário |
| `idx_eu_escritorio` | escritorio_id | Busca por escritório |
| `UNIQUE` | user_id, escritorio_id | Impede duplicidade |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `eu_select` | SELECT | Usuários veem seus próprios vínculos |
| `eu_insert` | INSERT | Admins podem adicionar usuários |
| `eu_update` | UPDATE | Admins podem atualizar vínculos |

**Uso no Sistema**:
- `useAuth()` - lista de escritórios do usuário
- Troca de escritório
- Verificação de permissões
- Cálculo de comissões (financeiro)

---

### escritorios_usuarios_ativo

**Descrição**: Tabela que armazena qual escritório está ativo para cada usuário. Usada para persistir a seleção entre sessões.

**Relacionamentos**:
- `FK user_id` → `profiles.id`
- `FK escritorio_id` → `escritorios.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `user_id` | uuid | NO | - | FK para profiles (PK) |
| `escritorio_id` | uuid | NO | - | FK para escritório ativo |
| `updated_at` | timestamptz | YES | now() | Última atualização |

**Uso no Sistema**:
- `useEscritorio()` - determina escritório ativo no login
- Troca de escritório - atualiza esta tabela

---

### escritorios_cargos

**Descrição**: Cargos personalizados dentro de cada escritório. Permite criar hierarquia e definir valores padrão por cargo.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `→ escritorios_cargos_permissoes` via `cargo_id`
- `→ escritorios_usuarios` via `cargo_id`
- `→ financeiro_contratos_valores_cargo` via `cargo_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `nome` | text | NO | - | Nome interno (slug) |
| `nome_display` | text | NO | - | Nome para exibição |
| `nivel` | integer | NO | - | Nível hierárquico (1=maior) |
| `cor` | text | YES | - | Cor para UI (hex) |
| `descricao` | text | YES | - | Descrição do cargo |
| `valor_hora_padrao` | numeric | YES | - | Valor/hora padrão |
| `ativo` | boolean | YES | true | Se está ativo |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Cargos Padrão** (criados no setup):
- Sócio (nivel 1)
- Advogado Sênior (nivel 2)
- Advogado Pleno (nivel 3)
- Advogado Júnior (nivel 4)
- Estagiário (nivel 5)
- Secretária (nivel 6)

**Uso no Sistema**:
- Configurações → Equipe → Cargos
- Seleção de cargo ao convidar usuário
- Cálculo de valores em contratos de honorários

---

### escritorios_cargos_permissoes

**Descrição**: Permissões específicas por cargo e módulo. Define o que cada cargo pode fazer em cada módulo do sistema.

**Relacionamentos**:
- `FK cargo_id` → `escritorios_cargos.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `cargo_id` | uuid | NO | - | FK para cargo |
| `modulo` | text | NO | - | Nome do módulo |
| `pode_visualizar` | boolean | YES | false | Permissão de leitura |
| `pode_criar` | boolean | YES | false | Permissão de criação |
| `pode_editar` | boolean | YES | false | Permissão de edição |
| `pode_excluir` | boolean | YES | false | Permissão de exclusão |
| `pode_exportar` | boolean | YES | false | Permissão de exportação |
| `created_at` | timestamptz | YES | now() | Data de criação |
| `updated_at` | timestamptz | YES | now() | Data de atualização |

**Módulos disponíveis**:
- `dashboard`
- `crm`
- `processos`
- `agenda`
- `financeiro`
- `consultivo`
- `publicacoes`
- `documentos`
- `relatorios`
- `configuracoes`

**Uso no Sistema**:
- `usePermissoes()` hook - verifica permissões
- Renderização condicional de botões/seções
- Bloqueio de rotas sem permissão

---

### escritorios_permissoes

**Descrição**: Permissões específicas por usuário-escritório. Permite sobrescrever permissões do cargo para um usuário específico.

**Relacionamentos**:
- `FK usuario_escritorio_id` → `escritorios_usuarios.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `usuario_escritorio_id` | uuid | NO | - | FK para escritorios_usuarios |
| `modulo` | text | NO | - | Nome do módulo |
| `permissoes` | text[] | YES | ['read'] | Array de permissões |
| `created_at` | timestamptz | YES | now() | Data de criação |

**Permissões possíveis no array**:
- `read` - visualizar
- `create` - criar
- `update` - editar
- `delete` - excluir
- `export` - exportar
- `admin` - administrador do módulo

**Uso no Sistema**:
- Permissões personalizadas por usuário
- Sobrescreve permissões do cargo quando definido

---

### escritorios_convites

**Descrição**: Convites pendentes para novos usuários. Permite convidar pessoas por email antes de terem conta no sistema.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id`
- `FK convidado_por` → `profiles.id`
- `FK aceito_por` → `profiles.id`
- `FK cargo_id` → `escritorios_cargos.id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios |
| `email` | text | NO | - | Email do convidado |
| `role` | text | NO | - | Role a ser atribuída |
| `cargo_id` | uuid | YES | - | Cargo a ser atribuído |
| `token` | uuid | YES | uuid_generate_v4() | Token único do convite |
| `convidado_por` | uuid | NO | - | Quem enviou o convite |
| `aceito` | boolean | YES | false | Se foi aceito |
| `aceito_por` | uuid | YES | - | User que aceitou |
| `aceito_em` | timestamptz | YES | - | Quando foi aceito |
| `expira_em` | timestamptz | YES | now() + 7 days | Data de expiração |
| `created_at` | timestamptz | YES | now() | Data de criação |

**Fluxo de Convite**:
1. Admin cria convite com email
2. Sistema gera token único
3. Email é enviado com link `/convite?token=xxx`
4. Usuário acessa link
5. Se já tem conta → aceita convite
6. Se não tem conta → cria conta e aceita

**Uso no Sistema**:
- Configurações → Equipe → Convidar
- Página `/convite` - aceitar convite
- Página de registro com convite

---

## Funções do Banco

### get_user_escritorios(user_uuid)

**Descrição**: Retorna todos os escritórios que um usuário pertence.

```sql
SELECT * FROM get_user_escritorios(auth.uid());
```

### get_user_permissions(user_uuid, escritorio_uuid)

**Descrição**: Retorna as permissões do usuário em um escritório específico.

```sql
SELECT * FROM get_user_permissions(auth.uid(), 'escritorio-uuid');
```

---

## Notas de Implementação

### Padrões Seguidos
- Todo `escritorio_id` é obrigatório para multitenancy
- RLS policies garantem isolamento de dados
- Triggers atualizam `updated_at` automaticamente

### Pontos de Atenção
- `profiles.escritorio_id` está **DEPRECATED** - usar `escritorios_usuarios`
- Ao criar escritório, criar também cargos padrão
- Ao aceitar convite, criar vínculo em `escritorios_usuarios`

### Melhorias Futuras
- [ ] Histórico de alterações em escritórios
- [ ] Audit log de permissões
- [ ] Convites em lote

---

## Histórico de Alterações

| Data | Descrição | Migration |
|------|-----------|-----------|
| 2024-XX-XX | Criação inicial | (migration inicial) |
| 2025-01-XX | Adição de cargos e permissões | 2025XXXX_cargos.sql |
| 2025-01-XX | Sistema de convites melhorado | 2025XXXX_convites.sql |
