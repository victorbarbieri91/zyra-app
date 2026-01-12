// ============================================
// VALIDADORES PARA MIGRAÇÃO
// ============================================

/**
 * Validar CPF
 */
export function validarCPF(cpf: string): boolean {
  if (!cpf) return true // Campo opcional

  const numeros = cpf.replace(/\D/g, '')

  if (numeros.length !== 11) return false
  if (/^(\d)\1+$/.test(numeros)) return false // Todos dígitos iguais

  // Validação dos dígitos verificadores
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(numeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(numeros[10])) return false

  return true
}

/**
 * Validar CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return true // Campo opcional

  const numeros = cnpj.replace(/\D/g, '')

  if (numeros.length !== 14) return false
  if (/^(\d)\1+$/.test(numeros)) return false // Todos dígitos iguais

  // Validação dos dígitos verificadores
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numeros[i]) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(numeros[12])) return false

  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numeros[i]) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  if (digito2 !== parseInt(numeros[13])) return false

  return true
}

/**
 * Validar documento (CPF ou CNPJ)
 */
export function validarDocumento(doc: string): { valido: boolean; tipo?: 'cpf' | 'cnpj'; erro?: string } {
  if (!doc) return { valido: true }

  const numeros = doc.replace(/\D/g, '')

  if (numeros.length === 11) {
    if (validarCPF(numeros)) {
      return { valido: true, tipo: 'cpf' }
    }
    return { valido: false, erro: 'CPF inválido' }
  }

  if (numeros.length === 14) {
    if (validarCNPJ(numeros)) {
      return { valido: true, tipo: 'cnpj' }
    }
    return { valido: false, erro: 'CNPJ inválido' }
  }

  return { valido: false, erro: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos' }
}

/**
 * Validar número de processo CNJ
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function validarNumeroCNJ(numero: string): boolean {
  if (!numero) return false

  // Limpar e verificar formato
  const limpo = numero.trim()
  const regex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/

  return regex.test(limpo)
}

/**
 * Validar e-mail
 */
export function validarEmail(email: string): boolean {
  if (!email) return true // Campo opcional

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}

/**
 * Validar telefone brasileiro
 */
export function validarTelefone(telefone: string): boolean {
  if (!telefone) return true // Campo opcional

  const numeros = telefone.replace(/\D/g, '')

  // Aceita 10 (fixo) ou 11 (celular) dígitos
  return numeros.length === 10 || numeros.length === 11
}

/**
 * Validar data
 */
export function validarData(data: string): boolean {
  if (!data) return true // Campo opcional

  // Tentar vários formatos
  const formatos = [
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD
    /^\d{2}-\d{2}-\d{4}$/,   // DD-MM-YYYY
  ]

  const matchFormato = formatos.some(regex => regex.test(data.trim()))
  if (!matchFormato) return false

  // Tentar parsear
  const parsed = parseData(data)
  return parsed !== null && !isNaN(parsed.getTime())
}

/**
 * Parsear data de vários formatos
 */
export function parseData(data: string): Date | null {
  if (!data) return null

  const limpo = data.trim()

  // DD/MM/YYYY ou DD-MM-YYYY
  const matchDMY = limpo.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (matchDMY) {
    const [, dia, mes, ano] = matchDMY
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
  }

  // YYYY-MM-DD
  const matchYMD = limpo.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (matchYMD) {
    const [, ano, mes, dia] = matchYMD
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
  }

  return null
}

/**
 * Formatar CPF
 */
export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return cpf

  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formatar CNPJ
 */
export function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return cnpj

  return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formatar documento (CPF ou CNPJ)
 */
export function formatarDocumento(doc: string): string {
  if (!doc) return ''

  const numeros = doc.replace(/\D/g, '')

  if (numeros.length === 11) {
    return formatarCPF(numeros)
  }

  if (numeros.length === 14) {
    return formatarCNPJ(numeros)
  }

  return doc
}

/**
 * Inferir tipo de pessoa pelo documento
 */
export function inferirTipoPessoa(doc: string): 'pf' | 'pj' {
  if (!doc) return 'pf'

  const numeros = doc.replace(/\D/g, '')
  return numeros.length === 14 ? 'pj' : 'pf'
}

/**
 * Limpar e normalizar valor monetário
 */
export function parseValorMonetario(valor: string): number | null {
  if (!valor) return null

  // Remover R$, espaços
  let limpo = valor.replace(/[R$\s]/g, '')

  // Tratar separadores brasileiros (1.234,56 -> 1234.56)
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }

  const numero = parseFloat(limpo)
  return isNaN(numero) ? null : numero
}
