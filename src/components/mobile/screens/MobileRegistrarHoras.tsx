'use client'

// MobileRegistrarHoras — tela full-screen (phone-only) de lançamento de horas.
// Porta o fluxo de criação do TimesheetModal (desktop) para o celular: steppers
// de tempo, escolha de vínculo (processo/consultivo) com busca + recentes,
// atividade, data e card de contrato/faturável. Submete via a MESMA RPC do
// desktop: registrar_tempo_retroativo (p_hora_inicio/p_hora_fim = null).
//
// Comportamento (faturável, ato por_hora, contrato) replicado fielmente de
// src/components/financeiro/TimesheetModal.tsx — não inventar regra nova aqui.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useAuth } from '@/contexts/AuthContext'
import { useTimesheetRecentes } from '@/hooks/useTimesheetRecentes'
import { useAtosHora, type AtoHoraConfig } from '@/hooks/useAtosHora'
import {
  type FormaCobranca,
  parseFormasPagamento,
  contratoCobraHoras,
  formaPrincipal,
  FORMA_COBRANCA_LABELS,
} from '@/lib/contratos/formas'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileScreenHeader from '../shell/MobileScreenHeader'
import MobileFullScreen from '../shell/MobileFullScreen'

// ────────────────────────────── tipos locais ──────────────────────────────

interface ProcessoSel {
  id: string
  numero_cnj: string
  numero_pasta?: string | null
  cliente_nome?: string | null
  contrato_id?: string | null
}

interface ConsultaSel {
  id: string
  numero?: string | null
  titulo: string
  cliente_nome?: string | null
  contrato_id?: string | null
}

interface ContratoInfo {
  id: string
  formas_cobranca: FormaCobranca[]
  forma_cobranca: FormaCobranca
  horas_faturaveis: boolean
  titulo?: string | null
}

// Item unificado para busca/recentes
interface VinculoItem {
  id: string
  chip: string
  titulo: string
  sub?: string
  contrato_id?: string | null
}

type VinculoTipo = 'processo' | 'consulta'

// Linhas mínimas do Supabase que consumimos (cast explícito — sem any implícito)
interface ProcessoRow {
  id: string
  numero_cnj: string
  numero_pasta: string | null
  parte_contraria?: string | null
  contrato_id: string | null
  cliente_id: string | null
}
interface ConsultaRow {
  id: string
  numero: string | null
  titulo: string
  contrato_id: string | null
  cliente_id: string | null
}
interface PessoaRow {
  id: string
  nome_completo: string | null
}
interface ContratoRow {
  id: string
  forma_cobranca: string | null
  formas_pagamento: unknown
  horas_faturaveis: boolean | null
  titulo: string | null
}

// ────────────────────────────── helpers ──────────────────────────────

const formatDateInput = (date: Date = new Date()): string => formatBrazilDate(date, 'yyyy-MM-dd')

