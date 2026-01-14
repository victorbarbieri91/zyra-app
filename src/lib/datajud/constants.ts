// ============================================
// CONSTANTES PARA API DATAJUD (CNJ)
// ============================================

import type { TribunalInfo } from '@/types/datajud'

/**
 * URL base da API publica do DataJud
 */
export const DATAJUD_API_URL = 'https://api-publica.datajud.cnj.jus.br'

/**
 * Chave publica da API DataJud
 * NOTA: Esta chave pode ser alterada pelo CNJ a qualquer momento.
 * Verificar em: https://datajud-wiki.cnj.jus.br/api-publica/acesso/
 */
export const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

/**
 * Mapeamento do digito J (segmento do Judiciario) para tipo
 * Posicao 13 do numero CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
 */
export const SEGMENTOS: Record<string, string> = {
  '1': 'stf',
  '2': 'cnj',
  '3': 'stj',
  '4': 'federal',
  '5': 'trabalhista',
  '6': 'eleitoral',
  '7': 'militar_uniao',
  '8': 'estadual',
  '9': 'militar_estadual'
}

/**
 * Tribunais Estaduais (J=8)
 * Mapeamento TR -> Alias do endpoint
 */
export const TRIBUNAIS_ESTADUAIS: Record<string, TribunalInfo> = {
  '01': { alias: 'tjac', nome: 'TJAC', segmento: 'estadual' },
  '02': { alias: 'tjal', nome: 'TJAL', segmento: 'estadual' },
  '03': { alias: 'tjap', nome: 'TJAP', segmento: 'estadual' },
  '04': { alias: 'tjam', nome: 'TJAM', segmento: 'estadual' },
  '05': { alias: 'tjba', nome: 'TJBA', segmento: 'estadual' },
  '06': { alias: 'tjce', nome: 'TJCE', segmento: 'estadual' },
  '07': { alias: 'tjdft', nome: 'TJDFT', segmento: 'estadual' },
  '08': { alias: 'tjes', nome: 'TJES', segmento: 'estadual' },
  '09': { alias: 'tjgo', nome: 'TJGO', segmento: 'estadual' },
  '10': { alias: 'tjma', nome: 'TJMA', segmento: 'estadual' },
  '11': { alias: 'tjmt', nome: 'TJMT', segmento: 'estadual' },
  '12': { alias: 'tjms', nome: 'TJMS', segmento: 'estadual' },
  '13': { alias: 'tjmg', nome: 'TJMG', segmento: 'estadual' },
  '14': { alias: 'tjpa', nome: 'TJPA', segmento: 'estadual' },
  '15': { alias: 'tjpb', nome: 'TJPB', segmento: 'estadual' },
  '16': { alias: 'tjpr', nome: 'TJPR', segmento: 'estadual' },
  '17': { alias: 'tjpe', nome: 'TJPE', segmento: 'estadual' },
  '18': { alias: 'tjpi', nome: 'TJPI', segmento: 'estadual' },
  '19': { alias: 'tjrj', nome: 'TJRJ', segmento: 'estadual' },
  '20': { alias: 'tjrn', nome: 'TJRN', segmento: 'estadual' },
  '21': { alias: 'tjrs', nome: 'TJRS', segmento: 'estadual' },
  '22': { alias: 'tjro', nome: 'TJRO', segmento: 'estadual' },
  '23': { alias: 'tjrr', nome: 'TJRR', segmento: 'estadual' },
  '24': { alias: 'tjsc', nome: 'TJSC', segmento: 'estadual' },
  '25': { alias: 'tjse', nome: 'TJSE', segmento: 'estadual' },
  '26': { alias: 'tjsp', nome: 'TJSP', segmento: 'estadual' },
  '27': { alias: 'tjto', nome: 'TJTO', segmento: 'estadual' }
}

/**
 * Tribunais Regionais Federais (J=4)
 * Mapeamento TR -> Alias do endpoint
 */
