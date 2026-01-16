/**
 * Normalizador de dados da API Escavador para o sistema Zyra
 *
 * A API do Escavador retorna dados na estrutura:
 * - data.fontes[0].capa -> dados da capa do processo
 * - data.fontes[0].envolvidos -> partes e advogados
 * - data.titulo_polo_ativo / titulo_polo_passivo -> nomes das partes principais
 */

import type {
  EscavadorProcessoResponse,
  EscavadorFonte,
  EscavadorCapa,
  EscavadorEnvolvido,
  ProcessoEscavadorNormalizado,
  ParteNormalizada,
  AdvogadoNormalizado
} from './types'

// ============================================
// CONFIGURACAO DE AREAS
// ============================================

/**
 * Regras para inferir area juridica pela classe/assuntos
 */
const AREAS_POR_PALAVRAS: Array<{ palavras: string[]; area: string }> = [
  { palavras: ['trabalhista', 'reclamacao', 'clt', 'trabalho'], area: 'Trabalhista' },
  { palavras: ['familia', 'divorcio', 'alimentos', 'guarda', 'interdição', 'casamento', 'uniao estavel'], area: 'Família' },
  { palavras: ['criminal', 'penal', 'crime', 'delito', 'prisao', 'habeas corpus'], area: 'Criminal' },
  { palavras: ['tributar', 'fiscal', 'imposto', 'tributo', 'icms', 'iss', 'iptu'], area: 'Tributária' },
  { palavras: ['consumidor', 'cdc', 'defesa do consumidor'], area: 'Consumidor' },
  { palavras: ['empresar', 'falencia', 'recuperacao judicial', 'societar'], area: 'Empresarial' },
  { palavras: ['ambiental', 'meio ambiente', 'florestal'], area: 'Ambiental' },
  { palavras: ['previdencia', 'aposentadoria', 'inss', 'beneficio'], area: 'Previdenciária' },
  { palavras: ['administrativ', 'licitacao', 'concurso', 'servidor'], area: 'Administrativa' }
]

// ============================================
// FUNCOES DE NORMALIZACAO
// ============================================

/**
 * Normaliza a resposta completa do processo da API Escavador
 *
 * IMPORTANTE: Os dados vem em fontes[0].capa e fontes[0].envolvidos
 */
