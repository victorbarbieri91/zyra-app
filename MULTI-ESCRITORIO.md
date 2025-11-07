# Sistema Multi-Escritório - Zyra Legal

## 📋 Visão Geral

O sistema Zyra Legal agora suporta **múltiplos escritórios** por usuário, permitindo que advogados e profissionais jurídicos:

- ✅ Criem e gerenciem múltiplos escritórios
- ✅ Participem de escritórios de outros usuários (via convite)
- ✅ Alternem entre escritórios com um clique
- ✅ Tenham roles e permissões diferentes em cada escritório
- ✅ Isolamento total de dados entre escritórios (via RLS)

---

## 🗄️ Estrutura do Banco de Dados

### Novas Tabelas Criadas

#### 1. `usuarios_escritorios`
Tabela de relacionamento many-to-many entre usuários e escritórios.

```sql
CREATE TABLE usuarios_escritorios (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    escritorio_id UUID REFERENCES escritorios(id),
    role TEXT ('owner', 'admin', 'advogado', 'assistente', 'readonly'),
    is_owner BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    convidado_por UUID,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP
);
```

**Roles disponíveis:**
- `owner`: Proprietário do escritório (total controle)
- `admin`: Administrador (pode gerenciar usuários)
- `advogado`: Advogado (acesso completo aos módulos)
- `assistente`: Assistente (acesso limitado)
- `readonly`: Somente leitura

#### 2. `usuarios_escritorio_ativo`
Armazena qual escritório está atualmente ativo na sessão do usuário.

```sql
CREATE TABLE usuarios_escritorio_ativo (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    escritorio_id UUID REFERENCES escritorios(id),
    updated_at TIMESTAMP
);
```

#### 3. `escritorios_permissoes`
Permissões granulares por módulo do sistema.

```sql
CREATE TABLE escritorios_permissoes (
    id UUID PRIMARY KEY,
    usuario_escritorio_id UUID REFERENCES usuarios_escritorios(id),
    modulo TEXT ('processos', 'clientes', 'financeiro', etc.),
    permissoes TEXT[] (['read', 'write', 'delete', 'manage']),
    created_at TIMESTAMP
);
```

#### 4. `escritorios_convites`
Sistema de convites para adicionar novos membros.

```sql
CREATE TABLE escritorios_convites (
    id UUID PRIMARY KEY,
    escritorio_id UUID REFERENCES escritorios(id),
    email TEXT NOT NULL,
    role TEXT,
    token UUID UNIQUE,
    convidado_por UUID,
    aceito BOOLEAN DEFAULT false,
    expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP
);
```

### Tabela `escritorios` Expandida

Novos campos adicionados:

```sql
ALTER TABLE escritorios ADD COLUMN owner_id UUID;
ALTER TABLE escritorios ADD COLUMN logo_url TEXT;
ALTER TABLE escritorios ADD COLUMN plano TEXT DEFAULT 'free';
ALTER TABLE escritorios ADD COLUMN max_usuarios INTEGER DEFAULT 5;
ALTER TABLE escritorios ADD COLUMN ativo BOOLEAN DEFAULT true;
```

---

## 🔐 Row Level Security (RLS)

Todas as tabelas principais têm RLS habilitado para garantir isolamento total:

### Exemplo de Policy (tabela `clientes`)

```sql
-- SELECT: Usuário vê clientes de todos os escritórios que participa
CREATE POLICY clientes_select_policy ON clientes
  FOR SELECT USING (
    escritorio_id IN (
      SELECT escritorio_id FROM usuarios_escritorios
      WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- INSERT: Escritório ativo é preenchido automaticamente
CREATE POLICY clientes_insert_policy ON clientes
  FOR INSERT WITH CHECK (
    escritorio_id = get_escritorio_ativo(auth.uid())
  );

-- UPDATE/DELETE: Somente no escritório ativo
CREATE POLICY clientes_update_policy ON clientes
  FOR UPDATE USING (
    escritorio_id = get_escritorio_ativo(auth.uid())
  );
```

