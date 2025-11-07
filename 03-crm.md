# Módulo: CRM (Gestão de Clientes)

## Funcionalidade

Gestão completa de relacionamento com clientes, incluindo cadastro, histórico de interações, documentos associados e análise de relacionamento.

### Telas Principais

**Lista de Clientes**
- Grid/tabela com clientes
- Filtros: status (ativo/inativo), tipo (pessoa física/jurídica), origem, responsável
- Busca por nome, CPF/CNPJ, OAB
- Ordenação por diversos campos
- Ações rápidas: ligar, email, whatsapp, ver processos
- Indicadores visuais: cliente com pendências, inadimplente, sem contato há X dias

**Cadastro/Edição de Cliente**

**Dados Principais**
- Tipo: Pessoa Física ou Jurídica
- Nome completo / Razão social
- CPF/CNPJ
- RG / Inscrição Estadual
- Data de nascimento / Data de fundação
- Nacionalidade / País de origem
- Estado civil
- Profissão / Ramo de atividade

**Contatos**
- Múltiplos telefones (residencial, comercial, celular)
- Múltiplos emails
- Endereço completo (com CEP auto-complete)
- Redes sociais
- Contato de emergência

**Dados Jurídicos**
- Como conheceu o escritório (origem)
- Advogado responsável
- Data de cadastro
- Status (ativo, inativo, prospecto)
- Observações gerais

**Perfil Completo do Cliente**

Visualização unificada com abas:

1. **Resumo**
   - Dados principais
   - Processos ativos/concluídos
   - Situação financeira
   - Próximos compromissos
   - Timeline de interações recentes

2. **Processos**
   - Lista de todos processos do cliente
   - Status de cada um
   - Link direto para módulo Processos

3. **Consultivo**
   - Consultas realizadas
   - Pareceres emitidos
   - Contratos vigentes

4. **Financeiro**
   - Honorários pagos/pendentes
   - Histórico de pagamentos
   - Faturas em aberto
   - Gráfico de inadimplência

5. **Documentos**
   - Todos documentos do cliente
   - Categorizados e pesquisáveis
   - Upload de novos documentos

6. **Interações**
   - Timeline completa de contatos
   - Emails, ligações, reuniões
   - Notas e observações
   - Registro automático de ações

7. **Agenda**
   - Compromissos agendados
   - Histórico de reuniões
   - Criar novo agendamento

**Registro de Interações**

Modal/tela para registrar contato:
- Tipo: ligação, reunião, email, whatsapp, outro
- Data e hora
- Duração
- Participantes
- Assunto
- Descrição detalhada
- Anexos
- Próximos passos / Follow-up

### Funcionalidades Especiais

**Relacionamentos**
- Vincular clientes relacionados (sócios, família, etc)
- Procuradores e representantes legais
- Empresa x Sócios
- Matriz x Filiais

**Origem e Captação**
- Rastreamento de origem (indicação, marketing, etc)
- Indicador (quem indicou)
- Campanha de captação
- Análise de ROI por origem

**Segmentação**
- Tags personalizadas
- Grupos de clientes
- Filtros salvos
- Listas dinâmicas

**Inativação Inteligente**
- Sistema sugere clientes inativos (sem movimentação há X dias)
- Workflow de reativação
- Histórico de motivo de inativação

### Integrações com IA

**Via Chat do Dashboard**
- "Mostre clientes inativos há mais de 60 dias"
- "Crie relatório de captação do trimestre"
- "Quais clientes têm processos com prazo esta semana?"
- "Agende follow-up com cliente X para próxima terça"
- "Analise perfil de inadimplência dos clientes"
- "Sugira clientes para upsell de serviços"

**Automações com n8n**
- Lembrete de follow-up periódico
- Envio automático de satisfação pós-atendimento
- Alerta de cliente sem contato há X dias
- Enriquecimento de dados via APIs externas
- Análise de sentimento em interações

**Sugestões Proativas da IA**
- "Cliente X não tem contato há 45 dias. Deseja agendar ligação?"
- "Cliente Y tem aniversário amanhã. Enviar mensagem?"
- "Processos do cliente Z movimentaram. Notificar cliente?"

## Banco de Dados

### Tabelas Necessárias

