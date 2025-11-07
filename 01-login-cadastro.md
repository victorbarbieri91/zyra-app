# Módulo: Login + Cadastro

## Funcionalidade

Página única que alterna entre modo de login e cadastro de usuários. Interface simples e intuitiva com autenticação via Supabase Auth.

### Componentes

**Tela Única com Toggle**
- Botão/link para alternar entre "Entrar" e "Cadastrar"
- Formulário adapta campos conforme modo selecionado
- Validação em tempo real
- Feedback visual de erros

**Modo Login**
- Email
- Senha
- Checkbox "Lembrar-me"
- Link "Esqueci minha senha"
- Botão "Entrar"

**Modo Cadastro**
- Nome completo
- Email
- OAB (número + UF)
- Telefone
- Senha
- Confirmar senha
- Aceite dos termos de uso
- Botão "Cadastrar"

**Recuperação de Senha**
- Modal ou tela separada
- Input de email
- Envio de link de recuperação

### Fluxos

**Login**
1. Usuário insere credenciais
2. Validação via Supabase Auth
3. Redirect para Dashboard
4. Carregamento do perfil e permissões

**Cadastro**
1. Usuário preenche dados
2. Validação de email único
3. Validação de OAB (formato)
4. Criação de usuário no Supabase Auth
5. Trigger cria perfil na tabela `profiles`
6. Email de confirmação (opcional)
7. Login automático ou redirect para login

**Recuperação**
1. Usuário solicita recuperação
2. Supabase envia email com link
3. Usuário clica no link
4. Formulário para nova senha
5. Atualização e redirect para login

### Integrações com IA

**Via Chat do Dashboard (após login)**
- Atualizar dados do perfil
- Alterar senha via comando
- Gerenciar notificações

Neste módulo, IA não é necessária na tela de login/cadastro.

## Banco de Dados

### Tabelas Necessárias

**profiles** (criada por trigger após signup)
```
- id (uuid, FK para auth.users)
- nome_completo (text)
- oab_numero (text)
- oab_uf (text)
- telefone (text)
- avatar_url (text, nullable)
- escritorio_id (uuid, FK, nullable)
- role (text: 'admin', 'advogado', 'assistente')
- created_at (timestamp)
- updated_at (timestamp)
```

**escritorios** (para multi-tenant)
```
- id (uuid, PK)
- nome (text)
- cnpj (text, unique)
- endereco (jsonb)
- config (jsonb) - configurações gerais
- created_at (timestamp)
- updated_at (timestamp)
```

### Triggers

**on_auth_user_created**
- Dispara após criação de usuário em `auth.users`
- Cria registro em `profiles` com dados do cadastro
- Associa a escritório se houver convite pendente

### RLS (Row Level Security)

**profiles**
- Users podem ler e atualizar apenas próprio perfil
- Admins podem ler perfis do mesmo escritório

**escritorios**
- Users podem ler dados do próprio escritório
- Apenas admins podem atualizar

### Functions

**get_user_profile()**
- Retorna perfil completo do usuário logado
- Inclui dados do escritório
- Usado no carregamento inicial do Dashboard

**update_profile(profile_data jsonb)**
- Atualiza dados do perfil
- Validações de campos
- Retorna perfil atualizado
