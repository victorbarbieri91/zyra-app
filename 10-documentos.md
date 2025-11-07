# Módulo: Documentos

## Funcionalidade

Gestão documental completa com armazenamento organizado, versionamento, busca inteligente, OCR, assinatura digital e compartilhamento seguro.

### Estrutura de Organização

**Categorias Principais**
- Por Cliente
- Por Processo
- Por Consulta
- Por Tipo de Documento
- Por Data
- Favoritos
- Compartilhados comigo
- Recentes

**Tipos de Documentos**
- Procurações
- Contratos
- RG, CPF, comprovantes
- Petições e peças processuais
- Sentenças e decisões
- Atas de audiência
- Pareceres técnicos
- Correspondências
- Certidões
- Comprovantes financeiros
- Outros

**Pastas e Subpastas**
- Estrutura hierárquica
- Criação livre de pastas
- Movimentação drag-and-drop
- Permissões por pasta
- Pastas compartilhadas

### Telas Principais

**Biblioteca de Documentos**
- Visualização em grid ou lista
- Preview de documentos
- Filtros múltiplos
- Busca textual (inclusive dentro dos documentos)
- Ordenação customizável
- Seleção múltipla
- Ações em lote

**Upload de Documentos**
- Upload múltiplo
- Drag and drop
- Seleção de categoria automaticamente
- Vinculação a cliente/processo/consulta
- Adição de tags
- Observações
- Definir permissões

**Visualizador de Documentos**
- Preview inline (PDF, imagens, Office)
- Zoom e rotação
- Anotações e marcações
- Destaque de texto
- Comentários
- Download
- Compartilhar
- Imprimir
- Histórico de versões

**Editor de Metadados**
- Nome do arquivo
- Categoria/tipo
- Tags
- Data do documento
- Cliente/processo vinculado
- Descrição
- Palavras-chave
- Confidencialidade

### Funcionalidades Especiais

**Versionamento Automático**
- Histórico completo de versões
- Quem alterou e quando
- Comparação entre versões
- Restauração de versões antigas
- Merge de alterações (quando possível)

**OCR Automático**
- Reconhecimento de texto em PDFs escaneados
- Extração de texto de imagens
- Indexação para busca
- Detecção de campos estruturados
- Validação de documentos

**Busca Inteligente**
- Busca full-text
- Busca por conteúdo do documento (via OCR)
- Filtros avançados combinados
- Busca semântica (via IA)
- Sugestões de busca
- Busca por similar

**Assinatura Digital**
- Assinatura eletrônica
- Certificado digital (ICP-Brasil)
- Múltiplos signatários
- Ordem de assinatura
- Rastreamento de status
- Validade jurídica
- Integração com plataformas (Docusign, Clicksign)

**Compartilhamento Seguro**
- Links com expiração
- Senha para acesso
- Controle de permissões (view/download/edit)
- Rastreamento de acessos
- Notificação de visualização
- Compartilhamento com clientes externos
- Portais de clientes

**Templates de Documentos**
- Biblioteca de modelos
- Templates de petições
- Templates de contratos
- Templates de procurações
- Variáveis dinâmicas
- Preenchimento automático
- Geração via IA

**Organização Automática**
- IA sugere categoria baseada em conteúdo
- Auto-vinculação a processos (por número)
- Extração automática de metadados
- Detecção de duplicatas
- Sugestão de tags

**Extração de Dados**
- Identificação de entidades (nomes, datas, valores)
- Extração de cláusulas em contratos
- Identificação de prazos em documentos
- Tabulação de dados estruturados
- Exportação para planilhas

**Controle de Acesso**
- Permissões granulares por documento
- Níveis: visualizar, baixar, editar, excluir, compartilhar
- Por usuário ou grupo
- Auditoria de acessos
- Documentos confidenciais

**Integração com Email**
- Salvar anexos de email diretamente
- Enviar documentos por email
- Protocolo automático por email
- Organização de correspondências

**Protocolo de Documentos**
- Numeração automática
- Livro de protocolo
- Recibo de entrega
- Rastreamento de documentos físicos
- Integração com processos

### Integrações com IA

**Via Chat do Dashboard**
- "Busque procuração do cliente João Silva"
- "Mostre documentos do processo X"
- "Há documentos pendentes de assinatura?"
- "Extraia dados do contrato anexado"
- "Gere procuração ad judicia para cliente Y"
- "Compare versões do contrato de prestação de serviços"
- "Quais documentos foram acessados esta semana?"
- "Organize documentos do cliente Z"

**Automações com n8n**
- Processamento automático após upload
- OCR de todos PDFs
- Extração de metadados
- Detecção de tipo de documento
- Vinculação automática
- Notificação de novos documentos
- Backup automático
- Arquivamento de documentos antigos

**Análise via IA**
- Classificação automática de documentos
- Extração de informações estruturadas
- Sumarização de documentos longos
- Identificação de cláusulas críticas
- Análise de conformidade
- Comparação de contratos
- Tradução automática

