import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tag, TagFormData, TagContexto, TagWithStats } from '@/types/tags'

export function useTags(contexto: TagContexto, escritorioId?: string) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const loadTags = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('tags_master')
        .select('*')
        .eq('contexto', contexto)
        .eq('ativa', true)
        .order('ordem', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setTags(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar tags:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTag = async (formData: TagFormData): Promise<Tag> => {
    try {
      if (!escritorioId) {
        throw new Error('escritorioId é obrigatório para criar tags')
      }

      const { data: newTag, error: tagError } = await supabase
        .from('tags_master')
        .insert({
          escritorio_id: escritorioId,
          nome: formData.nome,
          cor: formData.cor,
          contexto: formData.contexto,
          descricao: formData.descricao,
          icone: formData.icone,
          is_predefinida: false,
        })
        .select()
        .single()

      if (tagError) throw tagError

      await loadTags()

      return newTag
    } catch (err) {
      console.error('Erro ao criar tag:', err)
      throw err
    }
  }

  const updateTag = async (id: string, formData: Partial<TagFormData>): Promise<void> => {
    try {
      const { error: tagError } = await supabase
        .from('tags_master')
        .update({
          nome: formData.nome,
          cor: formData.cor,
          descricao: formData.descricao,
          icone: formData.icone,
        })
        .eq('id', id)

      if (tagError) throw tagError

      await loadTags()
    } catch (err) {
      console.error('Erro ao atualizar tag:', err)
      throw err
    }
  }

  const deleteTag = async (id: string): Promise<void> => {
    try {
      // Apenas desativa a tag em vez de deletar (soft delete)
      const { error: tagError } = await supabase
        .from('tags_master')
        .update({ ativa: false })
        .eq('id', id)

      if (tagError) throw tagError

      await loadTags()
    } catch (err) {
      console.error('Erro ao deletar tag:', err)
      throw err
    }
  }

  const hardDeleteTag = async (id: string): Promise<void> => {
    try {
      // Delete permanente (apenas para tags não-predefinidas)
      const { error: tagError } = await supabase
        .from('tags_master')
        .delete()
        .eq('id', id)
        .eq('is_predefinida', false)

      if (tagError) throw tagError

      await loadTags()
    } catch (err) {
      console.error('Erro ao deletar permanentemente tag:', err)
      throw err
    }
  }

  const reorderTags = async (tagIds: string[]): Promise<void> => {
    try {
      // Atualizar ordem de cada tag
      const updates = tagIds.map((id, index) => ({
        id,
        ordem: index + 1,
      }))

      for (const update of updates) {
        await supabase
          .from('tags_master')
          .update({ ordem: update.ordem })
          .eq('id', update.id)
      }

      await loadTags()
    } catch (err) {
      console.error('Erro ao reordenar tags:', err)
      throw err
    }
  }

  // Buscar tags com estatísticas de uso
  const loadTagsWithStats = async (): Promise<TagWithStats[]> => {
    try {
      const { data, error: queryError } = await supabase.rpc(
        'get_tags_with_usage_stats',
        {
          p_escritorio_id: escritorioId,
          p_contexto: contexto,
        }
      )

      if (queryError) {
        // Fallback: se a function não existir, retornar tags normais
        console.warn('Function get_tags_with_usage_stats não encontrada, usando fallback')
        return tags.map((tag) => ({ ...tag, uso_count: 0 }))
      }

      return data || []
    } catch (err) {
      console.error('Erro ao carregar tags com estatísticas:', err)
      throw err
    }
  }

  useEffect(() => {
    loadTags()
  }, [contexto, escritorioId])

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    hardDeleteTag,
    reorderTags,
    loadTagsWithStats,
    refreshTags: loadTags,
  }
}

// Hook para gerenciar associações de tags com entidades
export function useEntityTags(
  entityType: 'tarefa' | 'evento' | 'audiencia' | 'processo' | 'consultivo' | 'documento',
  entityId: string
) {
  const [entityTags, setEntityTagsState] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // Mapear tipo de entidade para nome da tabela
  const getTableName = () => {
    const tableMap = {
      tarefa: 'agenda_tarefas_tags',
      evento: 'agenda_eventos_tags',
      audiencia: 'agenda_audiencias_tags',
      processo: 'processos_tags',
      consultivo: 'consultivo_tags',
      documento: 'documentos_tags',
    }
    return tableMap[entityType]
  }

  // Mapear tipo de entidade para nome da coluna FK
  const getFkColumn = () => {
    const columnMap = {
      tarefa: 'tarefa_id',
      evento: 'evento_id',
      audiencia: 'audiencia_id',
      processo: 'processo_id',
      consultivo: 'consultivo_id',
      documento: 'documento_id',
    }
    return columnMap[entityType]
  }

  const loadEntityTags = async () => {
    try {
      setLoading(true)
      setError(null)

      const tableName = getTableName()
      const fkColumn = getFkColumn()

      const { data, error: queryError } = await supabase
        .from(tableName)
        .select(`
          tag_id,
          tags_master (*)
        `)
        .eq(fkColumn, entityId)

      if (queryError) throw queryError

      // Extrair tags do resultado
      const tagsData = (data || [])
        .map((item: any) => item.tags_master)
        .filter(Boolean)

      setEntityTagsState(tagsData)
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar tags da entidade:', err)
    } finally {
      setLoading(false)
    }
  }

  const addTagToEntity = async (tagId: string): Promise<void> => {
    try {
      const tableName = getTableName()
      const fkColumn = getFkColumn()

      const { error: insertError } = await supabase
        .from(tableName)
        .insert({
          [fkColumn]: entityId,
          tag_id: tagId,
        })

      if (insertError) throw insertError

      await loadEntityTags()
    } catch (err) {
      console.error('Erro ao adicionar tag à entidade:', err)
      throw err
    }
  }

  const removeTagFromEntity = async (tagId: string): Promise<void> => {
    try {
      const tableName = getTableName()
      const fkColumn = getFkColumn()

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq(fkColumn, entityId)
        .eq('tag_id', tagId)

      if (deleteError) throw deleteError

      await loadEntityTags()
    } catch (err) {
      console.error('Erro ao remover tag da entidade:', err)
      throw err
    }
  }

  const setEntityTags = async (tagIds: string[]): Promise<void> => {
    try {
      const tableName = getTableName()
      const fkColumn = getFkColumn()

      // Remover todas as tags atuais
      await supabase.from(tableName).delete().eq(fkColumn, entityId)

      // Adicionar novas tags
      if (tagIds.length > 0) {
        const inserts = tagIds.map((tagId) => ({
          [fkColumn]: entityId,
          tag_id: tagId,
        }))

        const { error: insertError } = await supabase.from(tableName).insert(inserts)

        if (insertError) throw insertError
      }

      await loadEntityTags()
    } catch (err) {
      console.error('Erro ao definir tags da entidade:', err)
      throw err
    }
  }

  useEffect(() => {
    if (entityId) {
      loadEntityTags()
    }
  }, [entityType, entityId])

  return {
    entityTags,
    loading,
    error,
    addTagToEntity,
    removeTagFromEntity,
    setEntityTags,
    refreshEntityTags: loadEntityTags,
  }
}
