# Módulo: Processos

## Funcionalidade

Gestão completa de processos judiciais e administrativos, com acompanhamento de movimentações, controle de prazos, documentos e estratégia processual.

### Telas Principais

**Lista de Processos**
- Grid/tabela com todos processos
- Filtros: status, área, responsável, cliente, tribunal, fase
- Busca por número, cliente, comarca
- Ordenação customizável
- Indicadores visuais: prazo vencendo, movimentação não lida, documento pendente
- Ações em lote: gerar relatórios, marcar como lido, atribuir responsável
- Views salvas (processos ativos, críticos, arquivados)

**Cadastro de Processo**

**Dados Básicos**
- Número do processo (CNJ)
- Tipo: judicial, administrativo, arbitragem
- Área: cível, trabalhista, tributária, família, criminal, etc
- Fase: conhecimento, recurso, execução
- Instância: 1ª, 2ª, 3ª, STJ, STF
- Rito: ordinário, sumário, especial
- Valor da causa

**Partes**
- Cliente (polo ativo/passivo/terceiro)
- Parte contrária (múltiplas)
- Advogados da parte contrária
- Tipo de participação de cada parte
- Litisconsortes

**Informações Judiciais**
- Tribunal/Fórum
- Comarca
- Vara/Câmara
- Juiz
- Data de distribuição

**Gestão do Processo**
- Advogado responsável
- Colaboradores (array de advogados que auxiliam)
- Status: ativo, suspenso, arquivado, baixado, transitado em julgado, acordo
- Tags personalizadas (array)
- Observações gerais
- Valores: causa, acordo, condenação
- Provisão contábil sugerida

**Perfil Completo do Processo**

Visualização detalhada com abas:

1. **Resumo**
   - Timeline visual do processo
   - Próximos prazos
   - Última movimentação
   - Status atual
   - Valor da causa e honorários
   - Acesso rápido a ações principais

2. **Movimentações**
   - Timeline completa de movimentações
   - Capturadas automaticamente dos tribunais
   - Possibilidade de adicionar manualmente
   - Marcação de lida/não lida
   - Comentários em cada movimentação
   - Filtro por tipo de movimentação
   - Exportação

3. **Prazos**
   - Lista de todos prazos
   - Prazos abertos, cumpridos, perdidos
   - Criar novo prazo
   - Cálculo automático
   - Integração com módulo Agenda
   - Alertas configuráveis

4. **Peças Processuais**
   - Todas peças do processo
   - Inicial, contestação, recursos, etc
   - Upload de peças
   - Template de peças
   - Histórico de versões
   - Protocolo e números
   - Geração via IA

5. **Documentos**
   - Procurações
   - Documentos da parte
   - Documentos anexados ao processo
   - Provas
   - Contratos
   - Organizados por tipo e data
   - OCR automático

6. **Audiências**
   - Lista de todas audiências
   - Passadas e futuras
   - Integração com Agenda
   - Preparação de audiência
   - Ata e resultados
   - Anexos (petições pós-audiência)

7. **Financeiro**
   - Contrato de honorários vinculado
   - Forma de cobrança (fixo/hora/etapa/êxito)
   - Se POR ETAPA:
     - Lista de etapas com valores
     - Checkboxes indicando etapas faturadas
     - Botão "Lançar Etapa" para cada etapa não faturada
   - Se POR HORA:
     - **Widget Sticky de Registro** (sempre visível no topo):
       ```
       ⏱️ Hoje: 2.5h | Não faturado: 15h
       [Atividade realizada...] [2.5]h ✓Faturável [Registrar]
       ```
     - **Tabela Timesheet** logo abaixo:
       - Linha quick add no topo (mesmo formato do widget)
       - Histórico de horas trabalhadas
       - Por data, advogado, atividade, horas
       - Indicador visual: faturado (verde) / pendente (azul)
     - Total de horas (faturadas/não faturadas)
     - Botão "Faturar Horas Pendentes" (gera honorário)
   - Honorários já lançados deste processo
   - Status de pagamento
   - Valores em disputa
   - Acordo e cálculos

8. **Histórico**
   - Todas alterações no processo
   - Auditoria completa
   - Quem fez o quê e quando

9. **Análise e Estratégia**
   - Resumo estratégico do caso
   - Pontos fortes/fracos
   - Jurisprudências relevantes
   - Doutrina aplicável
   - Próximos passos
   - Análise de risco via IA

### Funcionalidades Especiais

**Captura Automática de Movimentações**
- Integração com tribunais via Playwright/DataJud
- Verificação periódica automatizada
- Notificação de novas movimentações
- Parsing inteligente de movimentações
- Identificação automática de prazos

