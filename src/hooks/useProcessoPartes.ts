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
  /** true quando a parte foi derivada das colunas autor/reu/parte_contraria/cliente
   * (processo sem linhas em processos_partes, ex.: importado). É read-only. */
  derived?: boolean
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

  // Fallback: processos importados às vezes têm as partes apenas nas colunas de
  // texto (autor/reu/parte_contraria) + cliente_id, sem linhas em processos_partes.
  // Deriva partes read-only dessas colunas para a seção nunca ficar vazia.
  const derivarPartesDoProcesso = useCallback(async (): Promise<ProcessoParte[]> => {
    const { data: proc } = await supabase
      .from('processos_processos')
      .select('autor, reu, parte_contraria, polo_cliente, cliente_id, crm_pessoas!processos_processos_cliente_id_fkey(nome_completo, nome_fantasia)')
      .eq('id', processoId)
      .single()
    if (!proc) return []

    const autor = (proc.autor || '').trim()
    const reu = (proc.reu || '').trim()
    const parteContraria = (proc.parte_contraria || '').trim()
    const clienteNome = ((proc as any).crm_pessoas?.nome_completo || (proc as any).crm_pessoas?.nome_fantasia || '').trim()
    const polo = proc.polo_cliente as string | null

    const itens: { tipo: ProcessoParte['tipo']; nome: string; ehCliente?: boolean }[] = []
    const vistos = new Set<string>()
    const add = (tipo: ProcessoParte['tipo'], nome: string, ehCliente = false) => {
      const n = nome.trim()
      if (!n || vistos.has(n.toLowerCase())) return
      vistos.add(n.toLowerCase())
      itens.push({ tipo, nome: n, ehCliente })
    }

    // autor/reu de texto têm prioridade; depois completa com cliente (pelo polo) e parte contrária.
    if (autor) add('autor', autor)
    if (reu) add('reu', reu)
    if (clienteNome) {
      const tipoCliente: ProcessoParte['tipo'] =
        polo === 'passivo' ? 'reu' : polo === 'terceiro' ? 'terceiro_interessado' : 'autor'
      add(tipoCliente, clienteNome, true)
    }
    if (parteContraria) {
      const tipoContraria: ProcessoParte['tipo'] = polo === 'passivo' ? 'autor' : 'reu'
      add(tipoContraria, parteContraria)
    }

    return itens.map((it, i) => ({
      id: `derived-${i}`,
      processo_id: processoId,
      tipo: it.tipo,
      cliente_id: it.ehCliente ? (proc.cliente_id || null) : null,
      nome: it.nome,
      cpf_cnpj: null,
      qualificacao: null,
      observacoes: null,
      ordem: i,
      created_at: '',
      derived: true,
    }))
  }, [processoId, supabase])

  const carregarPartes = useCallback(async () => {
    if (!processoId || !escritorioAtivo) {
      setLoading(false)
      return
    }
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
      if (data && data.length > 0) {
        setPartes(data)
      } else {
        // Sem linhas estruturadas → deriva das colunas do processo (read-only)
        setPartes(await derivarPartesDoProcesso())
      }
    } catch (err) {
      console.error('Erro ao carregar partes:', err)
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase, derivarPartesDoProcesso])

  useEffect(() => {
    carregarPartes()
  }, [carregarPartes])

  // Sincronizar campos desnormalizados autor/reu em processos_processos.
  // OBS: desde a migration 20260504190000, um trigger SQL em processos_partes
  // mantém autor/reu sempre derivados do banco. Este hook é redundância benigna
  // (UPDATE idempotente) e ajuda em UIs que precisam refletir o estado imediato.
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

  // true quando as partes exibidas são derivadas das colunas (read-only)
  const derived = partes.some(p => p.derived)

  return {
    partes,
    autores,
    reus,
    terceiros,
    loading,
    saving,
    derived,
    adicionarParte,
    editarParte,
    removerParte,
    recarregar: carregarPartes,
  }
}
