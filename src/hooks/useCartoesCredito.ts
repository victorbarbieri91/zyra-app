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
    total_despesas: number
    dias_para_fechamento: number
    dias_para_vencimento: number
  } | null
}

export interface DespesaCartao {
  id: string
  escritorio_id: string
  cartao_id: string
  descricao: string
  categoria: string
  fornecedor: string | null
  valor_total: number
  numero_parcelas: number
  valor_parcela: number
  data_compra: string
  processo_id: string | null
  documento_fiscal: string | null
  comprovante_url: string | null
  importado_de_fatura: boolean
  hash_transacao: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // Campos de JOIN
  cartao_nome?: string
  cartao_banco?: string
  processo_numero?: string
}

export interface ParcelaCartao {
  id: string
  despesa_id: string
  fatura_id: string | null
  numero_parcela: number
  valor: number
  mes_referencia: string
  faturada: boolean
  created_at: string
  // Campos de JOIN
  despesa_descricao?: string
  despesa_categoria?: string
  despesa_fornecedor?: string
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
  total_parcelas?: number
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

export interface DespesaCartaoFormData {
  cartao_id: string
  descricao: string
  categoria: string
  fornecedor: string
  valor_total: number
  numero_parcelas: number
  data_compra: string
  processo_id: string | null
  documento_fiscal: string | null
  observacoes: string | null
}

// =====================================================
// CATEGORIAS DE DESPESA DO CARTÃO
// =====================================================

// Valores padronizados conforme v_financeiro_enums
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
  { value: 'outros', label: 'Outros' },
]

// Bandeiras conforme v_financeiro_enums
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
  '#64748b', // Slate-500 (neutro elegante)
  '#78716c', // Stone-500 (terroso suave)
  '#57534e', // Stone-600 (marrom fosco)
  '#52525b', // Zinc-600 (cinza chumbo)
  '#4b5563', // Gray-600 (cinza médio)
  '#334155', // Slate-700 (azul acinzentado)
  '#374151', // Gray-700 (grafite)
  '#44403c', // Stone-700 (marrom escuro)
  '#3f3f46', // Zinc-700 (chumbo escuro)
  '#1e293b', // Slate-800 (quase preto)
]

// =====================================================
// HOOK
// =====================================================

