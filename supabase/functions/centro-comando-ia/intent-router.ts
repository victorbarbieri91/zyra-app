export type FlowType =
  | 'read_simple'
  | 'read_ambiguous'
  | 'create'
  | 'update'
  | 'delete'
  | 'navigate'
  | 'unsupported'
  | 'unknown'

export type SupportedOperation =
  | 'count_pending_publications'
  | 'list_pending_publications'
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
  const cliente = message.match(/cliente\s+([a-z0-9\s.'-]+)/i)
  if (cliente) return cliente[1].trim()
  return undefined
}

export function classifyIntent(message: string): IntentResult {
  const normalized = message.toLowerCase()
  const processRef = extractProcessRef(message)
  const clientName = extractClientName(message)
  const wantsCurrentUserScope = /\b(minhas|meus|minha|eu)\b/i.test(message)
  const wantsOfficeScope = /\b(escrit[oó]rio|equipe)\b/i.test(message)

  if (/\b(ir para|abrir tela|navegar|abrir p[aá]gina)\b/i.test(message)) {
    return {
      flowType: 'navigate',
      operation: 'navigate',
      confidence: 0.9,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (/\b(excluir|apagar|remover|deletar)\b/i.test(message)) {
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

  if (/\b(reagendar|alterar data|mudar data)\b/i.test(message)) {
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

  if (/\b(criar|cadastrar|abrir|registrar|agendar|nova|novo)\b/i.test(message)) {
    if (/\b(tarefa|tarefas)\b/i.test(message)) {
      return {
        flowType: 'create',
        operation: 'create_task',
        confidence: 0.95,
        processRef,
        wantsCurrentUserScope,
        wantsOfficeScope,
      }
    }

    if (/\b(pasta consultiva|consultiv[oa]|consulta)\b/i.test(message)) {
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

  if (/\bquantas\b/i.test(message) && /\bpublica[cç][oõ]es\b/i.test(message) && /\bpendentes?\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'count_pending_publications',
      confidence: 0.98,
      wantsCurrentUserScope,
      wantsOfficeScope: true,
    }
  }

  if (/\bpublica[cç][oõ]es\b/i.test(message) && /\bpendentes?\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'list_pending_publications',
      confidence: 0.92,
      wantsCurrentUserScope,
      wantsOfficeScope: true,
    }
  }

  if (/\b(tarefas?)\b/i.test(message) && /\b(hoje|dia)\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'list_tasks_today',
      confidence: 0.96,
      wantsCurrentUserScope: wantsCurrentUserScope || !wantsOfficeScope,
      wantsOfficeScope,
    }
  }

  if (/\b(audi[eê]ncias?)\b/i.test(message) && /\b(semana|marcad|pr[oó]xim)\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'list_hearings_week',
      confidence: 0.92,
      wantsCurrentUserScope: wantsCurrentUserScope || !wantsOfficeScope,
      wantsOfficeScope,
    }
  }

  if (/\b(horas?|timesheet)\b/i.test(message) && /\b(m[eê]s|mes)\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'list_timesheet_month',
      confidence: 0.9,
      wantsCurrentUserScope: true,
      wantsOfficeScope: false,
    }
  }

  if (/\b(tem pasta consultiva|possui pasta consultiva|pasta consultiva aberta)\b/i.test(message)) {
    return {
      flowType: 'read_simple',
      operation: 'check_consultivo_by_client',
      confidence: 0.85,
      clientName,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(tarefas?)\b/i.test(message)) {
    return {
      flowType: 'read_ambiguous',
      operation: 'list_case_tasks',
      confidence: 0.9,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(audi[eê]ncias?)\b/i.test(message)) {
    return {
      flowType: 'read_ambiguous',
      operation: 'list_case_hearings',
      confidence: 0.9,
      processRef,
      wantsCurrentUserScope,
      wantsOfficeScope,
    }
  }

  if (processRef && /\b(agenda|agendamentos|compromissos)\b/i.test(message)) {
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