**clientes**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- tipo (text: 'pf', 'pj')
- nome_completo (text) - ou razão social
- nome_fantasia (text, nullable) - para PJ
- cpf_cnpj (text, unique)
- rg_ie (text, nullable)
- data_nascimento (date, nullable)
- nacionalidade (text)
- estado_civil (text, nullable)
- profissao (text, nullable)
- origem (text) - como conheceu
- indicado_por (uuid, FK clientes, nullable)
- responsavel_id (uuid, FK profiles)
- status (text: 'ativo', 'inativo', 'prospecto')
- observacoes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- inativado_em (timestamp, nullable)
- motivo_inativacao (text, nullable)
```

**clientes_contatos**
```
- id (uuid, PK)
- cliente_id (uuid, FK clientes)
- tipo (text: 'telefone', 'email', 'endereco', 'social')
- label (text) - ex: 'celular', 'comercial', 'residencial'
- valor (text)
- principal (boolean)
- created_at (timestamp)
```

**clientes_enderecos**
```
- id (uuid, PK)
- cliente_id (uuid, FK clientes)
- tipo (text: 'residencial', 'comercial')
- cep (text)
- logradouro (text)
- numero (text)
- complemento (text, nullable)
- bairro (text)
- cidade (text)
- uf (text)
- principal (boolean)
- created_at (timestamp)
```

**clientes_relacionamentos**
```
- id (uuid, PK)
- cliente_origem_id (uuid, FK clientes)
- cliente_destino_id (uuid, FK clientes)
- tipo_relacionamento (text: 'socio', 'procurador', 'conjuge', 'parente', 'filial', etc)
- observacoes (text, nullable)
- created_at (timestamp)
```

**interacoes**
```
- id (uuid, PK)
- cliente_id (uuid, FK clientes)
- user_id (uuid, FK profiles) - quem registrou
- tipo (text: 'ligacao', 'reuniao', 'email', 'whatsapp', 'outros')
- data_hora (timestamp)
- duracao_minutos (integer, nullable)
- assunto (text)
- descricao (text)
- participantes (text[], nullable)
- follow_up (boolean)
- follow_up_data (date, nullable)
- created_at (timestamp)
```

**interacoes_anexos**
```
- id (uuid, PK)
- interacao_id (uuid, FK interacoes)
- arquivo_nome (text)
- arquivo_url (text)
- arquivo_tipo (text)
- arquivo_tamanho (integer)
- created_at (timestamp)
```

**clientes_tags**
```
- id (uuid, PK)
- cliente_id (uuid, FK clientes)
- tag (text)
- created_at (timestamp)
- UNIQUE(cliente_id, tag)
```

**clientes_origem_captacao**
```
- id (uuid, PK)
- nome (text, unique) - ex: 'Google Ads', 'Indicação Clientes', 'Instagram'
- tipo (text: 'organico', 'pago', 'indicacao', 'evento')
- ativo (boolean)
- created_at (timestamp)
```

### Views

**v_clientes_resumo**
```
Visão consolidada com:
- Dados do cliente
- Total de processos (ativos/concluídos)
- Situação financeira (a receber, em atraso)
- Última interação
- Próximo compromisso
- Advogado responsável
```

**v_clientes_inativos**
```
Clientes sem interação/movimentação há X dias
Usado para campanhas de reativação
```

### Functions

**create_cliente(dados jsonb)**
- Cria cliente com validação de CPF/CNPJ
- Cria contatos e endereços associados
- Retorna cliente completo

**get_cliente_completo(cliente_id uuid)**
- Retorna dados completos do cliente
- Inclui contatos, endereços, tags
- Inclui resumo de processos e financeiro

**registrar_interacao(cliente_id uuid, dados jsonb)**
- Registra nova interação
- Atualiza última interação do cliente
- Pode criar lembrete de follow-up

**get_clientes_timeline(cliente_id uuid, limit int)**
- Retorna timeline de atividades do cliente
- Processos, interações, pagamentos, documentos
- Ordenado por data DESC

**suggest_inactive_clients(dias int)**
- Retorna clientes sem interação há X dias
- Para campanha de reativação

### Triggers

**update_cliente_updated_at**
- Atualiza campo updated_at em qualquer mudança

**log_cliente_changes**
- Registra histórico de alterações em tabela de auditoria

**create_interaction_notification**
- Quando interação com follow-up, cria notificação na agenda

### RLS

- Usuários veem apenas clientes do próprio escritório
- Advogados veem todos clientes do escritório
- Assistentes veem apenas clientes que estão vinculados
