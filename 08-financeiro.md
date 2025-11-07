# Módulo: Financeiro

## Funcionalidade

Gestão financeira completa do escritório incluindo controle de honorários, recebimentos, despesas, fluxo de caixa e análises financeiras.

**IMPORTANTE - Suporte Multi-Escritório:**

Cada seção do módulo financeiro possui seu próprio **seletor de visualização de escritório(s)**, permitindo ao usuário controlar exatamente quais escritórios deseja visualizar e analisar.

**Seletor de Visualização (em cada tela):**
- **Localização**: Topo de cada tela/seção (ao lado dos filtros principais)
- **Comportamento Padrão**: Mostra apenas o **primeiro escritório** do usuário
- **Filtro Multi-Seleção**:
  - Usuário pode adicionar mais escritórios para visualizar simultaneamente
  - Ao selecionar múltiplos: dados são agregados e cada linha mostra indicador de escritório
  - Gráficos exibem breakdown por escritório com cores diferentes
  - Totalizadores mostram soma de todos os escritórios selecionados
- **Persistência**: Seleção persiste na sessão (localStorage por tela)
- **Componente**: `<EscritorioFilter escritoriosIds={[]} onChange={...} />`

**Exemplos de Seletor em Cada Tela:**
```
┌─────────────────────────────────────────────────┐
│ Dashboard Financeiro                             │
│ [🏢 Escritório Silva & Associados ▼] [+ Adicionar]│
│                                                  │
│ Receitas: R$ 150.000  Despesas: R$ 45.000      │
└─────────────────────────────────────────────────┘

Com 2 escritórios selecionados:
┌─────────────────────────────────────────────────┐
│ Dashboard Financeiro                             │
│ [🏢 2 escritórios ▼]                            │
│   ✓ Silva & Associados                          │
│   ✓ Advocacia Costa                             │
│                                                  │
│ Receitas: R$ 280.000  Despesas: R$ 89.000      │
│ [Ver breakdown por escritório ▼]                │
└─────────────────────────────────────────────────┘
```

**Regras de Cadastro (Receitas, Despesas, Lançamentos):**

**TODOS os formulários de cadastro têm campo "Escritório" obrigatório:**

1. **Campo sempre visível e obrigatório**
2. **Valor padrão**: Primeiro escritório do usuário (se tiver apenas 1) ou vazio (se múltiplos)
3. **Lançamentos vinculados** (Processo/Consulta):
   - Campo mostra o escritório do processo/consulta (readonly)
   - Não pode ser alterado (garantia de consistência)
4. **Lançamentos avulsos**:
   - Usuário seleciona manualmente o escritório
   - Campo obrigatório sem valor padrão

**Integração com Processos e Consultivo:**
- Ao criar receita/despesa a partir de um Processo: herda `escritorio_id` do processo
- Ao criar receita/despesa a partir de uma Consulta: herda `escritorio_id` da consulta
- Ao criar lançamento de timesheet: herda `escritorio_id` do processo/consulta
- Campo "Escritório" aparece readonly para transparência

**Regras de Faturamento:**
- Seletor mostra 1 escritório por vez (não permite múltiplos)
- Lista de clientes filtra pelo escritório selecionado
- **Faturas consolidam apenas lançamentos do mesmo escritório**
- Validação no backend impede faturamento cross-escritório

**Permissões:**
- Usuário só vê escritórios aos quais tem acesso (gerenciado pelo módulo de Escritórios)
- Permissões financeiras por escritório:
  - Admin/Financeiro: acesso total ao financeiro
  - Gestor (pode_aprovar_horas): aprova timesheet de colaboradores
  - Advogado: vê apenas próprios casos e registra horas
  - Colaborador: registra próprias horas apenas

**Banco de Dados:**
- Todas as tabelas financeiras têm `escritorio_id (uuid, FK escritorios, NOT NULL)`
- Índices compostos incluem escritorio_id: `(escritorio_id, campo_chave)`
- RLS policies filtram automaticamente por escritórios do usuário
- Numerações sequenciais (faturas, contratos) são únicas por escritório

### Telas Principais

**Dashboard Financeiro**
- **Seletor de escritório(s)** no topo
- Visão geral de receitas e despesas
- Gráfico de fluxo de caixa
- Contas a receber e a pagar
- Inadimplência
- Comparativo mensal/anual
- Métricas principais (ticket médio, taxa de conversão)
- **Se múltiplos escritórios selecionados**: cards mostram totais agregados + gráfico com quebra por cor

**Contas a Receber e a Pagar** (tela unificada)
- **Seletor de escritório(s)** no topo
- **Filtros Inteligentes**:
  - **Tipo**: Receber | Pagar | Ambos (toggle/tabs)
  - **Status**: Pendente | Vencido | Pago | Cancelado | Todos
  - **Período**: Vencimento (custom range ou presets: hoje, semana, mês)
  - **Cliente/Fornecedor**: Busca rápida
  - **Categoria**: Honorários, Despesas Processuais, Fornecedores, Folha, Impostos, etc.
  - **Ordenação**: Por vencimento, valor, cliente/fornecedor

- **Lista Unificada**:
  - Colunas: Tipo (badge Receber/Pagar) | Data | Cliente/Fornecedor | Descrição | Valor | Status | Ações
  - **Cores visuais**: Verde para receber, Vermelho para pagar
  - **Badge de escritório** quando múltiplos selecionados
  - Indicador de urgência (vencido, vence hoje, vence em 3 dias)
  - Agrupamento opcional por data ou tipo

- **Totalizadores** (dinâmicos conforme filtros):
  - Total a Receber
  - Total a Pagar
  - Saldo Líquido (receber - pagar)
  - Valores vencidos vs a vencer

- **Ações Contextuais**:
  - **Para Receber**: Enviar cobrança, Marcar como pago, Parcelar, Cancelar, Ver processo/consulta
  - **Para Pagar**: Marcar como pago, Agendar pagamento, Cancelar, Vincular conta bancária

- **Dashboard de Previsão**:
  - Linha do tempo visual (próximos 30 dias)
  - Fluxo de caixa projetado (receber vs pagar)
  - Alertas de vencimentos próximos

**Contas Bancárias**

**Gestão de Contas Bancárias**
- **Lista de Contas por Escritório**:
  - Seletor de escritório no topo (mostra contas do escritório selecionado)
  - Cards com saldo atual, banco, agência, conta
  - Indicador de conta principal (padrão para recebimentos)
  - Status: ativa, inativa
  - Ações rápidas: ver extrato, nova transação, transferir

- **Cadastro de Conta Bancária**:
  - Escritório (obrigatório)
  - Banco (select com lista de bancos ou campo texto)
  - Tipo de conta (corrente, poupança, investimento)
  - Agência
  - Número da conta
  - Saldo inicial
  - Data de abertura
  - Conta principal (checkbox) - padrão para recebimentos deste escritório
  - Observações

**Extrato Bancário (Virtual)**
- Visualização do extrato baseado em lançamentos do sistema
- **Fontes de lançamentos no extrato**:
  - Pagamentos recebidos (honorários pagos)
  - Despesas pagas
  - Transferências entre contas
  - Lançamentos manuais (ajustes, taxas bancárias, etc.)
- **Colunas**: Data | Descrição | Tipo | Valor | Saldo | Categoria | Origem
- **Filtros**: Período, tipo de lançamento, categoria
- **Totalizadores**: Entradas, Saídas, Saldo inicial, Saldo final
- **Ações**: Exportar extrato (PDF/Excel), Conciliar com extrato bancário real

**Transferência Entre Contas**
- **Formulário de Transferência**:
  - Conta origem (select - apenas contas do mesmo escritório)
  - Conta destino (select - apenas contas do mesmo escritório)
  - Valor
  - Data da transferência
  - Descrição/Motivo
  - Categoria (opcional: "Transferência interna")
  - Observações
- **Validações**:
  - Origem e destino devem ser do mesmo escritório
  - Saldo suficiente na conta origem
  - Valor maior que zero
- **Efeito**:
  - Cria lançamento de débito na conta origem
  - Cria lançamento de crédito na conta destino
  - Lançamentos vinculados (transferencia_id) para rastreabilidade
  - Atualiza saldos das contas

**Lançamento Manual**
- Para registrar movimentações não vinculadas (taxas, tarifas, ajustes)
- Conta bancária
- Tipo: entrada ou saída
- Valor
- Data
- Descrição
- Categoria
- Comprovante (upload opcional)

**Honorários**

**Cadastro de Contrato de Honorários** (central)
- **Escritório** (obrigatório):
  - Select com escritórios do usuário
  - Valor padrão: primeiro escritório (se usuário tem apenas 1)
