import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTimeForDB } from '@/lib/timezone'

export interface Audiencia {
  id: string
  escritorio_id: string
  processo_id?: string | null
  consultivo_id?: string | null
  titulo: string
  descricao?: string
  data_hora: string
  duracao_minutos: number
  tipo_audiencia: 'inicial' | 'instrucao' | 'conciliacao' | 'julgamento' | 'una' | 'outra'
  modalidade: 'presencial' | 'virtual'

  // Presencial
  tribunal?: string
  comarca?: string
  vara?: string
  forum?: string
  sala?: string
  endereco?: string

  // Virtual
  link_virtual?: string
  plataforma?: string

  // Pessoas
  juiz?: string
  promotor?: string
  advogado_contrario?: string
  responsavel_id?: string
  criado_por?: string

  status: 'agendada' | 'realizada' | 'cancelada' | 'adiada' | 'remarcada'

  // Resultado
  resultado_tipo?: 'acordo' | 'sentenca' | 'adiamento' | 'outro'
  resultado_descricao?: string
  proxima_audiencia_id?: string

  // Preparação
  preparativos_checklist?: Array<{ item: string; concluido: boolean }>

  observacoes?: string
  cor?: string

  // Relations (populated)
  processo_numero?: string
  consultivo_titulo?: string
  consultivo_numero?: string
  responsavel_nome?: string
  criado_por_nome?: string

  // Múltiplos responsáveis (array direto na coluna)
  responsaveis_ids: string[]

  created_at: string
  updated_at: string
}

export interface AudienciaFormData extends Partial<Audiencia> {
  processo_id?: string | null
  consultivo_id?: string | null
}

