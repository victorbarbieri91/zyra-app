# Erros Comuns e Como Evitá-los

> Problemas frequentes que o agente deve evitar.

## Erro: UUID inventado

**Problema**: O agente inventa um UUID para responsavel_id, cliente_id, processo_id.
**Consequência**: INSERT falha com foreign key violation.
**Solução**: SEMPRE buscar o UUID via consultar_dados antes de usar em INSERT/UPDATE.
- Responsável: `SELECT id FROM profiles WHERE escritorio_id = '...' AND nome_completo ILIKE '%nome%'`
- Cliente: `SELECT id FROM crm_pessoas WHERE escritorio_id = '...' AND nome_completo ILIKE '%nome%'`
- Processo: `SELECT id FROM processos_processos WHERE escritorio_id = '...' AND numero_cnj ILIKE '%numero%'`

## Erro: Valor inválido em campo com CHECK constraint

**Problema**: O agente usa um valor que não está nos valores permitidos (ex: tipo='reunião' em agenda_tarefas quando o CHECK aceita apenas 'prazo_processual', 'acompanhamento', etc.)
**Consequência**: INSERT falha com check constraint violation.
**Solução**: Chamar `descobrir_estrutura` ANTES do INSERT para ver os valores válidos. Se o INSERT falhar, chamar descobrir_estrutura e corrigir.

## Erro: Confundir profiles com crm_pessoas

**Problema**: Buscar o advogado responsável em crm_pessoas, ou buscar o cliente em profiles.
**Consequência**: Não encontra o registro ou vincula errado.
**Solução**:
- profiles = advogados/usuários DO ESCRITÓRIO (quem trabalha no sistema)
- crm_pessoas = clientes/contatos EXTERNOS (quem é atendido pelo escritório)
- responsavel_id SEMPRE referencia profiles.id
- cliente_id SEMPRE referencia crm_pessoas.id

## Erro: Tipo de data incorreto

**Problema**: Enviar timestamptz onde o campo espera date, ou vice-versa.
**Consequência**: Erro de tipo ou data interpretada incorretamente.
**Solução**:
- agenda_tarefas.data_inicio = DATE → formato 'YYYY-MM-DD' (sem hora)
- agenda_eventos.data_inicio = TIMESTAMPTZ → formato 'YYYY-MM-DDTHH:MI:SS' (com hora)
- agenda_audiencias.data_hora = TIMESTAMPTZ → formato 'YYYY-MM-DDTHH:MI:SS' (com hora)
- Consultar `descobrir_estrutura` em caso de dúvida

## Erro: SELECT * (selecionar todas as colunas)

**Problema**: Retornar todas as colunas incluindo UUIDs, campos internos, timestamps.
**Consequência**: Resposta poluída com dados irrelevantes para o usuário.
**Solução**: SEMPRE selecionar apenas colunas relevantes + JOIN com profiles para nomes.

## Erro: Esquecer escritorio_id no WHERE

**Problema**: Query sem filtro de escritório.
**Consequência**: RLS bloqueia ou retorna dados vazios.
**Solução**: TODA query DEVE ter `WHERE escritorio_id = '{escritorio_id}'`

## Erro: Tentar INSERT/UPDATE em views

**Problema**: Tentar modificar v_agenda_consolidada, v_processos_dashboard, etc.
**Consequência**: Erro — views são somente leitura.
**Solução**: Views são apenas para SELECT. Para modificar, usar a tabela base (agenda_tarefas, processos_processos, etc.)

## Erro: Enviar campos automáticos no INSERT

**Problema**: Incluir id, escritorio_id, created_at, updated_at, criado_por nos dados do INSERT.
**Consequência**: Conflito com valores gerados automaticamente pelo banco.
**Solução**: Campos com `auto=true` na descobrir_estrutura são preenchidos automaticamente. NÃO enviar.

## Erro: Loop de confirmação

**Problema**: Após o usuário dizer "Sim" ou confirmar, perguntar novamente em vez de executar.
**Consequência**: Frustração do usuário com loop infinito.
**Solução**: Se o usuário confirmou (Sim, confirmar, pode fazer, aplica) → EXECUTAR imediatamente via preparar_cadastro/preparar_alteracao. NUNCA usar pedir_informacao para confirmar Sim/Não.

## Autocorreção

Quando um INSERT ou UPDATE falhar:
1. Chamar `descobrir_estrutura` para a tabela
2. Verificar os valores válidos nos constraints_check
3. Verificar os campos obrigatórios
4. Corrigir o valor e tentar novamente
5. Se ainda falhar, informar o usuário do erro específico
