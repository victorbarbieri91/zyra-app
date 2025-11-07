# Módulo: Agenda

## Funcionalidade

Calendário jurídico integrado com gestão de compromissos, prazos processuais, audiências e lembretes automatizados.

### Visualizações do Calendário

**Visão Mensal**
- Calendário tradicional mês a mês
- Marcadores visuais para tipo de evento
- Cores diferentes por categoria
- Indicador de quantidade de eventos por dia
- Destaque para prazos críticos

**Visão Semanal**
- Visualização por semana com horários
- Grid de horários (8h às 20h)
- Eventos posicionados por duração
- Visualização de conflitos
- Sidebar com lista de tarefas

**Visão Diária**
- Timeline detalhada do dia
- Blocos de tempo de 30min
- Eventos com horário e sem horário
- Checklist de tarefas do dia
- Resumo de prazos

**Visão Lista**
- Lista cronológica de compromissos
- Filtros avançados
- Agrupamento por tipo
- Exportação para Excel/PDF

**Visão Prazos Processuais**
- Calendário específico de prazos
- Cálculo automático de dias úteis
- Alertas de vencimento
- Cores por criticidade
- Filtro por processo/cliente/tipo

### Tipos de Eventos

**Compromissos**
- Reuniões com clientes
- Reuniões internas
- Eventos externos
- Blocos de trabalho

**Audiências**
- Tipo de audiência
- Processo vinculado
- Local (fórum, virtual)
- Juiz/Vara
- Pauta
- Preparação necessária

**Prazos Processuais**
- Prazo de recurso
- Prazo de manifestação
- Prazo de cumprimento
- Prazo de juntada
- Prazo de pagamento
- Outros prazos

**Tarefas**
- Tarefas sem horário definido
- Checklist
- Prioridade
- Responsável
- Deadline

### Criação de Evento

**Formulário Base**
- Título
- Tipo de evento
- Data e hora início
- Data e hora fim (ou evento dia inteiro)
- Local
- Descrição
- Participantes (internos e externos)
- Cliente vinculado
- Processo vinculado (se aplicável)
- Categoria/Etiqueta
- Cor personalizada

**Configurações de Notificação**
- Lembrete prévio (15min, 30min, 1h, 1dia, 1 semana)
- Múltiplos lembretes
- Enviar para participantes
- Métodos: email, push, SMS, whatsapp

**Recorrência**
- Não repetir
- Diariamente
- Semanalmente (escolher dias)
- Mensalmente
- Anualmente
- Personalizado
- Definir fim da recorrência

**Audiências - Campos Específicos**
- Número do processo
- Tipo de audiência (inicial, instrução, conciliação, etc)
- Modalidade (presencial/virtual)
- Link da sala virtual
- Fórum/Vara
- Juiz
- Documentos necessários
- Tempo estimado de deslocamento
- Checklist de preparação

**Prazos Processuais - Campos Específicos**
- Processo vinculado
- Tipo de prazo
- Data do protocolo/intimação
- Data limite
- Dias úteis/corridos
- Suspensão de prazo
- Prorrogação
- Status (aberto, cumprido, perdido)

### Funcionalidades Avançadas

**Cálculo de Prazos**
- Cálculo automático baseado em dias úteis
- Considera feriados nacionais, estaduais e municipais
- Considera recessos forenses
- Possibilidade de ajuste manual
- Histórico de cálculos

**Gestão de Feriados**
- Base de feriados nacionais
- Cadastro de feriados locais
- Recessos forenses
- Pontos facultativos
- Importação de calendário oficial

**Conflitos de Agenda**
- Detecção automática de sobreposição
- Sugestão de horários alternativos
- Visualização de disponibilidade da equipe

**Compartilhamento**
- Compartilhar eventos específicos
- Compartilhar calendário completo (somente leitura)
- Sincronização com Google Calendar / Outlook
- Link público de disponibilidade

**Filtros e Buscas**
- Filtrar por tipo de evento
- Filtrar por cliente/processo
- Filtrar por responsável
- Filtrar por categoria
- Busca por texto
- Filtros salvos (favoritos)

### Integrações com IA

**Via Chat do Dashboard**
- "Quais compromissos tenho hoje?"
- "Agende reunião com cliente João para sexta às 14h"
- "Mostre prazos vencendo esta semana"
- "Quando é a próxima audiência do processo X?"
- "Mude reunião de amanhã para próxima terça mesmo horário"
- "Calcule prazo de recurso a partir de hoje"
- "Encontre horário livre para reunião de 2h esta semana"

**Automações com n8n**
- Envio automático de lembretes
- Criação de prazos ao detectar intimação
- Sincronização com tribunais (movimentações → prazos)
- Lembretes de preparação de audiência
- Notificação de conflitos de agenda
- Envio de convites por email/whatsapp

**Sugestões Proativas**
- "Você tem audiência em 2h. Deseja revisar o processo?"
- "Prazo do processo X vence amanhã. Documentos prontos?"
- "Sua agenda está vazia na sexta de manhã. Agendar tarefas pendentes?"

## Banco de Dados

### Tabelas Necessárias

