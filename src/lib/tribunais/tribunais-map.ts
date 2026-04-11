/**
 * Mapa de tribunais do Brasil inteiro.
 *
 * Chave: `${segmento}.${tr}` onde segmento é o dígito J do CNJ e tr é o código
 * do tribunal (ambos strings com zero-padding quando aplicável).
 *
 * Cobertura:
 * - Tribunais Superiores (STF, STJ, TST, TSE, STM)
 * - Justiça Federal (TRF1..TRF6)
 * - Justiça do Trabalho (TRT1..TRT24)
 * - Justiça Estadual (TJAC..TJTO, 27 tribunais)
 * - Justiça Eleitoral e Militar têm cobertura mínima (raros)
 */

import type { CnjParsed, SistemaTribunal, TribunalConfig } from './types'

/**
 * Decide o sistema do TJSP com base no primeiro dígito do sequencial.
 * - '4' → eproc (sistema novo a partir de 2025)
 * - outros → e-SAJ (sistema padrão)
 *
 * Este é o único tribunal com ambiguidade estrutural entre dois sistemas
 * vivos. A regra é heurística — pode ser sobrescrita pelo cache DataJud.
 */
function resolveTjspSistema(parsed: CnjParsed): SistemaTribunal {
  return parsed.primeiroDigito === '4' ? 'eproc' : 'saj'
}

