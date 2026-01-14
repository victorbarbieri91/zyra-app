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

// ============================================
// NORMALIZAÇÃO DE NOMES
// ============================================

// Siglas empresariais que devem ser preservadas em maiúsculo
const SIGLAS_EMPRESARIAIS = [
  'S/A', 'S.A.', 'SA', 'LTDA', 'ME', 'EPP', 'EIRELI', 'CIA', 'CIA.',
  'SS', 'S/S', 'SIMPLES', 'MEI', 'LTDA.'
]

// Preposições e artigos que devem ficar em minúsculo (quando no meio do nome)
const PREPOSICOES = ['da', 'de', 'do', 'dos', 'das', 'e']
const ARTIGOS = ['o', 'a', 'os', 'as']
const PALAVRAS_MINUSCULAS = [...PREPOSICOES, ...ARTIGOS]

// Prefixos de tratamento que devem ser capitalizados de forma especial
const PREFIXOS_TRATAMENTO: Record<string, string> = {
  'dr': 'Dr.',
  'dr.': 'Dr.',
  'dra': 'Dra.',
  'dra.': 'Dra.',
  'sr': 'Sr.',
  'sr.': 'Sr.',
  'sra': 'Sra.',
  'sra.': 'Sra.',
  'prof': 'Prof.',
  'prof.': 'Prof.',
}

/**
 * Normaliza nome para Title Case preservando siglas e abreviações
 *
 * @example
 * normalizarNome("BANCO SANTANDER S/A") // "Banco Santander S/A"
 * normalizarNome("MARIA DA SILVA") // "Maria da Silva"
 * normalizarNome("DR. JOÃO ADVOGADOS LTDA") // "Dr. João Advogados Ltda"
 */