- Cliente (do escritório selecionado)
- Tipo de serviço: processo, consultoria, avulso, misto
- Forma de cobrança:
  - **Preço Fechado**: valor fixo total
  - **Por Hora**: valor/hora + estimativa de horas
  - **Por Etapa**: valores por fase processual (inicial, sentença, recurso, êxito)
  - **Misto**: combinação (ex: fixo + êxito, hora + êxito)
- Vigência (data início/fim)
- Arquivo do contrato assinado
- Observações

**Lançamento de Honorários** (gerados a partir do contrato)
- **Escritório**: herdado do contrato ou processo/consulta vinculado
- Referência ao contrato
- Processo/consulta vinculado
- Descrição do lançamento
- Valor
- Data de competência
- Parcelamento (se aplicável)
- Vencimento(s)
- Status: proposta, aprovado, em aberto, pago

**Gestão de Honorários**
- Propostas enviadas
- Contratos assinados
- Em aberto
- Parcialmente pagos
- Quitados
- Inadimplentes
- Histórico de negociações

**Formas de Pagamento**
- Boleto bancário
- Pix
- Cartão de crédito
- Transferência bancária
- Dinheiro
- Cheque
- Múltiplas formas em um pagamento

**Despesas**

**Tipos de Despesa**
- Custas processuais
- Fornecedores (água, luz, telefone, internet)
- Aluguel e condomínio
- Folha de pagamento
- Impostos e tributos
- Marketing e publicidade
- Capacitação e eventos
- Material de escritório
- Tecnologia e software
- Outras

**Cadastro de Despesa**
- **Escritório** (obrigatório):
  - Se vinculado a processo: herda do processo (readonly)
  - Se lançamento avulso: select com escritórios do usuário
- Categoria
- Fornecedor
- Valor
- Data de vencimento
- Recorrente (sim/não)
- Forma de pagamento
- Processo vinculado (se for custo processual)
- Centro de custo
- Documento fiscal
- Status: pendente, pago, cancelado

**Timesheet - Revisão e Aprovação** (Sócios/Gestores)
- **Seletor de escritório(s)** no topo
- Filtros avançados por colaborador, cliente, período, status
- Lista de horas para aprovação dos escritórios selecionados
- Aprovação/reprovação em lote
- Cards de resumo com métricas (total horas, valor estimado)
- Histórico de aprovações
- **Badge de escritório** em cada linha quando múltiplos selecionados

**Faturamento Inteligente**
- **Seletor de escritório único** (não permite múltiplos)
- Lista de clientes prontos para faturar do escritório selecionado
- Pré-visualização com seleção de lançamentos (apenas do mesmo escritório)
- Geração de fatura em PDF (com dados do escritório no cabeçalho)
- Envio automático por email
- Histórico de faturas emitidas (com badge de escritório se visualizando múltiplos)
- Desmontar faturas (cancelamento)
- Configuração de faturamento agendado (por escritório)

**Relatórios Financeiros**

**Fluxo de Caixa**
- Entradas e saídas por período
- Projeção futura
- Análise comparativa
- Gráficos de evolução
- **Se "Todos os Escritórios"**: gráfico consolidado + breakdown por escritório

**DRE (Demonstrativo de Resultados)**
- Receitas operacionais
- Custos e despesas
- Lucro/prejuízo líquido
- Margem de lucro
- Comparativo entre períodos
- **Se "Todos os Escritórios"**: DRE consolidado + DREs individuais por escritório

**Análise de Inadimplência**
- Taxa de inadimplência
- Clientes inadimplentes
- Valor em atraso
- Aging list (30, 60, 90+ dias)
- Ações de cobrança

**Performance por Área/Advogado**
- Receita por área de atuação
- Receita por advogado
- Horas faturadas vs não faturadas
- Ticket médio
- Taxa de conversão

**Previsões**
- Projeção de receitas
- Projeção de despesas
- Análise de cenários
- Metas e objetivos

### Funcionalidades Especiais

**Cobrança Automatizada**
- Envio automático de cobranças
- Emails personalizados
- Links de pagamento
- Lembretes antes do vencimento
- Lembretes pós-vencimento (escalonados)
- WhatsApp integrado

**Conciliação Bancária**
- Importação de extratos (OFX)
- Matching automático com lançamentos
- Conciliação manual
- Identificação de divergências

**Provisões e Contingências**
- Valores em risco em processos
- Provisões contábeis
- Análise de exposição

**Multi-moeda** (opcional)
- Contratos em moeda estrangeira
- Conversão automática
- Histórico de taxas

**Centro de Custos**
- Alocação de despesas por centro
- Análise de rentabilidade por área
- Relatórios segregados

**Contratos Recorrentes**
- Contratos mensais/anuais
- Geração automática de parcelas
- Reajuste por índices (IPCA, IGP-M)
- Renovações

**Comissões**
- Cálculo de comissões para captadores
- Comissões de indicação
- Pagamento a correspondentes

**Integração com Processos (Cobrança por Etapa)**
- Visualização do contrato no perfil do processo
- Badge/indicador mostrando forma de cobrança
- Botão "Lançar Etapa Processual" quando:
  - Peça inicial protocolada → Lançar honorários da inicial
  - Sentença publicada → Lançar honorários da sentença
  - Recurso interposto → Lançar honorários do recurso
  - Êxito alcançado → Lançar honorários de êxito
- IA sugere lançamento quando detecta marcos no processo
- Modal rápido de lançamento com dados pré-preenchidos

**Integração com Consultivo (Cobrança por Hora)**
- Timesheet integrado no perfil da consulta
- Registro de horas trabalhadas por atividade
- Marcação de horas faturáveis/não-faturáveis
- Geração automática de honorário baseado em horas registradas
- Botão "Faturar Horas" que cria honorário automaticamente

**Apontamento de Horas (Timesheet)**

**Registro de Horas**
- Sistema de registro inline (sem modals)
- **Widget Sticky** nas telas de processo/consulta:
  - Uma linha sempre visível
  - Input de atividade + input numérico de horas + checkbox faturável
  - Contexto automático (já sabe em qual processo/consulta está)
  - Enter ou botão "Adicionar" registra instantaneamente
  - Mostra contador: "Horas hoje: 2.5h | Total não faturado: 15h"

- **Tabela de Timesheet** com quick add:
  - Linha de adição no topo da tabela
  - Mesmo formato inline do widget
  - Histórico visível logo abaixo
  - Agrupamento por data
  - Totalizadores

- **Ofertas Contextuais da IA**:
  - Após salvar documento: "✓ Documento salvo. Registrar [__]h?"
  - Após concluir análise: "✓ Análise concluída. Trabalhou [__]h?"
  - Após revisar contrato: "✓ Revisão finalizada. Tempo gasto: [__]h"
  - Sempre inline, nunca modal
  - Botão "Ignorar" ou "Depois" visível

- **Quick Add Global**:
  - Atalho de teclado (Ctrl/Cmd + H)
  - Mini-form no topo da tela (slide down)
  - Busca de processo/consulta
  - Para lançar horas de atividades feitas fora do sistema

**Tela de Revisão/Aprovação de Timesheet** (Sócios/Gestores)
- **Filtros Avançados**:
  - Por colaborador (individual ou múltiplos)
  - Por cliente
  - Por processo/consulta
  - Por período (data início/fim ou presets: hoje, semana, mês)
  - Por status: pendente aprovação, aprovado, rejeitado
  - Por tipo: faturável, não-faturável, ambos
  - Horas já faturadas vs não faturadas

- **Lista de Horas para Revisão**:
  - Visualização em tabela agrupável:
    - Agrupar por colaborador
    - Agrupar por cliente
    - Agrupar por data
  - Colunas: Data | Colaborador | Cliente | Processo/Consulta | Atividade | Horas | Faturável | Status
  - Seleção múltipla (checkboxes)
  - Totalizadores dinâmicos (total horas selecionadas, total valor estimado)

- **Ações de Aprovação**:
  - Botão "Aprovar Selecionados" (em lote)
  - Botão "Reprovar Selecionados" com campo de justificativa
  - Ação individual por linha: aprovar/reprovar/editar
  - Edição rápida inline de horas e descrição (se necessário ajuste)
  - Histórico de aprovações (quem aprovou/reprovou e quando)

- **Cards de Resumo** (topo da tela):
  - Total horas pendentes de aprovação
  - Total horas aprovadas no período
  - Total valor estimado pendente
  - Horas não-faturáveis no período

- **Notificações**:
  - Colaborador recebe notificação quando horas são aprovadas/reprovadas
  - Gestor recebe alerta quando há horas pendentes de aprovação há mais de X dias

