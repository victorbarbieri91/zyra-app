# Workflows do Agente — Passo a Passo

> Regras de negócio para operações comuns no sistema Zyra Legal.
> A estrutura das tabelas (colunas, tipos, constraints) deve ser consultada via tool `descobrir_estrutura`.

## Criar Tarefa

1. Se o usuário menciona um responsável por NOME: consultar_dados → `SELECT id, nome_completo FROM profiles WHERE escritorio_id = '{escritorio_id}' AND nome_completo ILIKE '%nome%'`
2. Se ambíguo (mais de um resultado): perguntar ao usuário qual profile usar
3. Chamar `descobrir_estrutura('agenda_tarefas')` se não consultou nesta sessão — ver campos obrigatórios e valores válidos de tipo/prioridade/status
4. Chamar `preparar_cadastro` com os dados. Campos automáticos (id, escritorio_id, created_at, updated_at, criado_por) NÃO devem ser enviados
5. data_inicio é DATE (YYYY-MM-DD), não timestamptz
6. Se tipo não informado, usar default 'outro'. Se prioridade não informada, usar default 'media'

## Criar Múltiplas Tarefas

- Chamar `preparar_cadastro` UMA VEZ para CADA tarefa (nunca enviar arrays)
- Cada chamada deve ter valores válidos conforme CHECK constraints da tabela
- Se o usuário pede "3 tarefas", fazer 3 chamadas separadas de preparar_cadastro

## Criar Evento ou Audiência

1. Mesma lógica de responsável por nome (buscar UUID em profiles)
2. Consultar `descobrir_estrutura` da tabela correspondente
3. agenda_eventos usa data_inicio/data_fim como TIMESTAMPTZ (inclui hora)
4. agenda_audiencias usa data_hora como TIMESTAMPTZ, tem campo vara e tipo de audiência

## Reagendar Tarefa/Evento

1. Buscar o registro: `consultar_dados` → SELECT com filtro por título ou descrição
2. Chamar `preparar_alteracao` com o UUID do registro e a nova data
3. Para tarefas: data_inicio é DATE (YYYY-MM-DD)
4. Para eventos: data_inicio é TIMESTAMPTZ (inclui hora)

## Concluir/Cancelar Tarefa

1. Buscar a tarefa por título ou contexto
2. Chamar `preparar_alteracao` → alterar status para 'concluida' ou 'cancelada'
3. Se concluindo, pode também alterar data_conclusao para NOW()

## Cadastrar Processo

1. Obter cliente_id: `SELECT id, nome_completo FROM crm_pessoas WHERE escritorio_id = '{escritorio_id}' AND nome_completo ILIKE '%nome%'`
2. Obter responsavel_id: mesma lógica via profiles
3. Consultar `descobrir_estrutura('processos_processos')` para ver campos e constraints
4. Campos obrigatórios: tipo, area, data_distribuicao, cliente_id, polo_cliente, responsavel_id, status
5. autor e reu formam o "título" do caso (CONCAT(autor, ' x ', reu))

## Registrar Timesheet

1. Consultar `descobrir_estrutura('financeiro_timesheet')`
2. Campo data é DATE (YYYY-MM-DD)
3. horas é decimal (ex: 1.5 = 1h30min)
4. user_id é o UUID do advogado (profiles.id), se "meu" usar o user_id da sessão
5. processo_id vincula ao caso (opcional)

## Buscar Dados com Formatação Correta

- SEMPRE JOIN profiles para resolver nomes (nunca mostrar UUIDs)
- Datas: TO_CHAR(campo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
- Valores monetários: TO_CHAR(valor, 'FM999,999,990.00')
- LIMIT 20 por padrão, informar total se houver mais
- v_agenda_consolidada unifica tarefas+eventos+audiências com nome do responsável já resolvido