**Geração com IA**
- Criação de petições baseadas em dados do processo
- Preenchimento automático de templates
- Minutas de contratos personalizadas
- Pareceres técnicos com fundamentação
- Respostas a consultas
- Revisão gramatical e jurídica

**Sugestões Proativas**
- "Documento sem categoria. Sugestão: Contrato. Confirmar?"
- "Detectei duplicata do documento X. Manter ambos?"
- "Novo documento do cliente Y. Vincular ao processo Z?"
- "Contrato expira em 30 dias. Deseja criar lembrete?"

## Banco de Dados

### Tabelas Necessárias

**documentos**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- nome_original (text)
- arquivo_url (text)
- arquivo_tamanho (bigint) - em bytes
- arquivo_tipo (text) - mime type
- hash_arquivo (text) - para detecção de duplicatas
- categoria (text: 'procuracao', 'contrato', 'peticao', 'identificacao', etc)
- tipo_documento (text, nullable) - subtipo mais específico
- data_documento (date, nullable) - data do documento em si
- descricao (text, nullable)
- confidencial (boolean)
- cliente_id (uuid, FK clientes, nullable)
- processo_id (uuid, FK processos, nullable)
- consulta_id (uuid, FK consultas, nullable)
- pasta_id (uuid, FK pastas, nullable)
- criado_por (uuid, FK profiles)
- versao_numero (integer)
- documento_origem_id (uuid, FK documentos, nullable) - para versionamento
- is_versao_atual (boolean)
- ocr_processado (boolean)
- ocr_texto (text, nullable)
- metadata_extraido (jsonb, nullable) - dados extraídos por IA
- created_at (timestamp)
- updated_at (timestamp)
```

**pastas**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- pasta_pai_id (uuid, FK pastas, nullable)
- caminho (text) - path completo
- tipo (text: 'cliente', 'processo', 'geral')
- cliente_id (uuid, FK clientes, nullable)
- processo_id (uuid, FK processos, nullable)
- criado_por (uuid, FK profiles)
- created_at (timestamp)
```

**documentos_tags**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- tag (text)
- created_at (timestamp)
- UNIQUE(documento_id, tag)
```

**documentos_versoes**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- versao_numero (integer)
- arquivo_url (text)
- modificado_por (uuid, FK profiles)
- comentario (text, nullable)
- created_at (timestamp)
```

**documentos_compartilhados**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- compartilhado_com_user (uuid, FK profiles, nullable) - se interno
- link_publico (uuid, nullable) - se externo
- senha (text, nullable)
- permissoes (text[]) - 'view', 'download', 'edit'
- expira_em (timestamp, nullable)
- visualizacoes (integer)
- criado_por (uuid, FK profiles)
- created_at (timestamp)
```

**documentos_assinaturas**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- plataforma (text: 'interna', 'docusign', 'clicksign', etc)
- plataforma_id (text, nullable) - ID na plataforma externa
- status (text: 'pendente', 'assinado', 'cancelado', 'expirado')
- signatarios (jsonb) - array de signatários e status
- documento_assinado_url (text, nullable)
- created_at (timestamp)
- finalizado_em (timestamp, nullable)
```

