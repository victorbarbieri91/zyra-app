# Módulo: Centro de Comando

## Funcionalidade

Módulo dedicado para interação natural com o sistema via IA. O advogado conversa, consulta, executa ações e analisa dados sem precisar navegar por múltiplas telas. Um hub centralizado onde linguagem natural se transforma em ações concretas.

### Layout da Tela

**Estrutura em 2 Áreas Principais:**

**Área Superior (60% altura): Conversação**
- Chat completo com histórico
- Input de texto com sugestões inteligentes
- Botões de ação rápida contextuais
- Mensagens da IA com formatação rica
- Possibilidade de anexar arquivos/imagens
- Entrada por voz (opcional)
- Botões: [Limpar Conversa] [Ver Histórico] [Favoritos]

**Área Inferior (40% altura): Resultados**
- Visualização dinâmica dos resultados
- Tabs de visualização: Tabela | Cards | Timeline | Gráficos
- Ações contextuais sobre os resultados
- Exportação (CSV, PDF, Excel)
- Botões de ação rápida nos itens
- Scroll independente da conversa

**Sidebar Lateral (colapsável):**
- Seletor de contexto (módulo alvo)
- Comandos rápidos favoritos
- Histórico de comandos recentes
- Templates de comandos comuns

### Funcionalidades Principais

**1. Seletor de Contexto**

Dropdown no topo para focar a IA em módulos específicos:
- Tudo (contexto geral)
- Processos
- Clientes
- Agenda
- Financeiro
- Publicações
- Consultivo
- Documentos
- Relatórios

**Benefício:** Respostas mais precisas e ações direcionadas

**2. Tipos de Comandos Suportados**

**CONSULTAS (Read)**
Buscar e visualizar informações:
- "Mostre processos com prazo esta semana"
- "Quais clientes estão inadimplentes?"
- "Quanto recebi este mês?"
- "Onde está o contrato do cliente João Silva?"
- "Minha agenda de amanhã"
- "Liste publicações não lidas"
- "Processos do cliente X"
- "Horas não faturadas do mês"

**AÇÕES (Create/Update)**
Executar operações no sistema:
- "Registrar 2.5h no processo #1234 - análise contratual"
- "Faturar horas do cliente João Silva"
- "Agendar reunião com Maria para sexta às 14h"
- "Lançar etapa inicial do processo #5678"
- "Marcar publicação #789 como lida"
- "Criar novo cliente: Empresa ABC"
- "Atualizar status do processo para suspenso"
- "Enviar cobrança para cliente inadimplente"

**ANÁLISES (Insights)**
Gerar análises e insights:
- "Analise performance da equipe este mês"
- "Qual área está mais rentável?"
- "Clientes sem contato há mais de 60 dias"
- "Processos parados há muito tempo"
- "Taxa de êxito em processos trabalhistas"
- "Compare receita deste mês vs mês passado"

**RELATÓRIOS (Export)**
Gerar e exportar relatórios:
- "Gere relatório de receitas do trimestre"
- "Liste todos processos do cliente X"
- "Exportar timesheet de novembro"
- "Relatório de inadimplência"
- "DRE do último trimestre"

**AGENDAMENTOS (Schedule)**
Criar lembretes e tarefas futuras:
- "Lembre-me de ligar para cliente Y amanhã às 10h"
- "Agendar follow-up com cliente Z daqui 7 dias"
- "Criar tarefa de revisar contrato até sexta"
- "Notifique-me quando processo X movimentar"

**NAVEGAÇÃO (Go to)**
Acessar diretamente telas:
- "Abra o processo #1234"
- "Vá para agenda de amanhã"
- "Mostre perfil do cliente João"
- "Abra relatório financeiro"

**3. Área de Resultados (Versátil)**

**A) Visualização em Tabela**
Para listas e múltiplos registros:
- Colunas customizáveis
- Ordenação por coluna
- Filtros rápidos
- Ações em linha
- Paginação
- Exportação CSV/Excel
- Seleção múltipla

**B) Visualização em Cards**
Para detalhes e informações ricas:
- Layout de cards responsivo
- Informações principais destacadas
- Botões de ação por card
- Badges de status
- Miniaturas de documentos

