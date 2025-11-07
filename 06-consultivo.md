# Módulo: Consultivo

## Funcionalidade

Gestão de consultas jurídicas, pareceres, contratos e demais demandas consultivas (não processuais) dos clientes.

### Telas Principais

**Lista de Consultas**
- Grid com todas consultas
- Filtros: status, tipo, cliente, responsável, área, urgência
- Busca por assunto, cliente, palavras-chave
- Indicadores: prazo SLA, resposta pendente, aprovação pendente
- Ações rápidas: responder, aprovar, gerar documento
- Views salvas: pendentes, em análise, concluídas

**Cadastro de Consulta**

**Dados Básicos**
- Cliente
- Tipo: consulta simples, parecer técnico, análise contratual, due diligence, opinião legal
- Área: tributária, societária, trabalhista, cível, etc
- Assunto/título
- Descrição detalhada da consulta
- Prioridade/urgência: alta, média, baixa
- Prazo solicitado pelo cliente
- SLA interno (calculado automaticamente)

**Atribuição**
- Advogado responsável
- Equipe de apoio
- Revisor (se necessário)
- Data de recebimento
- Data estimada de conclusão

**Documentos Anexados**
- Contratos para análise
- Documentos da empresa
- Legislação aplicável
- Casos similares
- Minutas

**Perfil Completo da Consulta**

Visualização detalhada com abas:

1. **Resumo**
   - Status atual
   - Tempo decorrido vs SLA
   - Próximas ações
   - Valores envolvidos
   - Timeline de atividades

2. **Análise**
   - Campo de trabalho do advogado
   - Rascunho da resposta/parecer
   - Notas de pesquisa
   - Teses e fundamentos
   - Checklist de pontos a abordar
   - Editor rico com formatação jurídica

3. **Pesquisa**
   - Legislação aplicável
   - Jurisprudências
   - Doutrina
   - Precedentes do escritório (casos similares)
   - Pesquisa assistida por IA

4. **Documentos**
   - Documentos recebidos
   - Documentos gerados
   - Minutas de contratos
   - Versões e revisões
   - Controle de versão

5. **Resposta/Parecer**
   - Parecer final
   - Conclusão e recomendações
   - Ressalvas
   - Documentos complementares
   - Aprovação interna
   - Envio ao cliente

6. **Histórico**
   - Timeline de todas ações
   - Comunicações com cliente
   - Alterações e revisões
   - Aprovações

7. **Financeiro**
   - Contrato de honorários vinculado
   - Forma de cobrança (fixo/hora/êxito)
   - Se POR HORA:
     - **Widget Sticky de Registro** (sempre visível):
       ```
       ⏱️ Hoje: 3h | Não faturado: 12h
       [Descrição da atividade...] [1.5]h ✓Faturável [Registrar]
       ```
     - **Timesheet integrado:**
       - Linha quick add no topo
       - Tabela: Data | Advogado | Horas | Atividade | Faturável
       - Cores: verde (faturado) / azul (pendente)
     - Total: X horas trabalhadas | Y horas faturadas
     - Botão "Faturar Horas Pendentes" (gera honorário automaticamente)
     - Valor estimado a faturar em destaque
   - Honorários já lançados desta consulta
   - Status de pagamento

8. **Histórico**

### Tipos de Trabalho Consultivo

**Consultas Simples**
- Dúvidas pontuais
- Orientações rápidas
- Resposta em até 48h
- Formato simplificado

**Pareceres Técnicos**
- Análise aprofundada
- Fundamentação robusta
- Múltiplas fontes
- Formato formal
- Revisão obrigatória

**Análise Contratual**
- Revisão de contratos
- Identificação de riscos
- Sugestões de cláusulas
- Comparação de versões
- Minutas

**Due Diligence**
- Análise societária
- Compliance
- Riscos trabalhistas/tributários
- Passivos contingentes
- Relatório estruturado

**Opinião Legal**
- Viabilidade de operação
- Interpretação de normas
- Estratégias jurídicas
- Posicionamento institucional

### Funcionalidades Especiais

**Templates de Respostas**
- Modelos por tipo de consulta
- Banco de cláusulas
- Parágrafos padrão
- Personalizáveis

**Geração Assistida por IA**
- Rascunho inicial de parecer
- Sugestão de estrutura
- Pesquisa automática de legislação
- Citação de jurisprudências
- Revisão gramatical e técnica

**Gestão de SLA**
- Cálculo automático de prazo
- Alertas de vencimento
- Dashboard de performance
- Métricas por advogado/área

**Base de Conhecimento**
- Indexação de pareceres anteriores
- Busca semântica
- Reutilização de pesquisas
- Banco de teses

