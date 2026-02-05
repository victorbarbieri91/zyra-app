# Módulo: Processos

> Gerado automaticamente em: 2026-02-05
> Tabelas: 7

## Descrição
Processos judiciais e movimentações

---

## Tabelas

### processos_jurisprudencias

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| processo_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| tribunal | text | Sim | - |
| tipo | text | Não | - |
| numero_acordao | text | Não | - |
| numero_processo | text | Não | - |
| data_julgamento | date | Não | - |
| data_publicacao | date | Não | - |
| orgao_julgador | text | Não | - |
| relator | text | Não | - |
| ementa | text | Sim | - |
| decisao | text | Não | - |
| texto_completo | text | Não | - |
| resultado | text | Não | - |
| relevancia | text | Não | media::text |
| similaridade_score | numeric | Não | - |
| teses_aplicadas | _text[] | Não | - |
| temas_relacionados | _text[] | Não | - |
| aplicada_em_peca | boolean | Não | false |
| peca_id | uuid | Não | - |
| citada_em_analise | boolean | Não | false |
| link_inteiro_teor | text | Não | - |
| link_consulta | text | Não | - |
| tags | _text[] | Não | - |
| observacoes | text | Não | - |
| metadata | jsonb | Não | - |
| fonte | text | Não | manual::text |
| adicionado_por | uuid | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['acordao'::text, 'sumula'::text, 'tema_repetitivo'::text, 'incidente_rg'::text])
- `resultado`: resultado = ANY (ARRAY['favoravel'::text, 'desfavoravel'::text, 'parcial'::text, 'neutro'::text])
- `relevancia`: relevancia = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text])
- `fonte`: fonte = ANY (ARRAY['manual'::text, 'ia'::text, 'importacao'::text, 'api'::text])

---

### processos_estrategia

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| processo_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| resumo_caso | text | Não | - |
| objetivo_principal | text | Não | - |
| pontos_fortes | jsonb | Não | - |
| pontos_fracos | jsonb | Não | - |
| oportunidades | jsonb | Não | - |
| ameacas | jsonb | Não | - |
| teses_principais | _text[] | Não | - |
| teses_subsidiarias | _text[] | Não | - |
| fundamentos_legais | _text[] | Não | - |
| estrategia_texto | text | Não | - |
| proximos_passos | jsonb | Não | - |
| documentos_necessarios | jsonb | Não | - |
| provas_a_produzir | jsonb | Não | - |
| riscos_identificados | jsonb | Não | - |
| plano_contingencia | text | Não | - |
| possibilidade_acordo | boolean | Não | - |
| parametros_acordo | jsonb | Não | - |
| versao | integer | Não | 1 |
| versao_anterior_id | uuid | Não | - |
| is_versao_atual | boolean | Não | true |
| elaborado_por | uuid | Não | - |
| revisado_por | uuid | Não | - |
| data_revisao | timestamp with time zone | Não | - |
| aprovado | boolean | Não | false |
| data_aprovacao | timestamp with time zone | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |

---

### processos_processos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| escritorio_id | uuid | Sim | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |
| numero_cnj | text | Não | - |
| numero_pasta | text | Não | - |
| tipo | text | Sim | - |
| area | area_juridica_enum | Sim | - |
| fase | text | Não | - |
| instancia | text | Não | - |
| rito | text | Não | - |
| tribunal | text | Não | - |
| comarca | text | Não | - |
| vara | text | Não | - |
| data_distribuicao | date | Sim | - |
| cliente_id | uuid | Sim | - |
| polo_cliente | text | Sim | - |
| parte_contraria | text | Não | - |
| responsavel_id | uuid | Sim | - |
| colaboradores_ids | _uuid[] | Não | - |
| status | text | Sim | ativo::text |
| valor_causa | numeric | Não | - |
| valor_acordo | numeric | Não | - |
| valor_condenacao | numeric | Não | - |
| provisao_sugerida | numeric | Não | - |
| objeto_acao | text | Não | - |
| observacoes | text | Não | - |
| tags | _text[] | Não | - |
| data_transito_julgado | date | Não | - |
| data_arquivamento | date | Não | - |
| link_tribunal | text | Não | - |
| uf | text | Não | - |
| autor | text | Não | - |
| reu | text | Não | - |
| valor_atualizado | numeric | Não | - |
| contrato_id | uuid | Não | - |
| modalidade_cobranca | text | Não | - |
| outros_numeros | jsonb | Não | []::jsonb |
| escavador_monitoramento_id | integer | Não | - |
| consultivo_origem_id | uuid | Não | - |
| indice_correcao | text | Não | INPC::text |
| data_ultima_atualizacao_monetaria | date | Não | - |
| provisao_perda | text | Não | - |

