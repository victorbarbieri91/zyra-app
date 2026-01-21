# Template: Documentação de Módulo de Banco de Dados

Use este template ao documentar cada módulo do banco de dados.

---

# Módulo: [Nome do Módulo]

**Status**: ⬜ Pendente | 🔄 Em Progresso | ✅ Completo
**Última atualização**: YYYY-MM-DD
**Tabelas**: X tabelas

## Visão Geral

Breve descrição do propósito deste módulo e como ele se integra ao sistema.

## Diagrama de Relacionamentos

```
tabela_principal
    │
    ├──► tabela_filha_1
    │        │
    │        └──► tabela_neta
    │
    └──► tabela_filha_2
```

## Tabelas

### tabela_nome

**Descrição**: Descrição detalhada do propósito da tabela.

**Relacionamentos**:
- `FK escritorio_id` → `escritorios.id` (multitenancy)
- `FK campo_id` → `outra_tabela.id`
- `→ tabela_filha` via `este_id`

**Colunas**:

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | Identificador único |
| `escritorio_id` | uuid | NO | - | FK para escritorios (multitenancy) |
| `nome` | text | NO | - | Nome do registro |
| `descricao` | text | YES | NULL | Descrição opcional |
| `status` | text | NO | 'ativo' | Status: ativo, inativo, etc |
| `created_at` | timestamptz | NO | now() | Data de criação |
| `updated_at` | timestamptz | YES | - | Data de atualização |
| `created_by` | uuid | YES | - | FK para profiles.id |

**RLS Policies**:

| Policy | Operação | Descrição |
|--------|----------|-----------|
| `tabela_select_policy` | SELECT | Usuários veem registros do seu escritório |
| `tabela_insert_policy` | INSERT | Usuários inserem no seu escritório |
| `tabela_update_policy` | UPDATE | Usuários atualizam registros do seu escritório |
| `tabela_delete_policy` | DELETE | Usuários deletam registros do seu escritório |

**Índices**:

| Nome | Colunas | Tipo | Descrição |
|------|---------|------|-----------|
| `idx_tabela_escritorio` | escritorio_id | btree | Filtro por escritório |
| `idx_tabela_status` | status | btree | Filtro por status |

**Triggers**:

| Nome | Evento | Função | Descrição |
|------|--------|--------|-----------|
| `set_updated_at` | BEFORE UPDATE | `set_updated_at()` | Atualiza updated_at |

**Uso no Sistema**:
- Onde esta tabela é usada no frontend
- Quais hooks/componentes a acessam
- Quais Edge Functions a manipulam

---

## Funções do Banco

### função_nome(param1, param2)

**Descrição**: O que a função faz

**Parâmetros**:
- `param1` (tipo): descrição
- `param2` (tipo): descrição

**Retorno**: tipo - descrição

**Exemplo**:
```sql
SELECT função_nome('valor1', 'valor2');
```

---

## Views

### view_nome

**Descrição**: Propósito da view

**Tabelas fonte**:
- tabela1
- tabela2

**Uso**: Onde é utilizada

---

## Notas de Implementação

### Padrões Seguidos
- Lista de padrões específicos deste módulo

### Pontos de Atenção
- Cuidados ao modificar este módulo
- Dependências críticas

### Melhorias Futuras
- [ ] Melhoria planejada 1
- [ ] Melhoria planejada 2

---

## Histórico de Alterações

| Data | Descrição | Migration |
|------|-----------|-----------|
| YYYY-MM-DD | Criação inicial | 00000000000000_nome.sql |
| YYYY-MM-DD | Adição de coluna X | 00000000000001_add_x.sql |