**C) Visualização em Timeline**
Para histórico e sequências:
- Linha do tempo cronológica
- Agrupamento por data
- Ícones por tipo de evento
- Expansão de detalhes
- Filtro por tipo

**D) Visualização em Gráficos**
Para análises visuais:
- Barras horizontais/verticais
- Pizza/Donut
- Linhas (tendências)
- Área
- Sparklines
- Gauges

**E) Confirmação de Ação**
Após executar comandos:
- Ícone de sucesso/erro
- Resumo da ação executada
- Dados principais alterados
- Botões de ação subsequente
- Link para visualizar objeto criado/editado

**4. Comandos Rápidos (Favoritos)**

Sidebar com atalhos personalizáveis:

**Pré-configurados:**
- Minha agenda hoje
- Prazos desta semana
- Horas não faturadas
- Publicações pendentes
- Processos críticos
- Inadimplência atual
- Receita do mês

**Personalizáveis:**
- Usuário cria seus próprios comandos
- Nome + comando + ícone
- Pode reordenar
- Compartilhar com equipe
- Categorização

**5. Histórico de Comandos**

Painel lateral com histórico completo:
- Agrupado por data (Hoje, Ontem, Esta semana)
- Busca no histórico
- Favoritar comandos do histórico
- Reexecutar comando
- Ver resultado anterior
- Limpar histórico

**6. Entrada de Voz (Opcional)**

Botão de microfone no input:
- Clica e fala naturalmente
- Transcrição em tempo real
- IA processa comando falado
- Ideal para advogados ocupados
- Pode ditar longos comandos

### Inteligência da IA

**Entendimento Contextual**

A IA mantém contexto da conversa:

**Exemplo 1: Seguimento**
```
User: Mostre processos do cliente João Silva
IA: [mostra 3 processos]

User: Fature horas do primeiro
IA: [entende que é o processo #1234]
     ✓ 8h faturadas - R$ 4.000

User: Agende audiência para o segundo na sexta às 14h
IA: [entende que é o processo #5678]
     ✓ Audiência agendada para 08/11 às 14h
```

**Exemplo 2: Correção Automática**
```
User: Mostra clientes inadeplentes
IA: Você quis dizer "inadimplentes"?
    Encontrei 3 clientes com pagamentos em atraso...
```

**Exemplo 3: Sugestões Proativas**
```
User: Registrar 3h no processo 1234
IA: ✓ Registrado 3h no processo #1234
    
    💡 Você tem 15h não faturadas neste processo
       (valor potencial: R$ 7.500).
       Deseja faturar agora? [Sim] [Não]
```

**Exemplo 4: Desambiguação**
```
User: Abra o processo da Silva
IA: Encontrei 3 processos:
    1. Processo #1234 - Silva Ltda (Trabalhista)
    2. Processo #5678 - Maria Silva (Cível)
    3. Processo #9012 - João Silva (Tributário)
    
    Qual deseja abrir? Ou refine sua busca.
```

**Personalidade da IA**

Tom profissional mas amigável:
- Saudações personalizadas
- Celebra conquistas
- Oferece dicas úteis
- Explica quando não entende
- Pede confirmação em ações críticas
- Usa emojis moderadamente (para contexto)

**Exemplo:**
```
User: Quanto recebi este mês?

IA: 💰 Ótima pergunta!
    
    Você recebeu R$ 32.500 em novembro.
    Isso representa 81% da sua meta mensal.
    
    Está faltando apenas R$ 7.500 para bater
    a meta de R$ 40.000. Continue assim! 🚀
    
    [Ver Detalhes] [Gerar Relatório]
```

### Recursos Avançados

**Multi-ação em Um Comando**

```
User: Liste processos com prazo esta semana e crie lembretes para todos

IA: ✓ Encontrei 5 processos com prazo
    ✓ Criei 5 lembretes (1 dia antes de cada prazo)
    
    [Ver Processos] [Ver Lembretes]
```

**Comparações e Análises Complexas**