export function useAudiencias(escritorioId?: string) {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const loadAudiencias = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('agenda_audiencias')
        .select(`
          *,
          processo:processos_processos(numero_cnj),
          consultivo:consultivo_consultas(titulo, numero),
          responsavel:profiles!agenda_audiencias_responsavel_id_fkey(nome_completo),
          criado_por_user:profiles!agenda_audiencias_criado_por_fkey(nome_completo)
        `)
        .order('data_hora', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error('Erro na query de audiências:', {
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint,
          code: queryError.code
        })
        throw queryError
      }

      // Transform data
      const audienciasFormatadas = (data || []).map((a: any) => ({
        ...a,
        processo_numero: a.processo?.numero_cnj,
        consultivo_titulo: a.consultivo?.titulo,
        consultivo_numero: a.consultivo?.numero,
        responsavel_nome: a.responsavel?.nome_completo,
        criado_por_nome: a.criado_por_user?.nome_completo,
      }))

      setAudiencias(audienciasFormatadas)
    } catch (err: any) {
      const error = err as Error
      setError(error)
      console.error('Erro ao carregar audiências:', {
        message: err?.message || 'Erro desconhecido',
        name: err?.name,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        fullError: err
      })
    } finally {
      setLoading(false)
    }
  }

  const createAudiencia = async (data: AudienciaFormData): Promise<Audiencia> => {
    try {
      if (!data.processo_id && !data.consultivo_id) {
        throw new Error('É obrigatório vincular a um processo ou consultivo')
      }

      if (!data.escritorio_id) {
        throw new Error('escritorio_id é obrigatório')
      }

      const { data: novaAudiencia, error: audienciaError } = await supabase
        .from('agenda_audiencias')
        .insert({
          escritorio_id: data.escritorio_id, // CAMPO OBRIGATÓRIO
          processo_id: data.processo_id || null,
          consultivo_id: data.consultivo_id || null,
          titulo: data.titulo,
          data_hora: data.data_hora ? formatDateTimeForDB(new Date(data.data_hora)) : undefined,
          duracao_minutos: data.duracao_minutos || 60,
          tipo_audiencia: data.tipo_audiencia || 'inicial',
          modalidade: data.modalidade || 'presencial',
          // Presencial
          tribunal: data.tribunal,
          comarca: data.comarca,
          vara: data.vara,
          forum: data.forum,
          sala: data.sala,
          endereco: data.endereco,
          // Virtual
          link_virtual: data.link_virtual,
          plataforma: data.plataforma,
          // Pessoas/Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
          responsaveis_ids: data.responsaveis_ids || [],
          responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
          // Metadados
          preparativos_checklist: data.preparativos_checklist,
          observacoes: data.observacoes,
          status: data.status || 'agendada',
        })
        .select()
        .single()

      if (audienciaError) {
        console.error('Erro detalhado ao criar audiência:', JSON.stringify(audienciaError, null, 2))
        throw audienciaError
      }

      await loadAudiencias()

      return novaAudiencia
    } catch (err: any) {
      console.error('Erro ao criar audiência:', err)
      console.error('Detalhes do erro:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      })
      throw err
    }
  }

  const updateAudiencia = async (id: string, data: Partial<AudienciaFormData>): Promise<void> => {
    try {
      const { error: audienciaError } = await supabase
        .from('agenda_audiencias')
        .update({
          processo_id: data.processo_id || null,
          consultivo_id: data.consultivo_id || null,
          titulo: data.titulo,
          data_hora: data.data_hora ? formatDateTimeForDB(new Date(data.data_hora)) : undefined,
          duracao_minutos: data.duracao_minutos,
          tipo_audiencia: data.tipo_audiencia,
          modalidade: data.modalidade,
          // Presencial
          tribunal: data.tribunal,
          comarca: data.comarca,
          vara: data.vara,
          forum: data.forum,
          sala: data.sala,
          endereco: data.endereco,
          // Virtual
          link_virtual: data.link_virtual,
          plataforma: data.plataforma,
          // Pessoas/Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
          responsaveis_ids: data.responsaveis_ids,
          responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
          // Status e resultado
          status: data.status,
          resultado_tipo: data.resultado_tipo,
          resultado_descricao: data.resultado_descricao,
          // Metadados
          preparativos_checklist: data.preparativos_checklist,
          observacoes: data.observacoes,
        })
        .eq('id', id)

      if (audienciaError) throw audienciaError

      await loadAudiencias()
    } catch (err) {
      console.error('Erro ao atualizar audiência:', err)
      throw err
    }
  }

  const deleteAudiencia = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_audiencias')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadAudiencias()
    } catch (err) {
      console.error('Erro ao deletar audiência:', err)
      throw err
    }
  }

  // Marcar como realizada
  const realizarAudiencia = async (
    id: string,
    resultado: {
      tipo: 'acordo' | 'sentenca' | 'adiamento' | 'outro'
      descricao?: string
    }
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_audiencias')
        .update({
          status: 'realizada',
          resultado_tipo: resultado.tipo,
          resultado_descricao: resultado.descricao,
        })
        .eq('id', id)

      if (error) throw error

      await loadAudiencias()
    } catch (err) {
      console.error('Erro ao marcar audiência como realizada:', err)
      throw err
    }
  }

  // Cancelar audiência
  const cancelarAudiencia = async (id: string, motivo?: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_audiencias')
        .update({
          status: 'cancelada',
          observacoes: motivo ? `CANCELADA: ${motivo}` : 'CANCELADA',
        })
        .eq('id', id)

      if (error) throw error

      await loadAudiencias()
    } catch (err) {
      console.error('Erro ao cancelar audiência:', err)
      throw err
    }
  }

  // Remarcar audiência
  const remarcarAudiencia = async (
    id: string,
    novaData: string,
    motivo?: string
  ): Promise<Audiencia> => {
    try {
      // 1. Buscar dados da audiência original
      const { data: audienciaOriginal, error: fetchError } = await supabase
        .from('agenda_audiencias')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !audienciaOriginal) throw fetchError

      // 2. Criar nova audiência com nova data
      const { data: novaAudiencia, error: createError } = await supabase
        .from('agenda_audiencias')
        .insert({
          ...audienciaOriginal,
          id: undefined, // Gerar novo ID
          data_hora: novaData,
          status: 'agendada',
          observacoes: `Remarcada. Motivo: ${motivo || 'Não informado'}`,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single()

      if (createError) throw createError

      // 3. Marcar audiência original como remarcada
      const { error: updateError } = await supabase
        .from('agenda_audiencias')
        .update({
          status: 'remarcada',
          observacoes: `REMARCADA para ${new Date(novaData).toLocaleString('pt-BR')}. Nova audiência ID: ${novaAudiencia.id}. Motivo: ${motivo || 'Não informado'}`,
        })
        .eq('id', id)

      if (updateError) throw updateError

      await loadAudiencias()

      return novaAudiencia
    } catch (err) {
      console.error('Erro ao remarcar audiência:', err)
      throw err
    }
  }

  useEffect(() => {
    // Só carrega se tiver escritorioId definido
    if (escritorioId) {
      loadAudiencias()
    } else {
      setLoading(false)
      setAudiencias([])
    }
  }, [escritorioId])

  return {
    audiencias,
    loading,
    error,
    createAudiencia,
    updateAudiencia,
    deleteAudiencia,
    realizarAudiencia,
    cancelarAudiencia,
    remarcarAudiencia,
    refreshAudiencias: loadAudiencias,
  }
}