**Dashboard de Horas**
- Por advogado/colaborador
- Marcação: faturável ou não-faturável (toggle visual)
- Horas trabalhadas vs horas faturadas vs horas aprovadas
- Exportação para faturamento

**Sistema de Faturamento Inteligente**

**Tela Principal de Faturamento**
- **Lista de Clientes Prontos para Faturar**:
  - Card para cada cliente com indicador de lançamentos pendentes
  - Mostra quantidade de lançamentos não faturados por tipo:
    - "3 lançamentos de horas (12.5h)"
    - "2 etapas processuais"
    - "1 honorário fixo"
  - Valor total estimado do faturamento
  - Badge de período (ex: "Janeiro/2025" para contratos recorrentes)
  - Filtros: por cliente, por tipo de lançamento, por período
  - Busca rápida de cliente

- **Pré-Visualização Lateral (Drawer/Sidebar)**:
  - Abre ao clicar em um cliente
  - **Cabeçalho**:
    - Nome do cliente
    - Período de referência
    - Total do faturamento
  - **Lista de Lançamentos Incluídos**:
    - Agrupado por tipo (Horas | Etapas | Fixos | Avulsos)
    - Cada item mostra:
      - Descrição
      - Processo/consulta vinculado
      - Data de competência
      - Valor
      - Checkbox para incluir/excluir do faturamento
    - Sub-totais por grupo
    - Total geral em destaque

  - **Configurações do Faturamento**:
    - Data de emissão (default: hoje)
    - Data de vencimento (default: +30 dias, editável)
    - Observações adicionais (campo texto)
    - Forma de pagamento preferencial
    - Opção de parcelamento (se aplicável)

  - **Ações**:
    - Botão "Gerar Fatura" (primário)
    - Botão "Cancelar"
    - Link "Editar lançamentos individuais" (abre tela de edição)

**Geração de Fatura (PDF)**
- Ao clicar em "Gerar Fatura":
  - Cria registro de fatura em `faturas` (nova tabela)
  - Vincula todos lançamentos à fatura
  - Gera PDF com layout profissional:
    - Logo e dados do escritório
    - Dados do cliente
    - Número da fatura (sequencial por escritório)
    - Data de emissão e vencimento
    - Tabela de serviços prestados
    - Detalhamento de horas (se aplicável)
    - Total
    - Dados para pagamento (PIX, boleto, transferência)
    - Observações
  - Salva PDF no storage
  - Marca lançamentos como "faturados"
  - Cria honorário consolidado (se múltiplos lançamentos)
  - Envia fatura por email ao cliente (opcional)
  - Notifica responsável financeiro
  - Redireciona para visualização da fatura

**Tela de Faturas Emitidas**
- **Lista de Faturas**:
  - Tabela com colunas:
    - Número da fatura
    - Cliente
    - Data de emissão
    - Vencimento
    - Valor total
    - Status (emitida, enviada, paga, atrasada, cancelada)
    - Ações
  - Filtros: por cliente, período, status
  - Busca por número de fatura
  - Ordenação por data/valor

- **Ações por Fatura**:
  - Ver PDF (abre em nova aba)
  - Baixar PDF
  - Enviar por email
  - Copiar link de pagamento
  - Marcar como paga (abre modal de pagamento)
  - **Desmontar Fatura** (ação crítica):
    - Confirma ação com modal de alerta
    - Desmarca lançamentos como "faturados"
    - Remove vínculo com fatura
    - Cancela honorário consolidado (se houver)
    - Marca fatura como "cancelada"
    - Mantém PDF e histórico (audit trail)
    - Lançamentos voltam para lista de "prontos para faturar"

**Faturamento Automatizado (Agendado)**
- **Configuração de Agendamento**:
  - Tela de configuração em Configurações > Financeiro > Faturamento Automático
  - Por cliente ou global:
    - Ativar/desativar faturamento automático
    - Dia do mês para gerar faturas (ex: todo dia 1, todo dia 25)
    - Clientes incluídos (seleção múltipla ou "todos")
    - Tipos de lançamento incluídos (horas, fixos, etapas, todos)
    - Vencimento padrão (ex: +15 dias, +30 dias)
    - Envio automático de email (sim/não)
    - Observações padrão para faturas

- **Execução Automática** (Scheduled Function):
  - Roda diariamente à meia-noite
  - Verifica se hoje é dia de faturamento de algum cliente
  - Para cada cliente:
    - Busca lançamentos não faturados e aprovados
    - Se houver lançamentos:
      - Gera fatura automaticamente
      - Cria PDF
      - Envia email (se configurado)
      - Registra em log de faturamentos automáticos
      - Notifica gestor financeiro (resumo diário)

- **Log de Faturamentos Automáticos**:
  - Visualização de execuções
  - Faturas geradas automaticamente vs manualmente
  - Erros e alertas
  - Possibilidade de pausar agendamento

**Integrações do Faturamento**
- **Com Timesheet**:
  - Apenas horas aprovadas entram no faturamento
  - Opção de filtrar por período (ex: "faturar apenas janeiro")

- **Com Contratos**:
  - Contratos fixos mensais geram lançamento automático no dia configurado
  - Contratos recorrentes aparecem automaticamente na lista de faturamento

- **Com Processos**:
  - Etapas lançadas aparecem para faturamento
  - Vínculo entre fatura e processo mantido

- **Com Cobrança**:
  - Após fatura paga, atualiza status
  - Integra com conciliação bancária
  - Lembretes de vencimento usando dados da fatura

### Integrações com IA

**Via Chat do Dashboard**
- "Quanto recebi este mês?"
- "Mostre clientes inadimplentes"
- "Gere relatório de DRE do trimestre"
- "Qual a previsão de caixa para próximo mês?"
- "Envie cobrança para cliente X"
- "Liste despesas acima de R$ 1.000 este mês"
- "Crie honorário para processo Y no valor de R$ 5.000"
- "Qual minha margem de lucro?"
- **"Registrar 2.5h no processo X - análise de documentos"** (registro rápido via chat)
- **"Faturar horas do cliente João Silva"** (gera honorário de horas pendentes)
- **"Quanto tempo trabalhei hoje?"** (mostra resumo do timesheet)
- **"Quais processos têm horas não faturadas?"** (lista para faturamento)
- **"Quais clientes estão prontos para faturar?"** (lista clientes com lançamentos pendentes)
- **"Gerar fatura do cliente X"** (abre tela de faturamento pré-preenchida)
- **"Mostre faturas vencidas"** (lista faturas atrasadas)
- **"Aprovar horas do colaborador Y da última semana"** (aprovação rápida)
- **"Quais horas estão pendentes de aprovação?"** (lista para revisão)

**Automações com n8n**
- Envio automático de cobranças
- Geração de boletos
- Lembretes de vencimento
- Conciliação bancária automática
- Cálculo de impostos
- Análise de inadimplência e classificação de risco
- Envio de relatórios periódicos
- Alertas de fluxo de caixa negativo

**Análise via IA**
- Previsão de inadimplência por cliente
- Sugestão de precificação
- Identificação de padrões de pagamento
- Otimização de fluxo de caixa
- Detecção de anomalias
- Sugestão de ações de cobrança

**Sugestões Proativas**
- "Cliente X tem histórico de atraso. Sugerir pagamento antecipado?"
- "Você tem 5 vencimentos amanhã. Enviar lembretes?"
- "Fluxo de caixa projetado negativo em 30 dias. Analisar?"
- "Taxa de inadimplência subiu 15%. Revisar política de cobrança?"

## Banco de Dados

### Tabelas Necessárias

**IMPORTANTE - Multi-Escritório:**
- Todas as tabelas têm `escritorio_id (uuid, FK escritorios, NOT NULL)`
- Índices compostos incluem escritorio_id: `(escritorio_id, campo_chave)`
- RLS policies filtram por escritórios do usuário
- Numerações internas (faturas, contratos) são únicas por escritório

**user_escritorios_roles** (controle de permissões por escritório)
```
- id (uuid, PK)
- user_id (uuid, FK profiles)
- escritorio_id (uuid, FK escritorios)
- role (text: 'admin', 'financeiro', 'advogado', 'colaborador')
- pode_aprovar_horas (boolean)
- pode_faturar (boolean)
- pode_ver_relatorios (boolean)
- pode_editar_financeiro (boolean)
- ativo (boolean)
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(user_id, escritorio_id)
```

**escritorio_context** (contexto ativo do usuário - cache em localStorage)
```
Não é tabela, é gerenciado no frontend:
- escritorio_ativo_id (uuid | 'todos')
- nome_escritorio (text)
- logo_url (text)
- permissoes (jsonb) - cache das permissões do user no escritório ativo
```