export function normalizarProcessoEscavador(
  data: EscavadorProcessoResponse
): ProcessoEscavadorNormalizado {
  // DEBUG: Log da estrutura recebida
  console.log('[Normalizer] Dados recebidos:', JSON.stringify(data, null, 2).slice(0, 2000))
  console.log('[Normalizer] Fontes:', data.fontes?.length || 0)
  if (data.fontes?.[0]) {
    console.log('[Normalizer] Fonte[0].capa:', data.fontes[0].capa ? 'existe' : 'null')
    console.log('[Normalizer] Fonte[0].envolvidos:', data.fontes[0].envolvidos?.length || 0)
  }

  // Encontra a fonte principal (TRIBUNAL)
  const fontePrincipal = encontrarFontePrincipal(data.fontes || [])
  const capa = fontePrincipal?.capa || null

  // Envolvidos: primeiro tenta da fonte, depois do root (fallback do client)
  const envolvidos = fontePrincipal?.envolvidos?.length
    ? fontePrincipal.envolvidos
    : ((data as unknown as { envolvidos?: EscavadorEnvolvido[] }).envolvidos || [])

  console.log('[Normalizer] Fonte principal:', fontePrincipal ? 'encontrada' : 'null')
  console.log('[Normalizer] Capa:', capa ? 'existe' : 'null')
  console.log('[Normalizer] Envolvidos encontrados:', envolvidos.length)

  // Formata o numero CNJ
  const numeroCNJ = formatarNumeroCNJ(data.numero_cnj || '')

  // Extrai tribunal da fonte ou do numero CNJ
  const tribunal = fontePrincipal?.tribunal?.sigla || extrairTribunalDoCNJ(numeroCNJ)
  const tribunalNome = fontePrincipal?.tribunal?.nome || tribunal

  // Determina o tipo de processo
  const tipo = inferirTipoProcesso(capa)

  // Extrai classe e assunto
  const classe = capa?.classe || ''
  const assunto = capa?.assunto || ''

  // DEBUG: Log dos campos da capa
  if (capa) {
    console.log('[Normalizer] Capa.classe:', capa.classe)
    console.log('[Normalizer] Capa.assunto:', capa.assunto)
    console.log('[Normalizer] Capa.area:', capa.area)
    console.log('[Normalizer] Capa.orgao_julgador:', capa.orgao_julgador)
    console.log('[Normalizer] Capa.valor_causa:', JSON.stringify(capa.valor_causa))
  }

  // Extrai assunto principal normalizado
  const assuntoPrincipal = capa?.assunto_principal_normalizado?.nome ||
                           capa?.assuntos_normalizados?.[0]?.nome ||
                           assunto

  // Infere a area juridica
  const area = inferirArea(classe, assunto)

  // Extrai orgao julgador
  const orgaoJulgador = capa?.orgao_julgador || ''
  const vara = capa?.orgao_julgador_normalizado?.nome || orgaoJulgador
  const comarca = capa?.orgao_julgador_normalizado?.cidade ||
                  data.unidade_origem?.cidade || ''
  const estado = capa?.orgao_julgador_normalizado?.estado?.sigla ||
                 data.estado_origem?.sigla || ''
  const cidade = capa?.orgao_julgador_normalizado?.cidade ||
                 data.unidade_origem?.cidade || ''

  // Extrai juiz das informacoes complementares
  const juiz = extrairJuiz(capa?.informacoes_complementares)

  // Extrai valor da causa
  const valorCausa = capa?.valor_causa?.valor
    ? parseFloat(capa.valor_causa.valor.replace(/[^\d,.-]/g, '').replace(',', '.'))
    : null
  const valorCausaFormatado = capa?.valor_causa?.valor_formatado || null

  // Extrai grau/instancia
  const grau = fontePrincipal?.grau || 1
  const instancia = mapearInstancia(grau, fontePrincipal?.grau_formatado)

  // Normaliza partes/envolvidos
  const partes = normalizarPartes(envolvidos)

  // URL do processo
  const urlProcesso = fontePrincipal?.url || null

  // Monta dados normalizados
  return {
    // Identificacao
    numero_cnj: numeroCNJ,

    // Titulos das partes (direto da API)
    titulo_polo_ativo: data.titulo_polo_ativo || '',
    titulo_polo_passivo: data.titulo_polo_passivo || '',

    // Classificacao
    tipo,
    area,
    classe,
    assunto,
    assunto_principal: assuntoPrincipal,

    // Localizacao
    tribunal,
    tribunal_nome: tribunalNome,
    instancia,
    grau,
    comarca,
    vara,
    orgao_julgador: orgaoJulgador,
    estado,
    cidade,
    url_processo: urlProcesso,

    // Datas
    data_distribuicao: formatarData(capa?.data_distribuicao) || formatarData(data.data_inicio),
    data_inicio: formatarData(data.data_inicio),
    data_ultima_movimentacao: formatarData(data.data_ultima_movimentacao),

    // Valores
    valor_causa: valorCausa,
    valor_causa_formatado: valorCausaFormatado,

    // Status
    situacao: capa?.situacao || null,
    segredo_justica: fontePrincipal?.segredo_justica || false,
    status_predito: fontePrincipal?.status_predito || null,

    // Juiz
    juiz,

    // Partes
    partes,

    // Metadados
    fonte_id: fontePrincipal?.id || null,
    quantidade_movimentacoes: data.quantidade_movimentacoes || 0,
    consultado_em: new Date().toISOString()
  }
}

/**
 * Encontra a fonte principal (tipo TRIBUNAL) na lista de fontes
 */
function encontrarFontePrincipal(fontes: EscavadorFonte[]): EscavadorFonte | null {
  if (!fontes || fontes.length === 0) return null

  // Prioriza fontes do tipo TRIBUNAL
  const fonteTribunal = fontes.find(f => f.tipo === 'TRIBUNAL')
  if (fonteTribunal) return fonteTribunal

  // Fallback para primeira fonte
  return fontes[0]
}

/**
 * Extrai o juiz das informacoes complementares
 */
function extrairJuiz(informacoes: Array<{ tipo: string; valor: string }> | null | undefined): string | null {
  if (!informacoes || !Array.isArray(informacoes)) return null

  const infoJuiz = informacoes.find(i =>
    i.tipo?.toLowerCase().includes('juiz') ||
    i.tipo?.toLowerCase().includes('magistrado') ||
    i.tipo?.toLowerCase().includes('relator')
  )

  return infoJuiz?.valor || null
}

/**
 * Infere o tipo de processo (judicial, administrativo, arbitragem)
 */
