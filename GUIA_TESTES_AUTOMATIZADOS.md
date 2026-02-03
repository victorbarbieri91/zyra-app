# 🤖 Guia de Testes Automatizados - ZYRA AI Platform

Este guia explica como usar o escritório de testes isolado para fazer testes automatizados da plataforma sem afetar dados reais.

---

## 📋 Parte 1: Configurar Escritório de Testes

### Passo 1: Aplicar Migration

1. Acesse: **Supabase Dashboard** → Seu projeto → **SQL Editor**
2. Clique em **"New Query"**
3. Copie e cole o conteúdo do arquivo:
   ```
   /supabase/migrations/20260203000001_criar_escritorio_testes.sql
   ```
4. Clique em **"Run"**
5. Aguarde confirmação: ✅ Success

**O que foi criado:**
- ✅ Escritório de testes (ID: `00000000-0000-0000-0000-000000000001`)
- ✅ Cargos padrão (Sócio, Advogado, Estagiário, etc.)
- ✅ Permissões completas para todos os módulos
- ✅ Funções auxiliares (limpar dados, criar usuário)
- ✅ View de estatísticas

---

### Passo 2: Criar Usuário de Teste

#### Opção A: Via Supabase Dashboard (Recomendado)

1. **Supabase Dashboard** → **Authentication** → **Users**
2. Clique em **"Add User"**
3. Preencha:
   - Email: `teste-beta@zyra.ai`
   - Password: `teste123456`
   - Auto Confirm User: **✓ Ativado**
4. Clique em **"Create User"**

5. Agora vincule ao escritório de testes:
   - Vá em **SQL Editor** → **New Query**
   - Execute:
   ```sql
   SELECT criar_usuario_teste('teste-beta@zyra.ai', 'Beta Tester - Automação ZYRA');
   ```
   - Resultado esperado:
   ```json
   {
     "success": true,
     "user_id": "...",
     "escritorio_id": "00000000-0000-0000-0000-000000000001",
     "message": "Usuário de teste configurado com sucesso!"
   }
   ```

#### Opção B: Usar Usuário Real Existente

Se preferir usar sua própria conta para testes:

```sql
-- Substitua 'seu-email@exemplo.com' pelo email da sua conta
SELECT criar_usuario_teste('seu-email@exemplo.com', 'Seu Nome - Testes');
```

**IMPORTANTE**: Isso NÃO afeta seus escritórios reais. Apenas vincula sua conta ao escritório de testes também.

---

## 🧪 Parte 2: Como Rodar os Testes

### 🤖 Usando Agente Inteligente (Recomendado)

Agora posso lançar um agente que vai:

1. ✅ **Mapear toda a plataforma** (páginas, APIs, queries)
2. ✅ **Testar funcionalidades** (CRM, Processos, Agenda, Financeiro, etc.)
3. ✅ **Criar dados de teste** (pessoas, processos, contratos)
4. ✅ **Validar CRUD** (Create, Read, Update, Delete)
5. ✅ **Reportar erros** encontrados

**Para iniciar os testes, basta você me pedir:**

```
"Lance o agente de testes para testar toda a plataforma"
```

ou

```
"Teste apenas o módulo CRM"
```

ou

```
"Faça um teste completo de todos os módulos"
```

O agente vai usar o escritório de testes (`00000000-0000-0000-0000-000000000001`) e todos os dados criados ficarão isolados lá.

---

### 📊 Monitorar Testes

Durante e após os testes, você pode monitorar via SQL:

```sql
-- Ver estatísticas de dados criados
SELECT * FROM v_estatisticas_escritorio_teste;
```

Resultado exemplo:
```
modulo         | total_registros
---------------|----------------
Pessoas        | 15
Processos      | 8
Eventos        | 12
Tarefas        | 20
Lançamentos    | 25
Contratos      | 5
```

---

## 🧹 Parte 3: Limpar Dados de Teste

Após os testes, limpe os dados:

```sql
-- Remove TODOS os dados do escritório de testes
SELECT limpar_dados_escritorio_teste();
```

**Seguro**: Só afeta o escritório de testes, nunca dados reais.

---

## 🔒 Garantias de Segurança

### ✅ O que GARANTE que não vai afetar dados reais?

1. **Row Level Security (RLS)**
   - Todas as tabelas têm políticas de RLS por `escritorio_id`
   - Impossível acessar dados de outro escritório

2. **UUID Fixo e Único**
   - Escritório de testes: `00000000-0000-0000-0000-000000000001`
   - Escritórios reais: UUIDs diferentes
   - Nenhum vínculo entre eles