export const TRIBUNAIS_FEDERAIS: Record<string, TribunalInfo> = {
  '01': { alias: 'trf1', nome: 'TRF1', segmento: 'federal' },
  '02': { alias: 'trf2', nome: 'TRF2', segmento: 'federal' },
  '03': { alias: 'trf3', nome: 'TRF3', segmento: 'federal' },
  '04': { alias: 'trf4', nome: 'TRF4', segmento: 'federal' },
  '05': { alias: 'trf5', nome: 'TRF5', segmento: 'federal' },
  '06': { alias: 'trf6', nome: 'TRF6', segmento: 'federal' }
}

/**
 * Tribunais Regionais do Trabalho (J=5)
 * Mapeamento TR -> Alias do endpoint
 */
export const TRIBUNAIS_TRABALHISTAS: Record<string, TribunalInfo> = {
  '01': { alias: 'trt1', nome: 'TRT1', segmento: 'trabalhista' },
  '02': { alias: 'trt2', nome: 'TRT2', segmento: 'trabalhista' },
  '03': { alias: 'trt3', nome: 'TRT3', segmento: 'trabalhista' },
  '04': { alias: 'trt4', nome: 'TRT4', segmento: 'trabalhista' },
  '05': { alias: 'trt5', nome: 'TRT5', segmento: 'trabalhista' },
  '06': { alias: 'trt6', nome: 'TRT6', segmento: 'trabalhista' },
  '07': { alias: 'trt7', nome: 'TRT7', segmento: 'trabalhista' },
  '08': { alias: 'trt8', nome: 'TRT8', segmento: 'trabalhista' },
  '09': { alias: 'trt9', nome: 'TRT9', segmento: 'trabalhista' },
  '10': { alias: 'trt10', nome: 'TRT10', segmento: 'trabalhista' },
  '11': { alias: 'trt11', nome: 'TRT11', segmento: 'trabalhista' },
  '12': { alias: 'trt12', nome: 'TRT12', segmento: 'trabalhista' },
  '13': { alias: 'trt13', nome: 'TRT13', segmento: 'trabalhista' },
  '14': { alias: 'trt14', nome: 'TRT14', segmento: 'trabalhista' },
  '15': { alias: 'trt15', nome: 'TRT15', segmento: 'trabalhista' },
  '16': { alias: 'trt16', nome: 'TRT16', segmento: 'trabalhista' },
  '17': { alias: 'trt17', nome: 'TRT17', segmento: 'trabalhista' },
  '18': { alias: 'trt18', nome: 'TRT18', segmento: 'trabalhista' },
  '19': { alias: 'trt19', nome: 'TRT19', segmento: 'trabalhista' },
  '20': { alias: 'trt20', nome: 'TRT20', segmento: 'trabalhista' },
  '21': { alias: 'trt21', nome: 'TRT21', segmento: 'trabalhista' },
  '22': { alias: 'trt22', nome: 'TRT22', segmento: 'trabalhista' },
  '23': { alias: 'trt23', nome: 'TRT23', segmento: 'trabalhista' },
  '24': { alias: 'trt24', nome: 'TRT24', segmento: 'trabalhista' }
}

/**
 * Tribunais Regionais Eleitorais (J=6)
 * Mapeamento TR -> Alias do endpoint
 */