export function useCartoesCredito(escritorioIdOrIds: string | string[] | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalizar para sempre ter um array de IDs - usando useMemo para estabilidade
  const escritorioIds = useMemo(() => {
    if (Array.isArray(escritorioIdOrIds)) {
      return escritorioIdOrIds.filter(Boolean)
    }
    return escritorioIdOrIds ? [escritorioIdOrIds] : []
  }, [escritorioIdOrIds ? (Array.isArray(escritorioIdOrIds) ? escritorioIdOrIds.join(',') : escritorioIdOrIds) : ''])

  // Manter compatibilidade - pegar primeiro ID para operações de escrita
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

      // Carregar cartões
      const { data: cartoes, error: cartoesError } = await supabase
        .from('cartoes_credito')
        .select('*, escritorios(nome)')
        .in('escritorio_id', escritorioIds)
        .eq('ativo', true)
        .order('nome')

      if (cartoesError) throw cartoesError

      // Para cada cartão, buscar fatura atual
      const cartoesComFatura: CartaoComFaturaAtual[] = await Promise.all(
        (cartoes || []).map(async (cartao: any) => {
          const { data: faturaAtual } = await supabase
            .rpc('obter_fatura_atual_cartao', { p_cartao_id: cartao.id })

          // Mapear dados da fatura
          const faturaData = faturaAtual?.[0]
          const faturaFormatada = faturaData ? {
            fatura_id: faturaData.fatura_id,
            mes_referencia: faturaData.mes_referencia,
            data_fechamento: faturaData.data_fechamento,
            data_vencimento: faturaData.data_vencimento,
            valor_total: Number(faturaData.valor_total) || 0,
            status: faturaData.status,
            total_despesas: Number(faturaData.total_despesas) || 0,
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

      // Soft delete - apenas desativa
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
  // DESPESAS DO CARTÃO
  // ============================================

  const loadDespesas = useCallback(async (
    cartaoId?: string,
    mesReferencia?: string
  ): Promise<DespesaCartao[]> => {
    if (escritorioIds.length === 0) return []

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito_despesas')
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
        // Filtrar por mês de referência (despesas que têm parcelas nesse mês)
        const inicioMes = mesReferencia.substring(0, 7) + '-01'
        const fimMes = new Date(new Date(inicioMes).setMonth(new Date(inicioMes).getMonth() + 1) - 1)
          .toISOString().split('T')[0]
        query = query.gte('data_compra', inicioMes).lte('data_compra', fimMes)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Processar dados
      return (data || []).map((d: any) => ({
        ...d,
        cartao_nome: d.cartoes_credito?.nome,
        cartao_banco: d.cartoes_credito?.banco,
        processo_numero: d.processos_processos?.numero_cnj,
      }))
    } catch (err: any) {
      console.error('Erro ao carregar despesas:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, supabase])

  const createDespesa = useCallback(async (data: DespesaCartaoFormData): Promise<string | null> => {
    if (!escritorioIdPrincipal) return null

    try {
      setLoading(true)
      setError(null)

      // Usar função do banco que cria despesa e parcelas
      const { data: despesaId, error: rpcError } = await supabase
        .rpc('criar_despesa_cartao', {
          p_cartao_id: data.cartao_id,
          p_descricao: data.descricao,
          p_categoria: data.categoria,
          p_fornecedor: data.fornecedor || null,
          p_valor_total: data.valor_total,
          p_numero_parcelas: data.numero_parcelas,
          p_data_compra: data.data_compra,
          p_processo_id: data.processo_id || null,
          p_documento_fiscal: data.documento_fiscal || null,
          p_observacoes: data.observacoes || null,
          p_importado_de_fatura: false,
        })

      if (rpcError) throw rpcError

      return despesaId
    } catch (err: any) {
      console.error('Erro ao criar despesa:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioIdPrincipal, supabase])

  const deleteDespesa = useCallback(async (despesaId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Verifica se alguma parcela já foi faturada
      const { data: parcelas } = await supabase
        .from('cartoes_credito_parcelas')
        .select('id, faturada')
        .eq('despesa_id', despesaId)
        .eq('faturada', true)

      if (parcelas && parcelas.length > 0) {
        throw new Error('Não é possível excluir despesa com parcelas já faturadas')
      }

      const { error: deleteError } = await supabase
        .from('cartoes_credito_despesas')
        .delete()
        .eq('id', despesaId)

      if (deleteError) throw deleteError

      return true
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ============================================
  // PARCELAS
  // ============================================

  const loadParcelas = useCallback(async (
    cartaoId: string,
    mesReferencia?: string
  ): Promise<ParcelaCartao[]> => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('cartoes_credito_parcelas')
        .select(`
          *,
          cartoes_credito_despesas(descricao, categoria, fornecedor, cartao_id)
        `)
        .order('mes_referencia', { ascending: true })
        .order('numero_parcela', { ascending: true })

      // Filtrar por despesas do cartão
      const { data: despesas } = await supabase
        .from('cartoes_credito_despesas')
        .select('id')
        .eq('cartao_id', cartaoId)

      if (!despesas || despesas.length === 0) return []

      const despesaIds = despesas.map(d => d.id)
      query = query.in('despesa_id', despesaIds)

      if (mesReferencia) {
        query = query.eq('mes_referencia', mesReferencia)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      return (data || []).map((p: any) => ({
        ...p,
        despesa_descricao: p.cartoes_credito_despesas?.descricao,
        despesa_categoria: p.cartoes_credito_despesas?.categoria,
        despesa_fornecedor: p.cartoes_credito_despesas?.fornecedor,
      }))
    } catch (err: any) {
      console.error('Erro ao carregar parcelas:', err)
      setError(err.message)
      return []
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

      // Contar parcelas por fatura
      const faturasComParcelas = await Promise.all(
        (data || []).map(async (f: any) => {
          const { count } = await supabase
            .from('cartoes_credito_parcelas')
            .select('*', { count: 'exact', head: true })
            .eq('fatura_id', f.id)

          return {
            ...f,
            cartao_nome: f.cartoes_credito?.nome,
            cartao_banco: f.cartoes_credito?.banco,
            total_parcelas: count || 0,
          }
        })
      )

      return faturasComParcelas
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

      // Buscar fatura para pegar despesa_id
      const { data: fatura } = await supabase
        .from('cartoes_credito_faturas')
        .select('despesa_id')
        .eq('id', faturaId)
        .single()

      if (!fatura?.despesa_id) {
        throw new Error('Fatura não possui despesa vinculada')
      }

      // Atualizar despesa como paga
      const { error: despesaError } = await supabase
        .from('financeiro_despesas')
        .update({
          status: 'pago',
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
          forma_pagamento: formaPagamento,
        })
        .eq('id', fatura.despesa_id)

      if (despesaError) throw despesaError

      // O trigger vai atualizar a fatura automaticamente

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
      // Calcular hash
      const hash = `${dataCompra}|${descricao.toLowerCase().trim()}|${valor.toFixed(2)}`
      const hashMd5 = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(hash)
      ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))

      const { data } = await supabase
        .from('cartoes_credito_despesas')
        .select('id')
        .eq('cartao_id', cartaoId)
        .eq('hash_transacao', hashMd5.substring(0, 32))

      return (data || []).length > 0
    } catch {
      return false
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
    // Despesas
    loadDespesas,
    createDespesa,
    deleteDespesa,
    // Parcelas
    loadParcelas,
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
  }
}