**eventos**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- titulo (text)
- tipo (text: 'compromisso', 'audiencia', 'prazo', 'tarefa')
- data_inicio (timestamp)
- data_fim (timestamp, nullable)
- dia_inteiro (boolean)
- local (text, nullable)
- descricao (text, nullable)
- cor (text, nullable) - hex color
- cliente_id (uuid, FK clientes, nullable)
- processo_id (uuid, FK processos, nullable)
- criado_por (uuid, FK profiles)
- responsavel_id (uuid, FK profiles)
- status (text: 'agendado', 'realizado', 'cancelado', 'remarcado')
- recorrencia_id (uuid, nullable) - agrupa eventos recorrentes
- observacoes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**eventos_audiencias** (extends eventos)
```
- evento_id (uuid, PK, FK eventos)
- tipo_audiencia (text: 'inicial', 'instrucao', 'conciliacao', 'julgamento', etc)
- modalidade (text: 'presencial', 'virtual')
- link_virtual (text, nullable)
- forum_vara (text)
- juiz (text, nullable)
- pauta (text, nullable)
- documentos_necessarios (text[], nullable)
- tempo_deslocamento_min (integer, nullable)
- checklist_preparacao (jsonb, nullable)
```

**eventos_prazos** (extends eventos)
```
- evento_id (uuid, PK, FK eventos)
- tipo_prazo (text: 'recurso', 'manifestacao', 'cumprimento', 'juntada', etc)
- data_intimacao (date)
- data_limite (date)
- dias_uteis (boolean)
- quantidade_dias (integer)
- suspenso (boolean)
- data_suspensao (date, nullable)
- prorrogado (boolean)
- nova_data_limite (date, nullable)
- cumprido (boolean)
- cumprido_em (timestamp, nullable)
- perdido (boolean)
```

**eventos_participantes**
```
- id (uuid, PK)
- evento_id (uuid, FK eventos)
- tipo (text: 'interno', 'externo')
- user_id (uuid, FK profiles, nullable) - se interno
- nome (text) - se externo
- email (text, nullable)
- telefone (text, nullable)
- confirmado (boolean)
- created_at (timestamp)
```

**eventos_lembretes**
```
- id (uuid, PK)
- evento_id (uuid, FK eventos)
- user_id (uuid, FK profiles)
- tempo_antes_minutos (integer)
- metodos (text[]) - 'email', 'push', 'sms', 'whatsapp'
- enviado (boolean)
- enviado_em (timestamp, nullable)
```

**eventos_recorrencia**
```
- id (uuid, PK)
- frequencia (text: 'diaria', 'semanal', 'mensal', 'anual', 'custom')
- intervalo (integer) - a cada X dias/semanas/meses
- dias_semana (integer[], nullable) - 0=dom, 6=sab
- dia_mes (integer, nullable) - dia do mês
- mes (integer, nullable) - mês do ano
- data_fim (date, nullable)
- ocorrencias (integer, nullable) - número de repetições
```

**feriados**
```
- id (uuid, PK)
- nome (text)
- data (date)
- tipo (text: 'nacional', 'estadual', 'municipal')
- uf (text, nullable)
- cidade (text, nullable)
- fixo (boolean) - se repete todo ano
- recesso_forense (boolean)
- created_at (timestamp)
- UNIQUE(data, tipo, uf, cidade)
```

**eventos_categorias**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- cor (text)
- icone (text, nullable)
- created_at (timestamp)
```

### Views

**v_agenda_dia**
```
Eventos do dia com informações consolidadas
Inclui dados de cliente, processo, participantes
Ordenado por horário
```

**v_prazos_vencendo**
```
Prazos com vencimento próximo
Calculado por dias úteis
Ordenado por criticidade
```

**v_disponibilidade_equipe**
```
Horários livres/ocupados de cada membro
Para sugestão de agendamentos
```

### Functions

**create_evento(dados jsonb)**
- Cria evento com validações
- Cria participantes e lembretes
- Se recorrente, cria série de eventos
- Detecta conflitos
- Retorna evento criado

**calcular_prazo(data_base date, dias integer, uteis boolean)**
- Calcula prazo considerando feriados
- Retorna data limite
- Retorna dias de calendário envolvidos

**get_agenda_periodo(user_id uuid, data_inicio date, data_fim date)**
- Retorna eventos do período
- Filtra por permissões do usuário
- Agrupa recorrências

**check_conflitos(user_id uuid, data_inicio timestamp, data_fim timestamp)**
- Verifica conflitos de horário
- Retorna eventos conflitantes

**sugerir_horarios(user_id uuid, duracao_min integer, data_preferencia date)**
- Analisa agenda
- Retorna sugestões de horários livres

**marcar_prazo_cumprido(prazo_id uuid)**
- Atualiza status do prazo
- Registra data de cumprimento
- Cria notificação

### Triggers

**validate_evento_dates**
- Garante data_fim >= data_inicio
- Valida recorrência

**create_prazo_lembretes**
- Ao criar prazo, cria lembretes automáticos
- 7 dias antes, 3 dias antes, 1 dia antes

**notify_prazo_vencendo**
- Verifica prazos vencendo
- Envia notificações
- Alerta no dashboard

**sync_processo_audiencias**
- Quando audiência é criada/alterada
- Atualiza dados no módulo Processos

### Scheduled Functions

**check_prazos_vencendo**
- Roda diariamente às 7h
- Identifica prazos vencendo
- Envia alertas

**send_agenda_diaria**
- Roda às 7h
- Envia resumo da agenda do dia
- Para cada usuário com eventos

**cleanup_old_events**
- Roda mensalmente
- Arquiva eventos antigos (> 2 anos)
- Mantém base limpa

### RLS

- Usuários veem eventos do próprio escritório
- Podem ver eventos onde são participantes ou responsáveis
- Podem editar apenas eventos que criaram ou são responsáveis
- Admins veem/editam todos eventos do escritório
