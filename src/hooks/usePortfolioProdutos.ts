import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Produto,
  ProdutoCompleto,
  ProdutoCatalogo,
  ProdutoFase,
  ProdutoChecklist,
  ProdutoEquipePapel,
  ProdutoPreco,
  ProdutoRecurso,
  ProdutoFormData,
  ProdutoFaseFormData,
  ProdutoPrecoFormData,
  ProdutosFiltros,
  AreaJuridica,
} from '@/types/portfolio'

// =====================================================
// HOOK: usePortfolioProdutos
// =====================================================

export function usePortfolioProdutos(escritorioId?: string) {
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // Carregar produtos do catálogo
  const loadProdutos = useCallback(async (filtros?: ProdutosFiltros) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('v_portfolio_produtos_catalogo')
        .select('*')
        .order('area_juridica')
        .order('nome')

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      // Aplicar filtros
      if (filtros?.area_juridica?.length) {
        query = query.in('area_juridica', filtros.area_juridica)
      }
      if (filtros?.status?.length) {
        query = query.in('status', filtros.status)
      }
      if (filtros?.complexidade?.length) {
        query = query.in('complexidade', filtros.complexidade)
      }
      if (filtros?.visivel_catalogo !== undefined) {
        query = query.eq('visivel_catalogo', filtros.visivel_catalogo)
      }
      if (filtros?.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,codigo.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setProdutos(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar produtos:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, escritorioId])

  // Carregar produto completo com todas as relações
  const loadProdutoCompleto = async (produtoId: string): Promise<ProdutoCompleto | null> => {
    try {
      // Buscar produto base
      const { data: produto, error: produtoError } = await supabase
        .from('portfolio_produtos')
        .select('*')
        .eq('id', produtoId)
        .single()

      if (produtoError) throw produtoError

      // Buscar fases com checklist
      const { data: fases, error: fasesError } = await supabase
        .from('portfolio_produtos_fases')
        .select('*')
        .eq('produto_id', produtoId)
        .order('ordem')

      if (fasesError) throw fasesError

      // Buscar checklist de cada fase
      const fasesComChecklist = await Promise.all(
        (fases || []).map(async (fase) => {
          const { data: checklist } = await supabase
            .from('portfolio_produtos_checklist')
            .select('*')
            .eq('fase_id', fase.id)
            .order('ordem')

          return { ...fase, checklist: checklist || [] }
        })
      )

      // Buscar preços
      const { data: precos, error: precosError } = await supabase
        .from('portfolio_produtos_precos')
        .select('*')
        .eq('produto_id', produtoId)

      if (precosError) throw precosError

      // Buscar papéis da equipe
      const { data: papeis, error: papeisError } = await supabase
        .from('portfolio_produtos_equipe_papeis')
        .select('*')
        .eq('produto_id', produtoId)

      if (papeisError) throw papeisError

      // Buscar recursos
      const { data: recursos, error: recursosError } = await supabase
        .from('portfolio_produtos_recursos')
        .select('*')
        .eq('produto_id', produtoId)

      if (recursosError) throw recursosError

      return {
        ...produto,
        fases: fasesComChecklist,
        precos: precos || [],
        papeis_equipe: papeis || [],
        recursos: recursos || [],
      }
    } catch (err) {
      console.error('Erro ao carregar produto completo:', err)
      return null
    }
  }

  // Criar novo produto
  const criarProduto = async (data: ProdutoFormData): Promise<Produto | null> => {
    try {
      // Gerar código automaticamente se não fornecido
      let codigo = data.codigo
      if (!codigo) {
        const { data: codigoGerado } = await supabase.rpc('gerar_codigo_portfolio', {
          p_escritorio_id: escritorioId,
          p_tipo: 'produto',
          p_area: data.area_juridica,
        })
        codigo = codigoGerado
      }

      const { data: produto, error } = await supabase
        .from('portfolio_produtos')
        .insert({
          escritorio_id: escritorioId,
          codigo,
          nome: data.nome,
          descricao: data.descricao,
          descricao_comercial: data.descricao_comercial,
          area_juridica: data.area_juridica,
          categoria: data.categoria,
          tags: data.tags,
          icone: data.icone,
          cor: data.cor,
          duracao_estimada_dias: data.duracao_estimada_dias,
          complexidade: data.complexidade,
          visivel_catalogo: data.visivel_catalogo ?? false,
        })
        .select()
        .single()

      if (error) throw error

      await loadProdutos()
      return produto
    } catch (err) {
      console.error('Erro ao criar produto:', err)
      throw err
    }
  }

  // Atualizar produto
  const atualizarProduto = async (produtoId: string, data: Partial<ProdutoFormData>): Promise<Produto | null> => {
    try {
      const { data: produto, error } = await supabase
        .from('portfolio_produtos')
        .update(data)
        .eq('id', produtoId)
        .select()
        .single()

      if (error) throw error

      await loadProdutos()
      return produto
    } catch (err) {
      console.error('Erro ao atualizar produto:', err)
      throw err
    }
  }

  // Deletar produto
  const deletarProduto = async (produtoId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_produtos')
        .delete()
        .eq('id', produtoId)

      if (error) throw error

      await loadProdutos()
    } catch (err) {
      console.error('Erro ao deletar produto:', err)
      throw err
    }
  }

  // =====================================================
  // FASES
  // =====================================================

  const adicionarFase = async (produtoId: string, data: ProdutoFaseFormData): Promise<ProdutoFase | null> => {
    try {
      // Determinar próxima ordem
      const { data: fases } = await supabase
        .from('portfolio_produtos_fases')
        .select('ordem')
        .eq('produto_id', produtoId)
        .order('ordem', { ascending: false })
        .limit(1)

      const proximaOrdem = fases?.length ? fases[0].ordem + 1 : 1

      const { data: fase, error } = await supabase
        .from('portfolio_produtos_fases')
        .insert({
          produto_id: produtoId,
          ordem: data.ordem ?? proximaOrdem,
          nome: data.nome,
          descricao: data.descricao,
          duracao_estimada_dias: data.duracao_estimada_dias,
          prazo_tipo: data.prazo_tipo ?? 'dias_uteis',
          fase_dependencia_id: data.fase_dependencia_id,
          criar_evento_agenda: data.criar_evento_agenda ?? false,
          evento_titulo_template: data.evento_titulo_template,
          evento_descricao_template: data.evento_descricao_template,
          cor: data.cor,
          icone: data.icone,
        })
        .select()
        .single()

      if (error) throw error
      return fase
    } catch (err) {
      console.error('Erro ao adicionar fase:', err)
      throw err
    }
  }

  const atualizarFase = async (faseId: string, data: Partial<ProdutoFaseFormData>): Promise<ProdutoFase | null> => {
    try {
      const { data: fase, error } = await supabase
        .from('portfolio_produtos_fases')
        .update(data)
        .eq('id', faseId)
        .select()
        .single()

      if (error) throw error
      return fase
    } catch (err) {
      console.error('Erro ao atualizar fase:', err)
      throw err
    }
  }

  const deletarFase = async (faseId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_produtos_fases')
        .delete()
        .eq('id', faseId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao deletar fase:', err)
      throw err
    }
  }

  const reordenarFases = async (produtoId: string, faseIds: string[]): Promise<void> => {
    try {
      // Atualizar ordem de cada fase
      await Promise.all(
        faseIds.map((faseId, index) =>
          supabase
            .from('portfolio_produtos_fases')
            .update({ ordem: index + 1 })
            .eq('id', faseId)
        )
      )
    } catch (err) {
      console.error('Erro ao reordenar fases:', err)
      throw err
    }
  }

  // =====================================================
  // CHECKLIST
  // =====================================================

  const adicionarChecklistItem = async (
    faseId: string,
    item: string,
    obrigatorio: boolean = false
  ): Promise<ProdutoChecklist | null> => {
    try {
      // Determinar próxima ordem
      const { data: items } = await supabase
        .from('portfolio_produtos_checklist')
        .select('ordem')
        .eq('fase_id', faseId)
        .order('ordem', { ascending: false })
        .limit(1)

      const proximaOrdem = items?.length ? items[0].ordem + 1 : 1

      const { data: checklistItem, error } = await supabase
        .from('portfolio_produtos_checklist')
        .insert({
          fase_id: faseId,
          ordem: proximaOrdem,
          item,
          obrigatorio,
        })
        .select()
        .single()

      if (error) throw error
      return checklistItem
    } catch (err) {
      console.error('Erro ao adicionar item ao checklist:', err)
      throw err
    }
  }

  const atualizarChecklistItem = async (
    itemId: string,
    data: Partial<ProdutoChecklist>
  ): Promise<ProdutoChecklist | null> => {
    try {
      const { data: item, error } = await supabase
        .from('portfolio_produtos_checklist')
        .update(data)
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return item
    } catch (err) {
      console.error('Erro ao atualizar item do checklist:', err)
      throw err
    }
  }

  const deletarChecklistItem = async (itemId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_produtos_checklist')
        .delete()
        .eq('id', itemId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao deletar item do checklist:', err)
      throw err
    }
  }

  // =====================================================
  // PREÇOS
  // =====================================================

  const adicionarPreco = async (produtoId: string, data: ProdutoPrecoFormData): Promise<ProdutoPreco | null> => {
    try {
      const { data: preco, error } = await supabase
        .from('portfolio_produtos_precos')
        .insert({
          produto_id: produtoId,
          tipo: data.tipo,
          valor_fixo: data.valor_fixo,
          valor_minimo: data.valor_minimo,
          valor_maximo: data.valor_maximo,
          valor_hora: data.valor_hora,
          horas_estimadas: data.horas_estimadas,
          percentual_exito: data.percentual_exito,
          valores_por_fase: data.valores_por_fase,
          nome_opcao: data.nome_opcao,
          descricao: data.descricao,
          ativo: data.ativo ?? true,
          padrao: data.padrao ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return preco
    } catch (err) {
      console.error('Erro ao adicionar preço:', err)
      throw err
    }
  }

  const atualizarPreco = async (precoId: string, data: Partial<ProdutoPrecoFormData>): Promise<ProdutoPreco | null> => {
    try {
      const { data: preco, error } = await supabase
        .from('portfolio_produtos_precos')
        .update(data)
        .eq('id', precoId)
        .select()
        .single()

      if (error) throw error
      return preco
    } catch (err) {
      console.error('Erro ao atualizar preço:', err)
      throw err
    }
  }

  const deletarPreco = async (precoId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_produtos_precos')
        .delete()
        .eq('id', precoId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao deletar preço:', err)
      throw err
    }
  }

  // =====================================================
  // PAPÉIS DA EQUIPE
  // =====================================================

  const adicionarPapel = async (
    produtoId: string,
    nome: string,
    descricao?: string,
    obrigatorio: boolean = false
  ): Promise<ProdutoEquipePapel | null> => {
    try {
      const { data: papel, error } = await supabase
        .from('portfolio_produtos_equipe_papeis')
        .insert({
          produto_id: produtoId,
          nome,
          descricao,
          obrigatorio,
        })
        .select()
        .single()

      if (error) throw error
      return papel
    } catch (err) {
      console.error('Erro ao adicionar papel:', err)
      throw err
    }
  }

  const deletarPapel = async (papelId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_produtos_equipe_papeis')
        .delete()
        .eq('id', papelId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao deletar papel:', err)
      throw err
    }
  }

  // =====================================================
  // VERSIONAMENTO
  // =====================================================

  const criarVersao = async (produtoId: string, alteracoes?: string, motivo?: string): Promise<number> => {
    try {
      const { data: novaVersao, error } = await supabase.rpc('criar_versao_produto', {
        p_produto_id: produtoId,
        p_alteracoes: alteracoes,
        p_motivo: motivo,
      })

      if (error) throw error
      return novaVersao
    } catch (err) {
      console.error('Erro ao criar versão:', err)
      throw err
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  const getProdutosPorArea = useCallback((): Record<AreaJuridica, ProdutoCatalogo[]> => {
    const agrupado: Record<AreaJuridica, ProdutoCatalogo[]> = {
      tributario: [],
      societario: [],
      trabalhista: [],
      civel: [],
      outro: [],
    }

    produtos.forEach((produto) => {
      if (agrupado[produto.area_juridica]) {
        agrupado[produto.area_juridica].push(produto)
      }
    })

    return agrupado
  }, [produtos])

  // Carregar produtos ao montar
  useEffect(() => {
    if (escritorioId) {
      loadProdutos()
    }
  }, [escritorioId, loadProdutos])

  return {
    produtos,
    loading,
    error,
    loadProdutos,
    loadProdutoCompleto,
    criarProduto,
    atualizarProduto,
    deletarProduto,
    // Fases
    adicionarFase,
    atualizarFase,
    deletarFase,
    reordenarFases,
    // Checklist
    adicionarChecklistItem,
    atualizarChecklistItem,
    deletarChecklistItem,
    // Preços
    adicionarPreco,
    atualizarPreco,
    deletarPreco,
    // Papéis
    adicionarPapel,
    deletarPapel,
    // Versionamento
    criarVersao,
    // Utilitários
    getProdutosPorArea,
  }
}