function inferirTipoProcesso(capa: EscavadorCapa | null): 'judicial' | 'administrativo' | 'arbitragem' {
  if (!capa) return 'judicial'

  const classe = (capa.classe || '').toLowerCase()
  const area = (capa.area || '').toLowerCase()

  if (classe.includes('administrativ') || area.includes('administrativ')) {
    return 'administrativo'
  }

  if (classe.includes('arbitr')) {
    return 'arbitragem'
  }

  return 'judicial'
}

/**
 * Infere a area juridica com base na classe e assunto
 */
function inferirArea(classe: string, assunto: string): string {
  const textoBusca = `${classe} ${assunto}`.toLowerCase()

  for (const config of AREAS_POR_PALAVRAS) {
    if (config.palavras.some(palavra => textoBusca.includes(palavra.toLowerCase()))) {
      return config.area
    }
  }

  // Default
  return 'Cível'
}

/**
 * Extrai tribunal do numero CNJ
 */
function extrairTribunalDoCNJ(numeroCNJ: string): string {
  const limpo = numeroCNJ.replace(/[.-]/g, '')
  if (limpo.length !== 20) return ''

  const J = limpo.charAt(13)
  const TR = limpo.substring(14, 16)

  const tribunais: Record<string, Record<string, string>> = {
    '8': { // Estadual
      '26': 'TJSP', '19': 'TJRJ', '13': 'TJMG', '21': 'TJRS',
      '16': 'TJPR', '24': 'TJSC', '05': 'TJBA', '06': 'TJCE',
      '07': 'TJDFT', '08': 'TJES', '09': 'TJGO', '10': 'TJMA',
      '11': 'TJMT', '12': 'TJMS', '14': 'TJPA', '15': 'TJPB',
      '17': 'TJPE', '18': 'TJPI', '20': 'TJRN', '22': 'TJRO',
      '23': 'TJRR', '25': 'TJSE', '27': 'TJTO', '01': 'TJAC',
      '02': 'TJAL', '03': 'TJAP', '04': 'TJAM'
    },
    '4': { // Federal
      '01': 'TRF1', '02': 'TRF2', '03': 'TRF3', '04': 'TRF4', '05': 'TRF5', '06': 'TRF6'
    },
    '5': { // Trabalhista
      '01': 'TRT1', '02': 'TRT2', '03': 'TRT3', '04': 'TRT4', '05': 'TRT5',
      '06': 'TRT6', '07': 'TRT7', '08': 'TRT8', '09': 'TRT9', '10': 'TRT10',
      '11': 'TRT11', '12': 'TRT12', '13': 'TRT13', '14': 'TRT14', '15': 'TRT15',
      '16': 'TRT16', '17': 'TRT17', '18': 'TRT18', '19': 'TRT19', '20': 'TRT20',
      '21': 'TRT21', '22': 'TRT22', '23': 'TRT23', '24': 'TRT24', '00': 'TST'
    }
  }

  if (tribunais[J]?.[TR]) {
    return tribunais[J][TR]
  }

  // Tribunais superiores
  if (J === '1') return 'STF'
  if (J === '2') return 'CNJ'
  if (J === '3') return 'STJ'

  return ''
}

/**
 * Mapeia o grau para instancia do sistema
 */
function mapearInstancia(grau?: number, grauFormatado?: string): string {
  if (grauFormatado) {
    const formato = grauFormatado.toLowerCase()
    if (formato.includes('1') || formato.includes('primeiro') || formato.includes('origem')) return '1ª'
    if (formato.includes('2') || formato.includes('segundo')) return '2ª'
    if (formato.includes('3') || formato.includes('terceiro')) return '3ª'
    if (formato.includes('stj') || formato.includes('superior')) return 'STJ'
    if (formato.includes('stf') || formato.includes('supremo')) return 'STF'
  }

  if (grau) {
    if (grau === 1) return '1ª'
    if (grau === 2) return '2ª'
    if (grau === 3) return '3ª'
  }

  return '1ª' // Default
}

/**
 * Normaliza lista de partes/envolvidos
 */
