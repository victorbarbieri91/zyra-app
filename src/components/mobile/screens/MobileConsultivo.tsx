'use client'

// MobileConsultivo — Lista de consultas (mobile). Portado fielmente de
// components/MobileConsultivo.jsx, ligado a dados reais (v_consultivo_consultas).
// Título é o protagonista; tem área, prioridade, prazo e responsável.
// Cores via mTokens / consultivoAreaMeta / prioMeta; ícones via MobileIcon.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseDBDate, formatBrazilDateOnly, getNowInBrazil } from '@/lib/timezone'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { mTokens, consultivoAreaMeta, prioMeta } from '../tokens'
import MobileIcon from '../MobileIcon'
import { useMobileNav } from '../MobileApp'

// ---------- tipos ----------
interface ConsultaRow {
  id: string
  numero: string | null
  titulo: string
  cliente_nome: string | null
  area: string | null
  prioridade: string | null
  status: string
  prazo: string | null
  responsavel_nome: string | null
}

// ---------- rótulos de área (enum minúsculo → label PT-BR) ----------
const AREA_LABELS: Record<string, string> = {
  civel: 'Cível',
  trabalhista: 'Trabalhista',
  criminal: 'Criminal',
  tributario: 'Tributário',
  empresarial: 'Empresarial',
  familia: 'Família',
  consumidor: 'Consumidor',
  previdenciario: 'Previdenciário',
  administrativo: 'Administrativo',
  ambiental: 'Ambiental',
  contratual: 'Contratual',
  societario: 'Societário',
  imobiliario: 'Imobiliário',
  propriedade_intelectual: 'Prop. Intelectual',
  compliance: 'Compliance',
  outros: 'Outros',
}

function areaLabel(area: string | null): string {
  if (!area) return 'Sem área'
  return AREA_LABELS[area] || area
}

