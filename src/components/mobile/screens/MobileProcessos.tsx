'use client'

// MobileProcessos — Lista de processos (mobile). Portado fielmente de
// components/MobileProcessos.jsx, ligado a dados reais (view
// v_processos_com_movimentacoes, filtrada por escritorio_id). Cores via
// mTokens; ícones via MobileIcon. Busca (cliente/CNJ/pasta), filtro de status
// (Ativos/Arquivados/Todos), filtro "Meus" (responsável = usuário) e chips de
// área. Toca no card → detalhe do processo. Paginação simples (carregar mais).

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDateOnly } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import { useMobileNav } from '../MobileApp'

// ---------- meta por área (fundo + texto do badge) — portado do design ----------
function areaMeta(area: string, dark: boolean): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    'Cível': { bg: dark ? 'rgba(90,130,200,0.16)' : '#e7eefb', fg: dark ? '#8fb0e6' : '#3a5ba8' },
    'Tributária': { bg: dark ? 'rgba(160,140,100,0.16)' : '#f3ecdd', fg: dark ? '#c5ab7e' : '#8a6d3a' },
    'Trabalhista': { bg: dark ? 'rgba(196,160,60,0.16)' : '#fbf3d9', fg: dark ? '#d8c069' : '#8a6d2a' },
    'Consumidor': { bg: dark ? 'rgba(95,150,140,0.16)' : '#e3f1ee', fg: dark ? '#7db8aa' : '#3f6a60' },
    'Previdenciária': { bg: dark ? 'rgba(140,150,165,0.16)' : '#eef0f3', fg: dark ? '#a5afbd' : '#5a6775' },
    'Família': { bg: dark ? 'rgba(196,128,170,0.16)' : '#fbe7f3', fg: dark ? '#d68ab8' : '#a8407a' },
    'Criminal': { bg: dark ? 'rgba(196,128,128,0.16)' : '#fbe7e7', fg: dark ? '#d68a8a' : '#a84040' },
    'Empresarial': { bg: dark ? 'rgba(106,133,168,0.16)' : '#e9eef7', fg: dark ? '#8fb0e6' : '#4a679e' },
    'Ambiental': { bg: dark ? 'rgba(95,150,110,0.16)' : '#e3f1e6', fg: dark ? '#7db884' : '#3f6a48' },
  }
  return map[area] || { bg: dark ? 'rgba(140,150,165,0.16)' : '#eef0f3', fg: dark ? '#a5afbd' : '#5a6775' }
}

// ---------- mapeamento de área (igual ao desktop) ----------
function formatArea(area: string): string {
  const map: Record<string, string> = {
    civel: 'Cível', trabalhista: 'Trabalhista', tributaria: 'Tributária',
    familia: 'Família', criminal: 'Criminal', previdenciaria: 'Previdenciária',
    consumidor: 'Consumidor', empresarial: 'Empresarial', ambiental: 'Ambiental',
    outra: 'Outra',
  }
  return map[area] || area || 'Outra'
}

// ---------- iniciais do responsável (avatar) ----------
function iniciais(nome: string): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const STATUS_ATIVO = 'ativo'
const STATUS_ENCERRADOS = ['arquivado', 'baixado', 'transito_julgado', 'acordo']
const PAGE_SIZE = 20

// status filtro: 'ativo' | 'arquivado' | 'todos'
type StatusFiltro = 'ativo' | 'arquivado' | 'todos'

interface ProcessoRow {
  id: string
  numero_pasta: string | null
  numero_cnj: string | null
  cliente_nome: string | null
  parte_contraria: string | null
  area: string | null
  status: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  ultima_movimentacao: string | null
}

// chips de área (rótulos já formatados como no badge)
const AREAS = ['todas', 'Cível', 'Tributária', 'Trabalhista', 'Consumidor', 'Previdenciária', 'Família', 'Criminal'] as const

