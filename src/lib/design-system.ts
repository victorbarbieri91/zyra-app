// ============================================================================
// DESIGN SYSTEM - ZYRA LEGAL
// Baseado no módulo Dashboard (ver DESIGN_SYSTEM.md)
// ============================================================================

export const colors = {
  primary: {
    darkest: '#34495e',  // Títulos, gradientes escuros
    dark: '#46627f',     // Subtítulos, textos secundários
    medium: '#89bcbe',   // Ícones destaque, bordas especiais
    light: '#aacfd0',    // Backgrounds suaves, gradientes claros
  },
  accent: '#1E3A8A',     // Botões, links importantes
  financial: {
    light: '#f0f9f9',
    lighter: '#e8f5f5',
  },
  status: {
    success: 'emerald',
    warning: 'amber',
    error: 'red',
    info: 'blue',
  },
} as const;

export const gradients = {
  // CSS gradient classes (auto-switch via CSS variables in dark mode)
  kpi1: 'gradient-kpi1',
  kpi2: 'gradient-kpi2',
  kpi3: 'gradient-kpi3',
  kpi4: 'gradient-kpi4',
  primary: 'gradient-primary',
  // Legacy Tailwind classes (light mode only — prefer CSS classes above)
  kpi1Tw: 'from-[#34495e] to-[#46627f]',
  kpi2Tw: 'from-[#46627f] to-[#6c757d]',
  kpi3Tw: 'from-[#89bcbe] to-[#aacfd0]',
  kpi4Tw: 'from-[#aacfd0] to-[#cbe2e2]',
} as const;

export const typography = {
  pageHeader: 'text-2xl font-semibold',      // Header página
  kpiValue: 'text-2xl font-bold',             // Valores KPI
  cardTitle: 'text-base font-semibold',       // Títulos card principais
  cardTitleSmall: 'text-sm font-semibold',    // Títulos card padrão
  content: 'text-sm',                         // Conteúdo normal
  label: 'text-xs font-medium',               // Labels
  subtitle: 'text-xs',                        // Subtítulos, trends
  description: 'text-[11px]',                 // Descrições insights
  badge: 'text-[10px] font-medium',           // Badges, detalhes mínimos
} as const;

export const iconSizes = {
  kpi: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4',
  },
  timeline: {
    container: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
  },
  buttonHighlight: 'w-4 h-4',
  buttonNormal: 'w-3.5 h-3.5',
} as const;

export const spacing = {
  sectionGap: 'gap-6',      // Entre seções principais (24px)
  cardGap: 'gap-4',         // Entre cards em grid (16px)
  buttonGap: 'gap-2.5',     // Entre botões ações rápidas (10px)
  cardHeader: 'pb-2 pt-3',  // Card header padding
  cardContent: 'pt-2 pb-3', // Card content padding
  button: 'py-2.5 px-3',    // Padding botões
} as const;

export const borders = {
  default: 'border-slate-200 dark:border-slate-700',
  highlight: 'border-[#89bcbe] dark:border-teal-600',
  radius: 'rounded-lg',
} as const;

export const shadows = {
  card: 'shadow-sm',
  hover: 'shadow-lg',
  highlight: 'shadow-xl',
} as const;

// Variantes de cor para diferentes estados
export type ColorVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const colorVariants: Record<ColorVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/20',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/20',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/20',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/20',
  },
  neutral: {
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-500/20',
  },
};