export function normalizarNome(nome: string): string {
  if (!nome) return ''

  // Verificar se precisa normalizar (se está tudo maiúsculo ou tudo minúsculo)
  const temMinusculas = /[a-záàâãéèêíìîóòôõúùûç]/.test(nome)
  const temMaiusculas = /[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(nome)

  // Se já tem mistura de maiúsculas e minúsculas, pode estar correto
  // Só normaliza se estiver TODO em maiúsculo ou TODO em minúsculo
  if (temMinusculas && temMaiusculas) {
    // Verificar se está em formato razoável (primeira letra maiúscula)
    const palavras = nome.trim().split(/\s+/)
    const primeiraLetraMaiuscula = palavras.some(p => /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(p))
    if (primeiraLetraMaiuscula) {
      return nome.trim()
    }
  }

  // Separar em palavras mantendo espaços
  const palavras = nome.trim().split(/\s+/)

  const resultado = palavras.map((palavra, index) => {
    const palavraLower = palavra.toLowerCase()
    const palavraUpper = palavra.toUpperCase()

    // Verificar se é uma sigla empresarial conhecida
    const sigla = SIGLAS_EMPRESARIAIS.find(s =>
      palavraUpper === s.toUpperCase() ||
      palavraUpper === s.replace(/[./]/g, '').toUpperCase()
    )
    if (sigla) {
      return sigla
    }

    // Verificar se é um prefixo de tratamento
    const prefixo = PREFIXOS_TRATAMENTO[palavraLower]
    if (prefixo) {
      return prefixo
    }

    // Verificar se é preposição/artigo (manter em minúsculo, exceto se for primeira palavra)
    if (index > 0 && PALAVRAS_MINUSCULAS.includes(palavraLower)) {
      return palavraLower
    }

    // Capitalizar primeira letra, resto minúsculo
    if (palavra.length === 0) return ''

    // Tratar palavras com hífen (ex: "PORTO-ALEGRE" -> "Porto-Alegre")
    if (palavra.includes('-')) {
      return palavra
        .split('-')
        .map(parte => capitalizarPalavra(parte))
        .join('-')
    }

    return capitalizarPalavra(palavra)
  })

  return resultado.join(' ')
}

/**
 * Capitaliza uma palavra (primeira letra maiúscula, resto minúsculo)
 */
function capitalizarPalavra(palavra: string): string {
  if (!palavra) return ''
  return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
}

/**
 * Verifica se um nome precisa de normalização
 */
export function precisaNormalizar(nome: string): boolean {
  if (!nome) return false

  // Precisa normalizar se está tudo em maiúsculo
  const semNumeros = nome.replace(/[0-9]/g, '')
  const somenteLetras = semNumeros.replace(/[^a-zA-ZáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/g, '')

  if (somenteLetras.length === 0) return false

  // Está tudo em maiúsculo?
  const todoMaiusculo = somenteLetras === somenteLetras.toUpperCase()

  // Está tudo em minúsculo?
  const todoMinusculo = somenteLetras === somenteLetras.toLowerCase()

  return todoMaiusculo || todoMinusculo
}

// ============================================
// NORMALIZAÇÃO DE TIPO DE CONTATO
// ============================================

// Valores válidos no sistema
export const TIPOS_CONTATO_VALIDOS = [
  'cliente',
  'prospecto',
  'parte_contraria',
  'correspondente',
  'testemunha',
  'perito',
  'juiz',
  'promotor',
  'outros'
] as const

export type TipoContato = typeof TIPOS_CONTATO_VALIDOS[number]

// Mapeamento de variações para valores padrão
const MAPEAMENTO_TIPO_CONTATO: Record<string, TipoContato> = {
  // Cliente
  'cliente': 'cliente',
  'clientes': 'cliente',
  'client': 'cliente',
  'cli': 'cliente',
  'c': 'cliente',

  // Prospecto / Lead
  'prospecto': 'prospecto',
  'prospectos': 'prospecto',
  'prospect': 'prospecto',
  'lead': 'prospecto',
  'leads': 'prospecto',
  'potencial': 'prospecto',
  'em_prospecção': 'prospecto',
  'em_prospeccao': 'prospecto',
  'interessado': 'prospecto',

  // Parte Contrária
  'parte_contraria': 'parte_contraria',
  'parte contraria': 'parte_contraria',
  'parte contrária': 'parte_contraria',
  'parte_contrária': 'parte_contraria',
  'partecontraria': 'parte_contraria',
  'adversario': 'parte_contraria',
  'adversário': 'parte_contraria',
  'reu': 'parte_contraria',
  'réu': 'parte_contraria',
  'reclamado': 'parte_contraria',
  'reclamada': 'parte_contraria',
  'executado': 'parte_contraria',
  'executada': 'parte_contraria',
  'devedor': 'parte_contraria',
  'devedora': 'parte_contraria',
  'banco': 'parte_contraria',
  'empresa': 'parte_contraria',
  'instituicao': 'parte_contraria',
  'instituição': 'parte_contraria',

  // Correspondente
  'correspondente': 'correspondente',
  'correspondentes': 'correspondente',
  'corresp': 'correspondente',
  'parceiro': 'correspondente',
  'parceira': 'correspondente',
  'advogado_parceiro': 'correspondente',
  'advogado parceiro': 'correspondente',
  'escritorio_parceiro': 'correspondente',
  'escritório parceiro': 'correspondente',

  // Testemunha
  'testemunha': 'testemunha',
  'testemunhas': 'testemunha',
  'test': 'testemunha',

  // Perito
  'perito': 'perito',
  'peritos': 'perito',
  'perita': 'perito',
  'expert': 'perito',
  'especialista': 'perito',
  'assistente_tecnico': 'perito',
  'assistente técnico': 'perito',

  // Juiz
  'juiz': 'juiz',
  'juiza': 'juiz',
  'juíza': 'juiz',
  'magistrado': 'juiz',
  'magistrada': 'juiz',
  'desembargador': 'juiz',
  'desembargadora': 'juiz',
  'ministro': 'juiz',
  'ministra': 'juiz',

  // Promotor
  'promotor': 'promotor',
  'promotora': 'promotor',
  'promotores': 'promotor',
  'mp': 'promotor',
  'ministerio_publico': 'promotor',
  'ministério público': 'promotor',
  'procurador': 'promotor',
  'procuradora': 'promotor',

  // Outros
  'outros': 'outros',
  'outro': 'outros',
  'other': 'outros',
  'diverso': 'outros',
  'diversos': 'outros',
  'indefinido': 'outros',
  'nao_informado': 'outros',
  'não informado': 'outros',
  'n/a': 'outros',
  'na': 'outros',
  '-': 'outros',
  '': 'outros',
}

/**
 * Normaliza o valor de tipo_contato para um dos valores válidos do sistema
 *
 * @example
 * normalizarTipoContato("|cliente") // "cliente"
 * normalizarTipoContato("CLIENTE") // "cliente"
 * normalizarTipoContato("Lead") // "prospecto"
 * normalizarTipoContato("Réu") // "parte_contraria"
 * normalizarTipoContato("Banco Santander") // "parte_contraria"
 */
export function normalizarTipoContato(valor: string | null | undefined): TipoContato {
  if (!valor) return 'cliente' // Default

  // Limpar o valor
  let limpo = valor
    .toString()
    .trim()
    .toLowerCase()
    // Remover caracteres especiais no início/fim (|, /, \, etc.)
    .replace(/^[|/\\,;:\-_\s]+/, '')
    .replace(/[|/\\,;:\-_\s]+$/, '')
    // Remover múltiplos espaços
    .replace(/\s+/g, ' ')
    // Converter underscores e hífens para espaços para comparação
    .replace(/[_-]/g, ' ')
    .trim()

  // Se ficou vazio após limpeza
  if (!limpo) return 'cliente'

  // Busca direta no mapeamento
  const mapeadoDireto = MAPEAMENTO_TIPO_CONTATO[limpo]
  if (mapeadoDireto) return mapeadoDireto

  // Tentar sem espaços (para "partecontraria" etc.)
  const semEspacos = limpo.replace(/\s/g, '')
  const mapeadoSemEspacos = MAPEAMENTO_TIPO_CONTATO[semEspacos]
  if (mapeadoSemEspacos) return mapeadoSemEspacos

  // Tentar com underscore (para "parte_contraria" etc.)
  const comUnderscore = limpo.replace(/\s/g, '_')
  const mapeadoComUnderscore = MAPEAMENTO_TIPO_CONTATO[comUnderscore]
  if (mapeadoComUnderscore) return mapeadoComUnderscore

  // Busca parcial - verificar se contém palavras-chave
  for (const [chave, tipo] of Object.entries(MAPEAMENTO_TIPO_CONTATO)) {
    // Se o valor contém a chave ou a chave contém o valor
    if (limpo.includes(chave) || chave.includes(limpo)) {
      return tipo
    }
  }

  // Heurísticas adicionais para identificar parte_contraria (bancos, empresas)
  const PALAVRAS_PARTE_CONTRARIA = [
    'santander', 'itau', 'itaú', 'bradesco', 'caixa', 'bb', 'brasil',
    'nubank', 'inter', 'original', 'pan', 'bmg', 'safra', 'votorantim',
    'telefonica', 'claro', 'vivo', 'tim', 'oi', 'net', 'sky',
    'enel', 'cpfl', 'light', 'cemig', 'copel', 'celesc',
    'sabesp', 'sanepar', 'copasa', 'cedae',
    'inss', 'prefeitura', 'estado', 'união', 'municipio', 'município',
    'detran', 'receita', 'fazenda',
    's/a', 's.a.', 'sa', 'ltda', 'eireli', 'me', 'epp',
  ]

  for (const palavra of PALAVRAS_PARTE_CONTRARIA) {
    if (limpo.includes(palavra)) {
      return 'parte_contraria'
    }
  }

  // Se não encontrou nada, retorna 'outros' para não perder dados
  // Mas poderia ser 'cliente' como default mais seguro
  return 'outros'
}

/**
 * Verifica se um valor de tipo_contato é válido
 */
export function isTipoContatoValido(valor: string): boolean {
  return TIPOS_CONTATO_VALIDOS.includes(valor as TipoContato)
}

/**
 * Obtém sugestão de normalização para tipo_contato
 * Retorna o valor original se já for válido, ou a sugestão de normalização
 */
export function sugerirTipoContato(valor: string | null | undefined): {
  original: string
  sugerido: TipoContato
  precisaNormalizar: boolean
} {
  const original = valor?.toString() || ''
  const sugerido = normalizarTipoContato(valor)
  const precisaNormalizar = original.toLowerCase().trim() !== sugerido

  return { original, sugerido, precisaNormalizar }
}