**documentos_protocolo**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- numero_protocolo (text, unique)
- tipo (text: 'entrada', 'saida', 'interno')
- remetente (text, nullable)
- destinatario (text, nullable)
- data_protocolo (timestamp)
- recebido_por (uuid, FK profiles, nullable)
- observacoes (text, nullable)
- created_at (timestamp)
```

**templates_documentos**
```
- id (uuid, PK)
- escritorio_id (uuid, FK)
- nome (text)
- categoria (text)
- tipo_documento (text)
- conteudo_template (text) - com variáveis {{nome}}, {{cpf}}, etc
- variaveis (jsonb) - lista de variáveis e tipos
- instrucoes_ia (text, nullable) - para geração via IA
- formato (text: 'docx', 'pdf')
- arquivo_template_url (text, nullable)
- publico (boolean)
- criado_por (uuid, FK profiles)
- uso_count (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

**documentos_acessos**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- user_id (uuid, FK profiles, nullable)
- ip_address (text, nullable)
- acao (text: 'visualizou', 'baixou', 'editou', 'compartilhou')
- created_at (timestamp)
```

**documentos_anotacoes**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- user_id (uuid, FK profiles)
- pagina (integer, nullable)
- posicao (jsonb, nullable) - coordenadas se anotação em local específico
- tipo (text: 'comentario', 'destaque', 'marcacao')
- conteudo (text)
- cor (text, nullable)
- created_at (timestamp)
```

**documentos_permissoes**
```
- id (uuid, PK)
- documento_id (uuid, FK documentos)
- user_id (uuid, FK profiles, nullable)
- grupo (text, nullable) - 'todos', 'advogados', 'admins'
- permissoes (text[]) - 'view', 'download', 'edit', 'delete', 'share'
- created_at (timestamp)
```

**documentos_duplicatas**
```
- id (uuid, PK)
- documento_original_id (uuid, FK documentos)
- documento_duplicata_id (uuid, FK documentos)
- similaridade (numeric)
- status (text: 'potencial', 'confirmado', 'nao_duplicata')
- created_at (timestamp)
```

### Views

**v_documentos_recentes**
```
Documentos acessados recentemente
Por usuário
Com informações de cliente/processo
```

**v_documentos_pendentes_assinatura**
```
Documentos com assinaturas pendentes
Agrupados por urgência
```

**v_documentos_compartilhados_ativos**
```
Compartilhamentos ativos (não expirados)
Com estatísticas de acesso
```

**v_biblioteca_organizada**
```
Visão hierárquica da biblioteca
Com contadores por pasta
```

### Functions

**upload_documento(dados jsonb, arquivo bytea)**
- Faz upload para storage
- Cria registro em documentos
- Executa OCR se necessário
- Extrai metadados via IA
- Detecta duplicatas
- Aplica permissões padrão
- Retorna documento criado

**classificar_documento_ia(documento_id uuid)**
- Lê conteúdo do documento
- Identifica tipo/categoria via IA
- Extrai metadados relevantes
- Sugere tags
- Tenta vincular a cliente/processo
- Atualiza documento
- Retorna classificação

**gerar_documento_template(template_id uuid, variaveis jsonb)**
- Busca template
- Preenche variáveis
- Gera documento (docx/pdf)
- Salva em biblioteca
- Retorna documento gerado

**criar_nova_versao(documento_id uuid, arquivo bytea, comentario text)**
- Marca versão atual como não atual
- Cria novo documento com versao_numero++
- Salva versão antiga em documentos_versoes
- Retorna nova versão

**compartilhar_documento(documento_id uuid, config jsonb)**
- Cria registro de compartilhamento
- Gera link se necessário
- Configura permissões
- Envia notificações
- Retorna link/confirmação

**buscar_documentos(query text, filtros jsonb)**
- Busca full-text em nomes e descrições
- Busca em ocr_texto
- Busca semântica via IA
- Aplica filtros
- Ordena por relevância
- Retorna documentos

**extrair_dados_documento_ia(documento_id uuid)**
- Lê documento
- Identifica entidades (pessoas, datas, valores)
- Extrai informações estruturadas
- Salva em metadata_extraido
- Retorna dados extraídos

**detectar_duplicatas(documento_id uuid)**
- Compara hash do arquivo
- Compara conteúdo via similaridade
- Identifica duplicatas potenciais
- Registra em documentos_duplicatas
- Retorna lista de duplicatas

**solicitar_assinatura(documento_id uuid, signatarios jsonb, plataforma text)**
- Cria registro de assinatura
- Envia para plataforma externa (se aplicável)
- Notifica signatários
- Rastreia status
- Retorna confirmação

### Triggers

**documento_uploaded**
- Após upload
- Agenda OCR se PDF/imagem
- Agenda classificação via IA
- Detecta duplicatas

**documento_accessed**
- Quando documento é acessado
- Registra em documentos_acessos
- Atualiza contador de visualizações

**documento_versioned**
- Ao criar nova versão
- Arquiva versão anterior
- Mantém histórico
- Notifica usuários com permissão

**pasta_deleted**
- Ao excluir pasta
- Move documentos para pasta pai ou raiz
- Ou exclui em cascata se configurado

### Scheduled Functions

**processar_ocr_pendentes**
- Roda a cada 30 minutos
- Busca documentos com ocr_processado = false
- Executa OCR
- Atualiza documentos

**classificar_documentos_pendentes**
- Roda a cada hora
- Documentos sem categoria ou metadata
- Executa classificação via IA
- Atualiza documentos

**detectar_duplicatas_bulk**
- Roda diariamente à noite
- Compara documentos recentes
- Identifica duplicatas
- Notifica responsáveis

**limpar_compartilhamentos_expirados**
- Roda diariamente
- Desativa compartilhamentos expirados
- Limpa links temporários

**sincronizar_assinaturas**
- Roda a cada 30 minutos
- Verifica status em plataformas externas
- Atualiza registros
- Baixa documentos assinados
- Notifica conclusões

**arquivar_documentos_antigos**
- Roda mensalmente
- Documentos > 5 anos (configurável)
- Move para storage de arquivo
- Mantém metadados

### RLS

- Usuários veem documentos do próprio escritório
- Respeitam permissões granulares por documento
- Podem ver documentos em pastas compartilhadas
- Podem ver documentos de processos/clientes que têm acesso
- Documentos confidenciais apenas para quem tem permissão explícita
- Admins têm acesso total
- Clientes externos veem apenas documentos compartilhados com eles