**Geração de Peças com IA**
- Templates personalizáveis
- Preenchimento automático de dados
- Sugestão de teses e argumentos
- Citação de jurisprudências
- Revisão gramatical e jurídica
- Adequação ao caso concreto
- **Oferta de Registro de Horas após salvar:**
  - Toast/banner inline: "✓ Peça salva. Registrar tempo: [__]h [✓] [Registrar] [Ignorar]"
  - Pré-preenche com tempo médio baseado no tipo de peça

**Análise Preditiva**
- Probabilidade de êxito
- Tempo estimado de tramitação
- Valores prováveis de condenação
- Jurisprudências similares
- Perfil do juiz/tribunal

**Gestão de Riscos**
- Classificação de risco (alto/médio/baixo)
- Valor em risco
- Provisões sugeridas
- Plano de contingência

**Processos Relacionados**
- Vincular processos conexos
- Incidentes processuais
- Processos origem/decorrentes
- Visualização em árvore

### Integrações com IA

**Via Chat do Dashboard**
- "Mostre processos com prazo esta semana"
- "Qual o status do processo número XXX?"
- "Gere petição de contestação para processo Y"
- "Analise chances de êxito do processo Z"
- "Quais processos movimentaram hoje?"
- "Busque jurisprudências sobre tema X"
- "Crie resumo executivo do processo ABC"
- "Calcule custas do processo DEF"

**Automações com n8n**
- Monitoramento automático de processos
- Extração de prazos de intimações
- Criação automática de eventos na agenda
- Notificação de movimentações críticas
- Envio de atualizações para clientes
- Classificação automática de movimentações
- Análise de sentimento de decisões

**Sugestões Proativas**
- "Nova movimentação no processo X. Prazo de 15 dias. Deseja criar evento?"
- "Processo Y sem movimentação há 6 meses. Verificar andamento?"
- "Jurisprudência favorável recente sobre tema do processo Z"
- "Prazo do processo A vence em 3 dias. Peça protocolada?"
- **"Petição inicial protocolada. Lançar honorários da etapa inicial?"** (se contrato por etapa)
- **"Sentença publicada no processo X. Lançar honorários da sentença?"** (se contrato por etapa)
- **"Você tem 20h trabalhadas não faturadas neste processo. Faturar agora?"** (se contrato por hora)
- **"Processo finalizado com êxito. Lançar honorários de êxito?"** (se contrato por êxito)

## Banco de Dados

### Tabelas Implementadas

**processos_processos** (Principal)
```
- id (uuid, PK)
- escritorio_id (uuid, FK escritorios)
- created_at, updated_at (timestamptz)
- created_by (uuid, FK profiles)

-- Identificação
- numero_cnj (text, UNIQUE) - Formato CNJ: 1234567-12.2024.8.26.0100
- numero_pasta (text, UNIQUE) - Auto-gerado: 1000, 1001, 1002... (trigger)

-- Classificação
- tipo (text: 'judicial', 'administrativo', 'arbitragem')
- area (text: 'civel', 'trabalhista', 'tributaria', 'familia', 'criminal', etc)
- fase (text: 'conhecimento', 'recurso', 'execucao', 'cumprimento_sentenca')
- instancia (text: '1a', '2a', '3a', 'stj', 'stf', 'tst', 'administrativa')
- rito (text: 'ordinario', 'sumario', 'especial', 'sumarissimo')

-- Localização
- tribunal (text)
- comarca (text, nullable)
- vara (text, nullable)
- juiz (text, nullable)

-- Distribuição
- data_distribuicao (date)

-- Partes
- cliente_id (uuid, FK crm_clientes)
- polo_cliente (text: 'ativo', 'passivo', 'terceiro')
- parte_contraria (text, nullable) - Nome simples (para casos sem litisconsórcio)

-- Gestão
- responsavel_id (uuid, FK profiles)
- colaboradores_ids (uuid[]) - Array de UUIDs de colaboradores
- status (text: 'ativo', 'suspenso', 'arquivado', 'baixado', 'transito_julgado', 'acordo')

-- Valores (mantidos no processo)
- valor_causa (numeric(15,2))
- valor_acordo (numeric(15,2))
- valor_condenacao (numeric(15,2))
- provisao_sugerida (numeric(15,2))

-- Descrições
- objeto_acao (text) - Resumo do pedido
- observacoes (text)

-- Organização
- tags (text[]) - Array de tags

-- Datas de encerramento
- data_transito_julgado (date)
- data_arquivamento (date)
```

