/**
 * Constantes para áreas jurídicas
 * Valores correspondem ao ENUM area_juridica_enum no banco de dados
 */

// Valores do ENUM (usar estes ao salvar no banco)
export const AREAS_JURIDICAS = [
  'civel',
  'trabalhista',
  'criminal',
  'tributario',
  'empresarial',
  'familia',
  'consumidor',
  'previdenciario',
  'administrativo',
  'ambiental',
  'outros',
] as const

export type AreaJuridica = (typeof AREAS_JURIDICAS)[number]

// Mapeamento para exibição formatada
export const AREA_JURIDICA_LABELS: Record<AreaJuridica, string> = {
  civel: 'Cível',
  trabalhista: 'Trabalhista',
  criminal: 'Criminal',
  tributario: 'Tributário',
  empresarial: 'Empresarial',
  familia: 'Família',
  consumidor: 'Consumidor',
  previdenciario: 'Previdenciário',
  administrativo: 'Administrativo',
  ambiental: 'Ambiental',
  outros: 'Outros',
}

// Função helper para formatar área
export function formatAreaJuridica(area: string | null | undefined): string {
  if (!area) return '-'
  return AREA_JURIDICA_LABELS[area as AreaJuridica] || area
}
