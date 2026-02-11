// ============================================
// VALIDADORES PARA NUMERO CNJ E API DATAJUD
// ============================================

import type { TribunalInfo } from '@/types/datajud'
import {
  TRIBUNAIS_ESTADUAIS,
  TRIBUNAIS_FEDERAIS,
  TRIBUNAIS_TRABALHISTAS,
  TRIBUNAIS_ELEITORAIS,
  TRIBUNAIS_MILITARES_ESTADUAIS,
  TRIBUNAIS_SUPERIORES,
  AREAS_POR_CLASSE
} from './constants'

/**
 * Regex para validar formato do numero CNJ
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
 * Onde:
 * - NNNNNNN = 7 digitos do numero sequencial
 * - DD = 2 digitos verificadores
 * - AAAA = 4 digitos do ano
 * - J = 1 digito do segmento (justica)
 * - TR = 2 digitos do tribunal
 * - OOOO = 4 digitos da origem
 */
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/

/**
 * Valida apenas o formato do numero CNJ (sem verificar digito)
 */
export function validarFormatoCNJ(numero: string): boolean {
  return CNJ_REGEX.test(numero)
}

/**
 * Remove a formatacao do numero CNJ (pontos e tracos)
 */
export function limparNumeroCNJ(numero: string): string {
  return numero.replace(/[.-]/g, '')
}

/**
 * Formata numero CNJ de 20 digitos para formato com pontuacao
 */
export function formatarNumeroCNJ(numero: string): string {
  const limpo = numero.replace(/\D/g, '')
  if (limpo.length !== 20) return numero

  return `${limpo.substring(0, 7)}-${limpo.substring(7, 9)}.${limpo.substring(9, 13)}.${limpo.substring(13, 14)}.${limpo.substring(14, 16)}.${limpo.substring(16, 20)}`
}

/**
 * Calcula o digito verificador do numero CNJ usando Modulo 97 Base 10 (ISO 7064:2003)
 *
 * Conforme Resolucao CNJ 65/2008, Anexo VIII:
 * 1. Deslocar DD para o final com valor 00: NNNNNNN + AAAA + J + TR + OOOO + 00
 * 2. Calcular: DD = 98 - (numero modulo 97)
 * 3. Formatar resultado com 2 digitos (zero a esquerda se necessario)
 *
 * Referencia: https://github.com/edipojuan/numero-unico-processo
 */
export function calcularDigitoVerificadorCNJ(numero: string): string {
  // Remove formatacao
  const limpo = numero.replace(/[.-]/g, '')

  if (limpo.length !== 20) {
    throw new Error('Numero CNJ deve ter 20 digitos')
  }

  // Extrai as partes (sem o digito verificador)
  // Posicoes: NNNNNNN(0-6) DD(7-8) AAAA(9-12) J(13) TR(14-15) OOOO(16-19)
  const sequencial = limpo.substring(0, 7)   // NNNNNNN
  const ano = limpo.substring(9, 13)         // AAAA
  const segmento = limpo.substring(13, 14)   // J
  const tribunal = limpo.substring(14, 16)   // TR
  const origem = limpo.substring(16, 20)     // OOOO

  // Monta o numero para calculo conforme CNJ: NNNNNNN + AAAA + J + TR + OOOO + 00
  // Total: 7 + 4 + 1 + 2 + 4 + 2 = 20 digitos (com 00 no lugar de DD)
  const numeroParaCalculo = sequencial + ano + segmento + tribunal + origem + '00'

  // Para numeros muito grandes, usa BigInt
  const numeroBigInt = BigInt(numeroParaCalculo)
  const resto = numeroBigInt % BigInt(97)

  // DD = 98 - resto
  const digito = BigInt(98) - resto

  // Retorna com 2 digitos (padding com zero a esquerda se necessario)
  return digito.toString().padStart(2, '0')
}

/**
 * Valida numero CNJ completo (formato + digito verificador)
 */
