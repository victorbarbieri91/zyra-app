import {
  Briefcase,
  Users,
  Video,
  Phone,
  Coffee,
  FileText,
  type LucideIcon,
} from 'lucide-react'

// ============================================================
// Subtipos de Evento (agenda_eventos.tipo) — Single Source of Truth
// ============================================================
// Deve bater com a CHECK constraint eventos_tipo_check no banco
// (migração 20260422000001_agenda_eventos_relaxar_tipo_check).

export type TipoEvento =
  | 'reuniao_cliente'
  | 'reuniao_interna'
  | 'videoconferencia'
  | 'ligacao'
  | 'almoco'
  | 'outro'

// 'compromisso' é valor legado — registros criados antes do wizard ganhar
// subtipos carregam esse valor. Não aparece no wizard, mas precisa ser
// reconhecido na exibição.
export type TipoEventoComLegado = TipoEvento | 'compromisso'

export interface TipoEventoConfig {
  label: string
  icon: LucideIcon
  color: string // cor tailwind (blue, purple, emerald, amber, red, slate)
  description: string
}

export const EVENTO_TIPO_CONFIG: Record<TipoEvento, TipoEventoConfig> = {
  reuniao_cliente: {
    label: 'Reunião Cliente',
    icon: Briefcase,
    color: 'blue',
    description: 'Com cliente',
  },
  reuniao_interna: {
    label: 'Reunião Interna',
    icon: Users,
    color: 'purple',
    description: 'Equipe',
  },
  videoconferencia: {
    label: 'Videoconferência',
    icon: Video,
    color: 'emerald',
    description: 'Online',
  },
  ligacao: {
    label: 'Ligação',
    icon: Phone,
    color: 'amber',
    description: 'Telefone',
  },
  almoco: {
    label: 'Almoço',
    icon: Coffee,
    color: 'red',
    description: 'Refeição',
  },
  outro: {
    label: 'Outro',
    icon: FileText,
    color: 'slate',
    description: 'Outros',
  },
}

export const TIPO_EVENTO_LEGADO_LABEL = 'Compromisso'

export function isTipoEvento(tipo: string | null | undefined): tipo is TipoEvento {
  return !!tipo && tipo in EVENTO_TIPO_CONFIG
}

export function getEventoTipoLabel(tipo: string | null | undefined): string {
  if (isTipoEvento(tipo)) return EVENTO_TIPO_CONFIG[tipo].label
  return TIPO_EVENTO_LEGADO_LABEL
}

export function getEventoTipoConfig(
  tipo: string | null | undefined,
): TipoEventoConfig | null {
  if (isTipoEvento(tipo)) return EVENTO_TIPO_CONFIG[tipo]
  return null
}
