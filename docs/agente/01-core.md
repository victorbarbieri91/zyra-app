# Módulo: Core

> Gerado automaticamente em: 2026-02-05
> Tabelas: 9

## Descrição
Perfis, escritórios e permissões

---

## Tabelas

### escritorios

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| nome | text | Sim | - |
| cnpj | text | Não | - |
| endereco | jsonb | Não | - |
| config | jsonb | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| logo_url | text | Não | - |
| plano | text | Não | free::text |
| max_usuarios | integer | Não | 5 |
| ativo | boolean | Não | true |
| owner_id | uuid | Não | - |
| descricao | text | Não | - |
| telefone | text | Não | - |
| email | text | Não | - |
| site | text | Não | - |
| setup_completo | boolean | Não | false |
| setup_etapa_atual | text | Não | - |
| setup_completado_em | timestamp with time zone | Não | - |
| grupo_id | uuid | Sim | - |

**Notas**:
- `plano`: Plano de assinatura do escritório
- `max_usuarios`: Número máximo de usuários permitidos no plano
- `owner_id`: Proprietário/criador do escritório
- `grupo_id`: ID do escritório principal do grupo. Escritórios com mesmo grupo_id pertencem ao mesmo grupo e compartilham clientes/equipe.

**Constraints**:
- `plano`: plano = ANY (ARRAY['free'::text, 'basic'::text, 'professional'::text, 'enterprise'::text])

---

### profiles

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | - |
| nome_completo | text | Sim | - |
| oab_numero | text | Não | - |
| oab_uf | text | Não | - |
| telefone | text | Não | - |
| avatar_url | text | Não | - |
| escritorio_id | uuid | Não | - |
| role | text | Não | advogado::text |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| email | text | Não | - |
| ultimo_escritorio_ativo | uuid | Não | - |
| primeiro_acesso | boolean | Não | true |
| onboarding_completo | boolean | Não | false |
| onboarding_etapa_atual | text | Não | - |
| onboarding_completado_em | timestamp with time zone | Não | - |
| cpf | text | Não | - |
| preferencias | jsonb | Não | '{"sidebar_aberta": false, "agenda_vi... |

**Notas**:
- `email`: Email do usuário (sincronizado com auth.users)
- `ultimo_escritorio_ativo`: Último escritório acessado pelo usuário (para UX)
- `cpf`: CPF do usuário (opcional)
- `preferencias`: Preferências personalizadas do usuário (sidebar, agenda, etc)

**Constraints**:
- `role`: role = ANY (ARRAY['admin'::text, 'advogado'::text, 'assistente'::text])

---

### escritorios_usuarios

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| role | text | Sim | - |
| is_owner | boolean | Não | false |
| ativo | boolean | Não | true |
| convidado_por | uuid | Não | - |
| convidado_em | timestamp with time zone | Não | now() |
| ultimo_acesso | timestamp with time zone | Não | - |
| created_at | timestamp with time zone | Não | now() |
| cargo_id | uuid | Não | - |
| salario_base | numeric | Não | 0 |
| percentual_comissao | numeric | Não | 0 |
| meta_horas_mensal | integer | Não | 160 |
| valor_hora | numeric | Não | 0 |

**Constraints**:
- `role`: role = ANY (ARRAY['owner'::text, 'admin'::text, 'advogado'::text, 'assistente'::text, 'readonly'::text])

---

### escritorios_usuarios_ativo

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| updated_at | timestamp with time zone | Não | now() |

---

### escritorios_permissoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| usuario_escritorio_id | uuid | Sim | - |
| modulo | text | Sim | - |
| permissoes | _text[] | Não | ARRAY[read::text] |
| created_at | timestamp with time zone | Não | now() |

---

### escritorios_convites

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| email | text | Sim | - |
| role | text | Sim | - |
| token | uuid | Não | uuid_generate_v4() |
| convidado_por | uuid | Sim | - |
| aceito | boolean | Não | false |
| aceito_por | uuid | Não | - |
| aceito_em | timestamp with time zone | Não | - |
| expira_em | timestamp with time zone | Não | now() |
| created_at | timestamp with time zone | Não | now() |
| cargo_id | uuid | Não | - |

**Constraints**:
- `role`: role = ANY (ARRAY['admin'::text, 'advogado'::text, 'assistente'::text, 'readonly'::text])

---

### user_escritorios_roles

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| role | text | Sim | - |
| pode_aprovar_horas | boolean | Não | false |
| pode_faturar | boolean | Não | false |
| percentual_comissao | numeric | Não | 0 |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `role`: role = ANY (ARRAY['admin'::text, 'financeiro'::text, 'advogado'::text, 'colaborador'::text])

---

### escritorios_cargos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| escritorio_id | uuid | Sim | - |
| nome | text | Sim | - |
| nome_display | text | Sim | - |
| nivel | integer | Sim | - |
| cor | text | Não | - |
| descricao | text | Não | - |
| ativo | boolean | Não | true |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| valor_hora_padrao | numeric | Não | - |

**Notas**:
- `valor_hora_padrao`: Valor hora padrão para cobrança por timesheet. Pode ser sobrescrito no contrato por negociação.

---

### escritorios_cargos_permissoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| cargo_id | uuid | Sim | - |
| modulo | text | Sim | - |
| pode_visualizar | boolean | Não | false |
| pode_criar | boolean | Não | false |
| pode_editar | boolean | Não | false |
| pode_excluir | boolean | Não | false |
| pode_exportar | boolean | Não | false |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

**Constraints**:
- `modulo`: modulo = ANY (ARRAY['financeiro'::text, 'relatorios'::text, 'configuracoes'::text])

---