export const TRIBUNAIS_ELEITORAIS: Record<string, TribunalInfo> = {
  '01': { alias: 'tre-ac', nome: 'TRE-AC', segmento: 'eleitoral' },
  '02': { alias: 'tre-al', nome: 'TRE-AL', segmento: 'eleitoral' },
  '03': { alias: 'tre-ap', nome: 'TRE-AP', segmento: 'eleitoral' },
  '04': { alias: 'tre-am', nome: 'TRE-AM', segmento: 'eleitoral' },
  '05': { alias: 'tre-ba', nome: 'TRE-BA', segmento: 'eleitoral' },
  '06': { alias: 'tre-ce', nome: 'TRE-CE', segmento: 'eleitoral' },
  '07': { alias: 'tre-df', nome: 'TRE-DF', segmento: 'eleitoral' },
  '08': { alias: 'tre-es', nome: 'TRE-ES', segmento: 'eleitoral' },
  '09': { alias: 'tre-go', nome: 'TRE-GO', segmento: 'eleitoral' },
  '10': { alias: 'tre-ma', nome: 'TRE-MA', segmento: 'eleitoral' },
  '11': { alias: 'tre-mt', nome: 'TRE-MT', segmento: 'eleitoral' },
  '12': { alias: 'tre-ms', nome: 'TRE-MS', segmento: 'eleitoral' },
  '13': { alias: 'tre-mg', nome: 'TRE-MG', segmento: 'eleitoral' },
  '14': { alias: 'tre-pa', nome: 'TRE-PA', segmento: 'eleitoral' },
  '15': { alias: 'tre-pb', nome: 'TRE-PB', segmento: 'eleitoral' },
  '16': { alias: 'tre-pr', nome: 'TRE-PR', segmento: 'eleitoral' },
  '17': { alias: 'tre-pe', nome: 'TRE-PE', segmento: 'eleitoral' },
  '18': { alias: 'tre-pi', nome: 'TRE-PI', segmento: 'eleitoral' },
  '19': { alias: 'tre-rj', nome: 'TRE-RJ', segmento: 'eleitoral' },
  '20': { alias: 'tre-rn', nome: 'TRE-RN', segmento: 'eleitoral' },
  '21': { alias: 'tre-rs', nome: 'TRE-RS', segmento: 'eleitoral' },
  '22': { alias: 'tre-ro', nome: 'TRE-RO', segmento: 'eleitoral' },
  '23': { alias: 'tre-rr', nome: 'TRE-RR', segmento: 'eleitoral' },
  '24': { alias: 'tre-sc', nome: 'TRE-SC', segmento: 'eleitoral' },
  '25': { alias: 'tre-se', nome: 'TRE-SE', segmento: 'eleitoral' },
  '26': { alias: 'tre-sp', nome: 'TRE-SP', segmento: 'eleitoral' },
  '27': { alias: 'tre-to', nome: 'TRE-TO', segmento: 'eleitoral' }
}

/**
 * Tribunais Militares Estaduais (J=9)
 * Mapeamento TR -> Alias do endpoint
 */
export const TRIBUNAIS_MILITARES_ESTADUAIS: Record<string, TribunalInfo> = {
  '13': { alias: 'tjmmg', nome: 'TJMMG', segmento: 'militar_estadual' },
  '21': { alias: 'tjmrs', nome: 'TJMRS', segmento: 'militar_estadual' },
  '26': { alias: 'tjmsp', nome: 'TJMSP', segmento: 'militar_estadual' }
}

/**
 * Tribunais Superiores
 */
export const TRIBUNAIS_SUPERIORES: Record<string, TribunalInfo> = {
  'stj': { alias: 'stj', nome: 'STJ', segmento: 'superior' },
  'tst': { alias: 'tst', nome: 'TST', segmento: 'superior' },
  'tse': { alias: 'tse', nome: 'TSE', segmento: 'superior' },
  'stm': { alias: 'stm', nome: 'STM', segmento: 'superior' }
}

/**
 * Mapeamento do grau do processo para instancia do sistema
 */
export const GRAU_PARA_INSTANCIA: Record<string, string> = {
  'G1': '1a',
  'G2': '2a',
  'JE': '1a',      // Juizado Especial
  'TR': '2a',      // Turma Recursal
  'SUP': 'stj',    // Superior
  'STJ': 'stj',
  'STF': 'stf',
  'TST': 'tst'
}

/**
 * Areas juridicas para inferencia pela classe processual
 */
export const AREAS_POR_CLASSE: Array<{ palavras: string[]; area: string }> = [
  { palavras: ['trabalhista', 'reclamacao', 'CLT'], area: 'Trabalhista' },
  { palavras: ['familia', 'divorcio', 'alimentos', 'guarda', 'interdição'], area: 'Família' },
  { palavras: ['criminal', 'penal', 'crime', 'delito'], area: 'Criminal' },
  { palavras: ['tributar', 'fiscal', 'imposto', 'tributo'], area: 'Tributária' },
  { palavras: ['consumidor', 'CDC'], area: 'Consumidor' },
  { palavras: ['empresar', 'falencia', 'recuperacao judicial'], area: 'Empresarial' },
  { palavras: ['ambiental', 'meio ambiente'], area: 'Ambiental' }
]

/**
 * TTL do cache em minutos
 */
export const CACHE_TTL_MINUTOS = 15