**financeiro_contratos_honorarios** (novo - substitui parte de honorarios)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios, NOT NULL)
- numero_contrato (text) - ex: "CONT-2025-001"
- cliente_id (uuid, FK clientes)
- tipo_servico (text: 'processo', 'consultoria', 'avulso', 'misto')
- forma_cobranca (text: 'fixo', 'por_hora', 'por_etapa', 'misto')
- ativo (boolean)
- data_inicio (date)
- data_fim (date, nullable)
- arquivo_contrato_url (text, nullable)
- observacoes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(escritorio_id, numero_contrato)
INDEX(escritorio_id, cliente_id)
INDEX(escritorio_id, ativo)
```

**financeiro_contratos_honorarios_config** (configuração por tipo de cobrança)
```
- id (uuid, PK)
- contrato_id (uuid, FK financeiro_contratos_honorarios)
- tipo_config (text: 'fixo', 'hora', 'etapa', 'exito')

-- Para FIXO
- valor_fixo (numeric, nullable)

-- Para POR HORA
- valor_hora (numeric, nullable)
- horas_estimadas (numeric, nullable)

-- Para POR ETAPA (jsonb com valores por etapa)
- etapas_valores (jsonb, nullable)
  -- Exemplo: {"inicial": 5000, "sentenca": 3000, "recurso": 4000, "exito": 10000}

-- Para ÊXITO
- percentual_exito (numeric, nullable)
- valor_minimo_exito (numeric, nullable)

- created_at (timestamp)
```

**financeiro_honorarios** (lançamentos gerados a partir dos contratos)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios, NOT NULL)
- numero_interno (text) - ex: "HON-2025-001"
- contrato_id (uuid, FK financeiro_contratos_honorarios, nullable)
- cliente_id (uuid, FK clientes)
- processo_id (uuid, FK processos, nullable)
- consulta_id (uuid, FK consultas, nullable)
- tipo_lancamento (text: 'fixo', 'etapa', 'hora', 'exito', 'avulso')
- etapa_processual (text, nullable) - 'inicial', 'sentenca', 'recurso', 'exito'
- descricao (text)
- valor_total (numeric)
- referencia_horas (numeric, nullable) - se foi por hora
- parcelado (boolean)
- numero_parcelas (integer, nullable)
- responsavel_id (uuid, FK profiles)
- data_competencia (date) - quando o serviço foi realizado
- data_emissao (date)
- observacoes (text, nullable)
- status (text: 'proposta', 'aprovado', 'em_aberto', 'pago', 'cancelado')
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(escritorio_id, numero_interno)
INDEX(escritorio_id, cliente_id)
INDEX(escritorio_id, status)
INDEX(escritorio_id, data_emissao)

NOTA: escritorio_id é herdado do processo/consulta ou contrato vinculado
```

**financeiro_honorarios_parcelas**
```
- id (uuid, PK)
- honorario_id (uuid, FK financeiro_honorarios)
- numero_parcela (integer)
- valor (numeric)
- data_vencimento (date)
- data_pagamento (date, nullable)
- valor_pago (numeric, nullable)
- forma_pagamento (text, nullable)
- status (text: 'pendente', 'pago', 'atrasado', 'cancelado')
- boleto_url (text, nullable)
- pix_qrcode (text, nullable)
- dias_atraso (integer, nullable)
- juros_aplicados (numeric, nullable)
- observacoes (text, nullable)
- created_at (timestamp)
```

