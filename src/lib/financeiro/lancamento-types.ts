/**
 * Tipos compartilhados entre os modais de edição/exclusão de lançamentos.
 * Os modais aceitam um item genérico (ExtratoItem) da página pai e carregam
 * os detalhes completos via Supabase ao abrir.
 */

export type LancamentoTipo = 'despesa' | 'receita'

/**
 * Item mínimo necessário para abrir os modais. Compatível com ExtratoItem
 * da página receitas-despesas (que não expõe regra_recorrencia_id — os modais
 * buscam isso por dentro).
 */
export interface LancamentoRef {
  /** ID do registro em financeiro_despesas ou financeiro_receitas */
  origem_id: string | null
  /** Tipo de movimento — a view retorna esses valores */
  tipo_movimento:
    | 'receita'
    | 'despesa'
    | 'transferencia_saida'
    | 'transferencia_entrada'
    | 'levantamento'
  /** Descrição para exibição no título do modal */
  descricao: string
  /** Valor para exibição */
  valor: number
  /** Status atual */
  status: string
  /** Data de vencimento (string ISO) */
  data_vencimento: string | null
  /** Origem (fatura, nota_debito, etc) — algumas origens não são editáveis */
  origem: string
}

/** Dados completos carregados direto do banco quando abre o modal */
export interface LancamentoDetalhes {
  id: string
  tipo: LancamentoTipo
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: string
  categoria: string
  fornecedor: string | null
  observacoes: string | null
  conta_bancaria_id: string | null
  forma_pagamento: string | null
  pago_por_id: string | null
  regra_recorrencia_id: string | null
  // Metadados da regra (quando houver)
  regra: {
    id: string
    is_parcelamento: boolean
    parcela_total: number | null
    dia_vencimento: number
    frequencia: string
    /** Total de ocorrências afetáveis em toda a série (pendente/agendado/liberado) */
    pendentes_futuras: number
    /** Subconjunto de ocorrências afetáveis com data_vencimento >= a desta instância */
    pendentes_a_partir_desta: number
    /**
     * Data efetiva de corte para o escopo "desta em diante".
     * Quando a instância clicada está pendente/agendado/liberado, é a própria data dela.
     * Quando está pago/cancelado, é a data da PRÓXIMA parcela editável (ignora a clicada).
     * null = não há mais nenhuma parcela editável a partir desta.
     */
    proxima_data_afetavel: string | null
    /** Numero da próxima parcela afetável (parcelamento). null em recorrência ou sem próxima */
    proximo_numero_parcela: number | null
  } | null
}

/** Campos do formulário de edição */
export interface LancamentoEditFormData {
  descricao: string
  valor: number
  data_vencimento: string
  dia_vencimento: number
  categoria: string
  fornecedor: string
  observacoes: string
  conta_bancaria_id: string
  pago_por_id: string
  forma_pagamento: string
  data_pagamento: string
}

export const CATEGORIAS_DESPESA = [
  { value: 'custas', label: 'Custas' },
  { value: 'cartorio', label: 'Cartório' },
  { value: 'oficial_justica', label: 'Oficial de Justiça' },
  { value: 'correios', label: 'Correios' },
  { value: 'copia', label: 'Cópias' },
  { value: 'publicacao', label: 'Publicação' },
  { value: 'certidao', label: 'Certidão' },
  { value: 'protesto', label: 'Protesto' },
  { value: 'honorarios_perito', label: 'Honorários de Perito' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'material', label: 'Material' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'telefonia', label: 'Telefonia' },
  { value: 'folha', label: 'Folha' },
  { value: 'prolabore', label: 'Pró-labore' },
  { value: 'retirada_socios', label: 'Retirada de Sócios' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'taxas_bancarias', label: 'Taxas Bancárias' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'deslocamento', label: 'Deslocamento' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'capacitacao', label: 'Capacitação' },
  { value: 'associacoes', label: 'Associações' },
  { value: 'emprestimos', label: 'Empréstimos' },
  { value: 'juros', label: 'Juros' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'outra', label: 'Outra' },
  { value: 'outros', label: 'Outros' },
] as const

export const CATEGORIAS_RECEITA = [
  { value: 'honorarios', label: 'Honorários' },
  { value: 'custas_reembolsadas', label: 'Custas Reembolsadas' },
  { value: 'exito', label: 'Êxito' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'outros', label: 'Outros' },
] as const

export const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cheque', label: 'Cheque' },
] as const
