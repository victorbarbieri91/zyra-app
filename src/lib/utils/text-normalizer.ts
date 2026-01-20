/**
 * Utilitário para normalizar textos jurídicos
 * Converte textos em MAIÚSCULAS ou sem acentuação para formato correto
 */

// Mapeamento de termos jurídicos comuns para sua forma correta
const TERMOS_JURIDICOS: Record<string, string> = {
  // Tipos de movimentação
  'PUBLICACAO': 'Publicação',
  'PUBLICACOES': 'Publicações',
  'DISTRIBUICAO': 'Distribuição',
  'DISTRIBUICOES': 'Distribuições',
  'CONCLUSAO': 'Conclusão',
  'CONCLUSOES': 'Conclusões',
  'REMESSA': 'Remessa',
  'REMESSAS': 'Remessas',
  'DECISAO': 'Decisão',
  'DECISOES': 'Decisões',
  'DESPACHO': 'Despacho',
  'DESPACHOS': 'Despachos',
  'SENTENCA': 'Sentença',
  'SENTENCAS': 'Sentenças',
  'ACORDAO': 'Acórdão',
  'ACORDAOS': 'Acórdãos',
  'PETICAO': 'Petição',
  'PETICOES': 'Petições',
  'CITACAO': 'Citação',
  'CITACOES': 'Citações',
  'INTIMACAO': 'Intimação',
  'INTIMACOES': 'Intimações',
  'AUDIENCIA': 'Audiência',
  'AUDIENCIAS': 'Audiências',
  'JULGAMENTO': 'Julgamento',
  'JULGAMENTOS': 'Julgamentos',
  'RECURSO': 'Recurso',
  'RECURSOS': 'Recursos',
  'APELACAO': 'Apelação',
  'APELACOES': 'Apelações',
  'AGRAVO': 'Agravo',
  'AGRAVOS': 'Agravos',
  'EMBARGO': 'Embargo',
  'EMBARGOS': 'Embargos',
  'EXECUCAO': 'Execução',
  'EXECUCOES': 'Execuções',
  'PENHORA': 'Penhora',
  'PENHORAS': 'Penhoras',
  'LEILAO': 'Leilão',
  'LEILOES': 'Leilões',
  'AVALIACAO': 'Avaliação',
  'AVALIACOES': 'Avaliações',
  'PERICIA': 'Perícia',
  'PERICIAS': 'Perícias',
  'LAUDO': 'Laudo',
  'LAUDOS': 'Laudos',
  'CERTIDAO': 'Certidão',
  'CERTIDOES': 'Certidões',
  'MANDADO': 'Mandado',
  'MANDADOS': 'Mandados',
  'OFICIO': 'Ofício',
  'OFICIOS': 'Ofícios',
  'ALVARA': 'Alvará',
  'ALVARAS': 'Alvarás',
  'TRANSITO': 'Trânsito',
  'TRANSITO EM JULGADO': 'Trânsito em Julgado',
  'ARQUIVAMENTO': 'Arquivamento',
  'DESARQUIVAMENTO': 'Desarquivamento',
  'BAIXA': 'Baixa',
  'REDISTRIBUICAO': 'Redistribuição',
  'SUSPENSAO': 'Suspensão',
  'REATIVACAO': 'Reativação',
  'COMUNICACAO': 'Comunicação',
  'MANIFESTACAO': 'Manifestação',
  'CONTESTACAO': 'Contestação',
  'IMPUGNACAO': 'Impugnação',
  'RECONVENCAO': 'Reconvenção',
  'DENUNCIA': 'Denúncia',
  'QUEIXA': 'Queixa',
  'PRONUNCIA': 'Pronúncia',
  'ABSOLVICAO': 'Absolvição',
  'CONDENACAO': 'Condenação',
  'PRESCRICAO': 'Prescrição',
  'DECADENCIA': 'Decadência',
  'PRECLUSAO': 'Preclusão',
  'HOMOLOGACAO': 'Homologação',
  'RETIFICACAO': 'Retificação',
  'ADITAMENTO': 'Aditamento',
  'EMENDA': 'Emenda',
  'DESISTENCIA': 'Desistência',
  'RENUNCIA': 'Renúncia',
  'TRANSACAO': 'Transação',
  'CONCILIACAO': 'Conciliação',
  'MEDIACAO': 'Mediação',
  'ARBITRAGEM': 'Arbitragem',

  // Artigos e preposições (para manter minúsculas no meio de frases)
  ' DE ': ' de ',
  ' DA ': ' da ',
  ' DO ': ' do ',
  ' DAS ': ' das ',
  ' DOS ': ' dos ',
  ' EM ': ' em ',
  ' NA ': ' na ',
  ' NO ': ' no ',
  ' NAS ': ' nas ',
  ' NOS ': ' nos ',
  ' E ': ' e ',
  ' OU ': ' ou ',
  ' A ': ' a ',
  ' O ': ' o ',
  ' AS ': ' as ',
  ' OS ': ' os ',
  ' PARA ': ' para ',
  ' POR ': ' por ',
  ' COM ': ' com ',
  ' SEM ': ' sem ',
  ' AO ': ' ao ',
  ' AOS ': ' aos ',
  ' À ': ' à ',
  ' ÀS ': ' às ',

  // Termos específicos
  'PROCESSO': 'Processo',
  'CADASTRADO': 'Cadastrado',
  'RECEBIDO': 'Recebido',
  'ENVIADO': 'Enviado',
  'ANEXADO': 'Anexado',
  'JUNTADO': 'Juntado',
  'PROTOCOLADO': 'Protocolado',
  'EXPEDIDO': 'Expedido',
  'CUMPRIDO': 'Cumprido',
  'DEVOLVIDO': 'Devolvido',
  'DIGITALIZADO': 'Digitalizado',
  'AUTUADO': 'Autuado',
}

