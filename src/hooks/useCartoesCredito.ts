import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// INTERFACES
// =====================================================

export interface CartaoCredito {
  id: string
  escritorio_id: string
  nome: string
  banco: string
  bandeira: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners' | 'outra'
  ultimos_digitos: string
  dia_vencimento: number
  dias_antes_fechamento: number
  limite_total: number | null
  cor: string
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface CartaoComFaturaAtual extends CartaoCredito {
  escritorio_nome?: string
  fatura_atual: {
    fatura_id: string | null
    mes_referencia: string
    data_fechamento: string
    data_vencimento: string
    valor_total: number
    status: 'aberta' | 'fechada' | 'paga' | 'cancelada'
    total_lancamentos: number
    total_despesas: number
    dias_para_fechamento: number
    dias_para_vencimento: number
  } | null
}

// Nova interface para lançamentos unificados
export interface LancamentoCartao {
  id: string
  escritorio_id: string
  cartao_id: string
  fatura_id: string | null
  descricao: string
  categoria: string
  fornecedor: string | null
  valor: number
  tipo: 'unica' | 'parcelada' | 'recorrente'
  parcela_numero: number
  parcela_total: number
  compra_id: string
  data_compra: string
  mes_referencia: string
  recorrente_ativo: boolean
  recorrente_data_fim: string | null
  faturado: boolean
  importado_de_fatura: boolean
  hash_transacao: string | null
  processo_id: string | null
  documento_fiscal: string | null
  comprovante_url: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // Campos de JOIN
  cartao_nome?: string
  cartao_banco?: string
  processo_numero?: string
}

export interface FaturaCartao {
  id: string
  escritorio_id: string
  cartao_id: string
  mes_referencia: string
  data_fechamento: string
  data_vencimento: string
  valor_total: number
  despesa_id: string | null
  status: 'aberta' | 'fechada' | 'paga' | 'cancelada'
  pdf_url: string | null
  data_pagamento: string | null
  forma_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // Campos de JOIN
  cartao_nome?: string
  cartao_banco?: string
  total_lancamentos?: number
}

export interface ImportacaoFatura {
  id: string
  escritorio_id: string
  cartao_id: string
  fatura_id: string | null
  arquivo_nome: string
  arquivo_url: string
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  transacoes_encontradas: number
  transacoes_importadas: number
  transacoes_duplicadas: number
  modelo_ia: string | null
  confianca_media: number | null
  erro_mensagem: string | null
  erro_detalhes: any
  dados_extraidos: any
  processado_em: string | null
  created_at: string
}

export interface CartaoFormData {
  nome: string
  banco: string
  bandeira: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners' | 'outra'
  ultimos_digitos: string
  dia_vencimento: number
  dias_antes_fechamento: number
  limite_total: number | null
  cor: string
  observacoes: string | null
}

// Nova interface para criar lançamentos
export interface LancamentoFormData {
  cartao_id: string
  descricao: string
  categoria: string
  fornecedor?: string
  valor: number
  tipo: 'unica' | 'parcelada' | 'recorrente'
  parcelas?: number // Para parceladas
  data_compra: string
  mes_referencia?: string // Para importações - força o mês de referência (formato: YYYY-MM-DD)
  processo_id?: string | null
  documento_fiscal?: string | null
  observacoes?: string | null
  importado_de_fatura?: boolean
}

// =====================================================
// CATEGORIAS DE DESPESA DO CARTÃO
// =====================================================

export interface CategoriaCartaoPersonalizada {
  id: string
  escritorio_id: string
  value: string
  label: string
  ativo: boolean
  criado_por: string | null
  created_at: string
}

export const CATEGORIAS_DESPESA_CARTAO = [
  { value: 'custas', label: 'Custas Processuais' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'folha', label: 'Folha de Pagamento' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'capacitacao', label: 'Capacitação' },
  { value: 'material', label: 'Material de Escritório' },
  { value: 'tecnologia', label: 'Tecnologia / Software' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'assinatura', label: 'Assinaturas' },
  { value: 'telefonia', label: 'Telefonia' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'outros', label: 'Outros' },
]

// Função para sanear nome de categoria (capitalizar corretamente)
export function sanearNomeCategoria(nome: string): string {
  if (!nome) return ''
  const nomeLimpo = nome.trim().toLowerCase()
  // Capitaliza a primeira letra de cada palavra
  return nomeLimpo
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ')
}

// Função para gerar value a partir do label (para categorias personalizadas)
export function gerarValueCategoria(label: string): string {
  if (!label) return ''
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
}

export const BANDEIRAS_CARTAO = [
  { value: 'visa', label: 'Visa', cor: '#1A1F71' },
  { value: 'mastercard', label: 'Mastercard', cor: '#EB001B' },
  { value: 'elo', label: 'Elo', cor: '#00A4E0' },
  { value: 'amex', label: 'American Express', cor: '#006FCF' },
  { value: 'hipercard', label: 'Hipercard', cor: '#822124' },
  { value: 'diners', label: 'Diners Club', cor: '#0066B3' },
  { value: 'outra', label: 'Outra', cor: '#64748B' },
]

export const CORES_CARTAO = [
  '#64748b',
  '#78716c',
  '#57534e',
  '#52525b',
  '#4b5563',
  '#334155',
  '#374151',
  '#44403c',
  '#3f3f46',
  '#1e293b',
]

export const TIPOS_LANCAMENTO = [
  { value: 'unica', label: 'À vista', description: 'Compra única, aparece uma vez' },
  { value: 'parcelada', label: 'Parcelado', description: 'Compra em X parcelas' },
  { value: 'recorrente', label: 'Recorrente', description: 'Assinatura mensal (Netflix, etc.)' },
]

// =====================================================
// HOOK
// =====================================================

export function useCartoesCredito(escritorioIdOrIds: string | string[] | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const escritorioIds = useMemo(() => {
    if (Array.isArray(escritorioIdOrIds)) {
      return escritorioIdOrIds.filter(Boolean)
    }
    return escritorioIdOrIds ? [escritorioIdOrIds] : []
  }, [escritorioIdOrIds ? (Array.isArray(escritorioIdOrIds) ? escritorioIdOrIds.join(',') : escritorioIdOrIds) : ''])

  const escritorioIdPrincipal = escritorioIds[0] || null

  // ============================================
  // CARTÕES
  // ============================================

  const loadCartoes = useCallback(async (apenasAtivos = true): Promise<CartaoCredito[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito')
        .select('*')
        .in('escritorio_id', escritorioIds)
        .order('nome')

      if (apenasAtivos) {
        query = query.eq('ativo', true)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar cartões:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const loadCartoesComFaturaAtual = useCallback(async (): Promise<CartaoComFaturaAtual[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      const { data: cartoes, error: cartoesError } = await supabase
        .from('cartoes_credito')
        .select('*, escritorios(nome)')
        .in('escritorio_id', escritorioIds)
        .eq('ativo', true)
        .order('nome')

      if (cartoesError) throw cartoesError

      const cartoesComFatura: CartaoComFaturaAtual[] = await Promise.all(
        (cartoes || []).map(async (cartao: any) => {
          const { data: faturaAtual } = await supabase
            .rpc('obter_fatura_atual_cartao', { p_cartao_id: cartao.id })

          const faturaData = faturaAtual?.[0]
          const faturaFormatada = faturaData ? {
            fatura_id: faturaData.fatura_id,
            mes_referencia: faturaData.mes_referencia,
            data_fechamento: faturaData.data_fechamento,
            data_vencimento: faturaData.data_vencimento,
            valor_total: Number(faturaData.valor_total) || 0,
            status: faturaData.status,
            total_lancamentos: Number(faturaData.total_lancamentos) || 0,
            dias_para_fechamento: faturaData.dias_para_fechamento,
            dias_para_vencimento: faturaData.dias_para_vencimento,
          } : null

          return {
            ...cartao,
            escritorio_nome: cartao.escritorios?.nome,
            fatura_atual: faturaFormatada,
          }
        })
      )

      return cartoesComFatura
    } catch (err: any) {
      console.error('Erro ao carregar cartões com fatura:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const getCartao = useCallback(async (cartaoId: string): Promise<CartaoCredito | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('id', cartaoId)
        .single()

      if (queryError) throw queryError

      return data
    } catch (err: any) {
      console.error('Erro ao buscar cartão:', err)
      setError(err.message)
      return null
    }
  }, [supabase])

  const createCartao = useCallback(async (data: CartaoFormData, escritorioIdOverride?: string): Promise<string | null> => {
    const targetEscritorioId = escritorioIdOverride || escritorioIdPrincipal
    if (!targetEscritorioId) return null

    try {
      setLoading(true)
      setError(null)

      const { data: novoCartao, error: insertError } = await supabase
        .from('cartoes_credito')
        .insert({
          escritorio_id: targetEscritorioId,
          ...data,
        })
        .select()
        .single()

      if (insertError) throw insertError

      return novoCartao.id
    } catch (err: any) {
      console.error('Erro ao criar cartão:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioIdPrincipal, supabase])

  const updateCartao = useCallback(async (cartaoId: string, data: Partial<CartaoFormData>): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('cartoes_credito')
        .update(data)
        .eq('id', cartaoId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao atualizar cartão:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const deleteCartao = useCallback(async (cartaoId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('cartoes_credito')
        .update({ ativo: false })
        .eq('id', cartaoId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao desativar cartão:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // LANÇAMENTOS (NOVA ESTRUTURA UNIFICADA)
  // ============================================

  const loadLancamentosMes = useCallback(async (
    cartaoId: string,
    mesReferencia: string
  ): Promise<LancamentoCartao[]> => {
    try {
      setLoading(true)
      setError(null)

      // Usar função do banco que gera recorrentes automaticamente
      const { data, error: rpcError } = await supabase
        .rpc('obter_lancamentos_mes', {
          p_cartao_id: cartaoId,
          p_mes_referencia: mesReferencia,
        })

      if (rpcError) throw rpcError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar lançamentos:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadLancamentos = useCallback(async (
    cartaoId?: string,
    mesReferencia?: string
  ): Promise<LancamentoCartao[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito_lancamentos')
        .select(`
          *,
          cartoes_credito(nome, banco),
          processos_processos(numero_cnj)
        `)
        .in('escritorio_id', escritorioIds)
        .order('data_compra', { ascending: false })

      if (cartaoId) {
        query = query.eq('cartao_id', cartaoId)
      }

      if (mesReferencia) {
        const mes = mesReferencia.substring(0, 7) + '-01'
        query = query.eq('mes_referencia', mes)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      return (data || []).map((l: any) => ({
        ...l,
        cartao_nome: l.cartoes_credito?.nome,
        cartao_banco: l.cartoes_credito?.banco,
        processo_numero: l.processos_processos?.numero_cnj,
      }))
    } catch (err: any) {
      console.error('Erro ao carregar lançamentos:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const createLancamento = useCallback(async (data: LancamentoFormData): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: compraId, error: rpcError } = await supabase
        .rpc('criar_lancamento_cartao', {
          p_cartao_id: data.cartao_id,
          p_descricao: data.descricao,
          p_categoria: data.categoria,
          p_fornecedor: data.fornecedor || null,
          p_valor: data.valor,
          p_tipo: data.tipo,
          p_parcelas: data.parcelas || 1,
          p_data_compra: data.data_compra,
          p_mes_referencia: data.mes_referencia || null,
          p_processo_id: data.processo_id || null,
          p_documento_fiscal: data.documento_fiscal || null,
          p_observacoes: data.observacoes || null,
          p_importado_de_fatura: data.importado_de_fatura || false,
        })

      if (rpcError) throw rpcError

      return compraId
    } catch (err: any) {
      console.error('Erro ao criar lançamento:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const deleteLancamento = useCallback(async (lancamentoId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: success, error: rpcError } = await supabase
        .rpc('excluir_lancamento_cartao', {
          p_lancamento_id: lancamentoId,
        })

      if (rpcError) throw rpcError

      return success
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const cancelarRecorrente = useCallback(async (compraId: string, dataFim?: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: success, error: rpcError } = await supabase
        .rpc('cancelar_lancamento_recorrente', {
          p_compra_id: compraId,
          p_data_fim: dataFim || new Date().toISOString().split('T')[0],
        })

      if (rpcError) throw rpcError

      return success
    } catch (err: any) {
      console.error('Erro ao cancelar recorrente:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const reativarRecorrente = useCallback(async (compraId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: success, error: rpcError } = await supabase
        .rpc('reativar_lancamento_recorrente', {
          p_compra_id: compraId,
        })

      if (rpcError) throw rpcError

      return success
    } catch (err: any) {
      console.error('Erro ao reativar recorrente:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updateLancamento = useCallback(async (
    lancamentoId: string,
    data: Partial<LancamentoCartao>
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('cartoes_credito_lancamentos')
        .update(data)
        .eq('id', lancamentoId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // FATURAS
  // ============================================

  const loadFaturas = useCallback(async (cartaoId?: string): Promise<FaturaCartao[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito_faturas')
        .select(`
          *,
          cartoes_credito(nome, banco)
        `)
        .in('escritorio_id', escritorioIds)
        .order('mes_referencia', { ascending: false })

      if (cartaoId) {
        query = query.eq('cartao_id', cartaoId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Contar lançamentos por fatura
      const faturasComLancamentos = await Promise.all(
        (data || []).map(async (f: any) => {
          const { count } = await supabase
            .from('cartoes_credito_lancamentos')
            .select('*', { count: 'exact', head: true })
            .eq('fatura_id', f.id)

          return {
            ...f,
            cartao_nome: f.cartoes_credito?.nome,
            cartao_banco: f.cartoes_credito?.banco,
            total_lancamentos: count || 0,
          }
        })
      )

      return faturasComLancamentos
    } catch (err: any) {
      console.error('Erro ao carregar faturas:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const getFatura = useCallback(async (faturaId: string): Promise<FaturaCartao | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from('cartoes_credito_faturas')
        .select(`
          *,
          cartoes_credito(nome, banco)
        `)
        .eq('id', faturaId)
        .single()

      if (queryError) throw queryError

      return {
        ...data,
        cartao_nome: data.cartoes_credito?.nome,
        cartao_banco: data.cartoes_credito?.banco,
      }
    } catch (err: any) {
      console.error('Erro ao buscar fatura:', err)
      setError(err.message)
      return null
    }
  }, [supabase])

  const fecharFatura = useCallback(async (cartaoId: string, mesReferencia: string): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: faturaId, error: rpcError } = await supabase
        .rpc('fechar_fatura_cartao', {
          p_cartao_id: cartaoId,
          p_mes_referencia: mesReferencia,
        })

      if (rpcError) throw rpcError

      return faturaId
    } catch (err: any) {
      console.error('Erro ao fechar fatura:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const pagarFatura = useCallback(async (
    faturaId: string,
    formaPagamento: string,
    dataPagamento?: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: fatura } = await supabase
        .from('cartoes_credito_faturas')
        .select('despesa_id')
        .eq('id', faturaId)
        .single()

      if (!fatura?.despesa_id) {
        throw new Error('Fatura não possui despesa vinculada')
      }

      const { error: despesaError } = await supabase
        .from('financeiro_despesas')
        .update({
          status: 'pago',
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
          forma_pagamento: formaPagamento,
        })
        .eq('id', fatura.despesa_id)

      if (despesaError) throw despesaError

      return true
    } catch (err: any) {
      console.error('Erro ao pagar fatura:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // IMPORTAÇÃO
  // ============================================

  const loadImportacoes = useCallback(async (cartaoId?: string): Promise<ImportacaoFatura[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito_importacoes')
        .select('*')
        .in('escritorio_id', escritorioIds)
        .order('created_at', { ascending: false })

      if (cartaoId) {
        query = query.eq('cartao_id', cartaoId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar importações:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const createImportacao = useCallback(async (
    cartaoId: string,
    arquivoNome: string,
    arquivoUrl: string,
    escritorioIdOverride?: string
  ): Promise<string | null> => {
    const targetEscritorioId = escritorioIdOverride || escritorioIdPrincipal
    if (!targetEscritorioId) return null

    try {
      setLoading(true)
      setError(null)

      const { data, error: insertError } = await supabase
        .from('cartoes_credito_importacoes')
        .insert({
          escritorio_id: targetEscritorioId,
          cartao_id: cartaoId,
          arquivo_nome: arquivoNome,
          arquivo_url: arquivoUrl,
          status: 'pendente',
        })
        .select()
        .single()

      if (insertError) throw insertError

      return data.id
    } catch (err: any) {
      console.error('Erro ao criar importação:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioIdPrincipal, supabase])

  const updateImportacao = useCallback(async (
    importacaoId: string,
    data: Partial<ImportacaoFatura>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('cartoes_credito_importacoes')
        .update(data)
        .eq('id', importacaoId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao atualizar importação:', err)
      setError(err.message)
      return false
    }
  }, [supabase])

  // ============================================
  // UTILITÁRIOS
  // ============================================

  const verificarDuplicata = useCallback(async (
    cartaoId: string,
    dataCompra: string,
    descricao: string,
    valor: number
  ): Promise<boolean> => {
    try {
      const hash = `${dataCompra}|${descricao.toLowerCase().trim()}|${valor.toFixed(2)}`
      const hashMd5 = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(hash)
      ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))

      const { data } = await supabase
        .from('cartoes_credito_lancamentos')
        .select('id')
        .eq('cartao_id', cartaoId)
        .eq('hash_transacao', hashMd5.substring(0, 32))

      return (data || []).length > 0
    } catch {
      return false
    }
  }, [supabase])

  // Verificar se existe fatura para um mês (retorna a fatura se existir)
  const verificarFaturaExistente = useCallback(async (
    cartaoId: string,
    mesReferencia: string // formato: YYYY-MM-01
  ): Promise<FaturaCartao | null> => {
    try {
      const { data, error } = await supabase
        .from('cartoes_credito_faturas')
        .select('*')
        .eq('cartao_id', cartaoId)
        .eq('mes_referencia', mesReferencia)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Erro ao verificar fatura existente:', err)
      return null
    }
  }, [supabase])

  // Vincular lançamentos a uma fatura existente e atualizar o total
  const vincularLancamentosAFatura = useCallback(async (
    faturaId: string,
    lancamentoIds: string[]
  ): Promise<boolean> => {
    try {
      // 1. Vincular os lançamentos à fatura
      const { error: updateError } = await supabase
        .from('cartoes_credito_lancamentos')
        .update({
          fatura_id: faturaId,
          faturado: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', lancamentoIds)

      if (updateError) throw updateError

      // 2. Recalcular o total da fatura
      const { data: lancamentos } = await supabase
        .from('cartoes_credito_lancamentos')
        .select('valor')
        .eq('fatura_id', faturaId)

      const novoTotal = (lancamentos || []).reduce((sum: number, l: { valor: number | string }) => sum + Number(l.valor), 0)

      // 3. Atualizar o valor total da fatura
      const { error: faturaError } = await supabase
        .from('cartoes_credito_faturas')
        .update({
          valor_total: novoTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', faturaId)

      if (faturaError) throw faturaError

      return true
    } catch (err) {
      console.error('Erro ao vincular lançamentos à fatura:', err)
      return false
    }
  }, [supabase])

  // Verificar duplicatas em lote (para importação)
  const verificarDuplicatasEmLote = useCallback(async (
    cartaoId: string,
    transacoes: Array<{ data: string; descricao: string; valor: number }>
  ): Promise<Map<string, boolean>> => {
    const resultados = new Map<string, boolean>()

    for (const t of transacoes) {
      const key = `${t.data}|${t.descricao}|${t.valor}`
      const isDuplicate = await verificarDuplicata(cartaoId, t.data, t.descricao, t.valor)
      resultados.set(key, isDuplicate)
    }

    return resultados
  }, [verificarDuplicata])

  // ============================================
  // AÇÕES EM MASSA
  // ============================================

  // Excluir múltiplos lançamentos de uma vez
  const deleteLancamentosEmMassa = useCallback(async (lancamentoIds: string[]): Promise<number> => {
    if (lancamentoIds.length === 0) return 0

    try {
      setLoading(true)
      setError(null)

      let excluidos = 0
      for (const id of lancamentoIds) {
        const { data: success, error: rpcError } = await supabase
          .rpc('excluir_lancamento_cartao', {
            p_lancamento_id: id,
          })

        if (!rpcError && success) {
          excluidos++
        }
      }

      return excluidos
    } catch (err: any) {
      console.error('Erro ao excluir lançamentos em massa:', err)
      setError(err.message)
      return 0
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Atualizar categoria de múltiplos lançamentos de uma vez
  const atualizarCategoriaEmMassa = useCallback(async (
    lancamentoIds: string[],
    novaCategoria: string
  ): Promise<number> => {
    if (lancamentoIds.length === 0) return 0

    try {
      setLoading(true)
      setError(null)

      const { error: updateError, count } = await supabase
        .from('cartoes_credito_lancamentos')
        .update({ categoria: novaCategoria, updated_at: new Date().toISOString() })
        .in('id', lancamentoIds)

      if (updateError) throw updateError

      return count || lancamentoIds.length
    } catch (err: any) {
      console.error('Erro ao atualizar categorias em massa:', err)
      setError(err.message)
      return 0
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // CATEGORIAS PERSONALIZADAS
  // ============================================

  // Carregar categorias personalizadas do escritório
  const loadCategoriasPersonalizadas = useCallback(async (): Promise<CategoriaCartaoPersonalizada[]> => {
    if (escritorioIds.length === 0) return []

    try {
      const { data, error: queryError } = await supabase
        .from('cartoes_credito_categorias')
        .select('*')
        .in('escritorio_id', escritorioIds)
        .eq('ativo', true)
        .order('label')

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar categorias personalizadas:', err)
      return []
    }
  }, [escritorioIds, supabase])

  // Criar nova categoria personalizada (apenas owner)
  const criarCategoriaPersonalizada = useCallback(async (
    label: string,
    escritorioIdOverride?: string
  ): Promise<CategoriaCartaoPersonalizada | null> => {
    const targetEscritorioId = escritorioIdOverride || escritorioIdPrincipal
    if (!targetEscritorioId) return null

    try {
      setLoading(true)
      setError(null)

      // Sanear o nome
      const labelSaneado = sanearNomeCategoria(label)
      const value = gerarValueCategoria(label)

      if (!labelSaneado || !value) {
        throw new Error('Nome de categoria inválido')
      }

      // Verificar se já existe
      const { data: existente } = await supabase
        .from('cartoes_credito_categorias')
        .select('id')
        .eq('escritorio_id', targetEscritorioId)
        .eq('value', value)
        .maybeSingle()

      if (existente) {
        throw new Error('Esta categoria já existe')
      }

      // Criar a categoria
      const { data, error: insertError } = await supabase
        .from('cartoes_credito_categorias')
        .insert({
          escritorio_id: targetEscritorioId,
          value,
          label: labelSaneado,
          ativo: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      return data
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioIdPrincipal, supabase])

  // Excluir categoria personalizada (desativar)
  const excluirCategoriaPersonalizada = useCallback(async (categoriaId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('cartoes_credito_categorias')
        .update({ ativo: false })
        .eq('id', categoriaId)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      console.error('Erro ao excluir categoria:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    loading,
    error,
    // Cartões
    loadCartoes,
    loadCartoesComFaturaAtual,
    getCartao,
    createCartao,
    updateCartao,
    deleteCartao,
    // Lançamentos (nova estrutura)
    loadLancamentosMes,
    loadLancamentos,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    cancelarRecorrente,
    reativarRecorrente,
    // Faturas
    loadFaturas,
    getFatura,
    fecharFatura,
    pagarFatura,
    // Importação
    loadImportacoes,
    createImportacao,
    updateImportacao,
    // Utilitários
    verificarDuplicata,
    verificarDuplicatasEmLote,
    verificarFaturaExistente,
    vincularLancamentosAFatura,
    // Ações em massa
    deleteLancamentosEmMassa,
    atualizarCategoriaEmMassa,
    // Categorias personalizadas
    loadCategoriasPersonalizadas,
    criarCategoriaPersonalizada,
    excluirCategoriaPersonalizada,
  }
}