```
User: Compare minha receita de outubro vs novembro por área

IA: Análise comparativa Out/Nov:
    
    📈 Crescimento:
    • Tributário: +23% (R$ 12k → R$ 15k)
    • Cível: +12% (R$ 8k → R$ 9k)
    
    📉 Redução:
    • Trabalhista: -8% (R$ 10k → R$ 9.2k)
    
    💡 Recomendação: Tributário está em alta.
       Considere alocar mais recursos nessa área.
    
    [Ver Gráfico] [Relatório Detalhado]
```

**Workflows Complexos**

```
User: Para todos clientes inativos há mais de 90 dias, agende follow-up para próxima semana

IA: 🔍 Busquei clientes inativos...
    ✓ Encontrei 8 clientes
    ✓ Agendei 8 tarefas de follow-up
    
    Distribuição:
    • Segunda: 2 follow-ups
    • Terça: 3 follow-ups  
    • Quarta: 3 follow-ups
    
    [Ver Clientes] [Ver Agenda]
```

### Integração com Outros Módulos

**Transição Suave**

Quando IA sugere abrir outro módulo:
```
IA: [Análise completa]
    
    Deseja ver mais detalhes?
    [Abrir no Módulo Processos] [Ficar Aqui]
```

**Ações que Impactam Módulos**

Toda ação executada no Centro de Comando reflete instantaneamente:
- Criar processo → aparece no módulo Processos
- Registrar horas → atualiza Timesheet no Financeiro
- Agendar compromisso → adiciona na Agenda
- Faturar → gera honorário no Financeiro

**Feedback Visual**

Notificação toast confirma ação:
"✓ Processo #1234 atualizado com sucesso"

### Comandos por Módulo

**Processos:**
- "Novos processos este mês"
- "Processos críticos"
- "Movimentações de hoje"
- "Criar processo para cliente X"
- "Atualizar fase do processo Y"

**Clientes:**
- "Clientes ativos"
- "Novos clientes do trimestre"
- "Clientes sem contato há X dias"
- "Criar cliente: [dados]"
- "Ver histórico do cliente Z"

**Agenda:**
- "Minha agenda hoje/amanhã/semana"
- "Audiências pendentes"
- "Prazos vencendo"
- "Agendar [tipo] com [quem] para [quando]"
- "Remarcar compromisso X"

**Financeiro:**
- "Receita do mês/ano"
- "Inadimplência atual"
- "Faturar cliente/processo"
- "Registrar X horas no processo Y"
- "Gerar boleto para parcela Z"
- "Enviar cobrança para cliente A"

**Publicações:**
- "Publicações não lidas"
- "Publicações urgentes"
- "Processar publicação X"
- "Criar prazo da publicação Y"

**Consultivo:**
- "Consultas em aberto"
- "Consultas atrasadas"
- "Criar consulta para cliente X"
- "Faturar horas da consulta Y"

**Documentos:**
- "Buscar documento [termo]"
- "Documentos do cliente X"
- "Documentos do processo Y"
- "Upload documento para processo Z"

**Relatórios:**
- "DRE do mês/trimestre/ano"
- "Relatório de performance"
- "Análise de inadimplência"
- "Receita por área"
- "Timesheet do mês"

### Integrações com IA

**Via Centro de Comando (é o próprio módulo)**
- Qualquer comando natural
- Consultas complexas
- Ações em lote
- Análises personalizadas
- Relatórios sob demanda

**Automações com n8n**
- Comandos agendados (executar X às Y horas)
- Comandos recorrentes (toda segunda às 9h)
- Alertas que geram comandos automáticos
- Integração com webhooks externos

**Sugestões Proativas**
A IA pode iniciar conversa:
- "Bom dia! Você tem 3 compromissos hoje. Deseja revisar?"
- "Processo #1234 movimentou. Deseja visualizar?"
- "Há 5 publicações novas. Processar agora?"
- "Você bateu sua meta do mês! 🎉"

## Banco de Dados

### Tabelas Necessárias

