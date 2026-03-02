const TASK_TYPE_MAP: Record<string, string> = {
  'prazo processual': 'prazo_processual',
  'prazo_processual': 'prazo_processual',
  prazo: 'prazo_processual',
  acompanhamento: 'acompanhamento',
  'follow up': 'follow_up',
  followup: 'follow_up',
  'follow-up': 'follow_up',
  administrativo: 'administrativo',
  outro: 'outro',
  fixa: 'fixa',
}

const PRIORITY_MAP: Record<string, string> = {
  urgente: 'alta',
  alta: 'alta',
  media: 'media',
  média: 'media',
  baixa: 'baixa',
}

const CONSULTIVO_AREAS = new Set([
  'civel',
  'trabalhista',
  'tributaria',
  'tributario',
  'societaria',
  'societario',
  'empresarial',
  'contratual',
  'familia',
  'criminal',
  'previdenciaria',
  'consumidor',
  'ambiental',
  'imobiliario',
  'propriedade_intelectual',
  'compliance',
  'outra',
  'outros',
])

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function normalizeTaskType(value?: string | null): string {
  if (!value) return 'outro'
  const normalized = value.toLowerCase().trim()
  return TASK_TYPE_MAP[normalized] || 'outro'
}

export function normalizePriority(value?: string | null): string {
  if (!value) return 'media'
  const normalized = value.toLowerCase().trim()
  return PRIORITY_MAP[normalized] || 'media'
}

export function normalizeConsultivoArea(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_')
  if (CONSULTIVO_AREAS.has(normalized)) return normalized
  return null
}

export function normalizeDateInput(value?: string | null): string | null {
  if (!value) return null

  const normalized = value.toLowerCase().trim()
  const now = new Date()

  if (normalized === 'hoje') {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }

  if (normalized === 'amanha' || normalized === 'amanhã') {
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const brDate = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
  if (brDate) {
    const day = Number(brDate[1])
    const month = Number(brDate[2])
    const year = brDate[3] ? Number(brDate[3]) : now.getFullYear()
    return `${year}-${pad(month)}-${pad(day)}`
  }

  return null
}

export function buildIdempotencyKey(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(':')
}
