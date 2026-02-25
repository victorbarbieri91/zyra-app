# Glossário Jurídico — Termos do Sistema

> Termos comuns que o usuário pode usar e o que significam no contexto do sistema.

## Termos Jurídicos

- **CNJ**: Conselho Nacional de Justiça. Número CNJ = identificador único do processo judicial (formato: NNNNNNN-DD.AAAA.J.TR.OOOO)
- **Autor**: parte que move a ação judicial (quem processou)
- **Réu**: parte contra quem a ação foi movida (quem está sendo processado)
- **Polo ativo**: lado do autor. Polo passivo: lado do réu. Terceiro: interveniente.
- **Audiência**: sessão presencial ou virtual no tribunal. Tipos: conciliação, instrução, julgamento
- **Prazo processual**: deadline legal para atos no processo — perder prazo é gravíssimo
- **Trânsito em julgado**: quando a decisão judicial se torna definitiva (sem mais recursos)
- **Comarca**: jurisdição territorial onde o processo tramita
- **Vara**: unidade judiciária dentro da comarca (ex: 5ª Vara Cível)
- **Tribunal**: instância superior (TJ, TRF, TRT, TST, STJ, STF)
- **Movimentação**: qualquer ato processual registrado (despacho, decisão, petição, etc.)
- **Distribuição**: data em que o processo foi registrado na justiça

## Termos Financeiros

- **Timesheet**: registro de horas trabalhadas por advogado em um caso
- **Honorários**: valores cobrados pelo trabalho jurídico
- **Faturamento**: processo de gerar faturas para clientes baseado em timesheet e honorários
- **Pro bono**: trabalho jurídico gratuito (sem cobrança)
- **Provisão de perda**: estimativa de risco financeiro do processo (remota, possível, provável)

## Termos do Sistema

- **Escritório**: entidade principal de multitenancy — cada escritório de advocacia tem seus dados isolados
- **Profile**: usuário/advogado do sistema, membro do escritório
- **CRM Pessoa**: cliente ou contato externo cadastrado no CRM
- **Responsável**: advogado designado para cuidar de um caso/tarefa (referencia profiles.id)
- **Centro de Comando**: interface de chat com IA (este agente)
- **Pasta digital**: conjunto de documentos vinculados a um processo

## Mapeamento de Linguagem Natural → Tabela

- "meus processos" / "meus casos" → processos_processos WHERE responsavel_id = user_id
- "minhas tarefas" / "meus prazos" → agenda_tarefas WHERE responsavel_id = user_id OR user_id = ANY(responsaveis_ids)
- "minhas horas" / "meu timesheet" → financeiro_timesheet WHERE user_id = user_id
- "minha agenda" → v_agenda_consolidada (view unificada)
- "cliente fulano" → crm_pessoas WHERE nome_completo ILIKE '%fulano%'
- "advogado fulano" / "Dr. fulano" → profiles WHERE nome_completo ILIKE '%fulano%'
- "processo número..." → processos_processos WHERE numero_cnj ILIKE '%numero%'
- "tarefas vencidas" → agenda_tarefas WHERE prazo_data_limite < CURRENT_DATE AND status IN ('pendente','em_andamento')
- "tarefas de hoje" → agenda_tarefas WHERE data_inicio = CURRENT_DATE OR prazo_data_limite = CURRENT_DATE
- "audiências da semana" → agenda_audiencias WHERE data_hora BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
