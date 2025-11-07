/**
 * Design Tokens - Zyra Legal
 * Paleta de cores e tipografia padronizadas
 */

export const colors = {
  // Cor Principal de Destaque: #34495e
  primary: '#34495e',

  // Cor Secundária: #89bcbe
  secondary: '#89bcbe',

  // Cor Terciária: #46627f
  tertiary: '#46627f',

  // Hierarquia de Textos
  text: {
    primary: '#34495e',    // Títulos importantes (slate-700)
    secondary: '#46627f',  // Subtítulos (slate-600)
    body: '#6c757d',       // Corpo de texto (slate-500)
    muted: '#adb5bd',      // Textos secundários/labels (slate-400)
    light: '#ced4da',      // Textos muito claros (slate-300)
  },

  // Gradientes da Paleta para KPIs
  gradients: {
    kpi1: {
      from: '#34495e', // slate-700
      to: '#46627f',   // slate-600
      class: 'from-[#34495e] to-[#46627f]',
    },
    kpi2: {
      from: '#46627f', // slate-600
      to: '#6c757d',   // slate-500
      class: 'from-[#46627f] to-[#6c757d]',
    },
    kpi3: {
      from: '#89bcbe', // teal-300
      to: '#aacfd0',   // teal-200
      class: 'from-[#89bcbe] to-[#aacfd0]',
    },
    kpi4: {
      from: '#aacfd0', // teal-200
      to: '#cbe2e2',   // teal-100
      class: 'from-[#aacfd0] to-[#cbe2e2]',
    },
  },

  // Cores de Estado
  success: '#10b981',  // emerald-500
  warning: '#f59e0b',  // amber-500
  error: '#ef4444',    // red-500
  info: '#3b82f6',     // blue-500
}

export const typography = {
  // Pesos de fonte
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },

  // Tamanhos e estilos por tipo
  styles: {
    h1: {
      weight: 600,       // semibold
      color: '#34495e',  // text-primary
      size: 'text-3xl',  // ou text-4xl
    },
    h2: {
      weight: 500,       // medium
      color: '#46627f',  // text-secondary
      size: 'text-xl',   // ou text-2xl
    },
    h3: {
      weight: 500,       // medium
      color: '#34495e',  // text-primary
      size: 'text-lg',
    },
    cardTitle: {
      weight: 500,       // medium
      color: '#34495e',  // text-primary
      size: 'text-base', // ou text-lg
    },
    body: {
      weight: 400,       // normal
      color: '#6c757d',  // text-body
      size: 'text-sm',   // ou text-base
    },
    label: {
      weight: 400,       // normal
      color: '#adb5bd',  // text-muted
      size: 'text-xs',   // ou text-sm
    },
    emphasis: {
      weight: 600,       // semibold
      color: '#34495e',  // text-primary
    },
  },
}

// Classes Tailwind prontas para uso
export const tw = {
  // Títulos
  h1: 'text-3xl font-semibold text-[#34495e]',
  h2: 'text-xl font-medium text-[#46627f]',
  h3: 'text-lg font-medium text-[#34495e]',

  // Textos
  cardTitle: 'text-base font-medium text-[#34495e]',
  body: 'text-sm font-normal text-[#6c757d]',
  bodyBase: 'text-base font-normal text-[#6c757d]',
  label: 'text-xs font-normal text-[#adb5bd]',
  labelSm: 'text-sm font-normal text-[#adb5bd]',
  emphasis: 'font-semibold text-[#34495e]',

  // Botões
  btnPrimary: 'bg-[#34495e] hover:bg-[#2c3e50] text-white',
  btnSecondary: 'bg-[#89bcbe] hover:bg-[#6ba9ab] text-white',

  // Badges
  badgePrimary: 'bg-[#34495e] text-white',
  badgeSecondary: 'bg-[#89bcbe] text-white',

  // Gradientes KPI
  gradientKpi1: 'bg-gradient-to-br from-[#34495e] to-[#46627f]',
  gradientKpi2: 'bg-gradient-to-br from-[#46627f] to-[#6c757d]',
  gradientKpi3: 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]',
  gradientKpi4: 'bg-gradient-to-br from-[#aacfd0] to-[#cbe2e2]',
}
