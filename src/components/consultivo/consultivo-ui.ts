// Helpers visuais da Home do Consultivo (V4) — gêmeo da home de Processos.
// Classes Tailwind literais (JIT); dark via rgba/hex em bracket; dots/avatars inline.

import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'
import { TIPOS_CONSULTA, type TipoConsulta } from '@/lib/constants/consultivo-tipos'

export type AbaConsultivo = 'ativas' | 'minhas' | 'arquivadas'
export type SortKey = 'num' | 'titulo' | 'cliente' | 'tipo'
export type SortDir = 'asc' | 'desc'

export interface ConsultaLinha {
  id: string
  numero: string | null
  titulo: string
  cliente_nome: string | null
  tipo: string | null
  area: string | null
  status: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
}

// ---- TIPO ----
export function tipoLabel(tipo?: string | null): string {
  if (!tipo) return 'Não classificado'
  return TIPOS_CONSULTA[tipo as TipoConsulta]?.label || 'Não classificado'
}
export function tipoChipClass(tipo?: string | null): string {
  switch (tipo) {
    case 'consulta_simples':          return 'bg-[#e8f5f5] text-[#3f7376] dark:bg-[rgba(137,188,190,0.16)] dark:text-[#9fc7c9]'
    case 'parecer_tecnico':           return 'bg-[#edf1f7] text-[#415a7e] dark:bg-[rgba(70,98,127,0.18)] dark:text-[#9eb1cc]'
    case 'analise_contratual':        return 'bg-[#eef5f1] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.16)] dark:text-[#8db8a0]'
    case 'elaboracao_contrato':       return 'bg-[#f7f0e7] text-[#8a6438] dark:bg-[rgba(194,149,107,0.16)] dark:text-[#d6a87a]'
    case 'due_diligence':             return 'bg-[#f3eaf3] text-[#7a4d83] dark:bg-[rgba(181,142,194,0.15)] dark:text-[#c7a8d2]'
    case 'opiniao_legal':             return 'bg-[#eef2f7] text-[#46627f] dark:bg-[rgba(70,98,127,0.14)] dark:text-[#9eb1cc]'
    case 'notificacao_extrajudicial': return 'bg-[#f9e8e2] text-[#a8492e] dark:bg-[rgba(192,101,74,0.16)] dark:text-[#e0a585]'
    case 'acordo':                    return 'bg-[#eef5f1] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.16)] dark:text-[#8db8a0]'
    case 'assessoria_recorrente':     return 'bg-[#e8f5f5] text-[#3f7376] dark:bg-[rgba(137,188,190,0.16)] dark:text-[#9fc7c9]'
    default:                          return 'bg-[#f0f0ee] text-[#7c8693] dark:bg-[rgba(123,134,147,0.16)] dark:text-[#9aa1a8]'
  }
}

// ---- ÁREA ----
export function areaLabel(area?: string | null): string {
  if (!area) return '—'
  return AREA_JURIDICA_LABELS[area as keyof typeof AREA_JURIDICA_LABELS] || area
}
export function areaChipClass(area?: string | null): string {
  switch (area) {
    case 'tributario':     return 'bg-[#e8f5f5] text-[#3f7376] dark:bg-[rgba(137,188,190,0.15)] dark:text-[#9fc7c9]'
    case 'empresarial':
    case 'civel':          return 'bg-[#edf1f7] text-[#415a7e] dark:bg-[rgba(70,98,127,0.18)] dark:text-[#9eb1cc]'
    case 'contratual':
    case 'previdenciario': return 'bg-[#eef5f1] text-[#3f6a54] dark:bg-[rgba(107,158,132,0.16)] dark:text-[#8db8a0]'
    case 'trabalhista':    return 'bg-[#f7f0e7] text-[#8a6438] dark:bg-[rgba(194,149,107,0.15)] dark:text-[#d6a87a]'
    case 'societario':
    case 'familia':        return 'bg-[#f3eaf3] text-[#7a4d83] dark:bg-[rgba(181,142,194,0.15)] dark:text-[#c7a8d2]'
    case 'criminal':       return 'bg-[#f9ebe6] text-[#a85a3e] dark:bg-[rgba(181,106,106,0.15)] dark:text-[#c98080]'
    default:               return 'bg-[#f1ede2] text-[#5a6775] dark:bg-[rgba(123,134,147,0.16)] dark:text-[#9aa1a8]'
  }
}

// ---- STATUS (ativo / arquivado) ----
export function statusLabel(status?: string | null): string {
  return status === 'arquivado' ? 'Arquivada' : 'Ativo'
}
export function statusDot(status?: string | null): string {
  return status === 'arquivado' ? '#9aa1a8' : '#89bcbe'
}
export function statusFgClass(status?: string | null): string {
  return status === 'arquivado'
    ? 'text-[#7c8693] dark:text-[#9aa1a8]'
    : 'text-[#3f7376] dark:text-[#9fc7c9]'
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
