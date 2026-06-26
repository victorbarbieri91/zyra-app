'use client'

// MobilePublicacoes — lista de publicações/intimações (mobile), cards expansíveis.
// Portado de components/MobilePublicacoes.jsx (Claude Design), ligado a dados reais:
// publicacoes_publicacoes (+ join processo autor/réu, contagem de comentários),
// texto_completo lazy ao expandir, comentários reais (publicacoes_comentarios).

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseDBDate } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import { useMobileNav } from '../MobileApp'

// ---------- tipos ----------
interface PubRow {
  id: string
  data_publicacao: string | null
  tribunal: string | null
  vara: string | null
  tipo_publicacao: string | null
  numero_processo: string | null
  processo_id: string | null
  status: string
  agendamento_id: string | null
  source: string | null
  processos_processos: { autor: string | null; reu: string | null } | null
  publicacoes_comentarios: { count: number }[] | null
}

type DesignStatus = 'pendente' | 'tratada' | 'arquivada'

// real (pendente|em_analise|processada|arquivada) → design
function designStatus(real: string): DesignStatus {
  if (real === 'processada') return 'tratada'
  if (real === 'arquivada') return 'arquivada'
  return 'pendente'
}

function pubStatusMeta(s: DesignStatus, dark: boolean) {
  if (s === 'pendente') return { label: 'Pendente', fg: dark ? '#d6a87a' : '#8a6438', bg: dark ? 'rgba(194,149,107,0.16)' : '#f7f0e7', dot: '#c2956b' }
  if (s === 'arquivada') return { label: 'Arquivada', fg: dark ? '#94a3b8' : '#6a7480', bg: dark ? 'rgba(148,163,184,0.14)' : '#eef0f3', dot: dark ? '#94a3b8' : '#9aa1a8' }
  return { label: 'Tratada', fg: dark ? '#8db8a0' : '#3f6a54', bg: dark ? 'rgba(107,158,132,0.16)' : '#eef5f1', dot: dark ? '#8db8a0' : '#6b9e84' }
}

const TIPO_LABEL: Record<string, string> = {
  intimacao: 'Intimação', sentenca: 'Sentença', despacho: 'Despacho', decisao: 'Decisão',
  acordao: 'Acórdão', citacao: 'Citação', outro: 'Outro',
}
function tipoLabel(t: string | null): string {
  if (!t) return 'Publicação'
  return TIPO_LABEL[t] || (t.charAt(0).toUpperCase() + t.slice(1))
}

function iniciais(nome: string): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmtData(s: string | null): string {
  if (!s) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDBDate(s))
}
function fmtQuando(s: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(parseDBDate(s))
}

const FILTROS: [string, string][] = [['pendentes', 'Pendentes'], ['tratadas', 'Tratadas'], ['arquivadas', 'Arquivadas'], ['todas', 'Todas']]

