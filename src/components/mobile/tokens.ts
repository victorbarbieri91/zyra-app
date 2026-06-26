// tokens.ts — Tokens visuais da versão MOBILE (phone-only) do Zyra.
// Portado fielmente do design (components/MobileShell.jsx · mTokens) do projeto
// Claude Design. NÃO confundir com os tokens do desktop: aqui valem só as telas
// de celular (src/components/mobile/*). Cor sempre vem daqui — nada de hex solto.

export interface MobileTokens {
  page: string
  rail: string
  card: string
  cardAlt: string
  border: string
  borderSubtle: string
  ink: string
  primary: string
  secondary: string
  muted: string
  teal: string
  tealSoft: string
  shadow: string
}

export function mTokens(dark: boolean): MobileTokens {
  return dark
    ? {
        page: '#0b0f14', rail: '#0d1119', card: '#141922', cardAlt: '#10151d',
        border: '#1e2733', borderSubtle: '#161c26',
        ink: '#e8ecf2', primary: '#e8ecf2', secondary: '#8a97a8', muted: '#5a6675',
        teal: '#89bcbe', tealSoft: 'rgba(137,188,190,0.15)',
        shadow: '0 8px 24px -10px rgba(0,0,0,0.6)',
      }
    : {
        page: '#fafaf7', rail: '#f3f0e8', card: '#ffffff', cardAlt: '#faf8f2',
        border: '#ece9e2', borderSubtle: '#f3f1ea',
        ink: '#1a2330', primary: '#2c3e50', secondary: '#5a6775', muted: '#9aa1a8',
        teal: '#6ba9ab', tealSoft: '#e8f5f5',
        shadow: '0 8px 22px -12px rgba(52,73,94,0.22)',
      }
}

// ---------- meta por tipo de item da agenda (cor + rótulo) ----------
export type AgendaKind = 'audiencia' | 'compromisso' | 'tarefa'

export function agendaMeta(type: string, dark: boolean): { c: string; label: string } {
  const map: Record<AgendaKind, { c: string; label: string }> = {
    audiencia: { c: dark ? '#c98080' : '#b56a6a', label: 'Audiência' },
    compromisso: { c: dark ? '#89bcbe' : '#6ba9ab', label: 'Compromisso' },
    tarefa: { c: dark ? '#8ba1c0' : '#6a7a90', label: 'Tarefa' },
  }
  return map[(type as AgendaKind)] || map.tarefa
}

// ---------- meta por "kind" de prioridade/categoria ----------
export function kindMeta(k: string, dark: boolean): { c: string; label: string } {
  const map: Record<string, { c: string; label: string }> = {
    urgente: { c: dark ? '#c98080' : '#b56a6a', label: 'Audiência' },
    cliente: { c: dark ? '#89bcbe' : '#6ba9ab', label: 'Cliente' },
    consultivo: { c: dark ? '#8ba1c0' : '#6a85a8', label: 'Consultivo' },
    interno: { c: dark ? '#7a8696' : '#9aa1a8', label: 'Interno' },
  }
  return map[k] || map.interno
}

// ---------- status de lançamento de horas (faturado/pendente) ----------
export function hsStatus(s: string, dark: boolean): { c: string; bg: string; fg: string } {
  if (s === 'faturado' || s === 'faturada')
    return { c: dark ? '#8db8a0' : '#6b9e84', bg: dark ? 'rgba(107,158,132,0.15)' : '#eef5f1', fg: dark ? '#8db8a0' : '#3f6a54' }
  if (s === 'pendente')
    return { c: dark ? '#d6a87a' : '#c2956b', bg: dark ? 'rgba(194,149,107,0.15)' : '#f7f0e7', fg: dark ? '#d6a87a' : '#8a6438' }
  return { c: dark ? '#5a6675' : '#c0bbad', bg: dark ? 'rgba(148,163,184,0.12)' : '#f1ede2', fg: dark ? '#94a3b8' : '#8a8470' }
}

// ---------- meta de prioridade (Alta/Média/Baixa) — usado em consultivo/tarefas ----------
export function prioMeta(p: string, dark: boolean): { bg: string; fg: string; dot: string; label: string } {
  const key = (p || '').toLowerCase()
  if (key === 'alta' || key === 'urgente')
    return { bg: dark ? 'rgba(194,149,107,0.16)' : '#f7eede', fg: dark ? '#d6a87a' : '#8a6438', dot: '#c2956b', label: 'Alta' }
  if (key === 'media' || key === 'média')
    return { bg: dark ? 'rgba(106,133,168,0.16)' : '#e9eef7', fg: dark ? '#8fb0e6' : '#4a679e', dot: '#6a85c0', label: 'Média' }
  return { bg: dark ? 'rgba(148,163,184,0.12)' : '#eef0f3', fg: dark ? '#a5afbd' : '#5a6775', dot: '#9aa1a8', label: 'Baixa' }
}

// ---------- meta de área do consultivo (fundo + texto do badge) ----------
export function consultivoAreaMeta(area: string, dark: boolean): { bg: string; fg: string } {
  // paleta calma derivada do design; fallback neutro
  const soft = dark ? 'rgba(137,188,190,0.14)' : '#eef3f3'
  const fg = dark ? '#9fc7c9' : '#46627f'
  void area
  return { bg: soft, fg }
}