export default function MobileProcessos({ dark }: { dark: boolean }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { user } = useAuth()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFiltro>('ativo')
  const [area, setArea] = useState<string>('todas')
  const [meus, setMeus] = useState(false)

  const [processos, setProcessos] = useState<ProcessoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // busca com debounce
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(id)
  }, [q])

  // resetar página ao trocar filtros
  useEffect(() => {
    setPage(0)
  }, [status, area, meus])

  const loadProcessos = useCallback(async () => {
    if (!escritorioAtivo) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('v_processos_com_movimentacoes')
      .select(
        'id, numero_pasta, numero_cnj, cliente_nome, parte_contraria, area, status, responsavel_id, responsavel_nome, ultima_movimentacao',
        { count: 'exact' },
      )
      .eq('escritorio_id', escritorioAtivo)

    // status
    if (status === 'ativo') {
      query = query.eq('status', STATUS_ATIVO)
    } else if (status === 'arquivado') {
      query = query.in('status', STATUS_ENCERRADOS)
    }

    // "Meus" (responsável = usuário logado)
    if (meus && user?.id) {
      query = query.eq('responsavel_id', user.id)
    }

    // busca (cliente / CNJ / pasta / parte contrária)
    if (debouncedQ) {
      const term = `%${debouncedQ}%`
      query = query.or(
        `numero_cnj.ilike.${term},numero_pasta.ilike.${term},parte_contraria.ilike.${term},cliente_nome.ilike.${term}`,
      )
    }

    // área (filtra pelo valor cru no banco a partir do rótulo)
    if (area !== 'todas') {
      const rawArea = Object.entries({
        civel: 'Cível', trabalhista: 'Trabalhista', tributaria: 'Tributária',
        familia: 'Família', criminal: 'Criminal', previdenciaria: 'Previdenciária',
        consumidor: 'Consumidor', empresarial: 'Empresarial', ambiental: 'Ambiental',
      }).find(([, label]) => label === area)?.[0]
      if (rawArea) query = query.eq('area', rawArea)
    }

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error, count } = await query
      .order('ultima_movimentacao', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (error) {
      setLoading(false)
      return
    }

    const rows = (data || []) as ProcessoRow[]
    setTotalCount(count || 0)
    setProcessos((prev) => (page === 0 ? rows : [...prev, ...rows]))
    setLoading(false)
  }, [escritorioAtivo, status, meus, user?.id, debouncedQ, area, page])

  useEffect(() => {
    loadProcessos()
  }, [loadProcessos])

  const temMais = processos.length < totalCount

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>

      {/* ===== app bar ===== */}
      <div style={{ flexShrink: 0, background: t.card, borderBottom: `1px solid ${t.border}`, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 18px 12px' }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 600, color: t.primary, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Processos</div>
            <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 1 }}>
              {loading && page === 0 ? 'Carregando…' : `${processos.length} de ${totalCount}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav.openMais()}
            style={{
              height: 40, padding: '0 16px', borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', fontSize: 13.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 8px 18px -10px rgba(52,73,94,0.5)',
            }}
          >
            <MobileIcon name="plus" size={16} /> Novo
          </button>
        </div>

        {/* busca */}
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: t.muted, pointerEvents: 'none', display: 'flex' }}><MobileIcon name="search" size={16} /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, CNJ, pasta…"
              style={{
                width: '100%', height: 44, paddingLeft: 38, paddingRight: q ? 38 : 14, borderRadius: 13,
                border: `1px solid ${t.border}`, background: t.page, fontSize: 14, color: t.primary, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 14, border: 'none', background: dark ? '#1a212c' : '#ece9e2', color: t.secondary, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                aria-label="Limpar busca"
              >×</button>
            )}
          </div>
        </div>

        {/* status + meus */}
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px' }}>
          <div style={{ display: 'flex', flex: 1, gap: 5, background: dark ? '#11161f' : '#efece4', padding: 4, borderRadius: 11 }}>
            {([['ativo', 'Ativos'], ['arquivado', 'Arquivados'], ['todos', 'Todos']] as [StatusFiltro, string][]).map(([v, l]) => {
              const on = status === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatus(v)}
                  style={{
                    flex: 1, height: 34, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600, border: 'none',
                    background: on ? t.card : 'transparent', color: on ? t.primary : t.secondary,
                    boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >{l}</button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setMeus(!meus)}
            style={{
              flexShrink: 0, height: 42, padding: '0 14px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              border: `1px solid ${meus ? '#34495e' : t.border}`,
              background: meus ? 'linear-gradient(135deg,#34495e,#46627f)' : t.card, color: meus ? '#fff' : t.secondary,
            }}
          ><MobileIcon name="user" size={14} /> Meus</button>
        </div>

        {/* área chips */}
        <div style={{ display: 'flex', gap: 7, padding: '0 18px 12px', overflowX: 'auto' }}>
          {AREAS.map((a) => {
            const on = area === a
            const am = a === 'todas' ? null : areaMeta(a, dark)
            return (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a)}
                style={{
                  flexShrink: 0, height: 30, padding: '0 13px', borderRadius: 15, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  border: `1px solid ${on ? (am ? 'transparent' : (dark ? '#3a4757' : '#cdd5dd')) : t.border}`,
                  background: on ? (am ? am.bg : (dark ? '#1c2530' : '#eef1f4')) : t.card,
                  color: on ? (am ? am.fg : t.primary) : t.secondary,
                }}
              >{a === 'todas' ? 'Todas as áreas' : a}</button>
            )
          })}
        </div>
      </div>

      {/* ===== lista ===== */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading && page === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ fontSize: 13, color: t.secondary }}>Carregando processos…</div>
          </div>
        ) : processos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ color: t.secondary, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><MobileIcon name="scale" size={28} /></div>
            <div style={{ fontSize: 13.5, color: t.secondary, fontWeight: 600 }}>Nenhum processo encontrado</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Ajuste a busca ou os filtros.</div>
          </div>
        ) : (
          <>
            {processos.map((p) => {
              const areaLabel = formatArea(p.area || '')
              const am = areaMeta(areaLabel, dark)
              const ativo = p.status === 'ativo'
              const cliente = p.cliente_nome || 'Sem cliente'
              const re = p.parte_contraria || 'Não informado'
              const pasta = p.numero_pasta || '—'
              const mov = p.ultima_movimentacao ? formatBrazilDateOnly(p.ultima_movimentacao) : '—'
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => nav.navigate('/dashboard/processos/' + p.id)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow,
                    padding: '14px 15px', display: 'block', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: am.bg, color: am.fg, letterSpacing: '0.01em' }}>{areaLabel}</span>
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: ativo ? (dark ? '#8db8a0' : '#3f6a54') : t.muted }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: ativo ? (dark ? '#8db8a0' : '#6b9e84') : t.muted }} />
                      {ativo ? 'Ativo' : 'Arquivado'}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{cliente}</div>
                  <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 2, lineHeight: 1.35 }}>
                    <span style={{ color: t.muted }}>× </span>{re}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.borderSubtle}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)', background: dark ? '#161c26' : '#f3f1ea', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>{pasta}</span>
                    {p.numero_cnj
                      ? <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero_cnj}</span>
                      : <span style={{ fontSize: 10.5, color: t.muted, fontStyle: 'italic' }}>sem CNJ</span>}
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: dark ? '#1c2530' : '#eef1f4', color: t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700 }}>{iniciais(p.responsavel_nome || '')}</span>
                      <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)' }}>{mov}</span>
                    </span>
                  </div>
                </button>
              )
            })}

            {/* carregar mais */}
            {temMais && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                style={{
                  width: '100%', marginTop: 3, height: 42, borderRadius: 12,
                  border: `1px solid ${t.border}`, background: t.card, cursor: loading ? 'default' : 'pointer',
                  color: t.primary, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Carregando…' : 'Carregar mais'}
                {!loading && <MobileIcon name="chevronDown" size={14} />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