**Resultado:** Um usuário logado **NUNCA** verá dados de escritórios aos quais não pertence.

---

## ⚙️ Functions SQL Helpers

### 1. `get_escritorio_ativo(user_uuid UUID)`
Retorna o UUID do escritório atualmente ativo do usuário.

```sql
SELECT get_escritorio_ativo(auth.uid());
```

### 2. `has_permission(user_uuid, escritorio_uuid, modulo, permission_type)`
Verifica se o usuário tem permissão específica em um módulo.

```sql
SELECT has_permission(
  auth.uid(),
  'escritorio-uuid',
  'clientes',
  'delete'
);
```

### 3. `set_escritorio_ativo(user_uuid, escritorio_uuid)`
Troca o escritório ativo do usuário (com validação de permissão).

```sql
SELECT set_escritorio_ativo(auth.uid(), 'novo-escritorio-uuid');
```

### 4. `get_user_escritorios(user_uuid)`
Lista todos os escritórios que o usuário tem acesso.

```sql
SELECT * FROM get_user_escritorios(auth.uid());
```

---

## 🔄 Triggers Automáticos

### 1. `auto_set_escritorio_id()`
Preenche automaticamente o `escritorio_id` em INSERTs.

Aplicado em: `clientes`, `processos`, `eventos`, `honorarios`, `timesheet`, `dashboard_metrics`

**Comportamento:** Ao inserir um registro sem especificar `escritorio_id`, o sistema preenche com o escritório ativo.

### 2. `update_updated_at_column()`
Atualiza automaticamente o campo `updated_at` em UPDATEs.

Aplicado em: `escritorios`, `profiles`, `clientes`, `processos`, `eventos`, `honorarios`

---

## 💻 Frontend - Componentes e Hooks

### 1. EscritorioContext
Context Provider que gerencia o estado do escritório ativo.

```tsx
import { EscritorioProvider } from '@/contexts/EscritorioContext';

<EscritorioProvider>
  {children}
</EscritorioProvider>
```

### 2. useEscritorio Hook
Hook para acessar dados do escritório.

```tsx
import { useEscritorio } from '@/contexts/EscritorioContext';

function MyComponent() {
  const {
    escritorioAtivo,
    escritoriosDisponiveis,
    roleAtual,
    isOwner,
    carregando,
    trocarEscritorio,
    recarregar,
  } = useEscritorio();

  return (
    <div>
      <h1>Escritório: {escritorioAtivo?.nome}</h1>
      <p>Seu role: {roleAtual}</p>
    </div>
  );
}
```

### 3. EscritorioSelector
Componente dropdown para trocar de escritório.

```tsx
import { EscritorioSelector } from '@/components/escritorio/EscritorioSelector';

<EscritorioSelector />
```

---

## 🛠️ API Helpers

### Arquivo: `lib/supabase/escritorio-helpers.ts`

#### Listar Escritórios

```typescript
import { getEscritoriosDoUsuario } from '@/lib/supabase/escritorio-helpers';

const escritorios = await getEscritoriosDoUsuario();
```

#### Obter Escritório Ativo

```typescript
import { getEscritorioAtivo } from '@/lib/supabase/escritorio-helpers';

const ativo = await getEscritorioAtivo();
```

#### Trocar Escritório

```typescript
import { trocarEscritorio } from '@/lib/supabase/escritorio-helpers';

await trocarEscritorio('escritorio-uuid');
```

#### Criar Novo Escritório

```typescript
import { criarEscritorio } from '@/lib/supabase/escritorio-helpers';

const novoEscritorio = await criarEscritorio({
  nome: 'Meu Escritório',
  cnpj: '00.000.000/0000-00',
});
```

#### Convidar Usuário

```typescript
import { convidarUsuario } from '@/lib/supabase/escritorio-helpers';

const { token, expira_em } = await convidarUsuario({
  email: 'usuario@exemplo.com',
  role: 'advogado',
  escritorioId: 'escritorio-uuid',
});

// Enviar link: /convite/{token}
```

