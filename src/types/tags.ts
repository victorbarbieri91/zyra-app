// Types para o sistema de tags/etiquetas

export type TagContexto = 'agenda' | 'processo' | 'consultivo' | 'documento'

export interface Tag {
  id: string
  escritorio_id: string
  nome: string
  cor: string // Hex color (ex: #EF4444)
  contexto: TagContexto
  is_predefinida: boolean
  ordem: number
  ativa: boolean
  descricao?: string
  icone?: string // Nome do ícone Lucide
  created_at: string
  created_by?: string
  updated_at: string
  updated_by?: string
}

export interface TagFormData {
  nome: string
  cor: string
  contexto: TagContexto
  descricao?: string
  icone?: string
}

// Para associações de tags com entidades
export interface TagAssociation {
  id: string
  tag_id: string
  created_at: string
  created_by?: string
  // O relacionamento específico (tarefa_id, evento_id, etc) virá da tabela específica
}

// Tag com informações completas (incluindo contadores de uso)
export interface TagWithStats extends Tag {
  uso_count?: number // Quantas vezes a tag está sendo usada
}

// Cores pré-definidas do sistema (seguindo Tailwind + Design System)
export const TAG_COLORS = {
  // Vermelhos
  red: {
    hex: '#EF4444',
    name: 'Vermelho',
    light: '#FEE2E2',
    dark: '#DC2626'
  },
  darkRed: {
    hex: '#DC2626',
    name: 'Vermelho Escuro',
    light: '#FEE2E2',
    dark: '#991B1B'
  },
  crimson: {
    hex: '#991B1B',
    name: 'Carmesim',
    light: '#FEE2E2',
    dark: '#7F1D1D'
  },

  // Laranjas
  orange: {
    hex: '#F97316',
    name: 'Laranja',
    light: '#FFEDD5',
    dark: '#EA580C'
  },
  amber: {
    hex: '#F59E0B',
    name: 'Âmbar',
    light: '#FEF3C7',
    dark: '#D97706'
  },

  // Amarelos
  yellow: {
    hex: '#EAB308',
    name: 'Amarelo',
    light: '#FEF9C3',
    dark: '#CA8A04'
  },

  // Verdes
  green: {
    hex: '#10B981',
    name: 'Verde',
    light: '#D1FAE5',
    dark: '#059669'
  },
  emerald: {
    hex: '#059669',
    name: 'Esmeralda',
    light: '#D1FAE5',
    dark: '#047857'
  },
  teal: {
    hex: '#14B8A6',
    name: 'Azul-verde',
    light: '#CCFBF1',
    dark: '#0D9488'
  },

  // Azuis
  cyan: {
    hex: '#06B6D4',
    name: 'Ciano',
    light: '#CFFAFE',
    dark: '#0891B2'
  },
  blue: {
    hex: '#3B82F6',
    name: 'Azul',
    light: '#DBEAFE',
    dark: '#2563EB'
  },
  indigo: {
    hex: '#6366F1',
    name: 'Índigo',
    light: '#E0E7FF',
    dark: '#4F46E5'
  },

  // Roxos
  purple: {
    hex: '#8B5CF6',
    name: 'Roxo',
    light: '#EDE9FE',
    dark: '#7C3AED'
  },
  violet: {
    hex: '#A855F7',
    name: 'Violeta',
    light: '#F3E8FF',
    dark: '#9333EA'
  },

  // Rosas
  pink: {
    hex: '#EC4899',
    name: 'Rosa',
    light: '#FCE7F3',
    dark: '#DB2777'
  },

  // Cinzas (Neutros)
  slate: {
    hex: '#64748B',
    name: 'Ardósia',
    light: '#F1F5F9',
    dark: '#475569'
  },
  gray: {
    hex: '#6B7280',
    name: 'Cinza',
    light: '#F3F4F6',
    dark: '#4B5563'
  },

  // Cores do Design System
  primary: {
    hex: '#34495e',
    name: 'Primário',
    light: '#E8F5F5',
    dark: '#2C3E50'
  },
  secondary: {
    hex: '#46627f',
    name: 'Secundário',
    light: '#F0F9F9',
    dark: '#3A5166'
  },
  accent: {
    hex: '#89bcbe',
    name: 'Destaque',
    light: '#E8F5F5',
    dark: '#6BA9AB'
  },
} as const

export type TagColorKey = keyof typeof TAG_COLORS

// Helper para validar cor hex
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

// Helper para obter cor mais próxima do catálogo
export function getClosestColor(hex: string): TagColorKey {
  // Implementação simples - retorna uma cor padrão
  // Pode ser melhorado com cálculo de distância RGB
  return 'blue'
}

// Helper para converter hex para RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Helper para determinar se texto deve ser claro ou escuro baseado no fundo
export function shouldUseWhiteText(hexColor: string): boolean {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return false

  // Cálculo de luminosidade
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance < 0.6 // Se escuro, usar texto branco
}