**centro_comando_historico**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- comando (text) - texto do comando
- comando_normalizado (text) - versão limpa para busca
- intent (text) - intenção identificada
- modulo_alvo (text, nullable) - qual módulo foi alvo
- contexto_anterior (jsonb, nullable) - contexto da conversa
- resultado (jsonb) - resultado da execução
- tipo_resultado (text) - 'lista', 'acao', 'analise', 'relatorio'
- sucesso (boolean)
- tempo_execucao_ms (integer)
- created_at (timestamp)
```

**centro_comando_favoritos**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- nome (text) - nome do favorito
- comando (text) - comando a executar
- icone (text, nullable)
- categoria (text, nullable)
- ordem (integer)
- compartilhado_equipe (boolean) - se compartilha com escritório
- uso_count (integer) - quantas vezes foi usado
- created_at (timestamp)
- updated_at (timestamp)
```

**centro_comando_cache**
```
- id (uuid, PK)
- comando_hash (text, unique) - hash do comando
- user_id (uuid, FK profiles, nullable) - null se cache global
- resultado (jsonb)
- created_at (timestamp)
- expires_at (timestamp)
```

**centro_comando_templates**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- descricao (text)
- comando_template (text) - com placeholders
- variaveis (jsonb) - lista de variáveis necessárias
- categoria (text)
- publico (boolean)
- criado_por (uuid, FK profiles)
- uso_count (integer)
- created_at (timestamp)
```

**centro_comando_sessoes**
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- inicio (timestamp)
- fim (timestamp, nullable)
- comandos_count (integer)
- contexto_sessao (jsonb) - mantém contexto da conversa
- ativo (boolean)
```

### Views

**v_comandos_frequentes**
```
Comandos mais utilizados por usuário
Para sugestões e auto-complete
Ranking por frequência
```

**v_comandos_recentes**
```
Últimos 20 comandos do usuário
Para histórico rápido
Ordenado por data DESC
```

### Functions

**processar_comando(user_id uuid, comando text, contexto jsonb)**
- Recebe comando em linguagem natural
- Identifica intenção (intent)
- Extrai entidades (datas, nomes, valores)
- Determina módulo alvo
- Executa ação apropriada
- Registra no histórico
- Retorna resultado estruturado

**manter_contexto_sessao(sessao_id uuid, novo_contexto jsonb)**
- Atualiza contexto da sessão
- Para comandos sequenciais
- Resolve referências ("o primeiro", "esse", etc)
- TTL de 30 minutos de inatividade

**sugerir_comandos(user_id uuid, texto_parcial text)**
- Auto-complete inteligente
- Baseado em histórico
- Baseado em comandos populares
- Retorna lista de sugestões

**executar_acao(intent text, parametros jsonb)**
- Router para ações específicas
- Chama function apropriada do módulo alvo
- Valida permissões
- Retorna resultado + feedback

**gerar_resposta_ia(comando text, resultado jsonb)**
- Formata resultado para linguagem natural
- Adiciona insights quando relevante
- Tom personalizado
- Retorna texto formatado

**favoritar_comando(user_id uuid, comando text, nome text)**
- Cria atalho favorito
- Retorna confirmação

**buscar_historico(user_id uuid, filtros jsonb)**
- Busca no histórico com filtros
- Full-text search
- Filtro por data, módulo, sucesso
- Retorna resultados ordenados

### Triggers

**log_comando_executado**
- Após execução bem-sucedida
- Registra em histórico
- Atualiza cache se aplicável

**increment_uso_favorito**
- Quando favorito é usado
- Incrementa uso_count
- Para ranking

**cleanup_sessao_inativa**
- Detecta sessões inativas > 30 min
- Marca como encerrada
- Limpa contexto temporário

### Scheduled Functions

**limpar_cache_expirado**
- Roda a cada hora
- Remove cache expirado
- Mantém apenas cache válido

**agregar_comandos_populares**
- Roda diariamente
- Identifica comandos mais usados
- Para sugestões e templates

**backup_historico**
- Roda semanalmente
- Arquiva histórico antigo (> 90 dias)
- Mantém base limpa

### RLS

- Usuários veem apenas próprio histórico
- Favoritos podem ser pessoais ou compartilhados com equipe
- Cache pode ser pessoal ou global
- Admins veem estatísticas agregadas (não comandos individuais)
