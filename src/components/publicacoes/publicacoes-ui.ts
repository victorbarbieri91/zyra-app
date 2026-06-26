// Helpers visuais do módulo Publicações (redesign V4 — mestre-detalhe).
// Cores fiéis ao design (Claude Design · PublicacoesViews.jsx). As classes são
// strings literais para o JIT do Tailwind gerar; dark via rgba/hex em bracket.

export type StatusPub = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
export type TipoPub = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'
export type StatusDesign = 'pendente' | 'tratada' | 'arquivada'
export type AbaPub = 'pendentes' | 'tratadas' | 'todas' | 'arquivadas'

export interface Publicacao {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: TipoPub
  numero_processo?: string
  processo_id?: string
  processo_autor?: string
  processo_reu?: string
  status: StatusPub
  agendamento_id?: string
  agendamento_tipo?: 'tarefa' | 'compromisso' | 'audiencia'
  hash_conteudo?: string
  duplicata_revisada?: boolean
  is_snippet?: boolean
  updated_at?: string
  created_at?: string
  source?: string
  escritorio_id?: string
  comentarios_count?: number
  partes?: string[] | null
  resumo?: string | null // resumo_executivo da análise (quando houver) — vira snippet da lista
  pdf_url?: string | null
}

// "Autor × Réu" do processo vinculado, ou fallback para itens sem pasta
export function partesLabel(p: Pick<Publicacao, 'processo_autor' | 'processo_reu' | 'partes' | 'numero_processo'>): string {
  if (p.processo_autor || p.processo_reu) {
    return [p.processo_autor, p.processo_reu].filter(Boolean).join(' × ')
  }
  if (p.partes && p.partes.length) return p.partes.join(' × ')
  return 'Processo sem pasta vinculada'
}

// processada → "tratada"; em_analise agrupa em "pendente"
export function statusToDesign(s: StatusPub | string): StatusDesign {
  if (s === 'processada') return 'tratada'
  if (s === 'arquivada') return 'arquivada'
  return 'pendente'
}

export function tipoLabel(t: TipoPub | string): string {
  const m: Record<string, string> = {
    intimacao: 'Intimação', sentenca: 'Sentença', despacho: 'Despacho',
    decisao: 'Decisão', acordao: 'Acórdão', citacao: 'Citação', outro: 'Outro',
  }
  return m[t] || 'Outro'
}

// classes do chip de TIPO (fundo + texto, light/dark)
export function tipoChipClass(t: TipoPub | string): string {
  switch (tipoLabel(t)) {
    case 'Acórdão':   return 'bg-[#eaeff6] text-[#3d567a] dark:bg-[rgba(70,98,127,0.20)] dark:text-[#9eb1cc]'
    case 'Sentença':  return 'bg-[#e9f3ed] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.18)] dark:text-[#8db8a0]'
    case 'Despacho':  return 'bg-[#e6f1f1] text-[#3f7376] dark:bg-[rgba(137,188,190,0.16)] dark:text-[#9fc7c9]'
    case 'Decisão':   return 'bg-[#f5ede2] text-[#8a6438] dark:bg-[rgba(194,149,107,0.18)] dark:text-[#d6a87a]'
    case 'Intimação': return 'bg-[#eef0f2] text-[#5a6775] dark:bg-[rgba(123,134,147,0.18)] dark:text-[#aab4c0]'
    default:          return 'bg-[#f0ede6] text-[#7c8693] dark:bg-[rgba(123,134,147,0.16)] dark:text-[#9aa1a8]'
  }
}

export interface StatusUI {
  dot: string
  label: string
  chip: string // classes do chip (fundo + texto)
}
export function statusUI(s: StatusPub | string): StatusUI {
  switch (statusToDesign(s)) {
    case 'tratada':
      return { dot: '#6b9e84', label: 'Tratada', chip: 'bg-[#e9f3ed] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.16)] dark:text-[#8db8a0]' }
    case 'arquivada':
      return { dot: '#9aa1a8', label: 'Arquivada', chip: 'bg-[#f0f0ee] text-[#7c8693] dark:bg-[rgba(123,134,147,0.16)] dark:text-[#9aa1a8]' }
    default:
      return { dot: '#c2956b', label: 'Pendente', chip: 'bg-[#f6efe4] text-[#9a6f3c] dark:bg-[rgba(194,149,107,0.16)] dark:text-[#d6a87a]' }
  }
}

// abreviação do diário/tribunal para o rail (best-effort)
export function tribunalCurto(tribunal?: string | null): string {
  if (!tribunal) return '—'
  const t = tribunal.toLowerCase()
  if (t.includes('federal') && /\b3|terceira/.test(t)) return 'TRF3'
  if (t.includes('federal') && /\b1|primeira/.test(t)) return 'TRF1'
  if (t.includes('federal') && /\b2|segunda/.test(t)) return 'TRF2'
  if (t.includes('superior tribunal de justiça') || t.includes('stj')) return 'STJ'
  if (t.includes('supremo') || t.includes('stf')) return 'STF'
  if (t.includes('trabalho') || t.includes('trt')) return 'TRT'
  if (t.includes('são paulo') || t.includes('sao paulo') || t.includes('tjsp')) return 'TJSP'
  if (t.includes('federal')) return 'JF'
  const m = tribunal.match(/\b([A-ZÀ-Ý])/g)
  return m ? m.slice(0, 4).join('') : tribunal.slice(0, 4).toUpperCase()
}

// cor determinística do avatar a partir de iniciais/nome
const AV_COLORS = ['#4a6fa5', '#6b9e84', '#a8714a', '#7c5e9b', '#3f7376', '#9a5a6f', '#5a7a4a', '#8a6438']
export function avatarColor(seed?: string): string {
  if (!seed) return '#9aa1a8'
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}

export function getInitials(nome?: string): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// formata uma data "yyyy-mm-dd" como "dd/MM/yyyy" (sem shift de timezone)
export function formatDataCurta(dateStr?: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.slice(0, 10).split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
// "25 jun · 08:14" — data da publicação + hora de captura (created_at)
export function formatDataHora(dataPublicacao?: string, createdAt?: string): string {
  if (!dataPublicacao) return ''
  const [y, m, d] = dataPublicacao.slice(0, 10).split('-')
  const mes = MESES_CURTO[parseInt(m, 10) - 1] || m
  let base = `${parseInt(d, 10)} ${mes}`
  if (y) base += ` de ${y}`
  if (createdAt) {
    const dt = new Date(createdAt)
    if (!Number.isNaN(dt.getTime())) {
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      base += ` · ${hh}:${mm}`
    }
  }
  return base
}

// "há X min/h/d" a partir de um ISO timestamp
export function tempoRelativo(iso?: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const h = Math.round(diffMin / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} d`
}