3. **Isolamento Total**
   - Usuários, processos, contratos, etc. são filtrados por escritório
   - Mesmo se houver bug, o RLS bloqueia acesso cruzado

4. **Função de Limpeza**
   - Deleta APENAS onde `escritorio_id = '00000000-0000-0000-0000-000000000001'`
   - Impossível deletar dados de outros escritórios

---

## 🎯 Tipos de Teste Disponíveis

### 1. Teste Completo (30-40 min)
```
Lance o agente para testar TODA a plataforma
```

**O que testa:**
- ✅ Dashboard (métricas, cards, gráficos)
- ✅ CRM (pessoas, oportunidades, interações)
- ✅ Processos (CRUD, movimentações, partes)
- ✅ Agenda (eventos, tarefas, audiências)
- ✅ Financeiro (contratos, lançamentos, faturas)
- ✅ Publicações (consultas, análises)
- ✅ Integrações (APIs, webhooks)

---

### 2. Teste por Módulo (5-10 min)
```
Teste apenas o módulo Financeiro
```

**Módulos disponíveis:**
- `CRM`
- `Processos`
- `Agenda`
- `Financeiro`
- `Dashboard`
- `Publicações`

---

### 3. Teste Específico (2-5 min)
```
Teste a criação de contratos de honorários
```

ou

```
Valide se o cálculo de timesheet está correto
```

---

## 📈 Relatório de Testes

O agente gera um relatório completo:

```markdown
# RELATÓRIO DE TESTES - ZYRA AI PLATFORM
Data: 2026-02-03
Duração: 28 minutos

## ✅ FUNCIONALIDADES TESTADAS (82%)

### CRM (95%)
✅ Criar pessoa física
✅ Criar pessoa jurídica
✅ Editar pessoa
✅ Buscar por CPF/CNPJ
❌ Deletar pessoa com vínculos (ERRO: não valida)

### Processos (88%)
✅ Criar processo
✅ Adicionar partes
✅ Registrar movimentação
❌ Link tribunal quebrado (500 error)

### Financeiro (75%)
✅ Criar contrato
✅ Lançar despesa
❌ Gerar fatura mensal (erro de cálculo)
❌ Timesheet não calcula hora extra

## ❌ PROBLEMAS ENCONTRADOS (8)

### CRÍTICO (2)
1. Fatura mensal não inclui despesas reembolsáveis
   Arquivo: src/lib/financeiro.ts:234

2. Timesheet permite lançar mais de 24h/dia
   Arquivo: src/app/api/timesheet/route.ts:89

### MÉDIO (4)
3. Busca por CPF não valida formato
4. Link tribunal retorna 500
...

### BAIXO (2)
7. Logo do escritório não carrega
8. Tooltip da agenda em inglês

## 📊 COBERTURA GERAL

Módulos testados: 7/10 (70%)
Funcionalidades testadas: 127/155 (82%)
APIs validadas: 45/50 (90%)
Queries testadas: 38/42 (90%)

TEMPO TOTAL: 28 minutos
```

---

## ❓ FAQ

**P: Os testes vão deixar dados "lixo" no banco?**
R: Sim, mas isolados no escritório de testes. Execute `limpar_dados_escritorio_teste()` para remover.

**P: Posso usar minha conta real para testes?**
R: Sim! A função `criar_usuario_teste()` apenas adiciona seu usuário ao escritório de testes. Seus escritórios reais não são afetados.

**P: O que acontece se eu deletar o escritório de testes?**
R: Todos os dados são deletados automaticamente (CASCADE). Basta rodar a migration novamente para recriar.

**P: Posso rodar testes em produção?**
R: Sim, é seguro! O RLS garante isolamento total. Mas recomendamos fazer em ambiente de staging se possível.

**P: Quanto custa rodar os testes?**
R: Zero. Os testes usam APIs gratuitas do Supabase. Só consomem um pouco de banco de dados.

---

## 🚀 Próximos Passos

1. ✅ Aplique a migration (Passo 1)
2. ✅ Crie o usuário de teste (Passo 2)
3. ✅ Peça ao Claude para lançar o agente
4. 📊 Analise o relatório
5. 🐛 Corrija os bugs encontrados
6. 🧹 Limpe os dados de teste

---

**Pronto para começar?** Basta me pedir:

> "Lance o agente de testes completo agora!"

ou

> "Teste o módulo CRM primeiro"

🎯 Estou pronto para testar sua plataforma!