// ---------- iniciais do responsável ----------
function iniciais(nome: string | null): string {
  if (!nome) return '—'
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------- prazo: rótulo + urgência ----------
function prazoInfo(prazo: string | null): { label: string; urgente: boolean } | null {
  if (!prazo) return null
  const data = parseDBDate(prazo)
  const hoje = getNowInBrazil()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(data)
  alvo.setHours(0, 0, 0, 0)
  const diffDias = Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  return { label: formatBrazilDateOnly(data), urgente: diffDias <= 3 }
}

export default function MobileConsultivo({ dark }: { dark: boolean }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [consultas, setConsultas] = useState<ConsultaRow[]>([])
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'ativo' | 'arquivado' | 'todos'>('ativo')
  const [area, setArea] = useState('todas')

  // ---------- carregar consultas (filtra por escritório ativo) ----------
  useEffect(() => {
    if (!escritorioAtivo) {
      setLoading(false)
      return
    }
    let cancel = false
    setLoading(true)
    const supabase = createClient()
    void (async () => {
      const { data, error } = await supabase
        .from('v_consultivo_consultas')
        .select('id, numero, titulo, cliente_nome, area, prioridade, status, prazo, responsavel_nome')
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: false })

      if (cancel) return
      if (error) {
        console.error('Erro ao carregar consultas:', error)
        setConsultas([])
      } else {
        setConsultas((data || []) as ConsultaRow[])
      }
      setLoading(false)
    })()
    return () => {
      cancel = true
    }
  }, [escritorioAtivo])

  const ql = q.trim().toLowerCase()

  // ---------- áreas disponíveis (derivadas dos dados) ----------
  const areas = useMemo(() => {
    const set = new Set<string>()
    consultas.forEach((c) => {
      if (c.area) set.add(c.area)
    })
    return ['todas', ...Array.from(set).sort((a, b) => areaLabel(a).localeCompare(areaLabel(b), 'pt-BR'))]
  }, [consultas])

  // ---------- lista filtrada ----------
  const list = useMemo(() => {
    return consultas.filter((c) => {
      if (status !== 'todos' && c.status !== status) return false
      if (area !== 'todas' && c.area !== area) return false
      if (!ql) return true
      return `${c.numero || ''} ${c.titulo} ${c.cliente_nome || ''}`.toLowerCase().includes(ql)
    })
  }, [consultas, status, area, ql])

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: t.page,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ===== app bar ===== */}
      <div style={{ flexShrink: 0, background: t.card, borderBottom: `1px solid ${t.border}`, paddingTop: 54 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 18px 12px' }}>
          <div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 600,
                color: t.primary,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}
            >
              Consultivo
            </div>
            <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 1 }}>
              {loading
                ? 'Carregando…'
                : `${list.length} de ${consultas.length} ${consultas.length === 1 ? 'consulta' : 'consultas'}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav.openMais()}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'linear-gradient(135deg,#34495e,#46627f)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 8px 18px -10px rgba(52,73,94,0.5)',
            }}
          >
            <MobileIcon name="plus" size={16} /> Nova
          </button>
        </div>

        {/* busca */}
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 13,
                top: '50%',
                transform: 'translateY(-50%)',
                color: t.muted,
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              <MobileIcon name="search" size={16} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, título…"
              style={{
                width: '100%',
                height: 44,
                paddingLeft: 38,
                paddingRight: q ? 38 : 14,
                borderRadius: 13,
                border: `1px solid ${t.border}`,
                background: t.page,
                fontSize: 14,
                color: t.primary,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="Limpar busca"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: 'none',
                  background: dark ? '#1a212c' : '#ece9e2',
                  color: t.secondary,
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* status */}
        <div style={{ display: 'flex', gap: 5, padding: '0 18px 12px' }}>
          <div
            style={{
              display: 'flex',
              flex: 1,
              gap: 5,
              background: dark ? '#11161f' : '#efece4',
              padding: 4,
              borderRadius: 11,
            }}
          >
            {(
              [
                ['ativo', 'Ativas'],
                ['arquivado', 'Arquivadas'],
                ['todos', 'Todas'],
              ] as const
            ).map(([v, l]) => {
              const on = status === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatus(v)}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    background: on ? t.card : 'transparent',
                    color: on ? t.primary : t.secondary,
                    boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {l}
                </button>
              )
            })}
          </div>
        </div>

        {/* área chips */}
        <div style={{ display: 'flex', gap: 7, padding: '0 18px 12px', overflowX: 'auto' }}>
          {areas.map((a) => {
            const on = area === a
            const am = a === 'todas' ? null : consultivoAreaMeta(a, dark)
            return (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a)}
                style={{
                  flexShrink: 0,
                  height: 30,
                  padding: '0 13px',
                  borderRadius: 15,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${on ? (am ? 'transparent' : dark ? '#3a4757' : '#cdd5dd') : t.border}`,
                  background: on ? (am ? am.bg : dark ? '#1c2530' : '#eef1f4') : t.card,
                  color: on ? (am ? am.fg : t.primary) : t.secondary,
                  whiteSpace: 'nowrap',
                }}
              >
                {a === 'todas' ? 'Todas as áreas' : areaLabel(a)}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== lista ===== */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '14px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ fontSize: 13.5, color: t.secondary, fontWeight: 600 }}>Carregando consultas…</div>
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ color: t.secondary, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <MobileIcon name="consultivo" size={28} />
            </div>
            <div style={{ fontSize: 13.5, color: t.secondary, fontWeight: 600 }}>Nenhuma consulta encontrada</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Ajuste a busca ou os filtros.</div>
          </div>
        ) : (
          list.map((c) => {
            const am = consultivoAreaMeta(c.area || '', dark)
            const pm = prioMeta(c.prioridade || '', dark)
            const ativa = c.status === 'ativo'
            const prazo = prazoInfo(c.prazo)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => nav.navigate('/dashboard/consultivo/' + c.id)}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  borderRadius: 16,
                  boxShadow: t.shadow,
                  padding: '14px 15px',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 7,
                      background: am.bg,
                      color: am.fg,
                    }}
                  >
                    {areaLabel(c.area)}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 7,
                      background: pm.bg,
                      color: pm.fg,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: pm.dot }} />
                    {pm.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: ativa ? (dark ? '#8db8a0' : '#3f6a54') : t.muted,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        background: ativa ? (dark ? '#8db8a0' : '#6b9e84') : t.muted,
                      }}
                    />
                    {ativa ? 'Ativa' : 'Arquivada'}
                  </span>
                </div>

                {/* título — protagonista */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: t.primary,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                  }}
                >
                  {c.titulo}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: t.secondary,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.cliente_nome || 'Sem cliente'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${t.borderSubtle}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.primary,
                      fontFamily: 'var(--font-mono)',
                      background: dark ? '#161c26' : '#f3f1ea',
                      padding: '2px 7px',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  >
                    {c.numero || 'Sem nº'}
                  </span>
                  {prazo ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: prazo.urgente ? (dark ? '#c98080' : '#9e4848') : t.muted,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <MobileIcon name="alert" size={11} />
                      {prazo.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10.5, color: t.muted }}>sem prazo</span>
                  )}
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        background: dark ? '#1c2530' : '#eef1f4',
                        color: t.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9.5,
                        fontWeight: 700,
                      }}
                    >
                      {iniciais(c.responsavel_nome)}
                    </span>
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