**Notas**:
- `numero_cnj`: Número CNJ do processo judicial. Opcional para processos administrativos.
- `cliente_id`: FK para crm_pessoas - cliente do escritório neste processo
- `polo_cliente`: Polo do cliente: ativo (autor) ou passivo (réu)
- `parte_contraria`: Nome da parte contrária (texto livre)
- `link_tribunal`: URL para acesso direto ao processo no site do tribunal
- `uf`: Unidade federativa (estado) do processo - 2 letras
- `autor`: Nome do autor do processo
- `reu`: Nome do réu do processo
- `valor_atualizado`: Valor atualizado do processo
- `contrato_id`: Contrato de honorários vinculado a este processo. Permite cobrança automática baseada nas regras do contrato.
- `outros_numeros`: Números alternativos do processo (ex: número administrativo, INSS, etc). 
Formato: [{"tipo": "Administrativo", "numero": "123/2024/INSS"}]
- `escavador_monitoramento_id`: ID do monitoramento no Escavador API para acompanhamento de movimentacoes
- `consultivo_origem_id`: ID da pasta consultiva que originou este processo. Permite rastrear a conversão consultivo → contencioso.
- `provisao_perda`: Classificação do risco de perda: remota, possivel, provavel

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['judicial'::text, 'administrativo'::text, 'arbitragem'::text])
- `fase`: fase = ANY (ARRAY['conhecimento'::text, 'recurso'::text, 'execucao'::text, 'cumprimento_sentenca'::text])
- `instancia`: instancia = ANY (ARRAY['1a'::text, '2a'::text, '3a'::text, 'stj'::text, 'stf'::text, 'tst'::text, 'administrativa'::text])
- `rito`: rito = ANY (ARRAY['ordinario'::text, 'sumario'::text, 'especial'::text, 'sumarissimo'::text])
- `polo_cliente`: polo_cliente = ANY (ARRAY['ativo'::text, 'passivo'::text, 'terceiro'::text])
- `status`: status = ANY (ARRAY['ativo'::text, 'suspenso'::text, 'arquivado'::text, 'baixado'::text, 'transito_julgado'::text, 'acordo'::text])
- `modalidade_cobranca`: modalidade_cobranca IS NULL OR (modalidade_cobranca = ANY (ARRAY['fixo'::text, 'por_hora'::text, 'por_etapa'::text, 'misto'::text, 'por_pasta'::text, 'por_ato'::text, 'por_cargo'::text]))
- `provisao_perda`: provisao_perda = ANY (ARRAY['remota'::text, 'possivel'::text, 'provavel'::text])

---

### processos_movimentacoes

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| processo_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| data_movimento | timestamp with time zone | Sim | - |
| tipo_codigo | text | Não | - |
| tipo_descricao | text | Não | - |
| descricao | text | Sim | - |
| conteudo_completo | text | Não | - |
| origem | text | Sim | manual::text |
| importante | boolean | Não | false |
| lida | boolean | Não | false |
| lida_por | uuid | Não | - |
| lida_em | timestamp with time zone | Não | - |
| comentarios | text | Não | - |
| created_at | timestamp with time zone | Não | now() |

**Constraints**:
- `origem`: origem = ANY (ARRAY['tribunal'::text, 'manual'::text, 'importacao'::text, 'escavador'::text, 'publicacao_diario'::text, 'sistema'::text])

---

### processos_historico

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| processo_id | uuid | Sim | - |
| acao | text | Sim | - |
| descricao | text | Sim | - |
| campo_alterado | text | Não | - |
| valor_anterior | text | Não | - |
| valor_novo | text | Não | - |
| user_id | uuid | Não | - |
| user_nome | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| escritorio_id | uuid | Sim | - |

**Constraints**:
- `acao`: acao = ANY (ARRAY['criacao'::text, 'edicao'::text, 'arquivamento'::text, 'reativacao'::text, 'adicao_parte'::text, 'remocao_parte'::text, 'adicao_movimentacao'::text, 'mudanca_status'::text, 'mudanca_responsavel'::text, 'outro'::text])

---

### processos_depositos

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | gen_random_uuid() |
| processo_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| tipo | text | Sim | - |
| descricao | text | Não | - |
| valor | numeric | Sim | - |
| data_deposito | date | Sim | - |
| banco | text | Não | - |
| agencia | text | Não | - |
| conta | text | Não | - |
| numero_guia | text | Não | - |
| status | text | Sim | ativo::text |
| data_levantamento | date | Não | - |
| valor_levantado | numeric | Não | - |
| observacoes | text | Não | - |
| created_at | timestamp with time zone | Não | now() |
| updated_at | timestamp with time zone | Não | now() |
| created_by | uuid | Não | - |

**Notas**:
- `tipo`: Tipo do depósito: recursal, embargo, caucao, outro
- `numero_guia`: Número da guia de depósito judicial
- `status`: Status: ativo (aguardando), levantado (sacado), convertido (perdeu), perdido

**Constraints**:
- `tipo`: tipo = ANY (ARRAY['recursal'::text, 'embargo'::text, 'caucao'::text, 'outro'::text])
- `status`: status = ANY (ARRAY['ativo'::text, 'levantado'::text, 'convertido'::text, 'perdido'::text])

---

### processos_equipe

| Coluna | Tipo | Obrigatório | Default |
|--------|------|-------------|---------|
| id | uuid | Sim | uuid_generate_v4() |
| processo_id | uuid | Sim | - |
| user_id | uuid | Sim | - |
| escritorio_id | uuid | Sim | - |
| papel | text | Sim | - |
| pode_editar | boolean | Não | false |
| pode_visualizar | boolean | Não | true |
| recebe_notificacoes | boolean | Não | true |
| adicionado_em | timestamp with time zone | Não | now() |
| adicionado_por | uuid | Não | - |

**Constraints**:
- `papel`: papel = ANY (ARRAY['responsavel'::text, 'co_responsavel'::text, 'assistente'::text, 'estagiario'::text, 'consultor'::text])

---