**financeiro_timesheet** (apontamento de horas)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios, NOT NULL)
- user_id (uuid, FK profiles) - quem trabalhou
- processo_id (uuid, FK processos, nullable)
- consulta_id (uuid, FK consultas, nullable)
- data_trabalho (date)
- horas (numeric) - quantidade de horas (ex: 2.5)
- atividade (text) - descrição do que foi feito
- faturavel (boolean) - se deve ser cobrado do cliente
- faturado (boolean) - se já foi faturado
- fatura_id (uuid, FK financeiro_faturamento_faturas, nullable) - vincula à fatura gerada
- aprovado (boolean) - controle interno
- aprovado_por (uuid, FK profiles, nullable)
- aprovado_em (timestamp, nullable)
- reprovado (boolean, default false)
- justificativa_reprovacao (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

INDEX(escritorio_id, user_id, data_trabalho)
INDEX(escritorio_id, aprovado, faturado)
INDEX(escritorio_id, processo_id)
INDEX(escritorio_id, consulta_id)

NOTA: escritorio_id é herdado do processo/consulta vinculado
Se lançamento manual (Quick Add): escritorio_id = contexto ativo do usuário
```

**financeiro_faturamento_faturas** (faturas consolidadas geradas)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios, NOT NULL)
- numero_fatura (text) - sequencial por escritório (ex: FAT-2025-001)
- cliente_id (uuid, FK clientes)
- data_emissao (date)
- data_vencimento (date)
- valor_total (numeric)
- descricao (text, nullable)
- observacoes (text, nullable)
- forma_pagamento_preferencial (text, nullable)
- parcelado (boolean, default false)
- numero_parcelas (integer, nullable)
- pdf_url (text, nullable)
- status (text: 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada')
- enviada_em (timestamp, nullable)
- paga_em (timestamp, nullable)
- cancelada_em (timestamp, nullable)
- cancelada_por (uuid, FK profiles, nullable)
- motivo_cancelamento (text, nullable)
- gerada_automaticamente (boolean, default false)
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(escritorio_id, numero_fatura)
INDEX(escritorio_id, cliente_id)
INDEX(escritorio_id, status)
INDEX(escritorio_id, data_vencimento)

REGRA: Uma fatura só pode ter lançamentos do mesmo escritório
```

**financeiro_faturamento_itens** (itens/lançamentos incluídos na fatura)
```
- id (uuid, PK)
- fatura_id (uuid, FK financeiro_faturamento_faturas)
- tipo_item (text: 'hora', 'etapa', 'fixo', 'avulso')
- descricao (text)
- processo_id (uuid, FK processos, nullable)
- consulta_id (uuid, FK consultas, nullable)
- quantidade (numeric, nullable) - para horas
- valor_unitario (numeric, nullable) - para horas
- valor_total (numeric)
- data_competencia (date)
- timesheet_ids (jsonb, nullable) - array de IDs de timesheet incluídos
- honorario_id (uuid, FK financeiro_honorarios, nullable) - se vinculado a honorário
- created_at (timestamp)
```

**financeiro_faturamento_agendamentos** (configuração de faturamento automático)
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- cliente_id (uuid, FK clientes, nullable) - se null, é configuração global
- ativo (boolean)
- dia_faturamento (integer) - dia do mês (1-31)
- tipos_lancamento (jsonb) - array: ['hora', 'fixo', 'etapa', 'avulso']
- dias_vencimento (integer) - quantos dias após emissão
- envio_automatico_email (boolean)
- observacoes_padrao (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**financeiro_faturamento_log** (log de execuções automáticas)
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- data_execucao (timestamp)
- clientes_processados (integer)
- faturas_geradas (integer)
- valor_total_faturado (numeric)
- erros (jsonb, nullable)
- detalhes (jsonb) - array de objetos com cliente_id, fatura_id, valor
- created_at (timestamp)
```

**financeiro_honorarios_timeline** (controle de etapas já faturadas)
```
- id (uuid, PK)
- processo_id (uuid, FK processos)
- etapa (text: 'inicial', 'sentenca', 'recurso', 'exito')
- honorario_id (uuid, FK financeiro_honorarios)
- data_lancamento (timestamp)
- lancado_por (uuid, FK profiles)
```

**financeiro_contas_bancarias** (contas do escritório)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios, NOT NULL)
- banco (text) - nome do banco
- tipo_conta (text: 'corrente', 'poupanca', 'investimento')
- agencia (text)
- numero_conta (text)
- saldo_atual (numeric) - atualizado automaticamente pelos lançamentos
- saldo_inicial (numeric) - saldo na data de abertura
- data_abertura (date)
- conta_principal (boolean, default false) - padrão para recebimentos do escritório
- ativa (boolean, default true)
- observacoes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(escritorio_id, banco, agencia, numero_conta)
INDEX(escritorio_id, ativa)
INDEX(escritorio_id, conta_principal)

REGRA: Apenas uma conta pode ser principal por escritório
```

**financeiro_contas_lancamentos** (extrato virtual da conta)
```
- id (uuid, PK)
- conta_bancaria_id (uuid, FK financeiro_contas_bancarias, NOT NULL)
- tipo (text: 'entrada', 'saida', 'transferencia_entrada', 'transferencia_saida')
- valor (numeric)
- data_lancamento (date)
- descricao (text)
- categoria (text, nullable)
- saldo_apos_lancamento (numeric) - saldo calculado após este lançamento
- origem_tipo (text: 'pagamento', 'despesa', 'transferencia', 'manual')
- origem_id (uuid, nullable) - ID do registro de origem (pagamento_id, despesa_id, etc)
- transferencia_id (uuid, nullable) - vincula transferências entrada/saída
- comprovante_url (text, nullable)
- conciliado (boolean, default false) - se foi conciliado com extrato bancário real
- conciliado_em (timestamp, nullable)
- observacoes (text, nullable)
- created_at (timestamp)

INDEX(conta_bancaria_id, data_lancamento DESC)
INDEX(conta_bancaria_id, tipo)
INDEX(conta_bancaria_id, conciliado)
INDEX(transferencia_id) - para buscar transferências vinculadas
```

**financeiro_contas_pagamentos**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- conta_bancaria_id (uuid, FK financeiro_contas_bancarias, nullable) - conta usada no pagamento
- parcela_id (uuid, FK financeiro_honorarios_parcelas, nullable) - se for pagamento de honorário
- despesa_id (uuid, FK financeiro_despesas, nullable) - se for pagamento de despesa
- tipo_lancamento (text: 'receita', 'despesa')
- valor (numeric)
- data_pagamento (timestamp)
- forma_pagamento (text: 'boleto', 'pix', 'cartao', 'transferencia', 'dinheiro', 'cheque')
- comprovante_url (text, nullable)
- conciliado (boolean)
- conciliado_em (timestamp, nullable)
- observacoes (text, nullable)
- created_at (timestamp)

INDEX(escritorio_id, conta_bancaria_id)
INDEX(escritorio_id, data_pagamento)
```

**financeiro_despesas**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- categoria (text: 'custas', 'fornecedor', 'folha', 'impostos', 'aluguel', 'marketing', etc)
- fornecedor (text)
- descricao (text)
- valor (numeric)
- data_vencimento (date)
- data_pagamento (date, nullable)
- recorrente (boolean)
- frequencia (text: 'mensal', 'trimestral', 'anual', nullable)
- processo_id (uuid, FK processos, nullable)
- centro_custo (text, nullable)
- documento_fiscal (text, nullable)
- forma_pagamento (text, nullable)
- status (text: 'pendente', 'pago', 'cancelado')
- created_at (timestamp)
- updated_at (timestamp)
```

**financeiro_faturamento_cobrancas**
```
- id (uuid, PK)
- parcela_id (uuid, FK financeiro_honorarios_parcelas)
- tipo (text: 'lembrete_previo', 'vencimento', 'pos_vencimento')
- metodo (text: 'email', 'whatsapp', 'sms')
- destinatario (text)
- enviado_em (timestamp)
- lido (boolean, nullable)
- lido_em (timestamp, nullable)
- respondido (boolean, nullable)
```

**financeiro_receitas_recorrentes**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- cliente_id (uuid, FK clientes)
- descricao (text)
- valor_mensal (numeric)
- dia_vencimento (integer) - dia do mês
- data_inicio (date)
- data_fim (date, nullable)
- reajuste_anual (boolean)
- indice_reajuste (text: 'ipca', 'igpm', 'fixo', nullable)
- ativo (boolean)
- created_at (timestamp)
```

**financeiro_contas_conciliacoes**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- conta_bancaria (text)
- data_extrato (date)
- saldo_inicial (numeric)
- saldo_final (numeric)
- total_entradas (numeric)
- total_saidas (numeric)
- conciliado (boolean)
- divergencias (jsonb, nullable)
- created_at (timestamp)
```

**financeiro_contas_importacoes**
```
- id (uuid, PK)
- conciliacao_id (uuid, FK financeiro_contas_conciliacoes)
- data_lancamento (date)
- descricao (text)
- valor (numeric)
- tipo (text: 'credito', 'debito')
- pagamento_id (uuid, FK financeiro_contas_pagamentos, nullable) - se conciliado
- conciliado (boolean)
- created_at (timestamp)
```

**financeiro_provisoes**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- processo_id (uuid, FK processos, nullable)
- tipo (text: 'possivel', 'provavel', 'remota')
- valor (numeric)
- descricao (text)
- data_registro (date)
- data_revisao (date, nullable)
- ativo (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

**financeiro_honorarios_comissoes**
```
- id (uuid, PK)
- honorario_id (uuid, FK financeiro_honorarios)
- beneficiario_tipo (text: 'profile', 'terceiro')
- beneficiario_id (uuid, FK profiles, nullable)
- beneficiario_nome (text) - se terceiro
- percentual (numeric)
- valor (numeric)
- pago (boolean)
- data_pagamento (date, nullable)
- created_at (timestamp)
```

**financeiro_metas**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- tipo (text: 'receita', 'captacao', 'margem')
- periodo (text: 'mensal', 'trimestral', 'anual')
- ano (integer)
- mes (integer, nullable)
- valor_meta (numeric)
- valor_realizado (numeric)
- observacoes (text, nullable)
- created_at (timestamp)
```

### Views

**v_fluxo_caixa**
```
Consolidação de receitas e despesas
Por período (dia, mês, ano)
Saldo acumulado
```

**v_inadimplencia**
```
Parcelas vencidas e não pagas
Aging list (30, 60, 90+ dias)
Por cliente
Valor total inadimplido
```

**v_dre**
```
Demonstrativo de resultados
Receitas operacionais
(-) Custos e despesas
(=) Lucro/prejuízo
Margem percentual
```

**v_receita_por_area**
```
Total de honorários por área jurídica
Comparativo entre períodos
```

**v_receita_por_advogado**
```
Honorários por advogado responsável
Horas faturadas
Ticket médio
```

**v_timesheet_pendente_aprovacao**
```
Todas as horas registradas não aprovadas e não reprovadas
Agrupamento por colaborador, cliente, período
Totalizadores de horas e valores estimados
```

**v_clientes_prontos_faturar**
```
Lista de clientes com lançamentos não faturados
Agregação por tipo de lançamento (horas, etapas, fixos)
Quantidade de itens e valor total estimado por cliente
Período de referência dos lançamentos
```

**v_faturas_dashboard**
```
Resumo de faturas por status
Total faturado no mês/trimestre/ano
Faturas vencidas e a vencer
Taxa de inadimplência de faturas
Comparativo com períodos anteriores
```

**v_extrato_conta_bancaria**
```
Extrato virtual de uma conta bancária
União de todos os lançamentos (pagamentos, despesas, transferências, manuais)
Ordenado por data descendente
Cálculo de saldo progressivo
Totalizadores por período
```

**v_saldos_contas_bancarias**
```
Visão consolidada de todas as contas por escritório
Saldo atual, última movimentação
Total disponível por escritório
Contas ativas vs inativas
```

**v_contas_receber_pagar** (view unificada para a tela)
```
União de:
- Parcelas de honorários (contas a receber)
- Despesas (contas a pagar)

Campos comuns:
- tipo (text: 'receber', 'pagar')
- escritorio_id
- data_vencimento
- data_pagamento (nullable)
- valor
- valor_pago (nullable)
- status (pendente, vencido, pago, cancelado)
- cliente_fornecedor (nome do cliente ou fornecedor)
- descricao
- categoria (honorário, despesa processual, fornecedor, etc)
- origem_tipo (honorario, despesa)
- origem_id (id do registro original)
- dias_vencimento (calculado: data_vencimento - hoje)
- urgencia (text: 'vencido', 'vence_hoje', 'vence_3_dias', 'normal')

Ordenado por data_vencimento ASC
Filtros aplicáveis por tipo, status, período, categoria
```

### Functions

**create_honorario(dados jsonb)**
- Cria honorário
- Gera parcelas se parcelado
- Gera número interno
- Calcula vencimentos
- Notifica responsável
- Retorna honorário criado

**lancar_etapa_processual(processo_id uuid, etapa text, user_id uuid)**
- Busca contrato do cliente vinculado ao processo
- Verifica se etapa já foi faturada
- Busca valor da etapa na config do contrato
- Cria honorário automaticamente
- Registra em processos_etapas_faturadas
- Notifica responsável financeiro
- Retorna honorário criado

**sugerir_lancamento_etapa(processo_id uuid)**
- Analisa última movimentação do processo
- Identifica se atingiu marco de etapa
- Verifica se etapa já foi faturada
- Verifica se contrato é por etapa
- Se tudo ok: retorna sugestão de lançamento
- Usado pela IA para sugestões proativas

**faturar_horas_consulta(consulta_id uuid, user_id uuid)**
- Busca todas horas faturáveis não faturadas da consulta
- Soma total de horas
- Busca valor/hora do contrato do cliente
- Calcula valor total
- Cria honorário automaticamente
- Marca horas como faturadas
- Retorna honorário criado

**faturar_horas_processo(processo_id uuid, user_id uuid)**
- Mesma lógica do faturar_horas_consulta
- Para processos com contratos por hora
- Retorna honorário criado

**registrar_horas_timesheet(dados jsonb)**
- Registra tempo trabalhado em timesheet
- Valida se processo/consulta existe
- Marca como faturável baseado no contrato
- Atualiza dashboard de horas
- Retorna registro criado

**registrar_pagamento(parcela_id uuid, dados jsonb)**
- Registra pagamento
- Atualiza status da parcela
- Concilia se possível
- Atualiza fluxo de caixa
- Notifica responsável
- Retorna pagamento

**gerar_boleto(parcela_id uuid)**
- Integra com gateway de pagamento
- Gera boleto
- Salva URL
- Envia para cliente
- Retorna boleto

**gerar_pix(parcela_id uuid)**
- Gera QR code Pix
- Salva dados
- Envia para cliente
- Retorna pix

**enviar_cobranca(parcela_id uuid, tipo text)**
- Busca dados do cliente e parcela
- Formata mensagem apropriada
- Envia por método configurado
- Registra envio
- Retorna confirmação

**calcular_inadimplencia(periodo text)**
- Busca parcelas vencidas do período
- Calcula valor total
- Calcula taxa
- Agrupa por cliente/tempo
- Retorna relatório

**gerar_dre(data_inicio date, data_fim date)**
- Consolida receitas do período
- Consolida despesas do período
- Calcula lucro/prejuízo
- Calcula margens
- Retorna DRE estruturado

**projetar_fluxo_caixa(meses integer)**
- Analisa histórico
- Considera contratos recorrentes
- Considera sazonal idade
- Projeta receitas e despesas
- Retorna projeção

**analisar_cliente_credito_ia(cliente_id uuid)**
- Histórico de pagamentos
- Taxa de atraso
- Valor médio de contratos
- Classifica risco (baixo/médio/alto)
- Sugere limite de crédito
- Retorna análise

**criar_despesas_recorrentes()**
- Busca despesas recorrentes ativas
- Verifica próximo vencimento
- Cria lançamentos futuros
- Retorna despesas criadas

**aprovar_horas_timesheet(timesheet_ids uuid[], aprovador_id uuid)**
- Recebe array de IDs de timesheet
- Marca todos como aprovados
- Registra quem aprovou e quando
- Notifica colaboradores
- Retorna quantidade aprovada

**reprovar_horas_timesheet(timesheet_ids uuid[], aprovador_id uuid, justificativa text)**
- Recebe array de IDs de timesheet
- Marca todos como reprovados
- Registra justificativa
- Notifica colaboradores com motivo
- Retorna quantidade reprovada

**buscar_lancamentos_faturar(cliente_id uuid, tipos jsonb)**
- Busca todos lançamentos não faturados do cliente
- Filtra por tipos de lançamento (opcional)
- Retorna horas aprovadas não faturadas
- Retorna etapas processuais não faturadas
- Retorna honorários fixos não faturados
- Retorna totais por tipo
- Usado pela tela de pré-faturamento

**gerar_fatura(dados jsonb)**
- Recebe: cliente_id, itens[], data_emissao, data_vencimento, observacoes
- Cria registro em faturas
- Gera número sequencial
- Cria itens em faturas_itens
- Marca timesheet como faturados (se houver)
- Marca honorários como faturados (se houver)
- Gera PDF da fatura (via Edge Function)
- Salva PDF no storage
- Envia email ao cliente (opcional)
- Notifica responsável financeiro
- Retorna fatura criada com URL do PDF

**desmontar_fatura(fatura_id uuid, user_id uuid, motivo text)**
- Verifica se fatura pode ser desmontada (não pode estar paga)
- Busca todos itens da fatura
- Desmarca timesheet como faturados
- Desmarca honorários como faturados
- Marca fatura como cancelada
- Registra quem cancelou e motivo
- Mantém registros para auditoria
- Retorna confirmação

**executar_faturamento_agendado()**
- Busca todas configurações ativas de faturamento automático
- Filtra por dia do mês = hoje
- Para cada configuração:
  - Busca lançamentos do cliente
  - Se houver lançamentos: gera fatura
  - Registra em log
- Envia resumo para gestores
- Retorna log de execução

**verificar_horas_pendentes_aprovacao(dias_limite integer)**
- Busca timesheet pendente há mais de X dias
- Agrupa por gestor responsável
- Envia notificação de alerta
- Usado por scheduled function

**transferir_entre_contas(dados jsonb)**
- Recebe: conta_origem_id, conta_destino_id, valor, data, descricao
- Valida que contas são do mesmo escritório
- Valida saldo suficiente na origem
- Cria lançamento de débito na origem
- Cria lançamento de crédito no destino
- Vincula lançamentos via transferencia_id (UUID comum)
- Atualiza saldos das contas
- Retorna confirmação com IDs dos lançamentos

**registrar_lancamento_conta(dados jsonb)**
- Cria lançamento manual em conta bancária
- Recebe: conta_id, tipo (entrada/saida), valor, data, descricao, categoria
- Atualiza saldo da conta
- Calcula saldo após lançamento
- Upload opcional de comprovante
- Retorna lançamento criado

**atualizar_saldo_conta(conta_bancaria_id uuid)**
- Recalcula saldo atual da conta
- Soma saldo_inicial + todas entradas - todas saídas
- Atualiza campo saldo_atual
- Usado por triggers após inserir/atualizar/deletar lançamentos
- Retorna novo saldo

**conciliar_extrato_bancario(conta_id uuid, data_inicio date, data_fim date, lancamentos jsonb[])**
- Recebe extrato bancário real (importado)
- Tenta fazer matching automático com lançamentos do sistema
- Marca lançamentos como conciliados quando match
- Identifica divergências (lançamentos no extrato não no sistema e vice-versa)
- Retorna relatório de conciliação

**marcar_conta_principal(conta_id uuid)**
- Define conta como principal do escritório
- Remove flag de principal das outras contas do mesmo escritório
- Valida que conta está ativa
- Retorna confirmação

### Triggers

**honorario_status_change**
- Ao mudar status
- Atualiza métricas
- Envia notificações

**parcela_vencimento_alert**
- Verifica vencimentos próximos
- Envia lembretes automáticos
- Marca como atrasado após vencimento

**pagamento_conciliacao**
- Ao registrar pagamento
- Tenta conciliar com extrato bancário
- Atualiza saldos

**update_meta_realizado**
- Quando honorário é pago
- Atualiza valor_realizado nas metas
- Calcula percentual de atingimento

**fatura_status_change**
- Ao mudar status da fatura
- Se marcada como paga: atualiza fluxo de caixa
- Se cancelada: reverte lançamentos
- Envia notificações
- Atualiza métricas do dashboard

**timesheet_aprovacao_alert**
- Ao aprovar/reprovar timesheet
- Notifica colaborador
- Se aprovado e faturável: atualiza contadores de "pronto para faturar"
- Atualiza dashboard de horas

**pagamento_registrado**
- Ao registrar pagamento com conta_bancaria_id
- Cria lançamento em financeiro_contas_lancamentos automaticamente
- Tipo: entrada (se receita) ou saída (se despesa)
- Atualiza saldo da conta via atualizar_saldo_conta()
- Vincula lançamento ao pagamento (origem_tipo='pagamento', origem_id=pagamento.id)

**lancamento_conta_modificado**
- Ao inserir/atualizar/deletar em financeiro_contas_lancamentos
- Chama atualizar_saldo_conta() para recalcular saldo
- Atualiza campo saldo_apos_lancamento de todos lançamentos posteriores
- Garante integridade do extrato

**conta_principal_unica**
- Before INSERT/UPDATE em financeiro_contas_bancarias
- Se conta_principal = true
- Remove flag de principal de outras contas do mesmo escritório
- Garante apenas uma conta principal por escritório

### Scheduled Functions

**enviar_lembretes_vencimento**
- Roda diariamente às 9h
- Parcelas vencendo em 3 dias
- Envia lembretes
- Registra envios

**marcar_parcelas_atrasadas**
- Roda diariamente à meia-noite
- Parcelas com vencimento < hoje
- Atualiza status para 'atrasado'
- Calcula dias de atraso

**enviar_cobrancas_pos_vencimento**
- Roda diariamente
- Escalonamento: 7, 15, 30 dias após vencimento
- Envia cobranças
- Registra tentativas

**gerar_contratos_recorrentes**
- Roda no dia 1 de cada mês
- Busca contratos ativos
- Cria honorários mensais
- Gera parcela única

**calcular_metricas_dashboard**
- Roda diariamente às 7h
- Atualiza cache de métricas
- Fluxo de caixa
- Inadimplência
- Receitas

**enviar_relatorio_financeiro**
- Roda último dia útil do mês
- Gera relatório executivo
- Envia para admins/sócios
- DRE, fluxo de caixa, inadimplência

**executar_faturamento_automatico**
- Roda diariamente à meia-noite
- Verifica configurações de faturamento agendado
- Gera faturas para clientes com dia de faturamento = hoje
- Registra execução em log
- Envia resumo para gestores financeiros

**alertar_horas_pendentes_aprovacao**
- Roda diariamente às 8h
- Busca timesheet pendente há mais de 5 dias
- Envia alerta para gestores responsáveis
- Inclui resumo de horas e colaboradores

**atualizar_status_faturas**
- Roda diariamente à meia-noite
- Marca faturas vencidas como "atrasada"
- Envia alertas de faturas vencidas
- Atualiza métricas de inadimplência

### RLS (Row Level Security)

**Regra Base - Multi-Escritório:**
```sql
-- Todas as tabelas financeiras têm esta policy base
CREATE POLICY "Users see only their offices data"
  ON [tabela]
  FOR SELECT
  USING (
    escritorio_id IN (
      SELECT escritorio_id
      FROM user_escritorios_roles
      WHERE user_id = auth.uid()
      AND ativo = true
    )
  );
```

**Permissões por Role e Contexto:**

1. **Admin/Financeiro do Escritório:**
   - Vê todos os dados financeiros do escritório
   - Pode criar, editar e excluir qualquer lançamento
   - Pode aprovar horas de qualquer colaborador
   - Pode gerar e desmontar faturas
   - Vê relatórios completos

2. **Advogado/Colaborador:**
   - Vê apenas dados financeiros dos próprios casos:
     - Processos onde é responsável
     - Consultas onde é responsável
     - Contratos onde é responsável
   - Pode registrar próprio timesheet
   - Pode ver próprias horas (aprovadas/reprovadas)
   - Não pode aprovar horas
   - Não pode gerar faturas
   - Vê relatórios limitados aos próprios casos

3. **Gestores (pode_aprovar_horas = true):**
   - Mesmas permissões de Advogado, mais:
   - Pode aprovar/reprovar horas de qualquer colaborador do escritório
   - Vê dashboard consolidado de horas
   - Recebe alertas de horas pendentes

4. **Permissões de Faturamento (pode_faturar = true):**
   - Pode acessar tela de faturamento
   - Pode gerar faturas
   - Pode desmontar faturas (se não pagas)
   - Pode configurar faturamento agendado
   - Vê log de faturamentos automáticos

**Policies Específicas por Tabela:**

**contratos_honorarios:**
```sql
SELECT: escritorio_id IN (user escritorios)
  AND (role IN ('admin', 'financeiro') OR responsavel_id = auth.uid())
INSERT/UPDATE/DELETE: role IN ('admin', 'financeiro')
```

**financeiro_honorarios:**
```sql
SELECT: escritorio_id IN (user escritorios)
  AND (role IN ('admin', 'financeiro')
    OR responsavel_id = auth.uid()
    OR processo_id IN (user processos)
    OR consulta_id IN (user consultas))
INSERT: role IN ('admin', 'financeiro')
UPDATE/DELETE: role IN ('admin', 'financeiro')
```

**financeiro_timesheet:**
```sql
SELECT: escritorio_id IN (user escritorios)
  AND (role IN ('admin', 'financeiro')
    OR user_id = auth.uid()
    OR pode_aprovar_horas = true)
INSERT: escritorio_id IN (user escritorios) AND user_id = auth.uid()
UPDATE: (user_id = auth.uid() AND aprovado = false)
  OR role IN ('admin', 'financeiro')
  OR pode_aprovar_horas = true
DELETE: role IN ('admin', 'financeiro')
```

**financeiro_faturamento_faturas:**
```sql
SELECT: escritorio_id IN (user escritorios)
  AND (role IN ('admin', 'financeiro')
    OR pode_faturar = true
    OR cliente_id IN (user clientes via processos/consultas))
INSERT: role IN ('admin', 'financeiro') OR pode_faturar = true
UPDATE: role IN ('admin', 'financeiro') OR pode_faturar = true
DELETE: role IN ('admin', 'financeiro')
```

**financeiro_despesas:**
```sql
SELECT: escritorio_id IN (user escritorios)
  AND (role IN ('admin', 'financeiro') OR pode_ver_relatorios = true)
INSERT/UPDATE/DELETE: role IN ('admin', 'financeiro')
```

**Clientes Externos (Portal do Cliente - futuro):**
- Veem apenas próprios honorários
- Veem apenas próprias faturas
- Veem status de pagamento
- Podem baixar PDF de faturas
- Não podem editar nada

---

## Resumo das Atualizações do Planejamento

### ✅ Funcionalidades Principais

**IMPORTANTE:** Cada tela possui **seletor próprio de escritório(s)**, permitindo visualização individual (padrão: 1 escritório) ou agregada (múltiplos selecionados).

**1. Gestão de Contas Bancárias** 🆕
- Cadastro de contas bancárias por escritório
- Extrato virtual baseado em lançamentos do sistema
- Transferências entre contas (mesmo escritório)
- Lançamentos manuais (taxas, ajustes, etc.)
- Conciliação com extrato bancário real
- Conta principal por escritório (padrão para recebimentos)
- Saldo atualizado automaticamente
- Integração com pagamentos e despesas

**2. Sistema de Revisão/Aprovação de Timesheet**
- Tela dedicada para gestores aprovarem horas dos colaboradores
- Filtros avançados (colaborador, cliente, período, status)
- Aprovação/reprovação em lote com justificativas
- Notificações automáticas para colaboradores
- Cards de resumo com métricas em tempo real
- Histórico completo de aprovações

**3. Sistema de Faturamento Inteligente**
- **Tela de Faturamento**: Lista de clientes com lançamentos pendentes
- **Pré-visualização Lateral**: Seleção de itens, configuração de vencimento e observações
- **Geração Automática de PDF**: Fatura profissional com todos os detalhes
- **Faturas Emitidas**: Histórico completo com ações (enviar, pagar, desmontar)
- **Desmontar Faturas**: Cancelamento com reversão de lançamentos (audit trail completo)
- **Faturamento Agendado**: Configuração por cliente para geração automática em dias específicos
- **Execução Automática**: Scheduled function que roda diariamente gerando faturas
- **Log Detalhado**: Rastreamento de todas execuções automáticas

### 🗄️ Novas Tabelas do Banco de Dados

1. **user_escritorios_roles** - Permissões granulares por escritório
2. **contas_bancarias** - Contas bancárias do escritório 🆕
3. **conta_bancaria_lancamentos** - Extrato virtual com todos os lançamentos 🆕
4. **faturas** - Registros das faturas consolidadas geradas
5. **faturas_itens** - Itens/lançamentos incluídos em cada fatura
6. **faturamento_agendado_config** - Configuração de faturamento automático por cliente
7. **faturamento_agendado_log** - Log de execuções do faturamento automático
8. **Atualização em timesheet** - Adicionados campos: `fatura_id`, `reprovado`, `justificativa_reprovacao`, `updated_at`
9. **Atualização em pagamentos** - Adicionado campo: `conta_bancaria_id`
10. **Todas as tabelas financeiras** - Garantia de `escritorio_id (NOT NULL)` e índices compostos

### 📊 Novas Views

1. **v_timesheet_pendente_aprovacao** - Horas aguardando aprovação
2. **v_clientes_prontos_faturar** - Clientes com lançamentos não faturados
3. **v_faturas_dashboard** - Métricas de faturas por status
4. **v_extrato_conta_bancaria** - Extrato virtual com todos os lançamentos 🆕
5. **v_saldos_contas_bancarias** - Visão consolidada de saldos por escritório 🆕
6. **v_contas_receber_pagar** - View unificada de receber e pagar com filtros 🆕

### ⚙️ Novas Functions

1. **aprovar_horas_timesheet()** - Aprovação em lote de horas
2. **reprovar_horas_timesheet()** - Reprovação com justificativa
3. **buscar_lancamentos_faturar()** - Lista lançamentos pendentes por cliente
4. **gerar_fatura()** - Cria fatura, PDF e marca lançamentos como faturados
5. **desmontar_fatura()** - Cancela fatura e reverte lançamentos
6. **executar_faturamento_agendado()** - Processa faturamento automático
7. **verificar_horas_pendentes_aprovacao()** - Alerta de horas pendentes há muito tempo
8. **transferir_entre_contas()** - Transferência entre contas do mesmo escritório 🆕
9. **registrar_lancamento_conta()** - Lançamento manual em conta bancária 🆕
10. **atualizar_saldo_conta()** - Recalcula saldo da conta 🆕
11. **conciliar_extrato_bancario()** - Conciliação com extrato real 🆕
12. **marcar_conta_principal()** - Define conta principal do escritório 🆕

### 🔔 Novos Triggers

1. **fatura_status_change** - Atualiza métricas ao mudar status da fatura
2. **timesheet_aprovacao_alert** - Notifica colaborador ao aprovar/reprovar horas
3. **pagamento_registrado** - Cria lançamento em conta bancária ao registrar pagamento 🆕
4. **lancamento_conta_modificado** - Recalcula saldo ao modificar lançamentos 🆕
5. **conta_principal_unica** - Garante apenas uma conta principal por escritório 🆕

### ⏰ Novas Scheduled Functions

1. **executar_faturamento_automatico** - Gera faturas diariamente conforme configuração
2. **alertar_horas_pendentes_aprovacao** - Alerta gestores sobre horas pendentes
3. **atualizar_status_faturas** - Marca faturas vencidas como atrasadas

### 🤖 Novos Comandos de IA via Chat

- "Quais clientes estão prontos para faturar?"
- "Gerar fatura do cliente X"
- "Mostre faturas vencidas"
- "Aprovar horas do colaborador Y da última semana"
- "Quais horas estão pendentes de aprovação?"

### 🎯 Integrações Implementadas

**Timesheet ↔ Faturamento**
- Apenas horas aprovadas entram no faturamento
- Vínculo direto entre timesheet e faturas via `fatura_id`
- Opção de filtrar horas por período no faturamento

**Faturamento ↔ Honorários**
- Faturas podem consolidar múltiplos lançamentos
- Honorários individuais ou consolidados
- Rastreamento bidirecional

**Automações Completas**
- Faturamento automático por cliente
- Alertas de horas pendentes de aprovação
- Notificações em cada etapa do processo

---

## Próximos Passos Sugeridos para Implementação

### Fase 1: Banco de Dados (1-2 dias)
1. Criar todas as tabelas novas
2. Atualizar tabela `timesheet` com novos campos
3. Criar views para agregações
4. Implementar RLS policies

### Fase 2: Functions e Triggers (2-3 dias)
1. Implementar functions de aprovação de timesheet
2. Implementar functions de faturamento
3. Criar triggers de notificação
4. Implementar scheduled functions

### Fase 3: Edge Functions (2-3 dias)
1. Geração de PDF de faturas
2. Envio de emails de fatura
3. Processamento de faturamento agendado

### Fase 4: Frontend - Timesheet (3-4 dias)
1. Tela de revisão/aprovação
2. Componentes de filtros avançados
3. Tabela com seleção múltipla
4. Cards de resumo
5. Modals de aprovação/reprovação

### Fase 5: Frontend - Faturamento (4-5 dias)
1. Tela principal com lista de clientes
2. Drawer de pré-visualização
3. Tela de faturas emitidas
4. Visualização de PDF
5. Tela de configuração de faturamento agendado
6. Log de faturamentos automáticos

### Fase 6: Testes e Refinamentos (2-3 dias)
1. Testes de fluxo completo
2. Testes de automações
3. Ajustes de UX
4. Validações e tratamento de erros

**Estimativa Total: 14-20 dias de desenvolvimento**

---

## 📌 Checklist de Implementação - Integração com Escritórios

**Frontend - Uso do Contexto de Escritório:**
- [ ] Importar e usar `useEscritorioContext()` em todas as telas financeiras
- [ ] Filtro de escritório em todas as listas (quando contexto = "Todos")
- [ ] Campo "Escritório" condicional em formulários:
  - Hidden quando contexto = escritório específico
  - Select obrigatório quando contexto = "Todos" e lançamento avulso
- [ ] Lógica de herança de escritório (processo/consulta → lançamento)
- [ ] Validação: impedir faturar lançamentos de escritórios diferentes
- [ ] Dashboard com visão consolidada e quebra por escritório
- [ ] Indicadores visuais de escritório (badge/cor) quando contexto = "Todos"
- [ ] Gráficos com breakdown por escritório

**Backend - Estrutura de Dados:**
- [ ] Coluna `escritorio_id (NOT NULL)` em todas as tabelas financeiras
- [ ] Constraints UNIQUE compostos: `(escritorio_id, numero_sequencial)`
- [ ] Índices compostos: `(escritorio_id, campo_principal)`
- [ ] RLS policies filtrando por `escritorio_id IN (user escritorios)`
- [ ] Functions validando e respeitando escritório
- [ ] Triggers impedindo operações cross-escritório
- [ ] Views agregando por escritório
- [ ] Scheduled functions processando por escritório

**Validações Críticas Específicas do Financeiro:**
- [ ] **Fatura só pode consolidar lançamentos do mesmo escritório** (validação backend)
- [ ] Timesheet herda `escritorio_id` do processo/consulta vinculado
- [ ] Honorário herda `escritorio_id` do contrato/processo/consulta
- [ ] Despesa herda `escritorio_id` do processo (se vinculada)
- [ ] Numerações sequenciais únicas por escritório:
  - `UNIQUE(escritorio_id, numero_fatura)`
  - `UNIQUE(escritorio_id, numero_contrato)`
  - `UNIQUE(escritorio_id, numero_interno)` (honorários)
- [ ] Relatórios e exportações incluem coluna de escritório quando consolidado

---

## 🎯 Principais Decisões de Arquitetura - Financeiro

### **1. Seletor de Escritório por Tela**
- **Cada tela** do financeiro tem seu próprio seletor de escritório(s)
- **Padrão**: Mostra 1 escritório (o primeiro do usuário)
- **Filtro Multi-Seleção**: Usuário pode adicionar mais escritórios para ver consolidado
- **Persistência**: Seleção persiste por tela (localStorage)
- **Não há seletor global no header** - cada módulo gerencia sua própria visualização

### **2. Campo Escritório Sempre Presente nos Cadastros**
- **TODOS os formulários** de cadastro têm campo "Escritório" obrigatório
- **Lançamentos Vinculados**: campo readonly mostrando escritório do vínculo (processo/consulta)
- **Lançamentos Avulsos**: campo select obrigatório para escolha manual
- **Valor padrão**: Primeiro escritório do usuário (se tiver apenas 1)
- Validações impedem inconsistências

### **3. Isolamento de Dados por Escritório**
- Todas as tabelas financeiras têm `escritorio_id (NOT NULL)`
- RLS policies filtram automaticamente por escritórios do usuário
- Índices compostos garantem performance: `(escritorio_id, campo_principal)`

### **4. Numeração Sequencial Única por Escritório**
- Faturas: `FAT-2025-001` (reinicia por escritório)
- Contratos: `CONT-2025-001` (reinicia por escritório)
- Honorários: `HON-2025-001` (reinicia por escritório)
- Constraints: `UNIQUE(escritorio_id, numero_sequencial)`

### **5. Regra Crítica de Faturamento**
- **Faturas NUNCA consolidam lançamentos de escritórios diferentes**
- Validação no backend (`gerar_fatura` function)
- Interface impede seleção cross-escritório
- Se contexto = "Todos": usuário seleciona escritório antes de visualizar lançamentos

### **6. Tela Unificada de Contas a Receber e Pagar**
- **Uma única tela** com filtros inteligentes para alternar entre Receber/Pagar/Ambos
- **View consolidada** no banco: `v_contas_receber_pagar` (union de parcelas e despesas)
- **Filtros contextuais**: Tipo, Status, Período, Cliente/Fornecedor, Categoria
- **Totalizadores dinâmicos**: Total a receber, a pagar, saldo líquido
- **Cores visuais**: Verde (receber), Vermelho (pagar)
- **Ações contextuais** por tipo (cobrança vs agendamento de pagamento)
- Benefícios: Visão completa do fluxo de caixa, menos navegação, UX simplificada

### **7. Visão Consolidada Multi-Escritório**
- Dashboard: métricas agregadas + gráficos com breakdown por escritório
- Listas: incluem badge/indicador visual de escritório em cada linha
- Filtros: permitem isolar escritório específico
- Relatórios: totais consolidados + seções por escritório
- Exportações: incluem coluna identificando o escritório

### **8. Permissões por Escritório**
- Verificadas via `user_escritorios_roles` (gerenciado pelo módulo de Escritórios)
- Flags específicas do financeiro: `pode_aprovar_horas`, `pode_faturar`
- Usuário pode ter permissões diferentes em cada escritório
- RLS policies aplicam permissões automaticamente