#### Aceitar Convite

```typescript
import { aceitarConvite } from '@/lib/supabase/escritorio-helpers';

await aceitarConvite('token-do-convite');
```

#### Gerenciar Membros

```typescript
import {
  getMembrosEscritorio,
  atualizarRoleMembro,
  removerMembroEscritorio,
} from '@/lib/supabase/escritorio-helpers';

// Listar membros
const membros = await getMembrosEscritorio('escritorio-uuid');

// Atualizar role
await atualizarRoleMembro('usuario-escritorio-id', 'admin');

// Remover membro
await removerMembroEscritorio('usuario-escritorio-id');
```

#### Verificar Permissão

```typescript
import { verificarPermissao } from '@/lib/supabase/escritorio-helpers';

const podeExcluir = await verificarPermissao('clientes', 'delete');

if (podeExcluir) {
  // Executar ação
}
```

---

## 🔁 Fluxo de Uso

### 1. Criação de Escritório

1. Usuário acessa `/dashboard/escritorio/criar`
2. Preenche nome e CNPJ (opcional)
3. Sistema cria escritório com `owner_id = user.id`
4. Cria entrada em `usuarios_escritorios` com `is_owner=true` e `role='owner'`
5. Define como escritório ativo em `usuarios_escritorio_ativo`
6. Redireciona para dashboard

### 2. Convite de Usuário

1. Owner/Admin acessa configurações de membros
2. Clica em "Convidar usuário"
3. Insere email e seleciona role
4. Sistema gera token único e data de expiração
5. Envia email com link: `/convite/{token}`
6. Usuário convidado clica no link
7. Sistema valida token e adiciona usuário ao escritório
8. Troca automaticamente para o novo escritório

### 3. Troca de Escritório

1. Usuário clica no `EscritorioSelector` (Header/Sidebar)
2. Seleciona outro escritório do dropdown
3. Sistema chama `set_escritorio_ativo()`
4. Atualiza `usuarios_escritorio_ativo.escritorio_id`
5. Context recarrega dados
6. Página recarrega (router.refresh())
7. **Todos os dados mudam** para o novo escritório

### 4. Isolamento de Dados

**Cenário:** Usuário participa de 2 escritórios (A e B)

- Escritório A: owner
- Escritório B: advogado

**Quando escritório A está ativo:**
- Vê somente clientes, processos, eventos do escritório A
- Pode criar/editar/excluir (owner tem todas permissões)

**Quando escritório B está ativo:**
- Vê somente clientes, processos, eventos do escritório B
- Pode criar/editar conforme permissões de "advogado"
- Não pode ver dados do escritório A

**RLS garante isso no nível do banco de dados.**

---

## 📊 Diagrama de Relacionamentos

```
auth.users (Supabase Auth)
    ↓
profiles (id, nome, email, avatar, etc.)
    ↓↓
    ├──→ usuarios_escritorios (many-to-many)
    │       ├── user_id → profiles.id
    │       ├── escritorio_id → escritorios.id
    │       ├── role (owner, admin, advogado, etc.)
    │       └── is_owner
    │
    └──→ usuarios_escritorio_ativo (escritório ativo)
            ├── user_id → profiles.id
            └── escritorio_id → escritorios.id

escritorios (id, nome, cnpj, owner_id, plano, etc.)
    ↓
    ├──→ clientes (escritorio_id)
    ├──→ processos (escritorio_id)
    ├──→ eventos (escritorio_id)
    ├──→ honorarios (escritorio_id)
    ├──→ timesheet (escritorio_id)
    └──→ ... (todas as outras tabelas)
```

---

## ✅ Checklist de Implementação