**Controle de Revisão**
- Workflow de aprovação
- Múltiplos revisores
- Comentários e sugestões
- Controle de versões

**Minutas e Modelos**
- Biblioteca de contratos
- Cláusulas modulares
- Geração automática
- Personalização inteligente

### Integrações com IA

**Via Chat do Dashboard**
- "Quais consultas estão atrasadas?"
- "Gere minuta de contrato de prestação de serviços"
- "Analise o contrato anexado pela cliente Maria"
- "Busque pareceres anteriores sobre LGPD"
- "Qual o SLA médio da equipe tributária?"
- "Responda consulta sobre prazo prescricional tributário"
- "Sugira cláusulas para contrato de franquia"

**Automações com n8n**
- Triagem inicial de consultas
- Atribuição inteligente por área/complexidade
- Pesquisa automática de legislação
- Extração de dados de contratos
- Alertas de SLA
- Envio automático de respostas
- Pesquisa em base de precedentes

**Sugestões Proativas**
- "Consulta X está há 5 dias sem resposta. Deseja rascunho via IA?"
- "Encontrei 3 pareceres similares que podem ajudar"
- "Legislação citada foi atualizada. Revisar parecer?"
- "Cliente Y enviou contrato. Iniciar análise automática?"
- **"Você acabou de salvar a análise. Registrar [__]h de trabalho?"** (inline após ação)
- **"Parecer concluído. Tempo estimado: 4h. Confirmar para registrar?"** (inline após conclusão)
- **"Você trabalhou 8h nesta consulta hoje. Registrar no timesheet?"** (se passou muito tempo)
- **"Consulta concluída com 15h trabalhadas. Faturar agora?"** (se contrato por hora)
- **"Cliente tem 25h não faturadas acumuladas. Gerar honorário?"** (se contrato por hora)

## Banco de Dados

### Tabelas Necessárias

