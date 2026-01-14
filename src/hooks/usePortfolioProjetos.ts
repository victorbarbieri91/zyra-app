import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForDB } from '@/lib/timezone'
import type {
  Projeto,
  ProjetoCompleto,
  ProjetoListItem,
  ProjetoFase,
  ProjetoFaseChecklist,
  ProjetoEquipeMembro,
  ProjetoAprendizado,
  ProjetoFormData,
  AprendizadoFormData,
  ProjetosFiltros,
  StatusProjeto,
  StatusFase,
  ResultadoProjeto,
} from '@/types/portfolio'

// =====================================================
// HOOK: usePortfolioProjetos
// =====================================================

export function usePortfolioProjetos(escritorioId?: string) {
  const [projetos, setProjetos] = useState<ProjetoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // Carregar lista de projetos
  const loadProjetos = useCallback(async (filtros?: ProjetosFiltros) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('v_portfolio_projetos_completos')
        .select('*')
        .order('created_at', { ascending: false })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      // Aplicar filtros
      if (filtros?.status?.length) {
        query = query.in('status', filtros.status)
      }
      if (filtros?.produto_id?.length) {
        query = query.in('produto_id', filtros.produto_id)
      }
      if (filtros?.cliente_id?.length) {
        query = query.in('cliente_id', filtros.cliente_id)
      }
      if (filtros?.responsavel_id?.length) {
        query = query.in('responsavel_id', filtros.responsavel_id)
      }
      if (filtros?.area_juridica?.length) {
        query = query.in('area_juridica', filtros.area_juridica)
      }
      if (filtros?.resultado?.length) {
        query = query.in('resultado', filtros.resultado)
      }
      if (filtros?.data_inicio_de) {
        query = query.gte('data_inicio', filtros.data_inicio_de)
      }
      if (filtros?.data_inicio_ate) {
        query = query.lte('data_inicio', filtros.data_inicio_ate)
      }
      if (filtros?.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,codigo.ilike.%${filtros.busca}%,cliente_nome.ilike.%${filtros.busca}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setProjetos(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar projetos:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, escritorioId])

  // Carregar projeto completo
  const loadProjetoCompleto = async (projetoId: string): Promise<ProjetoCompleto | null> => {
    try {
      // Buscar projeto base com relações
      const { data: projeto, error: projetoError } = await supabase
        .from('portfolio_projetos')
        .select(`
          *,
          produto:portfolio_produtos(*),
          cliente:crm_pessoas(id, nome_completo, tipo_pessoa),
          responsavel:profiles!responsavel_id(id, nome),
          processo:processos_processos(id, numero_cnj)
        `)
        .eq('id', projetoId)
        .single()

      if (projetoError) throw projetoError

      // Buscar fases com checklist
      const { data: fases, error: fasesError } = await supabase
        .from('portfolio_projetos_fases')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('ordem')

      if (fasesError) throw fasesError

      // Buscar checklist de cada fase
      const fasesComChecklist = await Promise.all(
        (fases || []).map(async (fase) => {
          const { data: checklist } = await supabase
            .from('portfolio_projetos_fases_checklist')
            .select('*')
            .eq('fase_projeto_id', fase.id)
            .order('ordem')

          return { ...fase, checklist: checklist || [] }
        })
      )

      // Buscar equipe
      const { data: equipe, error: equipeError } = await supabase
        .from('portfolio_projetos_equipe')
        .select(`
          *,
          user:profiles(id, nome, avatar_url)
        `)
        .eq('projeto_id', projetoId)

      if (equipeError) throw equipeError

      // Buscar aprendizados
      const { data: aprendizados, error: aprendizadosError } = await supabase
        .from('portfolio_projetos_aprendizados')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('created_at', { ascending: false })

      if (aprendizadosError) throw aprendizadosError

      return {
        ...projeto,
        fases: fasesComChecklist,
        equipe: equipe || [],
        aprendizados: aprendizados || [],
      }
    } catch (err) {
      console.error('Erro ao carregar projeto completo:', err)
      return null
    }
  }

  // Criar projeto (clonar produto)
  const criarProjeto = async (data: ProjetoFormData): Promise<string | null> => {
    try {
      // Usar function do banco para clonar
      const { data: projetoId, error } = await supabase.rpc('clonar_produto_para_projeto', {
        p_produto_id: data.produto_id,
        p_cliente_id: data.cliente_id,
        p_nome: data.nome,
        p_responsavel_id: data.responsavel_id,
        p_data_inicio: data.data_inicio ? formatDateForDB(data.data_inicio) : null,
        p_valor_negociado: data.valor_negociado,
        p_processo_id: data.processo_id,
      })

      if (error) throw error

      // Adicionar equipe adicional se houver
      if (data.equipe?.length) {
        await Promise.all(
          data.equipe.map((membro) =>
            supabase.from('portfolio_projetos_equipe').insert({
              projeto_id: projetoId,
              user_id: membro.user_id,
              papel_id: membro.papel_id,
              papel_nome: membro.papel_nome,
            })
          )
        )
      }

      await loadProjetos()
      return projetoId
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      throw err
    }
  }

  // Atualizar projeto
  const atualizarProjeto = async (projetoId: string, data: Partial<Projeto>): Promise<Projeto | null> => {
    try {
      const { data: projeto, error } = await supabase
        .from('portfolio_projetos')
        .update(data)
        .eq('id', projetoId)
        .select()
        .single()

      if (error) throw error

      await loadProjetos()
      return projeto
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err)
      throw err
    }
  }

  // Alterar status do projeto
  const alterarStatusProjeto = async (
    projetoId: string,
    novoStatus: StatusProjeto,
    resultado?: ResultadoProjeto,
    observacoes?: string
  ): Promise<void> => {
    try {
      const updateData: Partial<Projeto> = { status: novoStatus }

      if (novoStatus === 'concluido') {
        updateData.data_conclusao = formatDateForDB(new Date().toISOString())
        if (resultado) updateData.resultado = resultado
        if (observacoes) updateData.observacoes_resultado = observacoes
      }

      const { error } = await supabase
        .from('portfolio_projetos')
        .update(updateData)
        .eq('id', projetoId)

      if (error) throw error

      await loadProjetos()
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      throw err
    }
  }

  // =====================================================
  // FASES DO PROJETO
  // =====================================================

  const atualizarFaseProjeto = async (faseId: string, data: Partial<ProjetoFase>): Promise<ProjetoFase | null> => {
    try {
      const { data: fase, error } = await supabase
        .from('portfolio_projetos_fases')
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

  const iniciarFase = async (faseId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_fases')
        .update({
          status: 'em_andamento',
          data_inicio_real: formatDateForDB(new Date().toISOString()),
        })
        .eq('id', faseId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao iniciar fase:', err)
      throw err
    }
  }

  const concluirFase = async (faseId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_fases')
        .update({
          status: 'concluida',
          data_fim_real: formatDateForDB(new Date().toISOString()),
          progresso_percentual: 100,
        })
        .eq('id', faseId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao concluir fase:', err)
      throw err
    }
  }

  // =====================================================
  // CHECKLIST DO PROJETO
  // =====================================================

  const marcarItemChecklist = async (
    itemId: string,
    concluido: boolean,
    userId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_fases_checklist')
        .update({
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
          concluido_por: concluido ? userId : null,
        })
        .eq('id', itemId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao marcar item:', err)
      throw err
    }
  }

  // =====================================================
  // EQUIPE DO PROJETO
  // =====================================================

  const adicionarMembroEquipe = async (
    projetoId: string,
    userId: string,
    papelNome: string,
    papelId?: string
  ): Promise<ProjetoEquipeMembro | null> => {
    try {
      const { data: membro, error } = await supabase
        .from('portfolio_projetos_equipe')
        .insert({
          projeto_id: projetoId,
          user_id: userId,
          papel_id: papelId,
          papel_nome: papelNome,
        })
        .select(`
          *,
          user:profiles(id, nome, avatar_url)
        `)
        .single()

      if (error) throw error
      return membro
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      throw err
    }
  }

  const removerMembroEquipe = async (membroId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_equipe')
        .delete()
        .eq('id', membroId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao remover membro:', err)
      throw err
    }
  }

  // =====================================================
  // APRENDIZADOS
  // =====================================================

  const adicionarAprendizado = async (
    projetoId: string,
    data: AprendizadoFormData,
    userId: string
  ): Promise<ProjetoAprendizado | null> => {
    try {
      const { data: aprendizado, error } = await supabase
        .from('portfolio_projetos_aprendizados')
        .insert({
          projeto_id: projetoId,
          tipo: data.tipo,
          titulo: data.titulo,
          conteudo: data.conteudo,
          categoria: data.categoria,
          impacto: data.impacto,
          fase_projeto_id: data.fase_projeto_id,
          aplicar_ao_produto: data.aplicar_ao_produto ?? false,
          tags: data.tags,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return aprendizado
    } catch (err) {
      console.error('Erro ao adicionar aprendizado:', err)
      throw err
    }
  }

  const atualizarAprendizado = async (
    aprendizadoId: string,
    data: Partial<AprendizadoFormData>
  ): Promise<ProjetoAprendizado | null> => {
    try {
      const { data: aprendizado, error } = await supabase
        .from('portfolio_projetos_aprendizados')
        .update(data)
        .eq('id', aprendizadoId)
        .select()
        .single()

      if (error) throw error
      return aprendizado
    } catch (err) {
      console.error('Erro ao atualizar aprendizado:', err)
      throw err
    }
  }

  const deletarAprendizado = async (aprendizadoId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_aprendizados')
        .delete()
        .eq('id', aprendizadoId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao deletar aprendizado:', err)
      throw err
    }
  }

  const marcarAprendizadoAplicado = async (aprendizadoId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('portfolio_projetos_aprendizados')
        .update({
          aplicado_ao_produto: true,
          aplicado_em: new Date().toISOString(),
        })
        .eq('id', aprendizadoId)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao marcar aprendizado como aplicado:', err)
      throw err
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  const getProjetosAtrasados = useCallback((): ProjetoListItem[] => {
    const hoje = new Date()
    return projetos.filter(
      (p) =>
        p.status === 'em_andamento' &&
        p.data_prevista_conclusao &&
        new Date(p.data_prevista_conclusao) < hoje
    )
  }, [projetos])

  const getProjetosPorStatus = useCallback((): Record<StatusProjeto, ProjetoListItem[]> => {
    const agrupado: Record<StatusProjeto, ProjetoListItem[]> = {
      rascunho: [],
      em_andamento: [],
      pausado: [],
      concluido: [],
      cancelado: [],
    }

    projetos.forEach((projeto) => {
      if (agrupado[projeto.status]) {
        agrupado[projeto.status].push(projeto)
      }
    })

    return agrupado
  }, [projetos])

  // Carregar projetos ao montar
  useEffect(() => {
    if (escritorioId) {
      loadProjetos()
    }
  }, [escritorioId, loadProjetos])

  return {
    projetos,
    loading,
    error,
    loadProjetos,
    loadProjetoCompleto,
    criarProjeto,
    atualizarProjeto,
    alterarStatusProjeto,
    // Fases
    atualizarFaseProjeto,
    iniciarFase,
    concluirFase,
    // Checklist
    marcarItemChecklist,
    // Equipe
    adicionarMembroEquipe,
    removerMembroEquipe,
    // Aprendizados
    adicionarAprendizado,
    atualizarAprendizado,
    deletarAprendizado,
    marcarAprendizadoAplicado,
    // Utilitários
    getProjetosAtrasados,
    getProjetosPorStatus,
  }
}