export function validarNumeroCNJCompleto(numero: string): {
  valido: boolean
  erro?: string
} {
  // Verifica formato
  if (!validarFormatoCNJ(numero)) {
    return {
      valido: false,
      erro: 'Formato invalido. Use: 1234567-12.2024.8.26.0100'
    }
  }

  // Extrai o digito informado
  const limpo = numero.replace(/[.-]/g, '')
  const digitoInformado = limpo.substring(7, 9)

  try {
    // Calcula o digito correto
    const digitoCalculado = calcularDigitoVerificadorCNJ(numero)

    if (digitoInformado !== digitoCalculado) {
      return {
        valido: false,
        erro: `Digito verificador invalido. Esperado: ${digitoCalculado}, informado: ${digitoInformado}`
      }
    }

    return { valido: true }
  } catch {
    return {
      valido: false,
      erro: 'Erro ao calcular digito verificador'
    }
  }
}

/**
 * Extrai informacoes do tribunal a partir do numero CNJ
 * Retorna null se nao conseguir identificar
 */
export function extrairTribunalDoNumero(numero: string): TribunalInfo | null {
  const limpo = numero.replace(/[.-]/g, '')

  if (limpo.length !== 20) {
    return null
  }

  // Extrai J (segmento) e TR (tribunal)
  // Posicoes: NNNNNNN(0-6) DD(7-8) AAAA(9-12) J(13) TR(14-15) OOOO(16-19)
  const J = limpo.charAt(13)
  const TR = limpo.substring(14, 16)

  // Determina o mapeamento baseado no segmento
  switch (J) {
    case '1': // STF
      return { alias: 'stf', nome: 'STF', segmento: 'superior' }

    case '2': // CNJ
      return { alias: 'cnj', nome: 'CNJ', segmento: 'superior' }

    case '3': // STJ
      return TRIBUNAIS_SUPERIORES['stj'] || null

    case '4': // Justica Federal
      return TRIBUNAIS_FEDERAIS[TR] || null

    case '5': // Justica do Trabalho
      // Se TR = 00, e TST
      if (TR === '00') {
        return TRIBUNAIS_SUPERIORES['tst'] || null
      }
      return TRIBUNAIS_TRABALHISTAS[TR] || null

    case '6': // Justica Eleitoral
      // Se TR = 00, e TSE
      if (TR === '00') {
        return TRIBUNAIS_SUPERIORES['tse'] || null
      }
      return TRIBUNAIS_ELEITORAIS[TR] || null

    case '7': // Justica Militar da Uniao
      // Se TR = 00, e STM
      if (TR === '00') {
        return TRIBUNAIS_SUPERIORES['stm'] || null
      }
      return { alias: 'stm', nome: 'STM', segmento: 'militar_uniao' }

    case '8': // Justica Estadual
      return TRIBUNAIS_ESTADUAIS[TR] || null

    case '9': // Justica Militar Estadual
      return TRIBUNAIS_MILITARES_ESTADUAIS[TR] || null

    default:
      return null
  }
}

/**
 * Infere a area juridica com base na classe processual e assuntos
 */
export function inferirArea(classe: string, assuntos?: string[]): string | null {
  const textoBusca = [classe, ...(assuntos || [])].join(' ').toLowerCase()

  for (const config of AREAS_POR_CLASSE) {
    if (config.palavras.some(palavra => textoBusca.includes(palavra.toLowerCase()))) {
      return config.area
    }
  }

  // Default: Civel para processos nao identificados
  return 'Civel'
}

/**
 * Mapeia o grau do DataJud para instancia do sistema
 */
export function mapearInstancia(grau: string): string {
  const mapa: Record<string, string> = {
    'G1': '1ª',
    'G2': '2ª',
    'JE': '1ª',
    'TR': '2ª',
    'SUP': 'STJ',
    'STJ': 'STJ',
    'STF': 'STF',
    'TST': 'TST'
  }

  return mapa[grau] || '1ª'
}

/**
 * Valida se o numero CNJ pertence a um tribunal suportado
 */
export function tribunalSuportado(numero: string): boolean {
  const tribunal = extrairTribunalDoNumero(numero)
  return tribunal !== null
}