export const TRIBUNAIS_MAP: Record<string, TribunalConfig> = {
  // ============================================================================
  // TRIBUNAIS SUPERIORES (segmento 1, 2, 3)
  // ============================================================================
  '1.00': {
    sigla: 'STF',
    nome: 'Supremo Tribunal Federal',
    sistemaDefault: 'proprio',
    // STF tem landing com pesquisa pelo número
    pjeUrl: 'https://portal.stf.jus.br/processos/',
  },
  '3.00': {
    sigla: 'STJ',
    nome: 'Superior Tribunal de Justiça',
    sistemaDefault: 'proprio',
    // STJ suporta deep-link via query string
    pjeUrl: 'https://processo.stj.jus.br/processo/pesquisa/?aplicacao=processos.ea',
  },

  // ============================================================================
  // JUSTIÇA FEDERAL (segmento 4) — TRF1..TRF6
  // ============================================================================
  '4.01': {
    sigla: 'TRF1',
    nome: 'Tribunal Regional Federal da 1ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje1g.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam',
  },
  '4.02': {
    sigla: 'TRF2',
    nome: 'Tribunal Regional Federal da 2ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trf2.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '4.03': {
    sigla: 'TRF3',
    nome: 'Tribunal Regional Federal da 3ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '4.04': {
    sigla: 'TRF4',
    nome: 'Tribunal Regional Federal da 4ª Região',
    sistemaDefault: 'eproc',
    eprocUrl: 'https://eproc.trf4.jus.br/eproc2trf4/',
  },
  '4.05': {
    sigla: 'TRF5',
    nome: 'Tribunal Regional Federal da 5ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '4.06': {
    sigla: 'TRF6',
    nome: 'Tribunal Regional Federal da 6ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje1g.trf6.jus.br/pje/ConsultaPublica/listView.seam',
  },

  // ============================================================================
  // JUSTIÇA DO TRABALHO (segmento 5)
  // ============================================================================
  // TR=00 é o TST
  '5.00': {
    sigla: 'TST',
    nome: 'Tribunal Superior do Trabalho',
    sistemaDefault: 'proprio',
    pjeUrl: 'https://pje.tst.jus.br/consultaprocessual/',
  },
  '5.01': {
    sigla: 'TRT1',
    nome: 'Tribunal Regional do Trabalho da 1ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt1.jus.br/consultaprocessual/',
  },
  '5.02': {
    sigla: 'TRT2',
    nome: 'Tribunal Regional do Trabalho da 2ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt2.jus.br/consultaprocessual/',
  },
  '5.03': {
    sigla: 'TRT3',
    nome: 'Tribunal Regional do Trabalho da 3ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt3.jus.br/consultaprocessual/',
  },
  '5.04': {
    sigla: 'TRT4',
    nome: 'Tribunal Regional do Trabalho da 4ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt4.jus.br/consultaprocessual/',
  },
  '5.05': {
    sigla: 'TRT5',
    nome: 'Tribunal Regional do Trabalho da 5ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt5.jus.br/consultaprocessual/',
  },
  '5.06': {
    sigla: 'TRT6',
    nome: 'Tribunal Regional do Trabalho da 6ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt6.jus.br/consultaprocessual/',
  },
  '5.07': {
    sigla: 'TRT7',
    nome: 'Tribunal Regional do Trabalho da 7ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt7.jus.br/consultaprocessual/',
  },
  '5.08': {
    sigla: 'TRT8',
    nome: 'Tribunal Regional do Trabalho da 8ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt8.jus.br/consultaprocessual/',
  },
  '5.09': {
    sigla: 'TRT9',
    nome: 'Tribunal Regional do Trabalho da 9ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt9.jus.br/consultaprocessual/',
  },
  '5.10': {
    sigla: 'TRT10',
    nome: 'Tribunal Regional do Trabalho da 10ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt10.jus.br/consultaprocessual/',
  },
  '5.11': {
    sigla: 'TRT11',
    nome: 'Tribunal Regional do Trabalho da 11ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt11.jus.br/consultaprocessual/',
  },
  '5.12': {
    sigla: 'TRT12',
    nome: 'Tribunal Regional do Trabalho da 12ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt12.jus.br/consultaprocessual/',
  },
  '5.13': {
    sigla: 'TRT13',
    nome: 'Tribunal Regional do Trabalho da 13ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt13.jus.br/consultaprocessual/',
  },
  '5.14': {
    sigla: 'TRT14',
    nome: 'Tribunal Regional do Trabalho da 14ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt14.jus.br/consultaprocessual/',
  },
  '5.15': {
    sigla: 'TRT15',
    nome: 'Tribunal Regional do Trabalho da 15ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt15.jus.br/consultaprocessual/',
  },
  '5.16': {
    sigla: 'TRT16',
    nome: 'Tribunal Regional do Trabalho da 16ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt16.jus.br/consultaprocessual/',
  },
  '5.17': {
    sigla: 'TRT17',
    nome: 'Tribunal Regional do Trabalho da 17ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt17.jus.br/consultaprocessual/',
  },
  '5.18': {
    sigla: 'TRT18',
    nome: 'Tribunal Regional do Trabalho da 18ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt18.jus.br/consultaprocessual/',
  },
  '5.19': {
    sigla: 'TRT19',
    nome: 'Tribunal Regional do Trabalho da 19ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt19.jus.br/consultaprocessual/',
  },
  '5.20': {
    sigla: 'TRT20',
    nome: 'Tribunal Regional do Trabalho da 20ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt20.jus.br/consultaprocessual/',
  },
  '5.21': {
    sigla: 'TRT21',
    nome: 'Tribunal Regional do Trabalho da 21ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt21.jus.br/consultaprocessual/',
  },
  '5.22': {
    sigla: 'TRT22',
    nome: 'Tribunal Regional do Trabalho da 22ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt22.jus.br/consultaprocessual/',
  },
  '5.23': {
    sigla: 'TRT23',
    nome: 'Tribunal Regional do Trabalho da 23ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt23.jus.br/consultaprocessual/',
  },
  '5.24': {
    sigla: 'TRT24',
    nome: 'Tribunal Regional do Trabalho da 24ª Região',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.trt24.jus.br/consultaprocessual/',
  },

  // ============================================================================
  // JUSTIÇA ELEITORAL (segmento 6)
  // ============================================================================
  '6.00': {
    sigla: 'TSE',
    nome: 'Tribunal Superior Eleitoral',
    sistemaDefault: 'proprio',
    pjeUrl: 'https://www.tse.jus.br/servicos-eleitorais/processos',
  },

  // ============================================================================
  // JUSTIÇA ESTADUAL (segmento 8) — 27 tribunais (TJAC=01 até TJTO=27)
  // ============================================================================
  '8.01': {
    sigla: 'TJAC',
    nome: 'Tribunal de Justiça do Acre',
    sistemaDefault: 'pje',
    pjeUrl: 'https://esaj.tjac.jus.br/cpopg/open.do',
    sajDomain: 'esaj.tjac.jus.br',
  },
  '8.02': {
    sigla: 'TJAL',
    nome: 'Tribunal de Justiça de Alagoas',
    sistemaDefault: 'saj',
    sajDomain: 'www2.tjal.jus.br',
  },
  '8.03': {
    sigla: 'TJAP',
    nome: 'Tribunal de Justiça do Amapá',
    sistemaDefault: 'saj',
    sajDomain: 'tucujuris.tjap.jus.br',
  },
  '8.04': {
    sigla: 'TJAM',
    nome: 'Tribunal de Justiça do Amazonas',
    sistemaDefault: 'saj',
    sajDomain: 'consultasaj.tjam.jus.br',
  },
  '8.05': {
    sigla: 'TJBA',
    nome: 'Tribunal de Justiça da Bahia',
    sistemaDefault: 'saj',
    sajDomain: 'esaj.tjba.jus.br',
  },
  '8.06': {
    sigla: 'TJCE',
    nome: 'Tribunal de Justiça do Ceará',
    sistemaDefault: 'saj',
    sajDomain: 'esaj.tjce.jus.br',
  },
  '8.07': {
    sigla: 'TJDFT',
    nome: 'Tribunal de Justiça do Distrito Federal e Territórios',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.08': {
    sigla: 'TJES',
    nome: 'Tribunal de Justiça do Espírito Santo',
    sistemaDefault: 'pje',
    pjeUrl: 'https://sistemas.tjes.jus.br/ConsultaPublicaPJE/ConsultaPublica/listView.seam',
  },
  '8.09': {
    sigla: 'TJGO',
    nome: 'Tribunal de Justiça de Goiás',
    sistemaDefault: 'projudi',
    projudiUrl: 'https://projudi.tjgo.jus.br/BuscaProcesso',
  },
  '8.10': {
    sigla: 'TJMA',
    nome: 'Tribunal de Justiça do Maranhão',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.11': {
    sigla: 'TJMT',
    nome: 'Tribunal de Justiça do Mato Grosso',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.12': {
    sigla: 'TJMS',
    nome: 'Tribunal de Justiça do Mato Grosso do Sul',
    sistemaDefault: 'saj',
    sajDomain: 'esaj.tjms.jus.br',
  },
  '8.13': {
    sigla: 'TJMG',
    nome: 'Tribunal de Justiça de Minas Gerais',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje-consulta-publica.tjmg.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.14': {
    sigla: 'TJPA',
    nome: 'Tribunal de Justiça do Pará',
    sistemaDefault: 'pje',
    pjeUrl: 'https://consultas.tjpa.jus.br/consultaprocessoportal/pages/secure/abrirProcesso.faces',
  },
  '8.15': {
    sigla: 'TJPB',
    nome: 'Tribunal de Justiça da Paraíba',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.16': {
    sigla: 'TJPR',
    nome: 'Tribunal de Justiça do Paraná',
    sistemaDefault: 'projudi',
    projudiUrl: 'https://projudi.tjpr.jus.br/projudi/',
  },
  '8.17': {
    sigla: 'TJPE',
    nome: 'Tribunal de Justiça de Pernambuco',
    sistemaDefault: 'saj',
    sajDomain: 'srv01.tjpe.jus.br/consultaprocessualunificada',
  },
  '8.18': {
    sigla: 'TJPI',
    nome: 'Tribunal de Justiça do Piauí',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjpi.jus.br/1g/ConsultaPublica/listView.seam',
  },
  '8.19': {
    sigla: 'TJRJ',
    nome: 'Tribunal de Justiça do Rio de Janeiro',
    sistemaDefault: 'pje',
    pjeUrl: 'https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.20': {
    sigla: 'TJRN',
    nome: 'Tribunal de Justiça do Rio Grande do Norte',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje1g.tjrn.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.21': {
    sigla: 'TJRS',
    nome: 'Tribunal de Justiça do Rio Grande do Sul',
    sistemaDefault: 'eproc',
    eprocUrl: 'https://eproc1g.tjrs.jus.br/eproc/',
  },
  '8.22': {
    sigla: 'TJRO',
    nome: 'Tribunal de Justiça de Rondônia',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pjepg-consulta.tjro.jus.br/consulta/ConsultaPublica/listView.seam',
  },
  '8.23': {
    sigla: 'TJRR',
    nome: 'Tribunal de Justiça de Roraima',
    sistemaDefault: 'pje',
    pjeUrl: 'https://pje.tjrr.jus.br/pje/ConsultaPublica/listView.seam',
  },
  '8.24': {
    sigla: 'TJSC',
    nome: 'Tribunal de Justiça de Santa Catarina',
    sistemaDefault: 'eproc',
    eprocUrl: 'https://eproc1g.tjsc.jus.br/eproc/',
    sajDomain: 'esaj.tjsc.jus.br',
  },
  '8.25': {
    sigla: 'TJSE',
    nome: 'Tribunal de Justiça de Sergipe',
    sistemaDefault: 'pje',
    pjeUrl: 'https://www.tjse.jus.br/portaljustica/pages/consulta-processual',
  },
  '8.26': {
    sigla: 'TJSP',
    nome: 'Tribunal de Justiça de São Paulo',
    sistemaDefault: 'saj', // fallback; resolveSistema decide caso a caso
    sajDomain: 'esaj.tjsp.jus.br',
    eprocUrl: 'https://eproc1g.tjsp.jus.br/eproc',
    resolveSistema: resolveTjspSistema,
  },
  '8.27': {
    sigla: 'TJTO',
    nome: 'Tribunal de Justiça do Tocantins',
    sistemaDefault: 'eproc',
    eprocUrl: 'https://eproc1.tjto.jus.br/eprocV2_prod_1grau/',
  },
}

/**
 * Busca a configuração do tribunal pelo par (segmento, tr) do CNJ.
 * Retorna null se o tribunal não está mapeado.
 */
export function getTribunalConfig(
  segmento: string,
  tr: string
): TribunalConfig | null {
  const key = `${segmento}.${tr}`
  return TRIBUNAIS_MAP[key] ?? null
}