function fmtHorasDisplay(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

// ────────────────────────────── componente ──────────────────────────────

export default function MobileRegistrarHoras({
  dark,
  prefill,
  onClose,
  onSuccess,
}: {
  dark: boolean
  prefill?: { processoId?: string | null; consultaId?: string | null; tarefaId?: string | null; atividade?: string }
  onClose: () => void
  onSuccess?: () => void
}) {
  const t = mTokens(dark)
  const supabase = useMemo(() => createClient(), [])
  const { escritorioAtivo } = useEscritorioAtivo()
  const { user } = useAuth()
  const { getAtosConfiguradosHora } = useAtosHora()
  const { data: recentesRaw } = useTimesheetRecentes('mes', 60)

  // ── tempo ──
  const [horas, setHoras] = useState(1)
  const [minutos, setMinutos] = useState(0)
  const totalMin = horas * 60 + minutos
  const horasDecimal = useCallback(() => Math.max(0, horas + minutos / 60), [horas, minutos])

  // ── vínculo ──
  const [vinculoTipo, setVinculoTipo] = useState<VinculoTipo>('processo')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<VinculoItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [processoSel, setProcessoSel] = useState<ProcessoSel | null>(null)
  const [consultaSel, setConsultaSel] = useState<ConsultaSel | null>(null)
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)
  const [loadingVinculo, setLoadingVinculo] = useState(false)

  // ── atividade / data ──
  const [atividade, setAtividade] = useState(prefill?.atividade || '')
  const [dataTrabalho, setDataTrabalho] = useState(formatDateInput())

  // ── faturável (override só neste lançamento) ──
  const [faturavel, setFaturavel] = useState<boolean | null>(null) // null = padrão do contrato
  const [faturavelManual, setFaturavelManual] = useState(false)

  // ── ato (contratos por_ato em modo hora) ──
  const [atosHora, setAtosHora] = useState<AtoHoraConfig[]>([])
  const [atoSelecionado, setAtoSelecionado] = useState<string | null>(null)
  const [atosLoading, setAtosLoading] = useState(false)

  // ── submit ──
  const [loading, setLoading] = useState(false)
  // dirty = digitou atividade (campo essencial) → confirma descarte ao fechar
  const dirty = atividade.trim().length > 0
  const closeApiRef = useRef<{ close: () => void; forceClose: () => void } | null>(null)

  const vinculoFixo = !!(prefill?.processoId || prefill?.consultaId)

  // faturável padrão derivado do contrato (espelha calcular_faturavel_timesheet)
  const faturavelPadrao = useCallback((): boolean => {
    if (!contratoInfo) return true
    return contratoCobraHoras(contratoInfo.formas_cobranca, contratoInfo.horas_faturaveis)
  }, [contratoInfo])
  const padraoCobravel = faturavelPadrao()
  const faturavelEfetivo = faturavel !== null ? faturavel : padraoCobravel
  const overrideMarcado = faturavelManual && faturavel !== null && faturavel !== padraoCobravel

  const toggleOverride = () => {
    if (overrideMarcado) {
      setFaturavel(null)
      setFaturavelManual(false)
    } else {
      setFaturavel(!padraoCobravel)
      setFaturavelManual(true)
    }
  }

  // ── carregar contrato por id ──
  const loadContratoById = useCallback(async (contratoId: string): Promise<ContratoInfo | null> => {
    const { data, error } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, forma_cobranca, formas_pagamento, horas_faturaveis, titulo')
      .eq('id', contratoId)
      .single()
    if (error || !data) return null
    const row = data as ContratoRow
    const formas = parseFormasPagamento(row.formas_pagamento)
    const formasEfetivas: FormaCobranca[] =
      formas.length > 0
        ? formas
        : row.forma_cobranca
          ? [row.forma_cobranca as FormaCobranca]
          : []
    return {
      id: row.id,
      formas_cobranca: formasEfetivas,
      forma_cobranca: (formaPrincipal(formasEfetivas) ?? row.forma_cobranca) as FormaCobranca,
      horas_faturaveis: row.horas_faturaveis ?? true,
      titulo: row.titulo,
    }
  }, [supabase])

  // ── carregar nome do cliente ──
  const loadClienteNome = useCallback(async (clienteId: string | null): Promise<string | undefined> => {
    if (!clienteId) return undefined
    const { data } = await supabase
      .from('crm_pessoas')
      .select('nome_completo')
      .eq('id', clienteId)
      .single()
    return (data as PessoaRow | null)?.nome_completo || undefined
  }, [supabase])

  // ── carregar processo por id (recentes/prefill) ──
  const loadProcessoById = useCallback(async (id: string) => {
    if (!escritorioAtivo) return
    const { data, error } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, numero_pasta, contrato_id, cliente_id')
      .eq('id', id)
      .eq('escritorio_id', escritorioAtivo)
      .single()
    if (error || !data) return
    const row = data as ProcessoRow
    const clienteNome = await loadClienteNome(row.cliente_id)
    const contrato = row.contrato_id ? await loadContratoById(row.contrato_id) : null
    setProcessoSel({
      id: row.id,
      numero_cnj: row.numero_cnj,
      numero_pasta: row.numero_pasta,
      cliente_nome: clienteNome,
      contrato_id: row.contrato_id,
    })
    setConsultaSel(null)
    setContratoInfo(contrato)
  }, [supabase, escritorioAtivo, loadClienteNome, loadContratoById])

  // ── carregar consulta por id (recentes/prefill) ──
  const loadConsultaById = useCallback(async (id: string) => {
    if (!escritorioAtivo) return
    const { data, error } = await supabase
      .from('consultivo_consultas')
      .select('id, numero, titulo, contrato_id, cliente_id')
      .eq('id', id)
      .eq('escritorio_id', escritorioAtivo)
      .single()
    if (error || !data) return
    const row = data as ConsultaRow
    const clienteNome = await loadClienteNome(row.cliente_id)
    const contrato = row.contrato_id ? await loadContratoById(row.contrato_id) : null
    setConsultaSel({
      id: row.id,
      numero: row.numero,
      titulo: row.titulo,
      cliente_nome: clienteNome,
      contrato_id: row.contrato_id,
    })
    setProcessoSel(null)
    setContratoInfo(contrato)
  }, [supabase, escritorioAtivo, loadClienteNome, loadContratoById])

  // ── prefill: pré-seleciona processo/consulta ──
  useEffect(() => {
    if (!escritorioAtivo) return
    if (prefill?.processoId) {
      setVinculoTipo('processo')
      setLoadingVinculo(true)
      loadProcessoById(prefill.processoId).finally(() => setLoadingVinculo(false))
    } else if (prefill?.consultaId) {
      setVinculoTipo('consulta')
      setLoadingVinculo(true)
      loadConsultaById(prefill.consultaId).finally(() => setLoadingVinculo(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escritorioAtivo, prefill?.processoId, prefill?.consultaId])

  // ── recentes (vínculos dedup + atividades) derivados do timesheet ──
  const { recentesProcesso, recentesConsulta, atividadesRecentes } = useMemo(() => {
    const procMap = new Map<string, VinculoItem>()
    const consMap = new Map<string, VinculoItem>()
    const ativs: string[] = []
    for (const r of recentesRaw) {
      if (r.processo_id && !procMap.has(r.processo_id)) {
        procMap.set(r.processo_id, {
          id: r.processo_id,
          chip: 'Proc.',
          titulo: r.processo_titulo || r.cliente_nome || '—',
          sub: r.cliente_nome || undefined,
        })
      }
      if (r.consulta_id && !consMap.has(r.consulta_id)) {
        consMap.set(r.consulta_id, {
          id: r.consulta_id,
          chip: 'Consulta',
          titulo: r.consulta_titulo || r.cliente_nome || '—',
          sub: r.cliente_nome || undefined,
        })
      }
      const a = (r.atividade || '').trim()
      if (a && !ativs.includes(a)) ativs.push(a)
    }
    return {
      recentesProcesso: Array.from(procMap.values()).slice(0, 5),
      recentesConsulta: Array.from(consMap.values()).slice(0, 5),
      atividadesRecentes: ativs.slice(0, 5),
    }
  }, [recentesRaw])

  // ── busca (debounce) ──
  useEffect(() => {
    if (!escritorioAtivo || searchTerm.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    const term = searchTerm.trim()
    const handle = setTimeout(async () => {
      try {
        if (vinculoTipo === 'processo') {
          const { data: pData } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`numero_cnj.ilike.%${term}%,numero_pasta.ilike.%${term}%,parte_contraria.ilike.%${term}%`)
            .limit(15)
          const { data: cliData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${term}%`)
            .limit(10)
          const clienteMap = new Map<string, string>(
            ((cliData as PessoaRow[] | null) || []).map((c) => [c.id, c.nome_completo || '']),
          )
          let processosCliente: ProcessoRow[] = []
          if (clienteMap.size > 0) {
            const { data: pcData } = await supabase
              .from('processos_processos')
              .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10)
            processosCliente = (pcData as ProcessoRow[] | null) || []
          }
          const todos = [...((pData as ProcessoRow[] | null) || []), ...processosCliente]
          const unicos = Array.from(new Map(todos.map((p) => [p.id, p])).values()).slice(0, 10)
          // nomes de clientes faltantes
          const faltantes = unicos
            .filter((p) => p.cliente_id && !clienteMap.has(p.cliente_id))
            .map((p) => p.cliente_id as string)
          if (faltantes.length > 0) {
            const { data: extras } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', faltantes)
            ;((extras as PessoaRow[] | null) || []).forEach((c) => clienteMap.set(c.id, c.nome_completo || ''))
          }
          if (cancelled) return
          setSearchResults(
            unicos.map((p) => ({
              id: p.id,
              chip: p.numero_pasta || 'Proc.',
              titulo: (p.cliente_id && clienteMap.get(p.cliente_id)) || p.parte_contraria || p.numero_cnj,
              sub: p.numero_cnj,
              contrato_id: p.contrato_id,
            })),
          )
        } else {
          const { data: cData } = await supabase
            .from('consultivo_consultas')
            .select('id, numero, titulo, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`titulo.ilike.%${term}%,numero.ilike.%${term}%`)
            .limit(15)
          const { data: cliData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${term}%`)
            .limit(10)
          const clienteMap = new Map<string, string>(
            ((cliData as PessoaRow[] | null) || []).map((c) => [c.id, c.nome_completo || '']),
          )
          let consultasCliente: ConsultaRow[] = []
          if (clienteMap.size > 0) {
            const { data: ccData } = await supabase
              .from('consultivo_consultas')
              .select('id, numero, titulo, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10)
            consultasCliente = (ccData as ConsultaRow[] | null) || []
          }
          const todas = [...((cData as ConsultaRow[] | null) || []), ...consultasCliente]
          const unicas = Array.from(new Map(todas.map((c) => [c.id, c])).values()).slice(0, 10)
          const faltantes = unicas
            .filter((c) => c.cliente_id && !clienteMap.has(c.cliente_id))
            .map((c) => c.cliente_id as string)
          if (faltantes.length > 0) {
            const { data: extras } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', faltantes)
            ;((extras as PessoaRow[] | null) || []).forEach((c) => clienteMap.set(c.id, c.nome_completo || ''))
          }
          if (cancelled) return
          setSearchResults(
            unicas.map((c) => ({
              id: c.id,
              chip: c.numero || 'Cons.',
              titulo: c.titulo,
              sub: (c.cliente_id && clienteMap.get(c.cliente_id)) || undefined,
              contrato_id: c.contrato_id,
            })),
          )
        }
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [searchTerm, vinculoTipo, escritorioAtivo, supabase])

  // ── carregar atos quando contrato é por_ato (modo hora) ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!contratoInfo || contratoInfo.forma_cobranca !== 'por_ato') {
        setAtosHora([])
        setAtoSelecionado(null)
        return
      }
      setAtosLoading(true)
      try {
        const atos = await getAtosConfiguradosHora(contratoInfo.id)
        if (cancelled) return
        setAtosHora(atos)
        if (atos.length === 1) setAtoSelecionado(atos[0].ato_tipo_id)
      } catch {
        if (!cancelled) setAtosHora([])
      } finally {
        if (!cancelled) setAtosLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [contratoInfo, getAtosConfiguradosHora])

  // ── seleção a partir de busca/recentes ──
  const resetSelecaoDerivada = () => {
    setSearchTerm('')
    setSearchResults([])
    setFaturavel(null)
    setFaturavelManual(false)
    setAtoSelecionado(null)
  }

  const selecionarVinculo = async (item: VinculoItem) => {
    resetSelecaoDerivada()
    setLoadingVinculo(true)
    try {
      if (vinculoTipo === 'processo') await loadProcessoById(item.id)
      else await loadConsultaById(item.id)
    } finally {
      setLoadingVinculo(false)
    }
  }

  const trocarVinculo = () => {
    setProcessoSel(null)
    setConsultaSel(null)
    setContratoInfo(null)
    setAtosHora([])
    resetSelecaoDerivada()
  }

  // ── submit ──
  const hasSelection = !!(processoSel || consultaSel)
  const temContrato = !!(processoSel?.contrato_id || consultaSel?.contrato_id)
  const atoPendente = atosHora.length > 0 && !atoSelecionado
  const submitDisabled =
    loading || !hasSelection || !temContrato || !atividade.trim() || totalMin <= 0 || atoPendente

  const handleSubmit = async () => {
    if (!hasSelection) {
      toast.error('Selecione um processo ou consulta')
      return
    }
    if (!temContrato) {
      toast.error('Este caso não tem contrato de honorários vinculado. Vincule um contrato antes de lançar horas.')
      return
    }
    if (totalMin <= 0) {
      toast.error('Informe a duração do trabalho')
      return
    }
    if (!atividade.trim()) {
      toast.error('Informe a atividade realizada')
      return
    }
    if (atoPendente) {
      toast.error('Selecione o ato processual para este lançamento')
      return
    }
    if (!escritorioAtivo || !user) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.rpc('registrar_tempo_retroativo', {
        p_escritorio_id: escritorioAtivo,
        p_user_id: user.id,
        p_data_trabalho: dataTrabalho,
        p_hora_inicio: null,
        p_hora_fim: null,
        p_horas: horasDecimal(),
        p_atividade: atividade.trim(),
        p_processo_id: processoSel?.id || null,
        p_consulta_id: consultaSel?.id || null,
        p_tarefa_id: prefill?.tarefaId || null,
        p_faturavel: faturavelEfetivo,
        p_faturavel_manual: faturavelManual,
        p_ato_tipo_id: atoSelecionado || null,
        p_audiencia_id: null,
        p_evento_id: null,
      })
      if (error) throw error
      toast.success('Horas registradas com sucesso!')
      onSuccess?.()
      // fecha animado, ignorando o guard de descarte (já salvou)
      ;(closeApiRef.current?.forceClose ?? onClose)()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar horas'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ────────────────────────────── render ──────────────────────────────

  const dataObj = parseDateInBrazil(dataTrabalho)
  const subtitleHeader = formatBrazilDate(dataObj, "EEEE, d 'de' MMMM")
  const buscando = searchTerm.trim().length >= 2
  const lista = buscando ? searchResults : vinculoTipo === 'processo' ? recentesProcesso : recentesConsulta

  return (
    <MobileFullScreen
      dark={dark}
      isDirty={dirty}
      confirmTitle="Descartar lançamento?"
      confirmMessage="O que você preencheu será perdido."
      onClose={onClose}
    >
      {({ close, forceClose }) => {
        closeApiRef.current = { close, forceClose }
        return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>
      <MobileScreenHeader
        dark={dark}
        title="Registrar horas"
        subtitle={subtitleHeader.charAt(0).toUpperCase() + subtitleHeader.slice(1)}
        onBack={close}
        backLabel="Cancelar"
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px calc(env(safe-area-inset-bottom, 0px) + 96px)', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ===== TEMPO ===== */}
        <Section dark={dark} label="Tempo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 0 2px' }}>
            <Stepper dark={dark} value={horas} label="Horas" onStep={(d) => setHoras((x) => Math.max(0, Math.min(23, x + d)))} onSet={(n) => setHoras(Math.max(0, Math.min(23, n)))} max={23} />
            <div style={{ fontSize: 40, fontWeight: 700, color: t.muted, fontFamily: 'var(--font-mono)', marginBottom: 26, lineHeight: 1 }}>:</div>
            <Stepper
              dark={dark}
              value={minutos}
              label="Minutos"
              onStep={(d) => {
                // passo de 5 com "carry" para horas (igual incM do MobileHome)
                let nm = minutos + d
                let nh = horas
                if (nm > 59) { nm -= 60; nh += 1 }
                if (nm < 0) { nm += 60; nh -= 1 }
                if (nh < 0) { nh = 0; nm = 0 }
                setHoras(Math.min(23, nh))
                setMinutos(nm)
              }}
              onSet={(n) => setMinutos(Math.max(0, Math.min(59, n)))}
              step={5}
              max={59}
            />
          </div>
        </Section>

        {/* ===== VÍNCULO ===== */}
        <Section dark={dark} label="Vínculo">
          {loadingVinculo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px', color: t.secondary, fontSize: 13 }}>
              <span style={{ display: 'inline-flex', animation: 'mrhSpin 0.8s linear infinite' }}><MobileIcon name="clock" size={16} /></span>
              Carregando vínculo…
            </div>
          ) : hasSelection ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: '13px 14px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.tealSoft, color: t.teal }}>
                  <MobileIcon name={processoSel ? 'scale' : 'consultivo'} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {processoSel ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        {processoSel.numero_pasta && <span style={{ fontSize: 14, fontWeight: 600, color: t.primary }}>{processoSel.numero_pasta}</span>}
                        <span style={{ fontSize: 11.5, color: t.secondary, fontFamily: 'var(--font-mono)' }}>{processoSel.numero_cnj}</span>
                      </div>
                      {processoSel.cliente_nome && <div style={{ fontSize: 12, color: t.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{processoSel.cliente_nome}</div>}
                    </>
                  ) : consultaSel ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        {consultaSel.numero && <span style={{ fontSize: 13, fontWeight: 600, color: t.primary }}>{consultaSel.numero}</span>}
                        <span style={{ fontSize: 13, color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis' }}>{consultaSel.titulo}</span>
                      </div>
                      {consultaSel.cliente_nome && <div style={{ fontSize: 12, color: t.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{consultaSel.cliente_nome}</div>}
                    </>
                  ) : null}
                </div>
                {!vinculoFixo && (
                  <button type="button" onClick={trocarVinculo} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: t.teal, fontSize: 12, fontWeight: 600, padding: '2px 0' }}>
                    Trocar
                  </button>
                )}
              </div>
              {!temContrato && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, padding: '9px 12px', borderRadius: 10, background: dark ? 'rgba(194,149,107,0.14)' : '#f7f0e7', color: dark ? '#d6a87a' : '#8a6438' }}>
                  <MobileIcon name="alert" size={14} />
                  <span style={{ fontSize: 11.5, lineHeight: 1.3 }}>Sem contrato vinculado — não é possível lançar horas neste caso.</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {/* segmented Processo/Consultivo */}
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: dark ? t.cardAlt : '#f1efe8', border: `1px solid ${t.border}` }}>
                {([['processo', 'Processo'], ['consulta', 'Consultivo']] as const).map(([v, label]) => {
                  const on = vinculoTipo === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setVinculoTipo(v); setSearchTerm(''); setSearchResults([]) }}
                      style={{
                        flex: 1, height: 34, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, border: 'none',
                        background: on ? (dark ? '#2a3850' : '#fff') : 'transparent',
                        color: on ? t.primary : t.secondary,
                        boxShadow: on ? t.shadow : 'none',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* busca */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px', borderRadius: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}` }}>
                <span style={{ color: t.muted, flexShrink: 0 }}><MobileIcon name="search" size={17} /></span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={vinculoTipo === 'processo' ? 'Buscar por CNJ, pasta ou cliente…' : 'Buscar por número, título ou cliente…'}
                  style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: t.primary }}
                />
                {searchLoading && <span style={{ display: 'inline-flex', color: t.muted, animation: 'mrhSpin 0.8s linear infinite' }}><MobileIcon name="clock" size={15} /></span>}
              </div>

              {/* lista (recentes ou resultados) */}
              <div style={{ borderRadius: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '9px 13px 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: t.muted }}>
                  {buscando ? 'Resultados' : 'Recentes'}
                </div>
                {lista.length > 0 ? (
                  lista.map((it, i) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => selecionarVinculo(it)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                        background: 'transparent', border: 'none', padding: '11px 13px',
                        borderTop: i > 0 ? `1px solid ${t.borderSubtle}` : 'none',
                      }}
                    >
                      <span style={{ flexShrink: 0, maxWidth: 110, padding: '3px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', background: dark ? '#232f42' : '#eef1f0', color: t.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.chip}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.titulo}</span>
                        {it.sub && <span style={{ display: 'block', fontSize: 11, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</span>}
                      </span>
                      <span style={{ color: t.muted, flexShrink: 0 }}><MobileIcon name="chevronRight" size={15} /></span>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: '14px 13px', fontSize: 12.5, color: t.muted }}>
                    {buscando ? `Nenhum resultado para "${searchTerm.trim()}"` : 'Nenhum lançamento recente'}
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ===== ATO (por_ato modo hora) ===== */}
        {hasSelection && atosHora.length > 0 && (
          <Section dark={dark} label="Ato processual *">
            <div style={{ position: 'relative', borderRadius: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, height: 46, display: 'flex', alignItems: 'center', padding: '0 13px' }}>
              <select
                value={atoSelecionado || ''}
                onChange={(e) => setAtoSelecionado(e.target.value || null)}
                disabled={atosLoading}
                style={{ flex: 1, appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: atoSelecionado ? t.primary : t.muted, cursor: 'pointer' }}
              >
                <option value="">{atosLoading ? 'Carregando…' : 'Selecione o ato…'}</option>
                {atosHora.map((ato) => (
                  <option key={ato.ato_tipo_id} value={ato.ato_tipo_id}>
                    {ato.ato_nome}{ato.valor_hora != null ? ` (R$${ato.valor_hora.toFixed(2)}/h)` : ''}
                  </option>
                ))}
              </select>
              <span style={{ color: t.muted, flexShrink: 0, pointerEvents: 'none' }}><MobileIcon name="chevronDown" size={16} /></span>
            </div>
          </Section>
        )}

        {/* ===== ATIVIDADE ===== */}
        <Section
          dark={dark}
          label="Atividade *"
          right={<span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: atividade.length >= 280 ? '#c2785a' : t.muted }}>{atividade.length}/280</span>}
        >
          <textarea
            value={atividade}
            onChange={(e) => setAtividade(e.target.value.slice(0, 280))}
            rows={4}
            placeholder="Descreva o que foi feito — ex: revisão da minuta, reunião com cliente…"
            style={{ width: '100%', resize: 'none', borderRadius: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, padding: '12px 13px', fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.45, color: t.primary, outline: 'none' }}
          />
          {atividadesRecentes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: t.muted, marginBottom: 7 }}>Últimas atividades</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {atividadesRecentes.map((a) => {
                  const on = atividade === a
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAtividade(a.slice(0, 280))}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.35,
                        borderRadius: 10, padding: '9px 11px',
                        background: on ? t.tealSoft : (dark ? t.cardAlt : '#fff'),
                        border: `1px solid ${on ? (dark ? 'rgba(137,188,190,0.4)' : '#cfe7e7') : t.border}`,
                        color: on ? t.teal : t.secondary,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Section>

        {/* ===== DATA ===== */}
        <Section dark={dark} label="Data">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 13px', borderRadius: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}` }}>
            <span style={{ color: t.muted, flexShrink: 0 }}><MobileIcon name="calendar" size={17} /></span>
            <span style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: t.primary }}>{formatBrazilDate(dataObj, 'dd/MM/yyyy')}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: t.muted }}>{formatBrazilDate(dataObj, 'EEEE')}</span>
            <input
              type="date"
              value={dataTrabalho}
              max={formatDateInput()}
              onChange={(e) => { if (e.target.value) setDataTrabalho(e.target.value) }}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </div>
        </Section>

        {/* ===== CONTRATO / FATURÁVEL ===== */}
        {contratoInfo && (
          <Section dark={dark} label="Contrato">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.tealSoft, color: t.teal }}>
                <MobileIcon name="fileText" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contratoInfo.titulo || 'Contrato de honorários'}</div>
                <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contratoInfo.formas_cobranca.map((f) => FORMA_COBRANCA_LABELS[f]).join(' · ')}
                </div>
              </div>
              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 10px', borderRadius: 11, fontSize: 10.5, fontWeight: 700,
                background: faturavelEfetivo ? (dark ? 'rgba(107,158,132,0.18)' : '#eef5f1') : (dark ? 'rgba(194,149,107,0.18)' : '#f7f0e7'),
                color: faturavelEfetivo ? (dark ? '#8db8a0' : '#3f6a54') : (dark ? '#d6a87a' : '#8a6438'),
              }}>
                {faturavelEfetivo && <MobileIcon name="check" size={11} />}
                {faturavelEfetivo ? 'Cobrável' : 'Não cobrável'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleOverride}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: 'none', padding: 0 }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${overrideMarcado ? t.teal : t.border}`,
                background: overrideMarcado ? t.teal : 'transparent',
                color: dark ? '#0b1016' : '#fff',
              }}>
                {overrideMarcado && <MobileIcon name="check" size={13} stroke={3} />}
              </span>
              <span style={{ fontSize: 12.5, color: t.secondary, lineHeight: 1.35 }}>
                Marcar como <strong style={{ color: t.primary, fontWeight: 600 }}>{padraoCobravel ? 'não cobrável' : 'cobrável'}</strong> só neste lançamento
              </span>
            </button>
          </Section>
        )}
      </div>

      {/* ===== FOOTER FIXO ===== */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 14px)', borderTop: `1px solid ${t.border}`, background: t.card }}>
        <button
          type="button"
          onClick={close}
          disabled={loading}
          style={{ flex: '0 0 auto', minWidth: 104, height: 50, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, color: t.primary, fontSize: 14, fontWeight: 600 }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          style={{
            flex: 1, height: 50, borderRadius: 14, border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: submitDisabled ? 'default' : 'pointer',
            background: submitDisabled ? (dark ? '#2a3340' : '#c3c9cf') : 'linear-gradient(135deg,#34495e,#46627f)',
            boxShadow: submitDisabled ? 'none' : '0 10px 22px -10px rgba(52,73,94,0.5)',
            opacity: submitDisabled ? 0.7 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {loading ? (
            <><span style={{ display: 'inline-flex', animation: 'mrhSpin 0.8s linear infinite' }}><MobileIcon name="clock" size={17} /></span>Salvando…</>
          ) : (
            <><MobileIcon name="check" size={17} />Registrar {fmtHorasDisplay(totalMin)}</>
          )}
        </button>
      </div>

      <style>{'@keyframes mrhSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
        )
      }}
    </MobileFullScreen>
  )
}

// ────────────────────────────── subcomponentes ──────────────────────────────

function Section({ dark, label, right, children }: { dark: boolean; label: string; right?: React.ReactNode; children: React.ReactNode }) {
  const t = mTokens(dark)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, minHeight: 16 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: t.muted }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

function Stepper({ dark, value, label, onStep, onSet, step = 1, max }: { dark: boolean; value: number; label: string; onStep: (d: number) => void; onSet: (n: number) => void; step?: number; max: number }) {
  const t = mTokens(dark)
  const [txt, setTxt] = useState(String(value).padStart(2, '0'))
  const [foc, setFoc] = useState(false)
  useEffect(() => { if (!foc) setTxt(String(value).padStart(2, '0')) }, [value, foc])
  const btn: React.CSSProperties = {
    width: 92, height: 36, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: dark ? t.cardAlt : '#fff', border: `1px solid ${t.border}`, color: t.secondary,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => onStep(step)} style={btn} aria-label={`Aumentar ${label}`}><MobileIcon name="chevronDown" size={18} style={{ transform: 'rotate(180deg)' }} /></button>
      <input
        value={txt}
        inputMode="numeric"
        onFocus={(e) => { setFoc(true); e.currentTarget.select() }}
        onChange={(e) => setTxt(e.target.value.replace(/\D/g, '').slice(-2))}
        onBlur={() => {
          let n = parseInt(txt || '0', 10)
          if (Number.isNaN(n)) n = 0
          n = Math.max(0, Math.min(max, n))
          onSet(n)
          setTxt(String(n).padStart(2, '0'))
          setFoc(false)
        }}
        style={{
          width: 92, height: 60, textAlign: 'center', fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: t.primary, background: 'transparent', outline: 'none',
          border: `1.5px solid ${foc ? t.teal : 'transparent'}`, borderRadius: 12,
          letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
        }}
      />
      <button type="button" onClick={() => onStep(-step)} style={btn} aria-label={`Diminuir ${label}`}><MobileIcon name="chevronDown" size={18} /></button>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>{label}</span>
    </div>
  )
}