**processos_partes** (Litisconsórcio)
```
- id (uuid, PK)
- processo_id (uuid, FK processos_processos)
- tipo (text: 'autor', 'reu', 'terceiro_interessado', 'assistente', 'advogado_contrario')
- nome (text)
- cpf_cnpj (text, nullable)
- qualificacao (text) - Descrição do papel
- ordem (integer) - Ordem de exibição
- created_at (timestamptz)

Observação: Maioria dos processos usa apenas campo parte_contraria na tabela principal.
Esta tabela é para casos com múltiplas partes (litisconsórcio).
```

**processos_movimentacoes**
```
- id (uuid, PK)
- processo_id (uuid, FK processos_processos)
- escritorio_id (uuid, FK escritorios)
- data_movimento (timestamptz)
- tipo_codigo (text, nullable) - Código do tribunal
- tipo_descricao (text, nullable) - Descrição do tipo
- descricao (text) - Texto da movimentação
- conteudo_completo (text, nullable) - HTML/texto completo
- origem (text: 'tribunal', 'manual')
- importante (boolean)
- lida (boolean)
- lida_por (uuid, FK profiles, nullable)
- lida_em (timestamptz, nullable)
- comentarios (text, nullable)
- created_at (timestamptz)

Observações:
- Prazos são gerenciados via agenda_tarefas (integração futura)
- Audiências são gerenciadas via agenda_eventos (integração futura)
```

**processos_historico** (Auditoria)
```
- id (uuid, PK)
- processo_id (uuid, FK processos_processos)
- escritorio_id (uuid, FK escritorios)
- user_id (uuid, FK profiles)
- acao (text: 'criacao', 'edicao', 'movimentacao', 'status', 'arquivamento')
- campo_alterado (text, nullable)
- valor_anterior (text, nullable)
- valor_novo (text, nullable)
- descricao (text)
- created_at (timestamptz)

Observação: Preenchido automaticamente via triggers
```

**processos_estrategia** (Banco de Estratégias)
```
- id (uuid, PK)
- processo_id (uuid, FK processos_processos)
- escritorio_id (uuid, FK escritorios)
- versao (integer)
- data_estrategia (date)
- resumo_caso (text)
- tese_principal (text)
- teses_alternativas (text[])
- pontos_fortes (text[])
- pontos_fracos (text[])
- riscos_identificados (text[])
- jurisprudencias_favoraveis (text[])
- jurisprudencias_contrarias (text[])
- doutrina_aplicavel (text)
- precedentes_vinculantes (text[])
- provas_necessarias (text[])
- provas_obtidas (text[])
- proximos_passos (text[])
- prazo_critico (date, nullable)
- observacoes_estrategicas (text)
- created_at (timestamptz)
- created_by (uuid, FK profiles)

Observação: Permite múltiplas versões de estratégia ao longo do processo
```

**processos_jurisprudencias** (Banco de Jurisprudências)
```
- id (uuid, PK)
- processo_id (uuid, FK processos_processos, nullable) - Pode ser geral do escritório
- escritorio_id (uuid, FK escritorios)
- tribunal (text)
- numero_acordao (text)
- data_julgamento (date)
- ementa (text)
- texto_completo (text, nullable)
- link_fonte (text, nullable)
- relator (text, nullable)
- orgao_julgador (text, nullable)
- palavras_chave (text[])
- area_direito (text)
- relevancia (text: 'alta', 'media', 'baixa')
- favoravel (boolean, nullable) - Se aplicável ao processo
- citada_em_peca (boolean)
- observacoes (text, nullable)
- created_at (timestamptz)
- created_by (uuid, FK profiles)

Observação: Banco compartilhado. Se processo_id é NULL, é jurisprudência geral do escritório.
```

### Views Implementadas

**v_processos_dashboard**
```sql
SELECT
  p.escritorio_id,
  COUNT(*) FILTER (WHERE p.status = 'ativo') as total_ativos,
  COUNT(*) FILTER (WHERE p.status = 'arquivado') as total_arquivados,
  COUNT(DISTINCT p.area) as areas_atuacao,
  COUNT(*) FILTER (WHERE m.lida = false) as movimentacoes_nao_lidas,
  json_agg(DISTINCT p.area) as areas_list
FROM processos_processos p
LEFT JOIN processos_movimentacoes m ON m.processo_id = p.id AND m.lida = false
GROUP BY p.escritorio_id;
```