/**
 * Converte texto para Title Case (primeira letra de cada palavra maiúscula)
 */
function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Normaliza um termo jurídico para sua forma correta
 * @param texto - Texto a ser normalizado
 * @returns Texto normalizado com acentuação e capitalização corretas
 */
export function normalizarTermoJuridico(texto: string | null | undefined): string {
  if (!texto) return ''

  // Remove espaços extras
  let resultado = texto.trim().replace(/\s+/g, ' ')

  // Verifica se o texto está todo em maiúsculas
  const estaEmMaiusculas = resultado === resultado.toUpperCase() && resultado !== resultado.toLowerCase()

  // Se está em maiúsculas, primeiro converte para title case
  if (estaEmMaiusculas) {
    // Verifica se existe mapeamento direto
    const upper = resultado.toUpperCase()
    if (TERMOS_JURIDICOS[upper]) {
      return TERMOS_JURIDICOS[upper]
    }

    // Converte para title case
    resultado = toTitleCase(resultado)
  }

  // Aplica substituições de termos conhecidos (para partes do texto)
  for (const [termo, correcao] of Object.entries(TERMOS_JURIDICOS)) {
    // Cria regex case-insensitive para encontrar o termo
    const regex = new RegExp(`\\b${termo}\\b`, 'gi')
    resultado = resultado.replace(regex, correcao)
  }

  // Garante que a primeira letra é maiúscula
  if (resultado.length > 0) {
    resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1)
  }

  return resultado
}

/**
 * Normaliza texto completo de movimentação (conteúdo)
 * Aplica correções de acentuação mantendo o formato original
 */
export function normalizarTextoMovimentacao(texto: string | null | undefined): string {
  if (!texto) return ''

  let resultado = texto.trim()

  // Se o texto inteiro está em maiúsculas, converte para capitalização normal
  if (resultado === resultado.toUpperCase() && resultado.length > 10) {
    resultado = toTitleCase(resultado)
    // Corrige início de frases após pontuação
    resultado = resultado.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) =>
      punct + letter.toUpperCase()
    )
  }

  // Aplica correções de acentuação para palavras comuns
  const CORRECOES_ACENTUACAO: Record<string, string> = {
    'peticao': 'petição',
    'citacao': 'citação',
    'intimacao': 'intimação',
    'decisao': 'decisão',
    'sentenca': 'sentença',
    'acordao': 'acórdão',
    'publicacao': 'publicação',
    'distribuicao': 'distribuição',
    'conclusao': 'conclusão',
    'audiencia': 'audiência',
    'advogado': 'advogado',
    'juiz': 'juiz',
    'juiza': 'juíza',
    'requerente': 'requerente',
    'requerido': 'requerido',
    'autor': 'autor',
    'reu': 'réu',
    'execucao': 'execução',
    'apelacao': 'apelação',
    'recurso': 'recurso',
    'julgamento': 'julgamento',
    'transito': 'trânsito',
    'certidao': 'certidão',
    'mandado': 'mandado',
    'oficio': 'ofício',
    'notificacao': 'notificação',
    'manifestacao': 'manifestação',
    'contestacao': 'contestação',
    'impugnacao': 'impugnação',
    'homologacao': 'homologação',
  }

  for (const [incorreto, correto] of Object.entries(CORRECOES_ACENTUACAO)) {
    // Substitui versões sem acento mantendo a capitalização
    const regex = new RegExp(`\\b${incorreto}\\b`, 'gi')
    resultado = resultado.replace(regex, (match) => {
      // Mantém a capitalização original
      if (match === match.toUpperCase()) {
        return correto.toUpperCase()
      } else if (match[0] === match[0].toUpperCase()) {
        return correto.charAt(0).toUpperCase() + correto.slice(1)
      }
      return correto
    })
  }

  return resultado
}