**consultas**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- numero_interno (text, unique) - controle interno
- cliente_id (uuid, FK clientes)
- tipo (text: 'simples', 'parecer', 'contrato', 'due_diligence', 'opiniao')
- area (text: 'tributaria', 'societaria', 'trabalhista', 'civel', etc)
- assunto (text)
- descricao (text)
- urgencia (text: 'alta', 'media', 'baixa')
- prazo_cliente (date, nullable)
- sla_horas (integer) - SLA interno em horas
- data_recebimento (timestamp)
- data_conclusao_estimada (timestamp)
- data_conclusao_real (timestamp, nullable)
- responsavel_id (uuid, FK profiles)
- revisor_id (uuid, FK profiles, nullable)
- status (text: 'nova', 'em_analise', 'em_revisao', 'concluida', 'enviada', 'aprovada')
- valor_servico (numeric, nullable)
- horas_estimadas (numeric, nullable)
- horas_reais (numeric, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**consultas_equipe**
```
- id (uuid, PK)
- consulta_id (uuid, FK consultas)
- user_id (uuid, FK profiles)
- papel (text: 'responsavel', 'colaborador', 'revisor')
- created_at (timestamp)
```

**consultas_analise**
```
- id (uuid, PK)
- consulta_id (uuid, FK consultas)
- conteudo (text) - texto do parecer/análise
- versao (integer)
- status (text: 'rascunho', 'em_revisao', 'aprovado', 'final')
- notas_pesquisa (text, nullable)
- checklist (jsonb, nullable)
- created_by (uuid, FK profiles)
- revised_by (uuid, FK profiles, nullable)
- approved_by (uuid, FK profiles, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**consultas_documentos**
```
- id (uuid, PK)
- consulta_id (uuid, FK consultas)
- tipo (text: 'recebido', 'gerado', 'minuta', 'final')
- categoria (text: 'contrato', 'parecer', 'documento_cliente', 'legislacao', etc)
- titulo (text)
- arquivo_url (text)
- arquivo_nome (text)
- versao (integer, nullable)
- criado_por (uuid, FK profiles)
- created_at (timestamp)
```

**consultas_referencias**
```
- id (uuid, PK)
- consulta_id (uuid, FK consultas)
- tipo (text: 'legislacao', 'jurisprudencia', 'doutrina', 'precedente')
- titulo (text)
- referencia_completa (text)
- link (text, nullable)
- relevancia (text: 'alta', 'media', 'baixa')
- citado_no_parecer (boolean)
- created_at (timestamp)
```

**consultas_timeline**
```
- id (uuid, PK)
- consulta_id (uuid, FK consultas)
- tipo_acao (text: 'criacao', 'atribuicao', 'inicio_analise', 'revisao', 'aprovacao', 'conclusao', 'envio')
- descricao (text)
- user_id (uuid, FK profiles)
- metadata (jsonb, nullable)
- created_at (timestamp)
```

**templates_pareceres**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- tipo_consulta (text)
- area (text)
- estrutura (jsonb) - seções do parecer
- conteudo_template (text)
- variaveis (jsonb)
- clausulas_padrao (jsonb, nullable)
- ativo (boolean)
- created_by (uuid, FK profiles)
- created_at (timestamp)
- updated_at (timestamp)
```

**minutas_contratuais**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- tipo_contrato (text: 'prestacao_servicos', 'compra_venda', 'locacao', etc)
- conteudo_template (text)
- clausulas (jsonb) - cláusulas modulares
- variaveis_obrigatorias (text[])
- variaveis_opcionais (text[])
- instrucoes_preenchimento (text, nullable)
- tags (text[])
- versao (text)
- ativo (boolean)
- created_by (uuid, FK profiles)
- created_at (timestamp)
- updated_at (timestamp)
```

**clausulas_biblioteca**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- titulo (text)
- categoria (text: 'objeto', 'prazo', 'pagamento', 'rescisao', etc)
- tipo_contrato (text[], nullable) - quais contratos se aplica
- texto_clausula (text)
- variaveis (jsonb, nullable)
- tags (text[])
- uso_count (integer) - quantas vezes foi usada
- aprovada (boolean)
- created_by (uuid, FK profiles)
- created_at (timestamp)
```

**precedentes_internos**
```
- id (uuid, PK)
- consulta_origem_id (uuid, FK consultas)
- titulo (text)
- area (text)
- resumo (text)
- teses (text[])
- palavras_chave (text[])
- aplicavel_em (text[]) - situações onde é aplicável
- arquivo_url (text, nullable)
- aprovado_publicacao (boolean)
- created_at (timestamp)
```

### Views

**v_consultas_pendentes**
```
Consultas em andamento
Com cálculo de tempo decorrido
SLA vencido ou próximo do vencimento
Priorizado por urgência
```

**v_consultas_sla**
```
Métricas de SLA
Por advogado, área, tipo
Média de tempo de resposta
Taxa de cumprimento
```

**v_precedentes_similares**
```
Função que retorna precedentes similares
Baseado em palavras-chave e área
Para reutilização
```

### Functions

**create_consulta(dados jsonb)**
- Cria consulta
- Calcula SLA automático
- Atribui número interno
- Notifica responsável
- Retorna consulta criada

**gerar_parecer_ia(consulta_id uuid, template_id uuid)**
- Busca dados da consulta
- Busca template
- Pesquisa referências automáticas
- Gera rascunho via IA
- Salva versão inicial
- Retorna texto gerado

**gerar_contrato(minuta_id uuid, variaveis jsonb)**
- Busca minuta
- Preenche variáveis
- Monta cláusulas
- Gera documento final
- Retorna contrato

**analisar_contrato_ia(consulta_id uuid, documento_url text)**
- Extrai texto do contrato
- Identifica cláusulas
- Analisa riscos
- Sugere melhorias
- Gera relatório
- Retorna análise

**buscar_precedentes(palavras_chave text[], area text)**
- Busca em precedentes_internos
- Busca em consultas antigas
- Ranking por relevância
- Retorna lista ordenada

**aprovar_parecer(consulta_id uuid, versao integer, aprovador_id uuid)**
- Marca versão como aprovada
- Atualiza status da consulta
- Notifica responsável
- Gera versão final

### Triggers

**consulta_status_change**
- Ao mudar status
- Registra na timeline
- Envia notificações
- Atualiza métricas

**consulta_sla_alert**
- Verifica SLA periodicamente
- Quando próximo do vencimento (80%)
- Notifica responsável

**new_consulta_auto_assign**
- Nova consulta criada
- Se não tem responsável
- Atribui baseado em área e carga de trabalho

**versao_parecer_created**
- Nova versão de parecer
- Notifica revisores
- Registra na timeline

### Scheduled Functions

**verificar_sla_consultas**
- Roda a cada hora
- Identifica consultas atrasadas
- Envia alertas escalados
- Atualiza dashboard

**sugerir_precedentes**
- Roda diariamente
- Para consultas em análise
- Busca casos similares
- Notifica advogado responsável

**limpar_rascunhos_antigos**
- Roda mensalmente
- Arquiva versões antigas não aprovadas
- Mantém apenas versão final

### RLS

- Usuários veem consultas do próprio escritório
- Podem ver consultas onde são responsáveis ou membros da equipe
- Podem editar apenas consultas onde são responsáveis
- Revisores podem ver e comentar consultas atribuídas a eles
- Admins veem/editam todas consultas do escritório
