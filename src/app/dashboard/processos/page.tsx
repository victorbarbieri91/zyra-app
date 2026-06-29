'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NovoProcessoDropdown } from '@/components/processos/NovoProcessoDropdown'
import { BulkActionsToolbar, BulkAction } from '@/components/processos/BulkActionsToolbar'
import { BulkEditModal } from '@/components/processos/BulkEditModal'
import { VincularContratoModal } from '@/components/financeiro/VincularContratoModal'
import ProcessosTabela from '@/components/processos/ProcessosTabela'
import ProcessoRecentCard from '@/components/processos/ProcessoRecentCard'
import { useProcessosRecentes } from '@/hooks/useProcessosRecentes'
import { AREA_JURIDICA_LABELS } from '@/lib/constants/areas-juridicas'
import {
  type ProcessoLinha, type AbaProc, type SortKey, type SortDir, STATUS_ENCERRADOS, areaLabel, areaChipClass,
} from '@/components/processos/processos-ui'

type EditField = 'area' | 'responsavel' | 'status' | 'prioridade' | 'tags'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20
const ENC = `(${STATUS_ENCERRADOS.join(',')})`

const TABS: { v: AbaProc; l: string }[] = [
  { v: 'ativos', l: 'Ativos' },
  { v: 'meus', l: 'Meus' },
  { v: 'arquivados', l: 'Arquivados' },
]