**v_processos_criticos** (Processos que precisam atenção)
```sql
SELECT
  p.*,
  c.nome_completo as cliente_nome,
  prof.nome_completo as responsavel_nome,
  COUNT(m.id) FILTER (WHERE m.lida = false AND m.importante = true) as movimentacoes_importantes
FROM processos_processos p
JOIN crm_clientes c ON c.id = p.cliente_id
JOIN profiles prof ON prof.id = p.responsavel_id
LEFT JOIN processos_movimentacoes m ON m.processo_id = p.id
WHERE p.status = 'ativo'
GROUP BY p.id, c.nome_completo, prof.nome_completo
HAVING COUNT(m.id) FILTER (WHERE m.lida = false AND m.importante = true) > 0;
```

### Functions Implementadas

**user_tem_acesso_processo(p_processo_id uuid, p_user_id uuid)**
```sql
Retorna TRUE se o usuário pode VER o processo:
- Se é do mesmo escritório
- Se é responsável
- Se é colaborador
- Se é admin do escritório
```

**user_pode_editar_processo(p_processo_id uuid, p_user_id uuid)**
```sql
Retorna TRUE se o usuário pode EDITAR o processo:
- Se é admin do escritório
- Se é responsável
- Se é colaborador (com permissão)
```

**create_processo(p_dados jsonb)**
```sql
Cria novo processo com validações:
- Valida número CNJ (formato NNNNNNN-DD.AAAA.J.TT.OOOO)
- Gera numero_pasta automaticamente (trigger)
- Valida campos obrigatórios
- Adiciona responsável à equipe automaticamente
- Registra histórico de criação
- Retorna processo criado completo
```

**add_movimentacao(p_processo_id uuid, p_dados jsonb)**
```sql
Adiciona movimentação ao processo:
- Valida processo existe e user tem acesso
- Cria movimentação
- Notifica responsável e colaboradores via dashboard_notificacoes
- Atualiza updated_at do processo
- Registra histórico
- Retorna movimentação criada

Parâmetros em p_dados:
{
  "data_movimento": "2025-01-07T10:30:00Z",
  "tipo_codigo": "123",
  "tipo_descricao": "Sentença",
  "descricao": "Publicada sentença...",
  "conteudo_completo": "<html>...</html>",
  "origem": "tribunal",
  "importante": true
}
```

**registrar_historico_processo(p_processo_id uuid, p_acao text, p_descricao text)**
```sql
Registra entrada no histórico de auditoria:
- Automaticamente chamado por triggers
- Pode ser chamado manualmente para eventos customizados
```

### Triggers Implementados

**processos_updated_at**
```sql
BEFORE UPDATE ON processos_processos
Atualiza campo updated_at automaticamente em qualquer mudança
```

**processos_gerar_numero_pasta**
```sql
BEFORE INSERT ON processos_processos
Gera numero_pasta automaticamente se não fornecido:
- Inicia em 1000
- Incrementa sequencialmente: 1001, 1002, 1003...
- Único por escritório
```

**processos_add_responsavel_to_colaboradores**
```sql
AFTER INSERT OR UPDATE OF responsavel_id ON processos_processos
Adiciona responsável ao array colaboradores_ids automaticamente
```

**processos_registrar_criacao**
```sql
AFTER INSERT ON processos_processos
Registra criação no histórico
```

**processos_registrar_edicao**
```sql
AFTER UPDATE ON processos_processos
Registra mudanças importantes no histórico:
- Mudança de status
- Mudança de responsável
- Mudança de valores
```

**movimentacoes_notificar**
```sql
AFTER INSERT ON processos_movimentacoes
Cria notificações para responsável e colaboradores
```

### RLS (Row Level Security)

**processos_processos**
```
SELECT: Usuários veem processos do próprio escritório onde:
  - São responsáveis, OU
  - São colaboradores, OU
  - São admin do escritório

UPDATE/DELETE: Apenas se user_pode_editar_processo() retorna TRUE
```

**processos_partes**
```
SELECT: Mesmas regras do processo pai
INSERT/UPDATE/DELETE: Apenas se user_pode_editar_processo() do processo pai
```

**processos_movimentacoes**
```
SELECT: Mesmas regras do processo pai
INSERT: Se user_tem_acesso_processo()
UPDATE: Apenas campos lida/lida_por/lida_em/comentarios
DELETE: Apenas admin ou responsável
```

**processos_historico**
```
SELECT: Apenas admins e responsável do processo
INSERT/UPDATE/DELETE: Bloqueado (apenas triggers podem inserir)
```

**processos_estrategia**
```
SELECT: Mesmas regras do processo pai
INSERT/UPDATE/DELETE: Apenas admin ou responsável
```

**processos_jurisprudencias**
```
SELECT: Todos do escritório (banco compartilhado)
INSERT/UPDATE/DELETE: Todos do escritório (colaborativo)
```
