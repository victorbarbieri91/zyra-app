'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import { BulkActionsToolbarCRM, BulkActionCRM } from '@/components/crm/BulkActionsToolbarCRM'
import { VincularContratoModal } from '@/components/financeiro/VincularContratoModal'
import { BulkEditStatusConsultivoModal } from '@/components/consultivo/BulkEditStatusConsultivoModal'
import ConsultivoTabela from '@/components/consultivo/ConsultivoTabela'
import ConsultaRecentCard from '@/components/consultivo/ConsultaRecentCard'
import { useConsultasRecentes } from '@/hooks/useConsultasRecentes'
import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'
import { TIPOS_CONSULTA_LISTA, TIPOS_CONSULTA } from '@/lib/constants/consultivo-tipos'
import {
  type ConsultaLinha, type AbaConsultivo, type SortKey, type SortDir, areaLabel, areaChipClass,
} from '@/components/consultivo/consultivo-ui'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

const TABS: { v: AbaConsultivo; l: string }[] = [
  { v: 'ativas', l: 'Ativas' },
  { v: 'minhas', l: 'Minhas' },
  { v: 'arquivadas', l: 'Arquivadas' },
]

export default function ConsultivoPage() {
  const [consultas, setConsultas] = useState<ConsultaLinha[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [aba, setAba] = useState<AbaConsultivo>('ativas')
  const [area, setArea] = useState('todas')
  const [tipo, setTipo] = useState('todos')
  const [resp, setResp] = useState('todos')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'num', dir: 'desc' })
  const [wizardModalOpen, setWizardModalOpen] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Identidade
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [respOptions, setRespOptions] = useState<{ value: string; label: string }[]>([{ value: 'todos', label: 'Todos' }])

  // Contadores GLOBAIS (subtítulo + pills de área) — não mudam com busca/filtros
  const [globalAtivas, setGlobalAtivas] = useState(0)
  const [globalArquivadas, setGlobalArquivadas] = useState(0)
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({})
  // Contadores das ABAS — facetados: refletem a busca/filtros atuais
  const [ativasCount, setAtivasCount] = useState(0)
  const [arquivadasCount, setArquivadasCount] = useState(0)
  const [minhasCount, setMinhasCount] = useState(0)

  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading] = useState(false)
  const [showVincularContratoModal, setShowVincularContratoModal] = useState(false)
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reqIdRef = useRef(0) // "latest-wins": só a recarga mais recente escreve no estado
  const supabase = createClient()

  const { recentes } = useConsultasRecentes(userId, escritorioId, 4)

  // ?novo=true abre o wizard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('novo') === 'true') {
      setWizardModalOpen(true)
      window.history.replaceState({}, '', '/dashboard/consultivo')
    }
  }, [])

  // usuário + escritório + responsáveis
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('escritorio_id').eq('id', user.id).single()
      if (!profile?.escritorio_id) return
      setEscritorioId(profile.escritorio_id)
      const { data: membros } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .eq('escritorio_id', profile.escritorio_id)
        .order('nome_completo')
      setRespOptions([
        { value: 'todos', label: 'Todos' },
        ...(membros || []).map((m: { id: string; nome_completo: string }) => ({ value: m.id, label: m.nome_completo })),
      ])
    }
    load()
  }, [supabase])

  // debounce busca
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [searchQuery])

  const buscando = debouncedSearch.trim().length > 0

  // Carrega consultas (a view já filtra por grupo via RLS — sem .eq escritorio)
  const loadConsultas = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    try {
      // Aba "Minhas" exige usuário carregado; sem ele, lista vazia (bate com a faceta = 0).
      if (aba === 'minhas' && !userId) {
        if (reqIdRef.current === myId) { setConsultas([]); setTotalCount(0) }
        return
      }

      let query = supabase
        .from('v_consultivo_consultas')
        .select('id, numero, titulo, cliente_nome, tipo, area, status, responsavel_id, responsavel_nome', { count: 'exact' })

      // Escopo da aba (status / responsável) — SEMPRE aplicado, inclusive na busca.
      // Assim a busca padrão olha só as ativas; só busca arquivadas na aba Arquivadas.
      if (aba === 'arquivadas') {
        query = query.eq('status', 'arquivado')
      } else if (aba === 'minhas') {
        query = query.eq('responsavel_id', userId!).eq('status', 'ativo')
      } else {
        query = query.eq('status', 'ativo')
      }

      // Busca textual dentro do escopo da aba atual.
      if (buscando) {
        const t = `%${debouncedSearch.trim()}%`
        query = query.or(`titulo.ilike.${t},numero.ilike.${t},cliente_nome.ilike.${t}`)
      }

      if (area !== 'todas') query = query.eq('area', area)
      if (tipo !== 'todos') query = query.eq('tipo', tipo)
      if (resp !== 'todos') query = query.eq('responsavel_id', resp)

      const sortCol = sort.key === 'titulo' ? 'titulo' : sort.key === 'cliente' ? 'cliente_nome' : 'numero'
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await query
        .order(sortCol, { ascending: sort.dir === 'asc', nullsFirst: false })
        .range(from, to)

      if (reqIdRef.current !== myId) return // resposta obsoleta — ignora (latest-wins)
      if (error) {
        console.error('Erro ao carregar consultas:', error)
        return
      }
      setTotalCount(count || 0)
      setConsultas((data || []) as ConsultaLinha[])
    } finally {
      if (reqIdRef.current === myId) setLoading(false)
    }
  }, [buscando, debouncedSearch, aba, userId, area, tipo, resp, sort, currentPage, pageSize, supabase])

  useEffect(() => { loadConsultas() }, [loadConsultas])

  useEffect(() => {
    const onFocus = () => loadConsultas()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadConsultas])

  // Contadores GLOBAIS (apenas o subtítulo do topo) — não mudam com busca/filtros.
  const carregarGlobais = useCallback(async () => {
    const base = () => supabase.from('v_consultivo_consultas').select('id', { count: 'exact', head: true })
    const [a, ar] = await Promise.all([
      base().eq('status', 'ativo'),
      base().eq('status', 'arquivado'),
    ])
    setGlobalAtivas(a.count || 0)
    setGlobalArquivadas(ar.count || 0)
  }, [supabase])

  useEffect(() => { carregarGlobais() }, [carregarGlobais])

  // Contadores FACETADOS (abas + pills de área): cada número = o que apareceria ao
  // clicar, já considerando a busca + filtros atuais. As pills seguem o escopo da ABA.
  const carregarFacetas = useCallback(async () => {
    const base = () => supabase.from('v_consultivo_consultas').select('id', { count: 'exact', head: true })
    // Mesma cadeia de filtros do loadConsultas, para a contagem bater com o resultado.
    const comFiltros = (q: ReturnType<typeof base>) => {
      let r = q
      if (buscando) {
        const t = `%${debouncedSearch.trim()}%`
        r = r.or(`titulo.ilike.${t},numero.ilike.${t},cliente_nome.ilike.${t}`)
      }
      if (area !== 'todas') r = r.eq('area', area)
      if (tipo !== 'todos') r = r.eq('tipo', tipo)
      if (resp !== 'todos') r = r.eq('responsavel_id', resp)
      return r
    }
    const [a, mi, ar] = await Promise.all([
      comFiltros(base().eq('status', 'ativo')),
      userId ? comFiltros(base().eq('status', 'ativo').eq('responsavel_id', userId)) : Promise.resolve({ count: 0 }),
      comFiltros(base().eq('status', 'arquivado')),
    ])
    setAtivasCount(a.count || 0)
    setMinhasCount(mi.count || 0)
    setArquivadasCount(ar.count || 0)

    // Pills de área: escopo da ABA atual + busca + tipo + resp, agrupado por área
    // (sem o filtro de área, para listar todas as áreas disponíveis no escopo).
    if (aba === 'minhas' && !userId) { setAreaCounts({}); return }
    let aq = supabase.from('v_consultivo_consultas').select('area').limit(5000)
    if (aba === 'arquivadas') aq = aq.eq('status', 'arquivado')
    else if (aba === 'minhas') aq = aq.eq('responsavel_id', userId!).eq('status', 'ativo')
    else aq = aq.eq('status', 'ativo')
    if (buscando) {
      const t = `%${debouncedSearch.trim()}%`
      aq = aq.or(`titulo.ilike.${t},numero.ilike.${t},cliente_nome.ilike.${t}`)
    }
    if (tipo !== 'todos') aq = aq.eq('tipo', tipo)
    if (resp !== 'todos') aq = aq.eq('responsavel_id', resp)
    const { data: areasData } = await aq
    const counts: Record<string, number> = {}
    ;(areasData || []).forEach((r: { area: string | null }) => {
      const k = r.area || 'outros'
      counts[k] = (counts[k] || 0) + 1
    })
    setAreaCounts(counts)
  }, [buscando, debouncedSearch, area, tipo, resp, aba, userId, supabase])

  useEffect(() => { carregarFacetas() }, [carregarFacetas])

  const areaPills = useMemo(() => {
    const presentes = Object.keys(areaCounts).filter(a => areaCounts[a] > 0)
    presentes.sort((a, b) => areaCounts[b] - areaCounts[a])
    return ['todas', ...presentes]
  }, [areaCounts])
  const ativosTotal = useMemo(() => Object.values(areaCounts).reduce((s, n) => s + n, 0), [areaCounts])

  const areaOptions = useMemo(() => ([
    { value: 'todas', label: 'Todas as áreas' },
    ...Object.keys(AREA_JURIDICA_LABELS).map(a => ({ value: a, label: areaLabel(a) })),
  ]), [])
  const tipoOptions = useMemo(() => ([
    { value: 'todos', label: 'Todos os tipos' },
    ...TIPOS_CONSULTA_LISTA.map(t => ({ value: t, label: TIPOS_CONSULTA[t].label })),
  ]), [])

  // paginação
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)
  const goToPage = (p: number) => { if (p >= 1 && p <= totalPages) setCurrentPage(p) }

  const onSort = (key: SortKey) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'num' ? 'desc' : 'asc' })
    setCurrentPage(1)
  }
  const trocarAba = (v: AbaConsultivo) => { setAba(v); setCurrentPage(1) }
  const trocarArea = (a: string) => { setArea(a); setCurrentPage(1) }
  const trocarTipo = (t: string) => { setTipo(t); setCurrentPage(1) }
  const trocarResp = (r: string) => { setResp(r); setCurrentPage(1) }
  const limparFiltros = () => { setSearchQuery(''); setArea('todas'); setTipo('todos'); setResp('todos'); setCurrentPage(1) }
  const anyFilter = buscando || area !== 'todas' || tipo !== 'todos' || resp !== 'todos'
  const showRecentes = !buscando && aba === 'ativas' && area === 'todas' && tipo === 'todos' && resp === 'todos' && recentes.length > 0
  // Total encontrado na busca = ativas + arquivadas (partições disjuntas de status)
  const totalBusca = ativasCount + arquivadasCount

  // seleção em massa
  const toggleSelection = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === consultas.length ? new Set() : new Set(consultas.map(c => c.id))
  )
  const clearSelection = () => setSelectedIds(new Set())
  const handleBulkAction = (action: BulkActionCRM) => {
    if (action === 'vincular_contrato') setShowVincularContratoModal(true)
    else if (action === 'alterar_status') setShowBulkStatusModal(true)
  }

  const refresh = () => { loadConsultas(); carregarGlobais(); carregarFacetas() }

  return (
    <div className="min-h-full bg-[#fafaf7] dark:bg-[#0b0f14] px-6 md:px-7 pt-6 md:pt-7 pb-7">
      {/* cabeçalho */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[32px] md:text-[34px] font-medium tracking-[-0.035em] text-[#1a2330] dark:text-[#edf1f7] leading-none" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Consultivo
          </h1>
          <p className="mt-2 text-[12.5px] font-medium text-[#5a6775] dark:text-[#8a97a8]">
            {globalAtivas + globalArquivadas} consultas · {globalAtivas} ativas
          </p>
        </div>
        <Button
          onClick={() => setWizardModalOpen(true)}
          className="h-9 bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-2" />Nova consulta
        </Button>
      </div>

      {/* hero de busca */}
      <div className="mt-5">
        <div className="relative">
          <Search className={cn('absolute left-[18px] top-[18px] w-5 h-5', searchQuery ? 'text-[#89bcbe]' : 'text-[#9aa1a8] dark:text-[#5a6675]')} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); setDebouncedSearch(searchQuery); setCurrentPage(1) } }}
            placeholder="Buscar por cliente, título ou número da consulta…"
            className={cn(
              'w-full h-14 pl-[50px] rounded-[14px] bg-[#ffffff] dark:bg-[#151e2b] text-[16px] font-medium text-[#2c3e50] dark:text-[#d8e2ef] placeholder:text-[#9aa1a8] dark:placeholder:text-[#5a6675] outline-none border-[1.5px] transition-colors',
              searchQuery ? 'border-[#89bcbe] pr-[118px]' : 'border-[#e6e3da] dark:border-[#253345] pr-16'
            )}
          />
          <div className="absolute right-4 top-0 h-14 flex items-center gap-2">
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg border border-[#e6e3da] dark:border-[#253345] bg-[#faf9f5] dark:bg-[#10161f] text-[#5a6775] dark:text-[#8a97a8] text-[11.5px] font-semibold">
                <X className="w-3 h-3" />Limpar
              </button>
            ) : (
              <kbd className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-1 rounded-md bg-[#efece4] dark:bg-[#1c2530] border border-[#e6e3da] dark:border-[#253345] text-[#9aa1a8] dark:text-[#5a6675]">↵ Enter</kbd>
            )}
          </div>
        </div>

        {/* pills de área */}
        <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#9aa1a8] dark:text-[#5a6675]">Área</span>
          {areaPills.map(a => {
            const active = area === a
            const isTodas = a === 'todas'
            const n = isTodas ? ativosTotal : (areaCounts[a] || 0)
            return (
              <button
                key={a}
                onClick={() => trocarArea(a)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[11.5px] font-semibold border transition-all',
                  isTodas
                    ? active
                      ? 'bg-[#e9f3f3] dark:bg-[rgba(137,188,190,0.18)] border-[#bfdcdd] dark:border-[#3a5a5c] text-[#3f7376] dark:text-[#9fc7c9]'
                      : 'bg-transparent border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe]'
                    : cn(areaChipClass(a), 'border-transparent', active ? 'ring-2 ring-inset ring-current shadow-sm' : 'opacity-80 hover:opacity-100')
                )}
              >
                {isTodas ? 'Todas as áreas' : areaLabel(a)}
                <span className={cn('text-[9.5px] font-bold font-mono', isTodas ? (active ? 'text-[#3f7376] dark:text-[#9fc7c9]' : 'text-[#9aa1a8] dark:text-[#5a6675]') : 'opacity-60')}>{n}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* acessadas recentemente */}
      {showRecentes && (
        <div className="mt-6">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Clock className="w-3.5 h-3.5 text-[#9aa1a8] dark:text-[#5a6675]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9aa1a8] dark:text-[#5a6675]">Acessadas recentemente</span>
            <div className="flex-1 h-px bg-[#f0ede3] dark:bg-[#1d2a3c]" />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            {recentes.map(c => <ConsultaRecentCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* lista — rótulo + abas/contagem + limpar */}
      <div className="mt-7 mb-2 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9aa1a8] dark:text-[#5a6675]">
          {buscando ? 'Resultados' : 'Todas as consultas'}
        </span>
        {/* abas sempre visíveis — durante a busca, definem o escopo (ativas/minhas/arquivadas) */}
        <div className="flex gap-0.5 bg-[#ece9e2] dark:bg-[#1a212c] p-[3px] rounded-[9px]">
          {TABS.map(s => {
            const n = s.v === 'ativas' ? ativasCount : s.v === 'minhas' ? minhasCount : arquivadasCount
            return (
              <button
                key={s.v}
                onClick={() => trocarAba(s.v)}
                className={cn(
                  'px-3 py-[5px] rounded-[7px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                  aba === s.v
                    ? 'bg-[#ffffff] dark:bg-[#2a3544] text-[#34495e] dark:text-[#e2e8f0] shadow-sm'
                    : 'text-[#857f73] dark:text-[#8a97a8] hover:text-[#34495e] dark:hover:text-slate-300'
                )}
              >
                {s.l}
                <span className="text-[10px] font-bold font-mono opacity-60">{n}</span>
              </button>
            )
          })}
        </div>
        {buscando && (
          <span className="text-[12px] text-[#5a6775] dark:text-[#8a97a8]">
            <strong className="text-[#2c3e50] dark:text-[#d8e2ef] font-mono">{totalBusca}</strong> {totalBusca === 1 ? 'consulta' : 'consultas'} para “<span className="text-[#2c3e50] dark:text-[#d8e2ef] font-semibold">{debouncedSearch.trim()}</span>”
            <span className="text-[#9aa1a8] dark:text-[#5a6675]"> · {ativasCount} ativas · {arquivadasCount} arquivadas</span>
          </span>
        )}
        <div className="flex-1" />
        {anyFilter && (
          <button onClick={limparFiltros} className="inline-flex items-center gap-1.5 h-8 px-[11px] rounded-[9px] bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] text-[12px] font-semibold">
            <X className="w-3 h-3" />Limpar filtros
          </button>
        )}
      </div>

      {/* tabela */}
      <ConsultivoTabela
        consultas={consultas}
        loading={loading}
        sort={sort}
        onSort={onSort}
        area={area}
        onArea={trocarArea}
        areaOptions={areaOptions}
        tipo={tipo}
        onTipo={trocarTipo}
        tipoOptions={tipoOptions}
        resp={resp}
        onResp={trocarResp}
        respOptions={respOptions}
        selectedIds={selectedIds}
        onToggle={toggleSelection}
        onToggleAll={toggleSelectAll}
      />

      {/* paginação */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-3.5 text-[11.5px] text-[#5a6775] dark:text-[#8a97a8]">
          <div className="flex items-center gap-3">
            <span>Mostrando <strong className="text-[#2c3e50] dark:text-[#d8e2ef]">{startItem}</strong>–<strong className="text-[#2c3e50] dark:text-[#d8e2ef]">{endItem}</strong> de <strong className="text-[#2c3e50] dark:text-[#d8e2ef]">{totalCount}</strong></span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1) }}>
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg border-[#e6e3da] dark:border-[#253345] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="w-8 h-8 rounded-md border border-[#e6e3da] dark:border-[#253345] bg-[#ffffff] dark:bg-[#151e2b] flex items-center justify-center disabled:opacity-40">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[12px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] font-mono">{currentPage}/{totalPages || 1}</span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="w-8 h-8 rounded-md border border-[#e6e3da] dark:border-[#253345] bg-[#ffffff] dark:bg-[#151e2b] flex items-center justify-center disabled:opacity-40">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Nova consulta */}
      <ConsultaWizardModal
        open={wizardModalOpen}
        onOpenChange={setWizardModalOpen}
        onSuccess={refresh}
        escritorioId={escritorioId || undefined}
      />

      {/* seleção em massa */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbarCRM
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onAction={handleBulkAction}
          loading={bulkLoading}
        />
      )}
      <BulkEditStatusConsultivoModal
        open={showBulkStatusModal}
        onClose={() => setShowBulkStatusModal(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => { refresh(); clearSelection() }}
      />
      <VincularContratoModal
        open={showVincularContratoModal}
        onOpenChange={setShowVincularContratoModal}
        tipo="consultivo"
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => { refresh(); clearSelection() }}
      />
    </div>
  )
}
