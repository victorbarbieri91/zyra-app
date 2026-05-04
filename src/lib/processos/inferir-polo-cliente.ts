import type { ParteNormalizada } from '@/lib/escavador/types'

export interface ClienteParaMatch {
  id: string
  nome_completo: string
  cpf_cnpj?: string | null
}

export interface ResultadoInferenciaPolo {
  poloCliente: 'ativo' | 'passivo'
  parteContraria: string
  matchPor: 'documento' | 'nome' | 'fallback_heuristica'
  parteEncontrada: ParteNormalizada | null
}

const limparDoc = (v?: string | null) => (v || '').replace(/\D/g, '')

const normalizarNome = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Determina em qual polo o cliente do escritório está baseado nas partes do
 * Escavador. Match em 3 níveis: CPF/CNPJ → nome normalizado → fallback heurística.
 *
 * Quando o cliente não é encontrado entre as partes, cai no comportamento legado
 * (polo definido pela presença de partes ativas) — mas o caller deveria avisar
 * o usuário, pois esse caminho pode invertir autor/réu para clientes que estão
 * no polo passivo.
 */
export function inferirPoloCliente(
  cliente: ClienteParaMatch | null | undefined,
  partes: ParteNormalizada[],
): ResultadoInferenciaPolo {
  const ativas = partes.filter((p) => p.polo === 'ativo')
  const passivas = partes.filter((p) => p.polo === 'passivo')

  if (!cliente) {
    return {
      poloCliente: ativas.length > 0 ? 'ativo' : 'passivo',
      parteContraria: passivas[0]?.nome || ativas[0]?.nome || '',
      matchPor: 'fallback_heuristica',
      parteEncontrada: null,
    }
  }

  let parteMatch: ParteNormalizada | null = null
  let matchPor: ResultadoInferenciaPolo['matchPor'] = 'fallback_heuristica'

  const docCliente = limparDoc(cliente.cpf_cnpj)
  if (docCliente.length >= 11) {
    parteMatch = partes.find((p) => limparDoc(p.documento) === docCliente) || null
    if (parteMatch) matchPor = 'documento'
  }

  if (!parteMatch) {
    const nomeCli = normalizarNome(cliente.nome_completo)
    if (nomeCli.length >= 3) {
      parteMatch =
        partes.find((p) => {
          const nomeP = normalizarNome(p.nome)
          return nomeP.includes(nomeCli) || nomeCli.includes(nomeP)
        }) || null
      if (parteMatch) matchPor = 'nome'
    }
  }

  if (!parteMatch || (parteMatch.polo !== 'ativo' && parteMatch.polo !== 'passivo')) {
    return {
      poloCliente: ativas.length > 0 ? 'ativo' : 'passivo',
      parteContraria: passivas[0]?.nome || ativas[0]?.nome || '',
      matchPor: 'fallback_heuristica',
      parteEncontrada: parteMatch,
    }
  }

  const polo = parteMatch.polo
  const oposto = polo === 'ativo' ? passivas : ativas
  const parteContraria = oposto[0]?.nome || ''

  return {
    poloCliente: polo,
    parteContraria,
    matchPor,
    parteEncontrada: parteMatch,
  }
}