export default function MobilePublicacoes({ dark }: { dark: boolean }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { user } = useAuth()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [pubs, setPubs] = useState<PubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filt, setFilt] = useState('pendentes')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!escritorioAtivo) { setLoading(false); return }
    let cancel = false
    setLoading(true)
    const supabase = createClient()
    void (async () => {
      const { data, error } = await supabase
        .from('publicacoes_publicacoes')
        .select('id, data_publicacao, tribunal, vara, tipo_publicacao, numero_processo, processo_id, status, agendamento_id, source, processos_processos!processo_id(autor, reu), publicacoes_comentarios(count)')
        .eq('escritorio_id', escritorioAtivo)
        .neq('status', 'duplicada')
        .order('data_publicacao', { ascending: false })
        .limit(200)
      if (cancel) return
      if (error) { console.error('Erro ao carregar publicações:', error); setPubs([]) }
      else setPubs((data || []) as unknown as PubRow[])
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [escritorioAtivo])

  const ql = q.trim().toLowerCase()
  const list = useMemo(() => pubs.filter((p) => {
    const ds = designStatus(p.status)
    if (filt === 'pendentes' && ds !== 'pendente') return false
    if (filt === 'tratadas' && ds !== 'tratada') return false
    if (filt === 'arquivadas' && ds !== 'arquivada') return false
    if (filt !== 'arquivadas' && ds === 'arquivada') return false
    if (!ql) return true
    const autor = p.processos_processos?.autor || ''
    const re = p.processos_processos?.reu || ''
    return `${autor} ${re} ${p.numero_processo || ''}`.toLowerCase().includes(ql)
  }), [pubs, filt, ql])

  const pendentes = useMemo(() => pubs.filter((p) => designStatus(p.status) === 'pendente').length, [pubs])

  async function setStatus(id: string, real: string) {
    setPubs((a) => a.map((p) => p.id === id ? { ...p, status: real } : p))
    const supabase = createClient()
    const { error } = await supabase.from('publicacoes_publicacoes').update({ status: real }).eq('id', id).eq('escritorio_id', escritorioAtivo)
    if (error) console.error('Erro ao atualizar publicação:', error)
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>
      {/* app bar */}
      <div style={{ flexShrink: 0, background: t.card, borderBottom: `1px solid ${t.border}`, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{ fontSize: 23, fontWeight: 600, color: t.primary, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Publicações</div>
          <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 1 }}>
            {loading ? 'Carregando…' : pendentes > 0 ? <><span style={{ color: dark ? '#d6a87a' : '#8a6438', fontWeight: 600 }}>{pendentes} pendente{pendentes > 1 ? 's' : ''}</span> · {pubs.length} no total</> : `Tudo em dia · ${pubs.length} no total`}
          </div>
        </div>

        {/* busca */}
        <div style={{ padding: '0 18px 12px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: t.muted, pointerEvents: 'none', display: 'flex' }}><MobileIcon name="search" size={16} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou processo…" style={{ width: '100%', height: 44, paddingLeft: 38, paddingRight: q ? 38 : 14, borderRadius: 13, border: `1px solid ${t.border}`, background: t.page, fontSize: 14, color: t.primary, fontFamily: 'inherit', outline: 'none' }} />
            {q && <button type="button" onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 14, border: 'none', background: dark ? '#1a212c' : '#ece9e2', color: t.secondary, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
          </div>
        </div>

        {/* filtros */}
        <div style={{ display: 'flex', gap: 7, padding: '0 18px 12px', overflowX: 'auto' }}>
          {FILTROS.map(([v, l]) => {
            const on = filt === v
            const showBadge = v === 'pendentes' && pendentes > 0
            return (
              <button key={v} type="button" onClick={() => setFilt(v)} style={{ flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${on ? (dark ? '#3a4757' : '#cdd5dd') : t.border}`, background: on ? (dark ? '#1c2530' : '#eef1f4') : t.card, color: on ? t.primary : t.secondary }}>
                {l}
                {showBadge && <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: dark ? 'rgba(194,149,107,0.2)' : '#f7e9d8', color: dark ? '#d6a87a' : '#8a6438' }}>{pendentes}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* lista */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.secondary, fontSize: 13.5, fontWeight: 600 }}>Carregando publicações…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ color: t.secondary, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><MobileIcon name="publicacoes" size={28} /></div>
            <div style={{ fontSize: 13.5, color: t.secondary, fontWeight: 600 }}>Nenhuma publicação</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Ajuste a busca ou o filtro.</div>
          </div>
        ) : list.map((p) => {
          const ds = designStatus(p.status)
          const sm = pubStatusMeta(ds, dark)
          const autor = p.processos_processos?.autor || ''
          const re = p.processos_processos?.reu || ''
          const titulo = autor || p.numero_processo || 'Publicação'
          const coment = p.publicacoes_comentarios?.[0]?.count ?? 0
          const fonte = [p.tribunal, p.vara].filter(Boolean).join(' · ') || (p.source || '')
          const open = expanded === p.id
          return (
            <div key={p.id} style={{ flexShrink: 0, background: t.card, border: `1px solid ${ds === 'pendente' ? (dark ? 'rgba(194,149,107,0.4)' : '#e8d4b8') : t.border}`, borderRadius: 16, boxShadow: t.shadow, overflow: 'hidden' }}>
              <button type="button" onClick={() => setExpanded((e) => e === p.id ? null : p.id)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: 'none', padding: '14px 15px 12px', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: sm.bg, color: sm.fg }}>
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: sm.dot }} />{sm.label}
                  </span>
                  {p.agendamento_id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: t.tealSoft, color: t.teal }}><MobileIcon name="calendar" size={10} /> Agendado</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)' }}>{fmtData(p.data_publicacao)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    {titulo}{re ? <span style={{ color: t.muted, fontWeight: 500 }}> × {re}</span> : null}
                  </div>
                  <span style={{ color: t.muted, flexShrink: 0, display: 'flex', marginTop: 2, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s ease' }}><MobileIcon name="chevronDown" size={17} /></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: t.secondary, letterSpacing: '0.02em', background: dark ? '#161c26' : '#f3f1ea', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>{tipoLabel(p.tipo_publicacao)}</span>
                  {p.numero_processo && <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero_processo}</span>}
                  {coment > 0 && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: t.muted, flexShrink: 0 }}><MobileIcon name="comment" size={12} /> {coment}</span>}
                </div>
                {fonte && <div style={{ fontSize: 10.5, color: t.muted, marginTop: 5 }}>{fonte}</div>}
              </button>

              {open && (
                <div style={{ padding: '0 15px 4px', animation: 'dcExpandIn .26s ease both' }}>
                  <PubExpandedBody dark={dark} pub={p} escritorioId={escritorioAtivo} userId={user?.id || null} onVerProcesso={() => p.processo_id && nav.navigate('/dashboard/processos/' + p.processo_id)} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 7, padding: '0 12px 12px' }}>
                {ds === 'pendente'
                  ? <PubAct icon="check" label="Tratar" variant="green" dark={dark} onClick={() => setStatus(p.id, 'processada')} />
                  : <PubAct icon="clock" label="Reabrir" variant="neutral" dark={dark} onClick={() => setStatus(p.id, 'pendente')} />}
                <PubAct icon="calendar" label="Agendar" variant="teal" dark={dark} onClick={() => nav.openNovaTarefa({ processoId: p.processo_id })} />
                <PubAct icon="archive" label="Arquivar" variant="neutral" dark={dark} onClick={() => setStatus(p.id, 'arquivada')} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- ação rápida ----------
function PubAct({ icon, label, variant, dark, onClick }: { icon: string; label: string; variant: 'neutral' | 'teal' | 'green'; dark: boolean; onClick?: () => void }) {
  const t = mTokens(dark)
  const st = {
    neutral: { bg: t.page, border: t.border, color: t.secondary },
    teal: { bg: t.tealSoft, border: dark ? 'rgba(137,188,190,0.32)' : '#cfe7e7', color: t.teal },
    green: { bg: dark ? 'linear-gradient(135deg,#4f7d63,#5f9075)' : 'linear-gradient(135deg,#5f9075,#6ba585)', border: 'transparent', color: '#fff' },
  }[variant]
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, height: 36, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontSize: 11.5, fontWeight: 600, boxShadow: variant === 'green' ? '0 6px 14px -8px rgba(95,144,117,0.8)' : 'none' }}>
      <MobileIcon name={icon} size={13} /> {label}
    </button>
  )
}

// ---------- corpo expandido: processo + comentários + texto (lazy) ----------
interface Comentario { id: string; texto: string; created_at: string; user_id: string; nome: string }
const FONT_SIZES = [11.5, 12.5, 14]

function PubExpandedBody({ dark, pub, escritorioId, userId, onVerProcesso }: { dark: boolean; pub: PubRow; escritorioId: string | null; userId: string | null; onVerProcesso: () => void }) {
  const t = mTokens(dark)
  const [texto, setTexto] = useState<string | null>(null)
  const [fontIdx, setFontIdx] = useState(1)
  const [copied, setCopied] = useState(false)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [showComments, setShowComments] = useState(false)
  const [draft, setDraft] = useState('')
  const [enviando, setEnviando] = useState(false)

  // texto_completo lazy
  useEffect(() => {
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.from('publicacoes_publicacoes').select('texto_completo').eq('id', pub.id).single()
      if (!cancel) setTexto((data as { texto_completo?: string } | null)?.texto_completo || 'Texto da publicação não disponível.')
    })()
    return () => { cancel = true }
  }, [pub.id])

  async function fetchComentarios() {
    const supabase = createClient()
    const { data } = await supabase.from('publicacoes_comentarios').select('id, texto, created_at, user_id').eq('publicacao_id', pub.id).order('created_at', { ascending: true })
    const rows = (data || []) as { id: string; texto: string; created_at: string; user_id: string }[]
    if (rows.length === 0) { setComentarios([]); return }
    const userIds = [...new Set(rows.map((c) => c.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds)
    const nomeMap = new Map<string, string>((profiles || []).map((p: { id: string; nome_completo: string }) => [p.id, p.nome_completo] as [string, string]))
    setComentarios(rows.map((c) => ({ ...c, nome: nomeMap.get(c.user_id) || 'Usuário' })))
  }
  useEffect(() => { void fetchComentarios() }, [pub.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    const txt = draft.trim()
    if (!txt || !userId || !escritorioId) return
    setEnviando(true)
    const supabase = createClient()
    const { error } = await supabase.from('publicacoes_comentarios').insert({ publicacao_id: pub.id, user_id: userId, escritorio_id: escritorioId, texto: txt })
    setEnviando(false)
    if (error) { console.error('Erro ao enviar comentário:', error); return }
    setDraft('')
    void fetchComentarios()
  }

  function copiar() {
    if (texto) { try { navigator.clipboard.writeText(texto) } catch { /* noop */ } }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const fontSize = FONT_SIZES[fontIdx]

  return (
    <div style={{ borderTop: `1px solid ${t.borderSubtle}`, paddingTop: 16 }}>
      {/* processo vinculado */}
      {pub.numero_processo && (
        <button type="button" onClick={onVerProcesso} disabled={!pub.processo_id} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, cursor: pub.processo_id ? 'pointer' : 'default', fontFamily: 'inherit', background: t.page, border: `1px solid ${t.border}`, borderRadius: 11, padding: '10px 12px', textAlign: 'left', marginBottom: 18, opacity: pub.processo_id ? 1 : 0.7 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: t.tealSoft, color: t.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MobileIcon name="scale" size={15} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>Processo</div>
            <div style={{ fontSize: 11.5, color: t.primary, fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.numero_processo}</div>
          </div>
          {pub.processo_id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: t.teal, flexShrink: 0 }}>Ver <MobileIcon name="chevronRight" size={12} /></span>}
        </button>
      )}

      {/* comentários */}
      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={() => setShowComments((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: 'none', padding: '2px 0' }}>
          <MobileIcon name="comment" size={13} style={{ color: t.secondary }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>Comentários da equipe</span>
          {comentarios.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: t.secondary, background: dark ? '#1c2530' : '#eef1f4', padding: '1px 7px', borderRadius: 8 }}>{comentarios.length}</span>}
          <span style={{ marginLeft: 'auto', color: t.muted, display: 'flex', transform: showComments ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}><MobileIcon name="chevronDown" size={15} /></span>
        </button>

        {showComments && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {comentarios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: t.muted, background: t.page, border: `1px solid ${t.borderSubtle}`, borderRadius: 12 }}>
                  <div style={{ fontSize: 12 }}>Nenhum comentário ainda.</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>Deixe uma observação para a equipe.</div>
                </div>
              ) : comentarios.map((c) => {
                const eu = c.user_id === userId
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 9, flexDirection: eu ? 'row-reverse' : 'row' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: '#fff', background: eu ? 'linear-gradient(135deg,#34495e,#46627f)' : (dark ? '#3a4757' : '#9aa6b3') }}>{iniciais(c.nome)}</span>
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexDirection: eu ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.primary }}>{eu ? 'Você' : c.nome}</span>
                        <span style={{ fontSize: 9.5, color: t.muted }}>{fmtQuando(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4, color: t.primary, background: eu ? t.tealSoft : (dark ? '#10151d' : '#f1efe8'), border: `1px solid ${eu ? (dark ? 'rgba(137,188,190,0.25)' : '#d6e9e9') : t.borderSubtle}`, padding: '9px 12px', borderRadius: 13, borderTopRightRadius: eu ? 4 : 13, borderTopLeftRadius: eu ? 13 : 4 }}>{c.texto}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva um comentário…" rows={1} style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 84, borderRadius: 11, border: `1px solid ${t.border}`, background: t.page, padding: '10px 12px', fontSize: 13, color: t.primary, fontFamily: 'inherit', lineHeight: 1.4, outline: 'none' }} />
              <button type="button" onClick={enviar} disabled={!draft.trim() || enviando} style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, cursor: draft.trim() ? 'pointer' : 'default', border: 'none', background: draft.trim() ? 'linear-gradient(135deg,#34495e,#46627f)' : (dark ? '#1c2530' : '#e6e3da'), color: draft.trim() ? '#fff' : t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MobileIcon name="send" size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* texto da publicação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginRight: 'auto' }}>Texto da publicação</span>
        <button type="button" onClick={() => setFontIdx(Math.max(0, fontIdx - 1))} style={fontBtn(t, fontIdx === 0)} aria-label="Diminuir"><span style={{ fontSize: 11, fontWeight: 700 }}>A</span></button>
        <button type="button" onClick={() => setFontIdx(Math.min(2, fontIdx + 1))} style={fontBtn(t, fontIdx === 2)} aria-label="Aumentar"><span style={{ fontSize: 14, fontWeight: 700 }}>A</span></button>
        <button type="button" onClick={copiar} style={{ marginLeft: 3, display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 9px', borderRadius: 8, border: `1px solid ${t.border}`, background: copied ? t.tealSoft : t.page, color: copied ? t.teal : t.secondary, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}>
          <MobileIcon name={copied ? 'check' : 'fileText'} size={12} /> {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div style={{ background: t.page, border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '13px 14px', fontSize, lineHeight: 1.65, color: t.primary, textAlign: 'justify', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflow: 'auto' }}>
        {texto ?? 'Carregando…'}
      </div>
    </div>
  )
}

function fontBtn(t: ReturnType<typeof mTokens>, active: boolean): CSSProperties {
  return { width: 26, height: 26, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${t.border}`, background: t.page, color: active ? t.muted : t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
}