function normalizarPartes(envolvidos: EscavadorEnvolvido[]): ParteNormalizada[] {
  const partes: ParteNormalizada[] = []

  for (const env of envolvidos) {
    // Pega o tipo (ex: "Reqte", "Reqdo", "Advogado")
    const tipo = env.tipo || ''
    const tipoNormalizado = env.tipo_normalizado || tipo

    // Ignora advogados na lista principal (serao associados as partes)
    if (tipoNormalizado.toLowerCase().includes('advogado')) {
      continue
    }

    // Normaliza polo
    const polo = normalizarPolo(env.polo, tipoNormalizado)

    // Extrai advogados da parte
    const advogados: AdvogadoNormalizado[] = (env.advogados || []).map(adv => {
      // Extrai OAB do array de oabs
      const oabPrincipal = adv.oabs?.[0]
      return {
        nome: adv.nome,
        oab: oabPrincipal ? `${oabPrincipal.numero}` : null,
        oab_uf: oabPrincipal?.uf || null
      }
    })

    partes.push({
      nome: env.nome,
      tipo_pessoa: normalizarTipoPessoa(env.tipo_pessoa),
      tipo_participacao: tipoNormalizado,
      tipo_normalizado: tipoNormalizado,
      polo,
      documento: env.cpf || env.cnpj || null,
      advogados
    })
  }

  return partes
}

/**
 * Normaliza o polo da parte
 */
function normalizarPolo(
  polo: string | undefined,
  tipoNormalizado: string
): 'ativo' | 'passivo' | 'terceiro' | 'outro' {
  const poloUpper = (polo || '').toUpperCase()
  const tipoUpper = tipoNormalizado.toUpperCase()

  if (poloUpper === 'ATIVO' ||
      tipoUpper.includes('AUTOR') ||
      tipoUpper.includes('REQUERENTE') ||
      tipoUpper.includes('EXEQUENTE') ||
      tipoUpper.includes('RECLAMANTE') ||
      tipoUpper.includes('IMPETRANTE')) {
    return 'ativo'
  }

  if (poloUpper === 'PASSIVO' ||
      tipoUpper.includes('REU') ||
      tipoUpper.includes('RÉU') ||
      tipoUpper.includes('REQUERIDO') ||
      tipoUpper.includes('EXECUTADO') ||
      tipoUpper.includes('RECLAMADO') ||
      tipoUpper.includes('IMPETRADO')) {
    return 'passivo'
  }

  if (poloUpper === 'TERCEIRO' ||
      tipoUpper.includes('TERCEIRO') ||
      tipoUpper.includes('INTERESSADO') ||
      tipoUpper.includes('ASSISTENTE')) {
    return 'terceiro'
  }

  return 'outro'
}

/**
 * Normaliza tipo de pessoa
 */
function normalizarTipoPessoa(tipo?: string): 'fisica' | 'juridica' | 'desconhecido' {
  if (!tipo) return 'desconhecido'

  const tipoUpper = tipo.toUpperCase()
  if (tipoUpper === 'FISICA' || tipoUpper === 'PF' || tipoUpper === 'PESSOA FÍSICA') return 'fisica'
  if (tipoUpper === 'JURIDICA' || tipoUpper === 'PJ' || tipoUpper === 'PESSOA JURÍDICA') return 'juridica'

  return 'desconhecido'
}

/**
 * Formata o numero CNJ no padrao NNNNNNN-DD.AAAA.J.TR.OOOO
 */
function formatarNumeroCNJ(numero: string): string {
  // Remove tudo que nao e digito
  const digits = numero.replace(/\D/g, '')

  if (digits.length !== 20) return numero

  // Formata: NNNNNNN-DD.AAAA.J.TR.OOOO
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`
}

/**
 * Formata data para ISO string (YYYY-MM-DD)
 */
function formatarData(data?: string | null): string | null {
  if (!data) return null

  try {
    // Se ja esta no formato ISO completo
    if (data.includes('T')) {
      return data.split('T')[0]
    }

    // Se esta no formato DD/MM/YYYY
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/')
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    }

    // Se esta no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data
    }

    return data
  } catch {
    return null
  }
}

// ============================================
// FUNCOES DE UTILIDADE
// ============================================

/**
 * Extrai a parte contraria do processo baseado no polo do cliente
 */
export function extrairParteContraria(
  partes: ParteNormalizada[],
  poloCliente: 'ativo' | 'passivo'
): ParteNormalizada | null {
  const poloContrario = poloCliente === 'ativo' ? 'passivo' : 'ativo'

  return partes.find(p => p.polo === poloContrario) || null
}

/**
 * Formata valor monetario para exibicao
 */
export function formatarValorCausa(valor: number | null): string {
  if (valor === null || valor === undefined) return '-'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

/**
 * Formata data para exibicao no padrao brasileiro
 */
export function formatarDataExibicao(dataISO: string | null): string {
  if (!dataISO) return '-'

  try {
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  } catch {
    return dataISO
  }
}