export default function ProcessosPage() {
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const initialAba: AbaProc =
    viewParam === 'meus' ? 'meus'
      : viewParam === 'encerrados' || viewParam === 'arquivados' ? 'arquivados'
        : 'ativos'

  const [processos, setProcessos] = useState<ProcessoLinha[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('processos_search') || '' : ''
  )
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)

  const [aba, setAba] = useState<AbaProc>(initialAba)
  const [area, setArea] = useState<string>('todas')
  const [resp, setResp] = useState<string>('todos')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'mov', dir: 'desc' })

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Contadores GLOBAIS (apenas o subtítulo do topo) — não mudam com busca/filtros
  const [totalGeral, setTotalGeral] = useState(0)
  const [ativosCount, setAtivosCount] = useState(0)
  // Contadores FACETADOS (abas + pills de área) — refletem a busca/filtros atuais
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({})
  const [tabMeus, setTabMeus] = useState(0)
  const [tabAtivos, setTabAtivos] = useState(0)
  const [tabArquivados, setTabArquivados] = useState(0)

  // Identidade
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [respOptions, setRespOptions] = useState<{ value: string; label: string }[]>([{ value: 'todos', label: 'Todos' }])

  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditField, setBulkEditField] = useState<EditField | null>(null)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [showVincularContratoModal, setShowVincularContratoModal] = useState(false)
  const [bulkLoading] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reqIdRef = useRef(0) // "latest-wins": só a recarga mais recente escreve no estado
  const supabase = createClient()

  const { recentes } = useProcessosRecentes(userId, escritorioId, 4)

  // Carregar usuário + escritório + responsáveis
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

  // Debounce da busca
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [searchQuery])

  useEffect(() => {
    if (debouncedSearch.trim()) sessionStorage.setItem('processos_search', debouncedSearch.trim())
    else sessionStorage.removeItem('processos_search')
  }, [debouncedSearch])

  const buscando = debouncedSearch.trim().length > 0

  // Carregar processos
  const loadProcessos = useCallback(async () => {
    if (!escritorioId) return
    const myId = ++reqIdRef.current
    setLoading(true)
    try {
      // Aba "Meus" exige usuário carregado; sem ele, lista vazia (bate com a faceta = 0).
      if (aba === 'meus' && !userId) {
        if (reqIdRef.current === myId) { setProcessos([]); setTotalCount(0) }
        return
      }

      let query = supabase
        .from('v_processos_com_movimentacoes')
        .select('id, numero_pasta, numero_cnj, cliente_nome, parte_contraria, area, status, responsavel_id, responsavel_nome, ultima_movimentacao, ultima_mov_descricao, ultima_mov_tipo', { count: 'exact' })
        .eq('escritorio_id', escritorioId)

      // Escopo da aba SEMPRE aplicado — a busca acontece DENTRO da aba atual.
      // Ativos (padrão) = não-encerrados; Arquivados = encerrados; Meus = meus não-encerrados.
      if (aba === 'arquivados') query = query.in('status', STATUS_ENCERRADOS as unknown as string[])
      else if (aba === 'meus') query = query.eq('responsavel_id', userId!).not('status', 'in', ENC)
      else query = query.not('status', 'in', ENC) // ativos (padrão) = não-encerrados

      const termo = debouncedSearch.trim()
      if (termo) {
        const t = `%${termo}%`
        query = query.or(`numero_cnj.ilike.${t},numero_pasta.ilike.${t},parte_contraria.ilike.${t},cliente_nome.ilike.${t}`)
      }

      if (area !== 'todas') query = query.eq('area', area)
      if (resp !== 'todos') query = query.eq('responsavel_id', resp)

      const sortCol = sort.key === 'pasta' ? 'numero_pasta'
        : sort.key === 'cliente' ? 'cliente_nome'
          : sort.key === 'contraria' ? 'parte_contraria'
            : 'ultima_movimentacao'

      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order(sortCol, { ascending: sort.dir === 'asc', nullsFirst: false })
        .range(from, to)

      if (reqIdRef.current !== myId) return // resposta obsoleta — ignora (latest-wins)
      if (error) {
        console.error('Erro ao carregar processos:', error)
        return
      }
      setTotalCount(count || 0)
      setProcessos((data || []) as ProcessoLinha[])
    } finally {
      if (reqIdRef.current === myId) setLoading(false)
    }
  }, [escritorioId, userId, debouncedSearch, aba, area, resp, sort, currentPage, pageSize, supabase])

  useEffect(() => { loadProcessos() }, [loadProcessos])

  // Contadores GLOBAIS (apenas o subtítulo do topo) — não mudam com busca/filtros.
  const carregarContagens = useCallback(async () => {
    if (!escritorioId) return
    const base = () => supabase.from('v_processos_com_movimentacoes').select('id', { count: 'exact', head: true }).eq('escritorio_id', escritorioId)
    const [{ count: total }, { count: ativos }] = await Promise.all([
      base(),
      base().not('status', 'in', ENC),
    ])
    setTotalGeral(total || 0)
    setAtivosCount(ativos || 0)
  }, [escritorioId, supabase])

  useEffect(() => { carregarContagens() }, [carregarContagens])

  // Contadores FACETADOS (abas + pills de área): cada número = o que apareceria ao
  // clicar, já considerando a busca + filtros atuais. As pills seguem o escopo da ABA.
  const carregarFacetas = useCallback(async () => {
    if (!escritorioId) return
    const base = () => supabase.from('v_processos_com_movimentacoes').select('id', { count: 'exact', head: true }).eq('escritorio_id', escritorioId)
    // Mesma cadeia de filtros do loadProcessos, para a contagem bater com o resultado.
    const comFiltros = (q: ReturnType<typeof base>) => {
      let r = q
      const termo = debouncedSearch.trim()
      if (termo) {
        const t = `%${termo}%`
        r = r.or(`numero_cnj.ilike.${t},numero_pasta.ilike.${t},parte_contraria.ilike.${t},cliente_nome.ilike.${t}`)
      }
      if (area !== 'todas') r = r.eq('area', area)
      if (resp !== 'todos') r = r.eq('responsavel_id', resp)
      return r
    }
    const [at, me, ar] = await Promise.all([
      comFiltros(base().not('status', 'in', ENC)),
      userId ? comFiltros(base().eq('responsavel_id', userId).not('status', 'in', ENC)) : Promise.resolve({ count: 0 }),
      comFiltros(base().in('status', STATUS_ENCERRADOS as unknown as string[])),
    ])
    setTabAtivos(at.count || 0)
    setTabMeus(me.count || 0)
    setTabArquivados(ar.count || 0)

    // Pills de área: escopo da ABA atual + busca + resp, agrupado por área
    // (sem o filtro de área, para listar todas as áreas disponíveis no escopo).
    if (aba === 'meus' && !userId) { setAreaCounts({}); return }
    let aq = supabase.from('v_processos_com_movimentacoes').select('area').eq('escritorio_id', escritorioId).limit(5000)
    if (aba === 'arquivados') aq = aq.in('status', STATUS_ENCERRADOS as unknown as string[])
    else if (aba === 'meus') aq = aq.eq('responsavel_id', userId!).not('status', 'in', ENC)
    else aq = aq.not('status', 'in', ENC)
    const termo = debouncedSearch.trim()
    if (termo) {
      const t = `%${termo}%`
      aq = aq.or(`numero_cnj.ilike.${t},numero_pasta.ilike.${t},parte_contraria.ilike.${t},cliente_nome.ilike.${t}`)
    }
    if (resp !== 'todos') aq = aq.eq('responsavel_id', resp)
    const { data: areasData } = await aq
    const counts: Record<string, number> = {}
    ;(areasData || []).forEach((r: { area: string | null }) => {
      const a = r.area || 'outros'
      counts[a] = (counts[a] || 0) + 1
    })
    setAreaCounts(counts)
  }, [escritorioId, userId, debouncedSearch, area, resp, aba, supabase])

  useEffect(() => { carregarFacetas() }, [carregarFacetas])

  // pills de área = "todas" + áreas presentes (por contagem desc)
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

  // paginação
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalCount)
  const goToPage = (p: number) => { if (p >= 1 && p <= totalPages) setCurrentPage(p) }

  // ordenação
  const onSort = (key: SortKey) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'mov' ? 'desc' : 'asc' })
    setCurrentPage(1)
  }

  // filtros → reset página
  const trocarAba = (v: AbaProc) => { setAba(v); setCurrentPage(1) }
  const trocarArea = (a: string) => { setArea(a); setCurrentPage(1) }
  const trocarResp = (r: string) => { setResp(r); setCurrentPage(1) }
  const limparFiltros = () => { setSearchQuery(''); setArea('todas'); setResp('todos'); setCurrentPage(1) }
  const anyFilter = buscando || area !== 'todas' || resp !== 'todos'
  const showRecentes = !buscando && aba === 'ativos' && area === 'todas' && resp === 'todos' && recentes.length > 0
  // Total encontrado na busca = ativos + arquivados (partições disjuntas de status)
  const totalBusca = tabAtivos + tabArquivados

  // seleção em massa
  const toggleSelection = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === processos.length ? new Set() : new Set(processos.map(p => p.id))
  )
  const clearSelection = () => setSelectedIds(new Set())
  const handleBulkAction = (action: BulkAction) => {
    if (action === 'alterar_area') { setBulkEditField('area'); setShowBulkEditModal(true) }
    else if (action === 'alterar_responsavel') { setBulkEditField('responsavel'); setShowBulkEditModal(true) }
    else if (action === 'alterar_status') { setBulkEditField('status'); setShowBulkEditModal(true) }
    else if (action === 'alterar_prioridade') { setBulkEditField('prioridade'); setShowBulkEditModal(true) }
    else if (action === 'adicionar_tags') { setBulkEditField('tags'); setShowBulkEditModal(true) }
    else if (action === 'vincular_contrato') { setShowVincularContratoModal(true) }
  }

  return (
    <div className="min-h-full bg-[#fafaf7] dark:bg-[#0b0f14] px-6 md:px-7 pt-6 md:pt-7 pb-7">
      {/* cabeçalho */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[32px] md:text-[34px] font-medium tracking-[-0.035em] text-[#1a2330] dark:text-[#edf1f7] leading-none" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Processos
          </h1>
          <p className="mt-2 text-[12.5px] font-medium text-[#5a6775] dark:text-[#8a97a8]">
            {totalGeral} processos · {ativosCount} ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NovoProcessoDropdown onProcessoCriado={() => { loadProcessos(); carregarContagens(); carregarFacetas() }} />
        </div>
      </div>

      {/* hero de busca */}
      <div className="mt-5">
        <div className="relative">
          <Search className={cn('absolute left-[18px] top-[18px] w-5 h-5', searchQuery ? 'text-[#89bcbe]' : 'text-[#9aa1a8] dark:text-[#5a6675]')} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
                setDebouncedSearch(searchQuery)
                setCurrentPage(1)
              }
            }}
            placeholder="Buscar por cliente, número CNJ, pasta ou parte contrária…"
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

      {/* acessados recentemente */}
      {showRecentes && (
        <div className="mt-6">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Clock className="w-3.5 h-3.5 text-[#9aa1a8] dark:text-[#5a6675]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9aa1a8] dark:text-[#5a6675]">Acessados recentemente</span>
            <div className="flex-1 h-px bg-[#f0ede3] dark:bg-[#1d2a3c]" />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            {recentes.map(p => <ProcessoRecentCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* lista — rótulo + abas/contagem + limpar */}
      <div className="mt-7 mb-2 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9aa1a8] dark:text-[#5a6675]">
          {buscando ? 'Resultados' : 'Todos os processos'}
        </span>
        {/* abas sempre visíveis — durante a busca, definem o escopo (todos/meus/ativos/arquivados) */}
        <div className="flex gap-0.5 bg-[#ece9e2] dark:bg-[#1a212c] p-[3px] rounded-[9px]">
          {TABS.map(s => {
            const n = s.v === 'ativos' ? tabAtivos : s.v === 'meus' ? tabMeus : tabArquivados
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
            <strong className="text-[#2c3e50] dark:text-[#d8e2ef] font-mono">{totalBusca}</strong> {totalBusca === 1 ? 'processo' : 'processos'} para “<span className="text-[#2c3e50] dark:text-[#d8e2ef] font-semibold">{debouncedSearch.trim()}</span>”
            <span className="text-[#9aa1a8] dark:text-[#5a6675]"> · {tabAtivos} ativos · {tabArquivados} arquivados</span>
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
      <ProcessosTabela
        processos={processos}
        loading={loading}
        sort={sort}
        onSort={onSort}
        area={area}
        onArea={trocarArea}
        areaOptions={areaOptions}
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

      {/* seleção em massa */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onAction={handleBulkAction}
        loading={bulkLoading}
      />
      {showBulkEditModal && bulkEditField && (
        <BulkEditModal
          open={showBulkEditModal}
          onClose={() => { setShowBulkEditModal(false); setBulkEditField(null) }}
          field={bulkEditField}
          selectedIds={Array.from(selectedIds)}
          onSuccess={() => { loadProcessos(); carregarContagens(); carregarFacetas(); clearSelection() }}
        />
      )}
      <VincularContratoModal
        open={showVincularContratoModal}
        onOpenChange={setShowVincularContratoModal}
        tipo="processo"
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => { loadProcessos(); clearSelection() }}
      />
    </div>
  )
}
