export type FlowType =
  | 'read_simple'
  | 'read_ambiguous'
  | 'create'
  | 'update'
  | 'delete'
  | 'navigate'
  | 'unsupported'
  | 'unknown'
  | 'agentic'

export type SupportedOperation =
  | 'count_pending_publications'
  | 'list_pending_publications'
  | 'list_deadlines_today'
  | 'list_tasks_today'
  | 'list_hearings_week'
  | 'list_case_tasks'
  | 'list_case_hearings'
  | 'list_case_agenda'
  | 'list_timesheet_month'
  | 'create_task'
  | 'reschedule_task'
  | 'check_consultivo_by_client'
  | 'create_consultivo'
  | 'navigate'
  | 'unsupported'

export interface IntentResult {
  flowType: FlowType
  operation: SupportedOperation
  confidence: number
  processRef?: string
  consultivoRef?: string
  clientName?: string
  targetDateText?: string
  wantsOfficeScope?: boolean
  wantsCurrentUserScope?: boolean
}

function normalizeIntentText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractProcessRef(message: string): string | undefined {
  const cnj = message.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/)
  if (cnj) return cnj[0]

  const pasta = message.match(/\bpasta\s+([a-z0-9\-./]+)/i)
  if (pasta) return pasta[1]

  const proc = message.match(/\bproc[-\s]?(\d{1,5})\b/i)
  if (proc) return proc[1]

  return undefined
}

function extractClientName(message: string): string | undefined {
  const cliente = message.match(/cliente\s+([\p{L}0-9\s.'-]+)/iu)
  if (cliente) return cliente[1].trim()
  return undefined
}

export function classifyIntent(message: string): IntentResult {
  const normalized = normalizeIntentText(message)
  const processRef = extractProcessRef(message)
  const clientName = extractClientName(message)
  const wantsCurrentUserScope = /\b(minhas|meus|minha|eu)\b/.test(normalized)
  const wantsOfficeScope = /\b(escritorio|equipe)\b/.test(normalized)

  if (/\b(ir para|abrir tela|navegar|abrir pagina)\b/.test(normalized)) {
    return {
      flowType: 'navigate',
      operation: 'navigate',
      confidence: 0.9,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (/\b(excluir|apagar|remover|deletar)\b/.test(normalized)) {
    return {
      flowType: 'delete',
      operation: 'unsupported',
      confidence: 0.7,
      processRef,
      clientName,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (/\b(reagendar|alterar data|mudar data)\b/.test(normalized)) {
    return {
      flowType: 'update',
      operation: 'reschedule_task',
      confidence: 0.9,
      targetDateText: normalized.includes('amanh') ? 'amanha' : undefined,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (/\b(criar|cadastrar|abrir|registrar|agendar|nova|novo)\b/.test(normalized)) {
    if (/\b(tarefa|tarefas)\b/.test(normalized)) {
      return {
        flowType: 'create',
        operation: 'create_task',
        confidence: 0.95,
        processRef,
        wantsCurrentUserScope,
        wantsOfficeScope,
      }
    }

    if (/\b(pasta consultiva|consultiv[oa]|consulta)\b/.test(normalized)) {
      return {
        flowType: 'create',
        operation: 'create_consultivo',
        confidence: 0.9,
        clientName,
        wantsCurrentUserScope,
        wantsOfficeScope,
      }
    }
  }

  if (/\bquantas\b/.test(normalized) && /\bpublicac(?:ao|oes)\b/.test(normalized) && /\bpendentes?\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'count_pending_publications',
      confidence: 0.98,
      wantsCurrentUserScope,
      wantsOfficeScope: true,
    }
  }

  if (/\bpublicac(?:ao|oes)\b/.test(normalized) && /\bpendentes?\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'list_pending_publications',
      confidence: 0.92,
      wantsCurrentUserScope,
      wantsOfficeScope: true,
    }
  }

  if ((/\b(prazo|prazos)\b/.test(normalized) || /\bvenc(imento|imentos|e|em)\b/.test(normalized)) && /\b(hoje|dia)\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'list_deadlines_today',
      confidence: 0.95,
      wantsCurrentUserScope: wantsCurrentUserScope || !wantsOfficeScope,
      wantsOfficeScope,
    }
  }

  if (/\b(tarefas?)\b/.test(normalized) && /\b(hoje|dia)\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'list_tasks_today',
      confidence: 0.96,
      wantsCurrentUserScope: wantsCurrentUserScope || !wantsOfficeScope,
      wantsOfficeScope,
    }
  }

  if (/\b(audiencias?)\b/.test(normalized) && /\b(semana|marcad|proxim)\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'list_hearings_week',
      confidence: 0.92,
      wantsCurrentUserScope: wantsCurrentUserScope || !wantsOfficeScope,
      wantsOfficeScope,
    }
  }

  if (/\b(horas?|timesheet)\b/.test(normalized) && /\bmes\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'list_timesheet_month',
      confidence: 0.9,
      wantsCurrentUserScope: true,
      wantsOfficeScope: false,
    }
  }

  if (/\b(tem pasta consultiva|possui pasta consultiva|pasta consultiva aberta)\b/.test(normalized)) {
    return {
      flowType: 'read_simple',
      operation: 'check_consultivo_by_client',
      confidence: 0.85,
      clientName,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(tarefas?)\b/.test(normalized)) {
    return {
      flowType: 'read_ambiguous',
      operation: 'list_case_tasks',
      confidence: 0.9,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(audiencias?)\b/.test(normalized)) {
    return {
      flowType: 'read_ambiguous',
      operation: 'list_case_hearings',
      confidence: 0.9,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(agenda|agendamentos|compromissos)\b/.test(normalized)) {
    return {
      flowType: 'read_ambiguous',
      operation: 'list_case_agenda',
      confidence: 0.88,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  return {
    flowType: 'unsupported',
    operation: 'unsupported',
    confidence: 0.2,
    processRef,
    clientName,
    wantsCurrentUserScope,
    wantsOfficeScope,
  }
}
