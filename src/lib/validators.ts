/**
 * Utilitarios de validacao de documentos brasileiros
 */

/**
 * Valida CPF usando o algoritmo oficial da Receita Federal
 * @param cpf - CPF com ou sem formatacao
 * @returns true se valido, false se invalido
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres nao numericos
  const numbers = cpf.replace(/\D/g, '')

  // Deve ter 11 digitos
  if (numbers.length !== 11) return false

  // Rejeita CPFs com todos os digitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(numbers)) return false

  // Calcula primeiro digito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numbers[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numbers[9])) return false

  // Calcula segundo digito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numbers[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numbers[10])) return false

  return true
}

/**
 * Valida CNPJ usando o algoritmo oficial da Receita Federal
 * @param cnpj - CNPJ com ou sem formatacao
 * @returns true se valido, false se invalido
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres nao numericos
  const numbers = cnpj.replace(/\D/g, '')

  // Deve ter 14 digitos
  if (numbers.length !== 14) return false

  // Rejeita CNPJs com todos os digitos iguais
  if (/^(\d)\1+$/.test(numbers)) return false

  // Calcula primeiro digito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numbers[i]) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(numbers[12])) return false

  // Calcula segundo digito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numbers[i]) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  if (digito2 !== parseInt(numbers[13])) return false

  return true
}

/**
 * Valida CPF ou CNPJ automaticamente baseado no tamanho
 * @param documento - CPF ou CNPJ com ou sem formatacao
 * @returns true se valido, false se invalido
 */
export function validarCPFouCNPJ(documento: string): boolean {
  const numbers = documento.replace(/\D/g, '')

  if (numbers.length === 11) {
    return validarCPF(numbers)
  } else if (numbers.length === 14) {
    return validarCNPJ(numbers)
  }

  return false
}

/**
 * Formata CPF para exibicao (000.000.000-00)
 */
export function formatarCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '')
  if (numbers.length !== 11) return cpf

  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ para exibicao (00.000.000/0000-00)
 */
export function formatarCNPJ(cnpj: string): string {
  const numbers = cnpj.replace(/\D/g, '')
  if (numbers.length !== 14) return cnpj

  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata CPF ou CNPJ automaticamente
 */
export function formatarCPFouCNPJ(documento: string): string {
  const numbers = documento.replace(/\D/g, '')

  if (numbers.length === 11) {
    return formatarCPF(numbers)
  } else if (numbers.length === 14) {
    return formatarCNPJ(numbers)
  }

  return documento
}

/**
 * Aplica mascara de CPF enquanto digita
 */
export function mascaraCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11)

  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

/**
 * Aplica mascara de CNPJ enquanto digita
 */
export function mascaraCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14)

  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`
}

/**
 * Aplica mascara de CPF ou CNPJ automaticamente baseado no tamanho
 */
export function mascaraCPFouCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '')

  if (numbers.length <= 11) {
    return mascaraCPF(value)
  } else {
    return mascaraCNPJ(value)
  }
}

/**
 * Aplica mascara de CEP enquanto digita
 */
export function mascaraCEP(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8)

  if (numbers.length <= 5) return numbers
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
}

/**
 * Aplica mascara de telefone enquanto digita
 * Suporta fixo (10 digitos) e celular (11 digitos)
 */
export function mascaraTelefone(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11)

  if (numbers.length <= 2) return numbers.length ? `(${numbers}` : ''
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}
