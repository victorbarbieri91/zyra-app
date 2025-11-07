# 🚀 Roadmap de Desenvolvimento - Zyra Legal

## Setup Inicial (Dia 1-2)

### 1. Criar projeto Next.js 15
```bash
npx create-next-app@latest zyra-legal --typescript --tailwind --app
cd zyra-legal
```

### 2. Instalar dependências essenciais
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @tanstack/react-query zustand
npm install react-hook-form zod @hookform/resolvers
npm install date-fns recharts
npm install lucide-react
```

### 3. Configurar shadcn/ui
```bash
npx shadcn-ui@latest init
# Escolha: New York style, Slate base color, CSS variables
```

### 4. Instalar componentes básicos shadcn
```bash
npx shadcn-ui@latest add button card input label
npx shadcn-ui@latest add dialog sheet toast
npx shadcn-ui@latest add table tabs
npx shadcn-ui@latest add form select
npx shadcn-ui@latest add calendar date-picker
```

### 5. Configurar Supabase
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 6. Criar .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## Estrutura Base (Dia 3-4)

### 1. Layout Principal
- Header com navegação
- Sidebar para menu
- Container para conteúdo
- Footer simples

### 2. Sistema de Rotas
```
app/
├── (auth)/
│   ├── layout.tsx       # Layout autenticado
│   └── dashboard/page.tsx
├── (public)/
│   ├── layout.tsx       # Layout público
│   └── login/page.tsx
└── layout.tsx           # Root layout
```

### 3. Autenticação
- Tela de login/cadastro
- Middleware de proteção de rotas
- Context de usuário
- Logout funcional

## MVP - Semana 1

### Dashboard Básico
- [ ] Cards de métricas estáticas
- [ ] Layout em 3 colunas
- [ ] Integração com Supabase
- [ ] Dados do usuário logado

### CRUD Clientes
- [ ] Listagem com tabela
- [ ] Formulário de cadastro
- [ ] Edição inline
- [ ] Busca e filtros
- [ ] Exclusão com confirmação

### CRUD Processos
- [ ] Listagem principal
- [ ] Cadastro com validação
- [ ] Status e prioridades
- [ ] Vinculação com clientes
- [ ] Visualização detalhada

## MVP - Semana 2

### Centro de Comando (IA)
- [ ] Interface de chat
- [ ] Integração com Claude MCP
- [ ] Comandos básicos
- [ ] Histórico de conversas
- [ ] Resultados formatados

### Timesheet Básico
- [ ] Widget de registro rápido
- [ ] Listagem de horas
- [ ] Faturamento simples
- [ ] Relatório básico

## Prioridades por Módulo

### 🥇 Alta Prioridade (Core Business)
1. **Processos** - Coração do sistema
2. **Centro de Comando** - Diferencial competitivo
3. **Clientes (CRM)** - Base de tudo
4. **Financeiro** - Essencial para receita

### 🥈 Média Prioridade (Produtividade)
5. **Agenda** - Organização diária
6. **Publicações** - Automação importante
7. **Dashboard** - Visão gerencial

### 🥉 Baixa Prioridade (Nice to Have)
8. **Consultivo** - Feature específica
9. **Documentos** - Pode usar storage básico
10. **Relatórios** - Versão simples primeiro

## Comandos Úteis para Desenvolvimento

### Gerar componentes com IA
```bash
# Use o MCP do 21st.dev já configurado
# No chat: /21 criar formulário de cliente com validação
```

### Criar migration Supabase
```sql
-- supabase/migrations/001_initial_schema.sql
-- Copie o schema do database-schema.md
```

### Deploy na Vercel
```bash
# Conecte com GitHub primeiro
vercel --prod
```

## Checklist Diário

- [ ] Revisar código do dia anterior
- [ ] Definir 3 tarefas prioritárias
- [ ] Testar no navegador a cada mudança
- [ ] Commitar a cada feature completa
- [ ] Documentar decisões importantes
- [ ] Pedir ajuda ao Claude quando travar

## Recursos de Aprendizado

1. **Next.js 15 Docs**: https://nextjs.org/docs
2. **Supabase Docs**: https://supabase.com/docs
3. **shadcn/ui**: https://ui.shadcn.com
4. **Tailwind CSS**: https://tailwindcss.com
5. **TypeScript**: https://www.typescriptlang.org/docs

## Dúvidas Frequentes

**P: Como começar o servidor de desenvolvimento?**
```bash
npm run dev
# Acesse http://localhost:3000
```

**P: Como ver logs do Supabase?**
Use o MCP Supabase:
```typescript
mcp__supabase__get_logs({ service: "api" })
```

**P: Como debugar erros?**
1. Abra o Console do navegador (F12)
2. Verifique o terminal do Next.js
3. Use `console.log()` liberalmente
4. Pergunte ao Claude com o erro completo

## Notas Importantes

- **Sempre** use TypeScript (mesmo que o Claude gere JavaScript)
- **Sempre** teste autenticação antes de desenvolver features
- **Sempre** mantenha backup do banco de dados
- **Nunca** commite .env.local no Git
- **Nunca** exponha keys sensíveis no frontend

---

💡 **Dica de Ouro**: Quando travar, volte para a documentação original em README.md e database-schema.md. Tudo que você precisa está descrito lá!