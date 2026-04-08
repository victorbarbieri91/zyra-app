'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { toast } from 'sonner'

export interface ProcessoParte {
  id: string
  processo_id: string
  tipo: 'autor' | 'reu' | 'terceiro_interessado' | 'assistente' | 'opoente' | 'denunciado' | 'chamado' | 'advogado_contrario'
  cliente_id: string | null
  nome: string
  cpf_cnpj: string | null
  qualificacao: string | null
  observacoes: string | null
  ordem: number
  created_at: string
}

export interface NovaParteData {
  tipo: ProcessoParte['tipo']
  nome: string
  cliente_id?: string | null
  cpf_cnpj?: string | null
  qualificacao?: string | null
  observacoes?: string | null
}

const TIPO_LABELS: Record<string, string> = {
  autor: 'Autor',
  reu: 'Réu',
  terceiro_interessado: 'Terceiro Interessado',
  assistente: 'Assistente',
  opoente: 'Opoente',
  denunciado: 'Denunciado',
  chamado: 'Chamado',
  advogado_contrario: 'Advogado Contrário',
}

export function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] || tipo
}

export function useProcessoPartes(processoId: string) {
  const [partes, setPartes] = useState<ProcessoParte[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const carregarPartes = useCallback(async () => {
    if (!processoId || !escritorioAtivo) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('processos_partes')
        .select('*')
        .eq('processo_id', processoId)
        .eq('escritorio_id', escritorioAtivo)
        .order('tipo')
        .order('ordem')

      if (error) throw error
      setPartes(data || [])
    } catch (err) {
      console.error('Erro ao carregar partes:', err)
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase])

  useEffect(() => {
    carregarPartes()
  }, [carregarPartes])

  // Sincronizar campos desnormalizados autor/reu em processos_processos
  const sincronizarAutorReu = useCallback(async (partesAtuais: ProcessoParte[]) => {
    const autores = partesAtuais.filter(p => p.tipo === 'autor').map(p => p.nome)
    const reus = partesAtuais.filter(p => p.tipo === 'reu').map(p => p.nome)

    const autor = autores.length > 0 ? autores.join(' e ') : null
    const reu = reus.length > 0 ? reus.join(' e ') : null

    await supabase
      .from('processos_processos')
      .update({ autor, reu })
      .eq('id', processoId)
  }, [processoId, supabase])

  const adicionarParte = useCallback(async (data: NovaParteData) => {
    if (!escritorioAtivo) return false
    setSaving(true)
    try {
      const maxOrdem = partes
        .filter(p => p.tipo === data.tipo)
        .reduce((max, p) => Math.max(max, p.ordem), 0)

      const { data: novaParte, error } = await supabase
        .from('processos_partes')
        .insert({
          processo_id: processoId,
          escritorio_id: escritorioAtivo,
          tipo: data.tipo,
          nome: data.nome.trim(),
          cliente_id: data.cliente_id || null,
          cpf_cnpj: data.cpf_cnpj?.trim() || null,
          qualificacao: data.qualificacao?.trim() || null,
          observacoes: data.observacoes?.trim() || null,
          ordem: maxOrdem + 1,
        })
        .select()
        .single()

      if (error) throw error

      const novasPartes = [...partes, novaParte]
      setPartes(novasPartes)
      await sincronizarAutorReu(novasPartes)
      toast.success(`${getTipoLabel(data.tipo)} adicionado`)
      return true
    } catch (err) {
      console.error('Erro ao adicionar parte:', err)
      toast.error('Erro ao adicionar parte')
      return false
    } finally {
      setSaving(false)
    }
  }, [processoId, escritorioAtivo, partes, supabase, sincronizarAutorReu])

  const editarParte = useCallback(async (parteId: string, data: Partial<NovaParteData>) => {
    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {}
      if (data.nome !== undefined) updateData.nome = data.nome.trim()
      if (data.cpf_cnpj !== undefined) updateData.cpf_cnpj = data.cpf_cnpj?.trim() || null
      if (data.qualificacao !== undefined) updateData.qualificacao = data.qualificacao?.trim() || null
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes?.trim() || null
      if (data.cliente_id !== undefined) updateData.cliente_id = data.cliente_id || null

      const { error } = await supabase
        .from('processos_partes')
        .update(updateData)
        .eq('id', parteId)

      if (error) throw error

      const novasPartes = partes.map(p =>
        p.id === parteId ? { ...p, ...updateData } as ProcessoParte : p
      )
      setPartes(novasPartes)
      await sincronizarAutorReu(novasPartes)
      toast.success('Parte atualizada')
      return true
    } catch (err) {
      console.error('Erro ao editar parte:', err)
      toast.error('Erro ao editar parte')
      return false
    } finally {
      setSaving(false)
    }
  }, [partes, supabase, sincronizarAutorReu])

  const removerParte = useCallback(async (parteId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('processos_partes')
        .delete()
        .eq('id', parteId)

      if (error) throw error

      const novasPartes = partes.filter(p => p.id !== parteId)
      setPartes(novasPartes)
      await sincronizarAutorReu(novasPartes)
      toast.success('Parte removida')
      return true
    } catch (err) {
      console.error('Erro ao remover parte:', err)
      toast.error('Erro ao remover parte')
      return false
    } finally {
      setSaving(false)
    }
  }, [partes, supabase, sincronizarAutorReu])

  const autores = partes.filter(p => p.tipo === 'autor')
  const reus = partes.filter(p => p.tipo === 'reu')
  const terceiros = partes.filter(p => !['autor', 'reu'].includes(p.tipo))

  return {
    partes,
    autores,
    reus,
    terceiros,
    loading,
    saving,
    adicionarParte,
    editarParte,
    removerParte,
    recarregar: carregarPartes,
  }
}
