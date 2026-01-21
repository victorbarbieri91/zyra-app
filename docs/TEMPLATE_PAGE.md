# Template: Documentação de Página

Use este template ao documentar cada página do sistema.

---

# Página: [Nome da Página]

**Rota**: `/caminho/da/pagina`
**Arquivo**: `src/app/caminho/page.tsx`
**Status**: ⬜ Pendente | 🔄 Em Progresso | ✅ Completo
**Última atualização**: YYYY-MM-DD

## Visão Geral

Breve descrição do propósito desta página e o que o usuário pode fazer nela.

## Screenshot/Wireframe

[Se disponível, incluir imagem ou referência]

## Funcionalidades

### Funcionalidade 1
- Descrição detalhada
- Como funciona
- Regras de negócio

### Funcionalidade 2
- Descrição detalhada

## Estrutura de Componentes

```
PageComponent
├── HeaderSection
│   ├── PageTitle
│   ├── BreadCrumb
│   └── ActionButtons
├── FilterSection
│   ├── SearchInput
│   └── FilterDropdowns
├── ContentSection
│   ├── DataTable / DataGrid
│   │   └── TableRow
│   └── EmptyState
└── ModalComponents
    ├── CreateModal
    └── EditModal
```

## Componentes Utilizados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `ComponenteA` | `src/components/modulo/ComponenteA.tsx` | Descrição |
| `ComponenteB` | `src/components/modulo/ComponenteB.tsx` | Descrição |

## Hooks

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useHookA` | `src/hooks/useHookA.ts` | Descrição do que faz |
| `useHookB` | `src/hooks/useHookB.ts` | Descrição do que faz |

## Estado (State)

### Estado Local
```typescript
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [selectedItem, setSelectedItem] = useState<Item | null>(null)
const [isModalOpen, setIsModalOpen] = useState(false)
```

### Estado Global (Context/Zustand)
- `useEscritorioContext` - Escritório ativo
- `useAuthContext` - Usuário logado

## Dados do Banco

### Tabelas Acessadas

| Tabela | Operações | Campos Utilizados |
|--------|-----------|-------------------|
| `tabela1` | SELECT, INSERT, UPDATE | id, nome, status |
| `tabela2` | SELECT | id, descricao |

### Queries Principais

```typescript
// Query de listagem
const { data } = await supabase
  .from('tabela')
  .select('*')
  .eq('escritorio_id', escritorioId)
  .order('created_at', { ascending: false })

// Query de detalhe
const { data } = await supabase
  .from('tabela')
  .select(`
    *,
    relacao:tabela_relacionada(*)
  `)
  .eq('id', id)
  .single()
```

## Fluxos de Usuário

### Fluxo 1: Carregamento Inicial
1. Página monta
2. Hook carrega dados do escritório ativo
3. Query busca registros
4. Renderiza lista ou empty state

### Fluxo 2: Criação de Registro
1. Usuário clica em "Novo"
2. Modal de criação abre
3. Usuário preenche formulário
4. Validação client-side
5. Submit envia para banco
6. Sucesso: fecha modal, atualiza lista
7. Erro: mostra mensagem

### Fluxo 3: Edição de Registro
1. Usuário clica em item
2. Modal de edição abre com dados preenchidos
3. Usuário altera campos
4. Submit envia alterações
5. Atualiza lista

## Validações

| Campo | Regras | Mensagem de Erro |
|-------|--------|------------------|
| nome | required, min 3 chars | "Nome é obrigatório e deve ter pelo menos 3 caracteres" |
| email | required, valid email | "Email inválido" |
| valor | required, > 0 | "Valor deve ser maior que zero" |

## Permissões

| Ação | Permissão Necessária |
|------|---------------------|
| Visualizar | `modulo.visualizar` |
| Criar | `modulo.criar` |
| Editar | `modulo.editar` |
| Excluir | `modulo.excluir` |

## Integrações

### APIs Externas
- Nenhuma / Lista de APIs usadas

### Outras Páginas
- Link para `/pagina-relacionada`
- Recebe navegação de `/pagina-origem`

## Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| Mobile (<768px) | Cards empilhados, menu hamburger |
| Tablet (768-1024px) | Grid 2 colunas |
| Desktop (>1024px) | Layout completo com sidebar |

## Performance

### Otimizações Implementadas
- [ ] Paginação server-side
- [ ] Debounce em busca
- [ ] Virtualização de lista longa
- [ ] Cache de dados

### Métricas
- Tempo de carregamento inicial: ~Xms
- Registros por página: X

## Acessibilidade

- [ ] Labels em todos os inputs
- [ ] Navegação por teclado
- [ ] Contraste adequado
- [ ] Screen reader friendly

## Testes

| Tipo | Arquivo | Cobertura |
|------|---------|-----------|
| Unit | `__tests__/page.test.tsx` | X% |
| E2E | `e2e/modulo.spec.ts` | X cenários |

## Erros Conhecidos / Limitações

- Lista de bugs conhecidos
- Limitações atuais

## Melhorias Futuras

- [ ] Melhoria planejada 1
- [ ] Melhoria planejada 2

---

## Histórico de Alterações

| Data | Descrição | Commit |
|------|-----------|--------|
| YYYY-MM-DD | Criação da página | abc123 |
| YYYY-MM-DD | Adição de filtros | def456 |
