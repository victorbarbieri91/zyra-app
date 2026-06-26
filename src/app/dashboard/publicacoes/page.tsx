'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import { BuscaCNJModal } from '@/components/processos/BuscaCNJModal'
import ProcessoWizardAutomatico from '@/components/processos/ProcessoWizardAutomatico'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'
import PublicacoesRail from '@/components/publicacoes/PublicacoesRail'
import PublicacaoDetalhe from '@/components/publicacoes/PublicacaoDetalhe'
import { type Publicacao, type AbaPub, tipoLabel } from '@/components/publicacoes/publicacoes-ui'

export default function PublicacoesPage() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<AbaPub>('pendentes')
  const [busca, setBusca] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [conversaAberta, setConversaAberta] = useState(true)
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)

  // Seleção em massa
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Wizards para ações rápidas
  const [wizardTarefa, setWizardTarefa] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })
  const [wizardEvento, setWizardEvento] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })
  const [wizardAudiencia, setWizardAudiencia] = useState<{ open: boolean; pub: Publicacao | null }>({ open: false, pub: null })

  // Criação/vínculo de processo
  const [buscaCNJModal, setBuscaCNJModal] = useState<{ open: boolean; cnj: string }>({ open: false, cnj: '' })
  const [wizardProcessoAuto, setWizardProcessoAuto] = useState<{ open: boolean; dados: ProcessoEscavadorNormalizado | null }>({ open: false, dados: null })
  const [wizardProcessoManual, setWizardProcessoManual] = useState<{ open: boolean; cnj: string }>({ open: false, cnj: '' })

  // Texto completo (carga sob demanda + cache)
  const textoCacheRef = useRef<Map<string, string | null>>(new Map())
  const [textoSel, setTextoSel] = useState<{ id: string; texto: string | null }>({ id: '', texto: null })
  const [textoLoading, setTextoLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // ========================================
  // Carregar publicações
  // ========================================
  const carregarPublicacoes = useCallback(async () => {
    if (!escritorioAtivo) return
    setCarregando(true)
    try {
      const { data: rawData, error } = await supabase
        .from('publicacoes_publicacoes')
        .select(`id, data_publicacao, tribunal, vara, tipo_publicacao, numero_processo, processo_id, status, agendamento_id, agendamento_tipo, hash_conteudo, duplicata_revisada, is_snippet, partes, pdf_url, updated_at, created_at, escritorio_id, source, processos_processos!processo_id(autor, reu), publicacoes_comentarios(count)`)
        .eq('escritorio_id', escritorioAtivo)
        .neq('status', 'duplicada')
        .order('data_publicacao', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar publicações:', error)
        toast.error('Erro ao carregar publicações')
        return
      }

      const data = (rawData || []).map((d: any) => ({
        ...d,
        processo_autor: d.processos_processos?.autor || undefined,
        processo_reu: d.processos_processos?.reu || undefined,
        comentarios_count: d.publicacoes_comentarios?.[0]?.count || 0,
        resumo: null as string | null,
        partes: d.partes ?? null,
        pdf_url: d.pdf_url ?? null,
        processos_processos: undefined,
        publicacoes_comentarios: undefined,
      }))

      // Resumo da análise (snippet da lista) — best-effort, não bloqueia a carga
      const ids = data.map((d: any) => d.id)
      if (ids.length > 0) {
        const { data: analises } = await supabase
          .from('publicacoes_analises')
          .select('publicacao_id, resumo_executivo')
          .eq('escritorio_id', escritorioAtivo)
          .in('publicacao_id', ids)
        const resumoMap = new Map<string, string>()
        ;(analises || []).forEach((a: { publicacao_id: string; resumo_executivo: string | null }) => {
          if (a.resumo_executivo) resumoMap.set(a.publicacao_id, a.resumo_executivo)
        })
        data.forEach((d: any) => { d.resumo = resumoMap.get(d.id) ?? null })
      }

      setPublicacoes(dedupPublicacoes(data))
    } finally {
      setCarregando(false)
    }
  }, [escritorioAtivo, supabase])

  // Última sincronização (para "sincronizado há X min")
  const carregarUltimaSync = useCallback(async () => {
    if (!escritorioAtivo) return
    const { data } = await supabase
      .from('publicacoes_sincronizacoes')
      .select('created_at, data_fim')
      .eq('escritorio_id', escritorioAtivo)
      .eq('sucesso', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const row = data as { created_at?: string | null; data_fim?: string | null } | null
    setUltimaSync(row?.data_fim || row?.created_at || null)
  }, [escritorioAtivo, supabase])

  // Auto-deduplicação inteligente (mantém a versão de maior prioridade por grupo)
  const dedupPublicacoes = (pubs: any[]): Publicacao[] => {
    const grupos = new Map<string, any[]>()
    pubs.forEach(pub => {
      let chave = pub.hash_conteudo
      if (!chave && pub.numero_processo && pub.data_publicacao) {
        chave = `${pub.numero_processo}-${pub.data_publicacao}-${pub.tipo_publicacao || 'outro'}`
      }
      if (chave) {
        const grupo = grupos.get(chave) || []
        grupo.push(pub)
        grupos.set(chave, grupo)
      } else {
        grupos.set(pub.id, [pub])
      }
    })

    const resultado: Publicacao[] = []
    grupos.forEach((grupo) => {
      if (grupo.length === 1) {
        resultado.push(grupo[0])
      } else {
        const ordenado = grupo.sort((a, b) => {
          const prioridade = { processada: 1, em_analise: 2, pendente: 3, arquivada: 4 }
          const prioA = prioridade[a.status as keyof typeof prioridade] || 5
          const prioB = prioridade[b.status as keyof typeof prioridade] || 5
          if (prioA !== prioB) return prioA - prioB
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        })
        resultado.push(ordenado[0])
      }
    })
    return resultado
  }

  useEffect(() => {
    carregarPublicacoes()
    carregarUltimaSync()
  }, [carregarPublicacoes, carregarUltimaSync])

  // ========================================
  // Filtro por aba + busca, e contadores
  // ========================================
  const publicacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return publicacoes.filter(pub => {
      if (abaAtiva === 'tratadas') {
        if (pub.status !== 'processada') return false
      } else if (abaAtiva === 'arquivadas') {
        if (pub.status !== 'arquivada') return false
      } else if (abaAtiva === 'pendentes') {
        if (pub.status === 'processada' || pub.status === 'arquivada') return false
      } else {
        // todas (ativas) = tudo menos arquivada
        if (pub.status === 'arquivada') return false
      }

      if (termo) {
        const hay = [
          pub.numero_processo, pub.tribunal, pub.vara,
          pub.processo_autor, pub.processo_reu, (pub.partes || []).join(' '),
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(termo)) return false
      }
      return true
    })
  }, [publicacoes, abaAtiva, busca])

  const counts = useMemo(() => ({
    pendentes: publicacoes.filter(p => p.status !== 'processada' && p.status !== 'arquivada').length,
    tratadas: publicacoes.filter(p => p.status === 'processada').length,
    todas: publicacoes.filter(p => p.status !== 'arquivada').length,
    arquivadas: publicacoes.filter(p => p.status === 'arquivada').length,
  }), [publicacoes])

  const selectedPub = useMemo(
    () => publicacoes.find(p => p.id === selId) || null,
    [publicacoes, selId]
  )

  // Selecionar automaticamente a primeira da lista quando a seleção fica inválida
  useEffect(() => {
    if (publicacoesFiltradas.length === 0) {
      if (selId !== null) setSelId(null)
      return
    }
    if (!selId || !publicacoesFiltradas.some(p => p.id === selId)) {
      setSelId(publicacoesFiltradas[0].id)
    }
  }, [publicacoesFiltradas, selId])

  // Carregar texto completo da publicação selecionada (lazy + cache)
  useEffect(() => {
    if (!selId || !escritorioAtivo) return
    const cached = textoCacheRef.current.get(selId)
    if (cached !== undefined) {
      setTextoSel({ id: selId, texto: cached })
      return
    }
    let cancel = false
    setTextoLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('publicacoes_publicacoes')
        .select('texto_completo')
        .eq('id', selId)
        .eq('escritorio_id', escritorioAtivo)
        .maybeSingle()
      const txt = (data as { texto_completo?: string | null } | null)?.texto_completo ?? null
      textoCacheRef.current.set(selId, txt)
      if (!cancel) {
        setTextoSel({ id: selId, texto: txt })
        setTextoLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [selId, escritorioAtivo, supabase])

  // Navegação por teclado (↑/↓ navega a seleção)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (wizardTarefa.open || wizardEvento.open || wizardAudiencia.open || buscaCNJModal.open) return
      if (!selId || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return

      e.preventDefault()
      const idx = publicacoesFiltradas.findIndex(p => p.id === selId)
      if (idx === -1) return
      const next = e.key === 'ArrowDown'
        ? Math.min(idx + 1, publicacoesFiltradas.length - 1)
        : Math.max(idx - 1, 0)
      if (next !== idx) setSelId(publicacoesFiltradas[next].id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selId, publicacoesFiltradas, wizardTarefa.open, wizardEvento.open, wizardAudiencia.open, buscaCNJModal.open])

  // ========================================
  // Seleção em massa
  // ========================================
  const toggleSelecao = (id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }
  const limparSelecao = () => setSelecionados(new Set())

  const arquivarSelecionados = async () => {
    if (selecionados.size === 0) return
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada' })
        .in('id', Array.from(selecionados))
      if (error) throw error
      toast.success(`${selecionados.size} publicação(ões) arquivada(s)`)
      limparSelecao()
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar publicações')
    }
  }

  const voltarParaPendenteMassa = async () => {
    if (selecionados.size === 0) return
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'pendente' })
        .in('id', Array.from(selecionados))
      if (error) throw error
      toast.success(`${selecionados.size} publicação(ões) voltou(aram) para pendente`)
      limparSelecao()
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar publicações')
    }
  }

  const marcarComoProcessada = async () => {
    if (selecionados.size === 0) return
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .in('id', Array.from(selecionados))
      if (error) throw error
      toast.success(`${selecionados.size} publicação(ões) marcada(s) como tratada(s)`)
      limparSelecao()
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar publicações')
    }
  }

  // ========================================
  // Ações individuais (com auto-avanço da seleção)
  // ========================================
  const proximaSelecao = (id: string): string | null => {
    const idx = publicacoesFiltradas.findIndex(p => p.id === id)
    const prox = publicacoesFiltradas.find((p, i) => i > idx && p.status !== 'processada' && p.status !== 'arquivada')
    return prox ? prox.id : null
  }

  const arquivarPublicacao = async (id: string) => {
    const prox = proximaSelecao(id)
    try {
      const { error } = await supabase.from('publicacoes_publicacoes').update({ status: 'arquivada' }).eq('id', id)
      if (error) throw error
      toast.success('Publicação arquivada')
      if (selId === id) setSelId(prox)
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar')
    }
  }

  const marcarProcessada = async (id: string) => {
    const prox = proximaSelecao(id)
    try {
      const { error } = await supabase.from('publicacoes_publicacoes').update({ status: 'processada' }).eq('id', id)
      if (error) throw error
      toast.success('Publicação marcada como tratada')
      if (selId === id) setSelId(prox)
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar')
    }
  }

  const voltarParaPendente = async (id: string) => {
    try {
      const { error } = await supabase.from('publicacoes_publicacoes').update({ status: 'pendente' }).eq('id', id)
      if (error) throw error
      toast.success('Publicação voltou para pendente')
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar')
    }
  }

  // ========================================
  // Wizards (agendar) e criação de processo
  // ========================================
  const abrirWizardTarefa = (pub: Publicacao) => setWizardTarefa({ open: true, pub })
  const abrirWizardEvento = (pub: Publicacao) => setWizardEvento({ open: true, pub })
  const abrirWizardAudiencia = (pub: Publicacao) => setWizardAudiencia({ open: true, pub })
  const abrirWizardProcesso = (cnj: string) => setBuscaCNJModal({ open: true, cnj })

  const handleDadosEncontrados = (dados: ProcessoEscavadorNormalizado) => {
    setBuscaCNJModal({ open: false, cnj: '' })
    setWizardProcessoAuto({ open: true, dados })
  }
  const handleCadastroManual = () => {
    const cnj = buscaCNJModal.cnj
    setBuscaCNJModal({ open: false, cnj: '' })
    setWizardProcessoManual({ open: true, cnj })
  }

  const getTextoCache = (pubId: string) => textoCacheRef.current.get(pubId)?.substring(0, 500) || ''

  const getInitialDataTarefa = (pub: Publicacao) => ({
    titulo: `${tipoLabel(pub.tipo_publicacao)} - ${pub.numero_processo || 'Publicação'}`,
    descricao: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
    tipo: 'outro' as const,
    prioridade: 'media' as const,
  })

  const getInitialDataEvento = (pub: Publicacao) => ({
    titulo: `${tipoLabel(pub.tipo_publicacao)} - ${pub.numero_processo || 'Publicação'}`,
    descricao: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
  })

  const getInitialDataAudiencia = (pub: Publicacao) => ({
    titulo: `Audiência - ${pub.numero_processo || 'Publicação'}`,
    observacoes: `Publicação: ${pub.tipo_publicacao?.toUpperCase() || 'PUBLICAÇÃO'}\nData: ${new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}\nTribunal: ${pub.tribunal}\n${pub.numero_processo ? `Processo: ${pub.numero_processo}\n` : ''}\n---\n${getTextoCache(pub.id)}`,
    processo_id: pub.processo_id || undefined,
    local: pub.tribunal || '',
    vara: pub.vara || '',
  })

  // Após o wizard criar a entidade: vincula processo (por CNJ) e marca a publicação como tratada
  const vincularPublicacaoAposCriacao = async (
    pub: Publicacao,
    entidade: { id?: string; processo_id?: string | null } | undefined,
    tabelaEntidade: 'agenda_tarefas' | 'agenda_eventos' | 'agenda_audiencias',
    tipo: 'tarefa' | 'compromisso' | 'audiencia',
  ) => {
    let processoIdResolvido: string | null = pub.processo_id ?? null
    if (!processoIdResolvido && pub.numero_processo && escritorioAtivo) {
      const { data: proc } = await supabase
        .from('processos_processos')
        .select('id')
        .eq('escritorio_id', escritorioAtivo)
        .eq('numero_cnj', pub.numero_processo)
        .maybeSingle()
      processoIdResolvido = proc?.id ?? null
    }

    if (entidade?.id && processoIdResolvido && !entidade.processo_id) {
      const { error } = await supabase
        .from(tabelaEntidade)
        .update({ processo_id: processoIdResolvido })
        .eq('id', entidade.id)
      if (error) console.error(`Erro ao vincular ${tipo} ao processo:`, error)
    }

    const updatePayload: Record<string, unknown> = {
      status: 'processada',
      agendamento_tipo: tipo,
    }
    if (entidade?.id) updatePayload.agendamento_id = entidade.id
    if (processoIdResolvido && !pub.processo_id) updatePayload.processo_id = processoIdResolvido

    const { error } = await supabase
      .from('publicacoes_publicacoes')
      .update(updatePayload)
      .eq('id', pub.id)
    if (error) console.error('Erro ao atualizar publicação após agendamento:', error)
  }

  // ========================================
  // Render
  // ========================================
  return (
    <div className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] overflow-hidden bg-[#fafaf7] dark:bg-[#0b0f14]">
      <PublicacoesRail
        lista={publicacoesFiltradas}
        tab={abaAtiva}
        onTab={setAbaAtiva}
        counts={counts}
        busca={busca}
        onBusca={setBusca}
        selId={selId}
        onSelect={setSelId}
        selecionados={selecionados}
        onToggleSelecao={toggleSelecao}
        onLimparSelecao={limparSelecao}
        onBulkTratar={marcarComoProcessada}
        onBulkArquivar={arquivarSelecionados}
        onBulkVoltar={voltarParaPendenteMassa}
        onTratarItem={marcarProcessada}
        onPrazoItem={abrirWizardTarefa}
        onArquivarItem={arquivarPublicacao}
        ultimaSync={ultimaSync}
        onConfig={() => router.push('/dashboard/publicacoes/config')}
      />

      {selectedPub && escritorioAtivo ? (
        <PublicacaoDetalhe
          pub={selectedPub}
          texto={textoSel.id === selId ? textoSel.texto : null}
          textoLoading={textoLoading && textoSel.id !== selId}
          escritorioId={escritorioAtivo}
          conversaAberta={conversaAberta}
          onToggleConversa={() => setConversaAberta(o => !o)}
          onAgendarTarefa={() => abrirWizardTarefa(selectedPub)}
          onAgendarEvento={() => abrirWizardEvento(selectedPub)}
          onAgendarAudiencia={() => abrirWizardAudiencia(selectedPub)}
          onAbrirProcesso={() => selectedPub.processo_id && router.push(`/dashboard/processos/${selectedPub.processo_id}`)}
          onVincular={() => selectedPub.numero_processo && abrirWizardProcesso(selectedPub.numero_processo)}
          onArquivar={() => arquivarPublicacao(selectedPub.id)}
          onTratar={() => marcarProcessada(selectedPub.id)}
          onVoltarPendente={() => voltarParaPendente(selectedPub.id)}
          onCopiar={() => {
            const t = textoSel.id === selId ? textoSel.texto : null
            if (t) { navigator.clipboard?.writeText(t); toast.success('Texto copiado') }
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[13px] text-[#9aa1a8] dark:text-[#5a6675]">
          {carregando ? 'Carregando publicações…' : 'Selecione uma publicação'}
        </div>
      )}

      {/* Wizard de Tarefa */}
      {wizardTarefa.open && wizardTarefa.pub && escritorioAtivo && (
        <TarefaWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardTarefa({ open: false, pub: null })}
          initialData={getInitialDataTarefa(wizardTarefa.pub)}
          onCreated={async (tarefa) => {
            if (wizardTarefa.pub) {
              await vincularPublicacaoAposCriacao(wizardTarefa.pub, tarefa, 'agenda_tarefas', 'tarefa')
            }
            toast.success('Tarefa criada e publicação marcada como tratada')
            setWizardTarefa({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard de Evento/Compromisso */}
      {wizardEvento.open && wizardEvento.pub && escritorioAtivo && (
        <EventoWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardEvento({ open: false, pub: null })}
          initialData={getInitialDataEvento(wizardEvento.pub)}
          onSubmit={async (_data, evento) => {
            if (wizardEvento.pub) {
              await vincularPublicacaoAposCriacao(wizardEvento.pub, evento, 'agenda_eventos', 'compromisso')
            }
            toast.success('Compromisso criado e publicação marcada como tratada')
            setWizardEvento({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard de Audiência */}
      {wizardAudiencia.open && wizardAudiencia.pub && escritorioAtivo && (
        <AudienciaWizard
          escritorioId={escritorioAtivo}
          onClose={() => setWizardAudiencia({ open: false, pub: null })}
          initialData={getInitialDataAudiencia(wizardAudiencia.pub)}
          onSubmit={async (_data, audiencia) => {
            if (wizardAudiencia.pub) {
              await vincularPublicacaoAposCriacao(wizardAudiencia.pub, audiencia, 'agenda_audiencias', 'audiencia')
            }
            toast.success('Audiência criada e publicação marcada como tratada')
            setWizardAudiencia({ open: false, pub: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Modal de Busca por CNJ (Vincular/Criar Pasta) */}
      <BuscaCNJModal
        open={buscaCNJModal.open}
        onClose={() => setBuscaCNJModal({ open: false, cnj: '' })}
        onDadosEncontrados={handleDadosEncontrados}
        onCadastroManual={handleCadastroManual}
        initialCNJ={buscaCNJModal.cnj}
      />

      {/* Wizard Automático (Escavador) */}
      {wizardProcessoAuto.open && wizardProcessoAuto.dados && (
        <ProcessoWizardAutomatico
          open={wizardProcessoAuto.open}
          onClose={() => setWizardProcessoAuto({ open: false, dados: null })}
          dadosEscavador={wizardProcessoAuto.dados}
          onProcessoCriado={async (processoId: string) => {
            const cnj = wizardProcessoAuto.dados?.numero_cnj
            if (cnj && processoId && escritorioAtivo) {
              try {
                const cnjSomenteDigitos = cnj.replace(/\D/g, '')
                const { data: updated, error } = await supabase
                  .from('publicacoes_publicacoes')
                  .update({ processo_id: processoId })
                  .eq('escritorio_id', escritorioAtivo)
                  .or(`numero_processo.eq.${cnj},numero_processo.eq.${cnjSomenteDigitos}`)
                  .select('id')
                if (error) {
                  console.error('Erro ao vincular publicações:', error.message, error.details, error.hint)
                } else if (updated && updated.length > 0) {
                  toast.success(`Pasta criada e ${updated.length} publicação(ões) vinculada(s)!`)
                } else {
                  toast.success('Pasta criada com sucesso!')
                }
              } catch (err) {
                console.error('Erro ao vincular publicações:', err)
              }
            }
            setWizardProcessoAuto({ open: false, dados: null })
            carregarPublicacoes()
          }}
        />
      )}

      {/* Wizard Manual (fallback) */}
      {wizardProcessoManual.open && (
        <ProcessoWizard
          open={wizardProcessoManual.open}
          onClose={() => setWizardProcessoManual({ open: false, cnj: '' })}
          onSuccess={async (processoId) => {
            const cnj = wizardProcessoManual.cnj
            if (cnj && processoId && escritorioAtivo) {
              try {
                const cnjSomenteDigitos = cnj.replace(/\D/g, '')
                const { data: updated, error } = await supabase
                  .from('publicacoes_publicacoes')
                  .update({ processo_id: processoId })
                  .eq('escritorio_id', escritorioAtivo)
                  .or(`numero_processo.eq.${cnj},numero_processo.eq.${cnjSomenteDigitos}`)
                  .select('id')
                if (error) {
                  console.error('Erro ao vincular publicações:', error.message, error.details, error.hint)
                } else if (updated && updated.length > 0) {
                  toast.success(`Pasta criada e ${updated.length} publicação(ões) vinculada(s)!`)
                } else {
                  toast.success('Pasta criada com sucesso!')
                }
              } catch (err) {
                console.error('Erro ao vincular publicações:', err)
              }
            } else {
              toast.success('Pasta criada com sucesso!')
            }
            setWizardProcessoManual({ open: false, cnj: '' })
            carregarPublicacoes()
          }}
        />
      )}
    </div>
  )
}