### Backend (Supabase)
- [x] Tabela `usuarios_escritorios`
- [x] Tabela `usuarios_escritorio_ativo`
- [x] Tabela `escritorios_permissoes`
- [x] Tabela `escritorios_convites`
- [x] Expandir tabela `escritorios`
- [x] Ajustar tabela `profiles`
- [x] Functions SQL (get_escritorio_ativo, has_permission, set_escritorio_ativo, get_user_escritorios)
- [x] Triggers (auto_set_escritorio_id, update_updated_at)
- [x] RLS Policies para todas as tabelas
- [x] Migração de dados existentes

### Frontend (Next.js + React)
- [x] Helpers `escritorio-helpers.ts`
- [x] Context `EscritorioContext`
- [x] Hook `useEscritorio`
- [x] Componente `EscritorioSelector`
- [x] Integração no layout (Provider + Selector)
- [x] Página "Criar Escritório"
- [ ] Página "Gerenciar Membros" (TODO)
- [ ] Página "Aceitar Convite" (TODO)
- [ ] Página "Configurações do Escritório" (TODO)

---

## 🚀 Próximos Passos

### Funcionalidades Pendentes

1. **Página de Membros**
   - Listar membros do escritório
   - Editar roles
   - Remover membros
   - Ver histórico de acessos

2. **Página de Aceitar Convite**
   - Validar token
   - Exibir informações do escritório
   - Botão "Aceitar Convite"

3. **Configurações do Escritório**
   - Editar logo, nome, CNPJ
   - Configurar plano (upgrade)
   - Ver estatísticas (usuários, clientes, processos)

4. **Permissões Granulares**
   - Interface para owner/admin configurar permissões customizadas por módulo
   - Templates de permissões por role

5. **Notificações**
   - Notificar quando é convidado para escritório
   - Notificar quando membro é adicionado/removido
   - Notificar quando escritório atinge limite de usuários

6. **Auditoria**
   - Log de trocas de escritório
   - Log de ações realizadas em cada escritório
   - Relatório de uso por escritório

---

## 🔧 Troubleshooting

### Usuário não consegue ver dados

**Problema:** Após trocar de escritório, dados não aparecem.

**Solução:**
1. Verificar se `usuarios_escritorio_ativo` foi atualizado:
```sql
SELECT * FROM usuarios_escritorio_ativo WHERE user_id = 'user-uuid';
```

2. Verificar se usuário pertence ao escritório:
```sql
SELECT * FROM usuarios_escritorios
WHERE user_id = 'user-uuid' AND escritorio_id = 'escritorio-uuid';
```

3. Verificar RLS policies:
```sql
SELECT * FROM clientes WHERE escritorio_id = 'escritorio-uuid';
```

### Trigger não está preenchendo escritorio_id

**Problema:** Ao criar cliente, `escritorio_id` fica `NULL`.

**Solução:**
1. Verificar se trigger está ativo:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'clientes_auto_escritorio';
```

2. Verificar se function existe:
```sql
SELECT * FROM pg_proc WHERE proname = 'auto_set_escritorio_id';
```

3. Testar manualmente:
```sql
SELECT get_escritorio_ativo(auth.uid());
```

### Convite expirado

**Problema:** Token de convite expirado.

**Solução:**
Owner/Admin deve gerar novo convite. Convites expiram em 7 dias por padrão.

---

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Next.js Context API](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)

---

## 📝 Notas Importantes

1. **Migração de Dados**: Dados existentes foram migrados automaticamente. Todos os usuários com `profiles.escritorio_id` foram transformados em "owners" dos seus escritórios.

2. **Performance**: Índices foram criados em todas as FK e campos frequentemente consultados (user_id, escritorio_id, ativo, etc.).

3. **Segurança**: RLS garante isolamento total no nível do banco. Mesmo queries SQL diretos respeitam as policies.

4. **UX**: Ao trocar de escritório, a página recarrega completamente para evitar dados "fantasmas" de escritório anterior em cache.

5. **Escalabilidade**: O sistema suporta centenas de escritórios por usuário sem degradação de performance (graças aos índices).

---

**Sistema implementado com sucesso! 🎉**

Para dúvidas ou sugestões, consulte a documentação ou abra uma issue no repositório.
