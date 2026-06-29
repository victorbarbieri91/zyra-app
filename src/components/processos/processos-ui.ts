// Helpers visuais da Página Inicial de Processos (redesign V4).
// Cores fiéis ao design (Claude Design · ProcessosLista.jsx). Classes Tailwind
// literais p/ o JIT; dark via rgba/hex em bracket. Dots/avatars via hex inline.

import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'

export type AbaProc = 'ativos' | 'meus' | 'arquivados'
export type SortKey = 'pasta' | 'cliente' | 'contraria' | 'mov'
export type SortDir = 'asc' | 'desc'

export interface ProcessoLinha {
  id: string
  numero_pasta: string | null
  numero_cnj: string | null
  cliente_nome: string | null
  parte_contraria: string | null
  area: string | null
  status: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  ultima_movimentacao: string | null
  ultima_mov_descricao: string | null
  ultima_mov_tipo: string | null
}

// status do processo encerrado (aba "Arquivados")
export const STATUS_ENCERRADOS = ['arquivado', 'baixado', 'transito_julgado', 'acordo'] as const

// ---- ÁREA ----
export function areaLabel(area?: string | null): string {
  if (!area) return '—'
  return AREA_JURIDICA_LABELS[area as keyof typeof AREA_JURIDICA_LABELS] || area
}

// classes do chip de área (fundo + texto, light/dark) — paleta do design
export function areaChipClass(area?: string | null): string {
  switch (area) {
    case 'civel':          return 'bg-[#edf1f7] text-[#415a7e] dark:bg-[rgba(70,98,127,0.18)] dark:text-[#9eb1cc]'
    case 'trabalhista':    return 'bg-[#f7f0e7] text-[#8a6438] dark:bg-[rgba(194,149,107,0.15)] dark:text-[#d6a87a]'
    case 'tributario':     return 'bg-[#e8f5f5] text-[#3f7376] dark:bg-[rgba(137,188,190,0.15)] dark:text-[#9fc7c9]'
    case 'familia':        return 'bg-[#f3eaf3] text-[#7a4d83] dark:bg-[rgba(181,142,194,0.15)] dark:text-[#c7a8d2]'
    case 'previdenciario': return 'bg-[#eef5f1] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.15)] dark:text-[#8db8a0]'
    case 'criminal':       return 'bg-[#f9ebe6] text-[#a85a3e] dark:bg-[rgba(181,106,106,0.15)] dark:text-[#c98080]'
    default:               return 'bg-[#f1ede2] text-[#5a6775] dark:bg-[rgba(123,134,147,0.16)] dark:text-[#9aa1a8]'
  }
}

// ---- STATUS ----
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', suspenso: 'Suspenso', arquivado: 'Arquivado',
  baixado: 'Baixado', transito_julgado: 'Transitado', acordo: 'Acordo',
}
export function statusLabel(status?: string | null): string {
  if (!status) return '—'
  return STATUS_LABEL[status] || status
}
// cor do dot (hex; funciona em light/dark)
export function statusDot(status?: string | null): string {
  switch (status) {
    case 'ativo':            return '#89bcbe'
    case 'suspenso':         return '#bfb09b'
    case 'acordo':           return '#6b9e84'
    case 'transito_julgado': return '#46627f'
    default:                 return '#9aa1a8' // arquivado / baixado
  }
}
// classe de texto colorido do status (para o card de recente)
export function statusFgClass(status?: string | null): string {
  switch (status) {
    case 'ativo':            return 'text-[#3f7376] dark:text-[#9fc7c9]'
    case 'suspenso':         return 'text-[#8a8470] dark:text-[#94a3b8]'
    case 'acordo':           return 'text-[#3f6a54] dark:text-[#8db8a0]'
    case 'transito_julgado': return 'text-[#415a7e] dark:text-[#9eb1cc]'
    default:                 return 'text-[#64748b] dark:text-[#9aa1a8]'
  }
}

// ---- AVATAR ----
export function getInitials(nome?: string | null): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
const AV_COLORS = ['#34495e', '#3f7376', '#8a6438', '#6b9e84', '#7a4d83', '#46627f', '#a85a3e', '#5a7a4a']
export function avatarColor(seed?: string | null): string {
  if (!seed) return '#9aa1a8'
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}

// ---- VALOR ----
export function valorFmt(v?: number | null): string {
  if (!v) return '—'
  if (v >= 1000000) return 'R$ ' + (v / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi'
  if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + ' mil'
  return 'R$ ' + v
}

// ---- DATAS ----
// "Última movimentação" relativa (há Xh / ontem / dd/MM/yyyy)
export function formatUltMov(iso?: string | null): string {
  if (!iso) return 'Sem movimentações'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const h = Math.floor((Date.now() - date.getTime()) / 3600000)
  if (h < 1) return 'agora'
  if (h < 24) return `há ${h}h`
  if (h < 48) return 'ontem'
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} dias`
  return date.toLocaleDateString('pt-BR')
}

// "visto hoje / ontem / há Xd" (tempo desde o último acesso do usuário)
export function vistoHa(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const h = Math.floor((Date.now() - date.getTime()) / 3600000)
  if (h < 24) return 'visto hoje'
  const d = Math.floor(h / 24)
  if (d === 1) return 'visto ontem'
  if (d < 30) return `visto há ${d}d`
  return 'visto há +30d'
}
