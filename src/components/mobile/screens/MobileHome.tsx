'use client'

// MobileHome — Dashboard mobile (Início). Portado fielmente de
// components/MobileHomeB2.jsx, ligado a dados reais (agenda do dia, horas,
// ranking, últimas horas). Cores via mTokens; ícones via MobileIcon.

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, nextMonday } from 'date-fns'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { formatDateTimeForDB } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardAgenda, type AgendaItemDashboard } from '@/hooks/useDashboardAgenda'
import { useTimesheetRecentes, type TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'
import { useDashboardPerformance, type EquipeMember } from '@/hooks/useDashboardPerformance'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { mTokens, agendaMeta, hsStatus } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileSection from '../shell/MobileSection'
import MobileSheet from '../shell/MobileSheet'
import MobileTaskDetailSheet, { type MobileTaskItem } from '../shell/MobileTaskDetailSheet'
import { useMobileNav } from '../MobileApp'

// ---------- helpers de formatação ----------
function fmtHM(decimalHoras: number): string {
  const h = Math.floor(decimalHoras)
  const m = Math.round((decimalHoras - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

function brParts(now: Date) {
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts }).format(now)
  const hour = Number(f({ hour: 'numeric', hour12: false }))
  return {
    dayNum: f({ day: 'numeric' }),
    monthName: f({ month: 'long' }),
    dayName: f({ weekday: 'long' }),
    year: f({ year: 'numeric' }),
    hour,
  }
}

function saudacao(hour: number): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function quandoLabel(dataTrabalho: string): string {
  const hojeISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const ontemISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(addDays(new Date(), -1))
  if (dataTrabalho === hojeISO) return 'Hoje'
  if (dataTrabalho === ontemISO) return 'Ontem'
  const [, m, d] = dataTrabalho.split('-')
  return `${d}/${m}`
}

// ---------- tabela + coluna de data por tipo (conclusão/reagendamento) ----------
const TABELA: Record<string, { table: string; dateCol: string; doneStatus: string }> = {
  tarefa: { table: 'agenda_tarefas', dateCol: 'data_inicio', doneStatus: 'concluida' },
  evento: { table: 'agenda_eventos', dateCol: 'data_inicio', doneStatus: 'realizado' },
  audiencia: { table: 'agenda_audiencias', dateCol: 'data_hora', doneStatus: 'realizada' },
}

// prefill do "lançar horas" a partir do item da agenda
function prefillFromItem(e: AgendaItemDashboard) {
  return {
    processoId: e.processo_id ?? null,
    consultaId: e.consultivo_id ?? null,
    tarefaId: e.tipo === 'tarefa' ? e.id : null,
  }
}

// AgendaItemDashboard → item normalizado do sheet de detalhe compartilhado
function toTaskItem(e: AgendaItemDashboard): MobileTaskItem {
  return {
    id: e.id,
    tipo: e.tipo === 'audiencia' ? 'audiencia' : e.tipo === 'evento' ? 'compromisso' : 'tarefa',
    title: e.title,
    descricao: e.descricao,
    status: e.status,
    prioridade: e.prioridade,
    processoId: e.processo_id,
    numeroCnj: e.processo_numero,
    casoTitulo: e.caso_titulo,
    consultivoId: e.consultivo_id,
    consultivoTitulo: e.consultivo_titulo,
    dataInicio: e.data_inicio,
    prazoDataLimite: e.prazo_data_limite,
    responsaveis: e.todos_responsaveis || e.responsavel_nome,
    createdAt: e.created_at,
  }
}

export default function MobileHome({ dark }: { dark: boolean }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { user } = useAuth()
  const { escritorioAtivo } = useEscritorioAtivo()
  const [nome, setNome] = useState('')

  const { items: agenda, refresh: refreshAgenda } = useDashboardAgenda()
  const { data: recentes } = useTimesheetRecentes('semana', 50)
  const perf = useDashboardPerformance()
  const { metrics } = useDashboardMetrics()

  const [open, setOpen] = useState<{ agenda: boolean; ranking: boolean; horas: boolean }>({ agenda: true, ranking: false, horas: false })
  const toggle = (k: 'agenda' | 'ranking' | 'horas') => setOpen((s) => ({ ...s, [k]: !s[k] }))
  const [reschedItem, setReschedItem] = useState<AgendaItemDashboard | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<AgendaItemDashboard | null>(null)
  // ação pendente após o detalhe FECHAR (anima) — evita empilhar 2 camadas no histórico
  const pendingRef = useRef<{ type: 'resched' | 'horas'; item: AgendaItemDashboard } | null>(null)
  // numero_pasta + status do processo não estão na view da agenda — busca em lote
  // pelos processo_id presentes (RLS isola por escritório).
  const [pastaMap, setPastaMap] = useState<Record<string, { pasta?: string; status?: string }>>({})

  // nome do usuário (saudação + avatar)
  useEffect(() => {
    let cancel = false
    if (!user) return
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.from('profiles').select('nome_completo').eq('id', user.id).single()
      const nomeCompleto = (data as { nome_completo?: string } | null)?.nome_completo
      if (!cancel && nomeCompleto) setNome(nomeCompleto)
    })()
    return () => { cancel = true }
  }, [user])

  // busca de pasta/status dos processos vinculados aos itens da agenda
  useEffect(() => {
    const ids = Array.from(new Set(agenda.map((a) => a.processo_id).filter(Boolean))) as string[]
    if (ids.length === 0) { setPastaMap({}); return }
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.from('processos_processos').select('id, numero_pasta, status').in('id', ids)
      if (cancel || !data) return
      const map: Record<string, { pasta?: string; status?: string }> = {}
      for (const row of data as { id: string; numero_pasta?: string | null; status?: string | null }[]) {
        map[row.id] = { pasta: row.numero_pasta || undefined, status: row.status || undefined }
      }
      setPastaMap(map)
    })()
    return () => { cancel = true }
  }, [agenda])

  const dt = useMemo(() => brParts(new Date()), [])
  const primeiroNome = (nome || user?.email?.split('@')[0] || '').split(/\s+/)[0]

  // "Cobráveis" = mesmo indicador do desktop: horas faturáveis do USUÁRIO no
  // mês corrente vs meta (useDashboardMetrics), não "hoje".
  const cobraveisMes = metrics.horas_cobraveis_usuario || 0
  const metaMes = metrics.horas_meta || 0

  const recentesHome = recentes.slice(0, 5)

  // ---------- ações ----------
  async function concluir(item: AgendaItemDashboard) {
    const cfg = TABELA[item.tipo] || TABELA.tarefa
    const supabase = createClient()
    const { error } = await supabase.from(cfg.table).update({ status: cfg.doneStatus }).eq('id', item.id)
    if (error) { toast.error('Não foi possível concluir'); return }
    toast.success('Concluído')
    refreshAgenda()
  }

  async function reagendar(item: AgendaItemDashboard, novaData: Date) {
    // o fechamento (animado) é disparado pelo próprio sheet (close()); aqui só grava
    const cfg = TABELA[item.tipo] || TABELA.tarefa
    const supabase = createClient()
    const { error } = await supabase.from(cfg.table).update({ [cfg.dateCol]: formatDateTimeForDB(novaData) }).eq('id', item.id)
    if (error) { toast.error('Não foi possível reagendar'); return }
    toast.success('Reagendado')
    refreshAgenda()
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 28px' }}>
        {/* ===== hero ===== */}
        <div style={{ background: 'linear-gradient(150deg,#2c3e50,#34495e 55%,#46627f)', padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 22px 24px', position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <div style={{ position: 'absolute', top: -60, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(137,188,190,0.28),transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{saudacao(dt.hour)}{primeiroNome ? `, ${primeiroNome}` : ''}</div>
            <button type="button" onClick={() => setUserMenuOpen(true)} aria-label="Menu do usuário" style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{iniciais(nome || primeiroNome || '—')}</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 20, position: 'relative' }}>
            <div style={{ fontSize: 76, fontWeight: 500, color: '#fff', lineHeight: 0.82, letterSpacing: '-0.05em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{dt.dayNum}</div>
            <div style={{ paddingBottom: 6 }}>
              <div style={{ fontSize: 19, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.01em' }}>{dt.monthName}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{dt.dayName} · {dt.year}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, marginTop: 18, position: 'relative' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{agenda.length}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>compromissos</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.16)' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmtHM(cobraveisMes)}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>cobráveis no mês{metaMes > 0 ? ` · meta ${fmtHM(metaMes)}` : ''}</div>
            </div>
          </div>
        </div>

        {/* ===== 2 ações ===== */}
        <div style={{ display: 'flex', gap: 10, padding: '18px 20px 4px' }}>
          <button type="button" onClick={() => nav.openRegistrarHoras()} style={{ flex: 1, border: 'none', cursor: 'pointer', height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 10px 22px -10px rgba(52,73,94,0.5)' }}>
            <MobileIcon name="clock" size={19} />
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Registrar horas</span>
          </button>
          <button type="button" onClick={() => nav.openNovaTarefa()} style={{ flex: 1, cursor: 'pointer', height: 54, borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, color: t.primary, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <span style={{ color: t.teal }}><MobileIcon name="plus" size={19} /></span>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Nova tarefa</span>
          </button>
        </div>

        {/* ===== seções ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px 0' }}>
          <MobileSection title="Agenda de hoje" summary={`${agenda.length} ${agenda.length === 1 ? 'item' : 'itens'} hoje`} open={open.agenda} onToggle={() => toggle('agenda')} dark={dark}>
            <AgendaTimeline dark={dark} items={agenda} pastaMap={pastaMap} onConcluir={concluir} onHoras={(e) => nav.openRegistrarHoras(prefillFromItem(e))} onResched={setReschedItem} onOpenDetail={setDetailItem} onVerTudo={() => nav.navigate('/dashboard/agenda')} />
          </MobileSection>

          <MobileSection title="Ranking da equipe" summary="Horas cobráveis · este mês" open={open.ranking} onToggle={() => toggle('ranking')} dark={dark}>
            <TeamRanking dark={dark} equipe={perf.equipe} currentUserId={perf.currentUserId} />
          </MobileSection>

          <MobileSection title="Últimas horas lançadas" summary={`${recentes.length} nos últimos 7 dias`} open={open.horas} onToggle={() => toggle('horas')} dark={dark}>
            <RecentHours dark={dark} itens={recentesHome} onVerTudo={() => nav.navigate('/dashboard/financeiro/timesheet')} />
          </MobileSection>
        </div>
      </div>

      {reschedItem && (
        <RescheduleSheet dark={dark} item={reschedItem} onClose={() => setReschedItem(null)} onReagendar={(d) => reagendar(reschedItem, d)} />
      )}

      {userMenuOpen && (
        <UserMenuSheet dark={dark} nome={nome || primeiroNome} email={user?.email || ''} onClose={() => setUserMenuOpen(false)} />
      )}

      {detailItem && (
        <MobileTaskDetailSheet
          dark={dark}
          item={toTaskItem(detailItem)}
          escritorioId={escritorioAtivo}
          onClose={() => {
            setDetailItem(null)
            const p = pendingRef.current
            pendingRef.current = null
            if (p?.type === 'resched') setReschedItem(p.item)
            else if (p?.type === 'horas') nav.openRegistrarHoras(prefillFromItem(p.item))
          }}
          onConcluir={() => { void concluir(detailItem) }}
          onReagendar={() => { pendingRef.current = { type: 'resched', item: detailItem } }}
          onLancar={() => { pendingRef.current = { type: 'horas', item: detailItem } }}
        />
      )}
    </div>
  )
}

// ---------- menu do usuário (nome, e-mail, tema, sair) ----------
function UserMenuSheet({ dark, nome, email, onClose }: { dark: boolean; nome: string; email: string; onClose: () => void }) {
  const t = mTokens(dark)
  const { signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const item = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit',
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left',
    fontSize: 14.5, fontWeight: 600, color: t.primary,
  } as const
  return (
    <MobileSheet dark={dark} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15 }}>{iniciais(nome || '—')}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome || 'Usuário'}</div>
          {email && <div style={{ fontSize: 12, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <button type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} style={item}>
          <span style={{ color: t.teal, display: 'flex' }}><MobileIcon name={isDark ? 'sun' : 'moon'} size={17} /></span>
          <span style={{ flex: 1 }}>{isDark ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
        <button type="button" onClick={() => { void signOut() }} style={{ ...item, color: dark ? '#c98080' : '#9e4848' }}>
          <span style={{ display: 'flex' }}><MobileIcon name="logout" size={17} /></span>
          <span style={{ flex: 1 }}>Sair</span>
        </button>
      </div>
    </MobileSheet>
  )
}


// ---------- botão de ação colorido (rodapé do card) ----------
function ActBtn({ icon, label, onClick, variant, dark }: { icon: string; label: string; onClick?: () => void; variant: 'neutral' | 'teal' | 'green'; dark: boolean }) {
  const t = mTokens(dark)
  const styles = {
    neutral: { bg: t.card, border: t.border, color: t.secondary },
    teal: { bg: t.tealSoft, border: dark ? 'rgba(137,188,190,0.32)' : '#cfe7e7', color: t.teal },
    green: { bg: dark ? 'linear-gradient(135deg,#4f7d63,#5f9075)' : 'linear-gradient(135deg,#5f9075,#6ba585)', border: 'transparent', color: '#fff' },
  }[variant]
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, height: 36, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: variant === 'green' ? '0 6px 14px -8px rgba(95,144,117,0.8)' : 'none' }}>
      <MobileIcon name={icon} size={13} /> {label}
    </button>
  )
}

// ---------- agenda em linha do tempo ----------
function AgendaTimeline({ dark, items, pastaMap, onConcluir, onHoras, onResched, onOpenDetail, onVerTudo }: { dark: boolean; items: AgendaItemDashboard[]; pastaMap: Record<string, { pasta?: string; status?: string }>; onConcluir: (i: AgendaItemDashboard) => void; onHoras: (i: AgendaItemDashboard) => void; onResched: (i: AgendaItemDashboard) => void; onOpenDetail: (i: AgendaItemDashboard) => void; onVerTudo: () => void }) {
  const t = mTokens(dark)
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: t.muted, padding: '8px 2px 4px' }}>Nada para hoje. Bom dia livre. ✨</div>
  }
  const tipoDisplay = (tipo: string): 'audiencia' | 'compromisso' | 'tarefa' => (tipo === 'audiencia' ? 'audiencia' : tipo === 'evento' ? 'compromisso' : 'tarefa')
  return (
    <div>
      {items.map((e, i) => {
        const kind = tipoDisplay(e.tipo)
        const m = agendaMeta(kind, dark)
        const last = i === items.length - 1
        const done = ['concluida', 'realizado', 'realizada'].includes(e.status || '')
        // Só audiência e compromisso têm horário; tarefa não mostra hora
        // (data_inicio à meia-noite viraria "00:00").
        const mostraHorario = (kind === 'audiencia' || kind === 'compromisso') && !!e.time && e.time !== 'Dia todo'
        // Partes: no processo é o "Autor x Réu" (caso_titulo); no consultivo, o
        // título da consulta; senão, local/descrição.
        const partes = e.caso_titulo || e.consultivo_titulo || e.local || e.descricao || null
        const pasta = e.processo_id ? pastaMap[e.processo_id]?.pasta : undefined
        return (
          <div key={e.id} style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: done ? t.card : m.c, border: done ? `2px solid ${m.c}` : 'none', flexShrink: 0 }} />
              {!last && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4, minHeight: 18 }} />}
            </div>

            <div style={{ flex: 1, minWidth: 0, marginBottom: 12, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow, overflow: 'hidden', opacity: done ? 0.72 : 1 }}>
              <div onClick={() => onOpenDetail(e)} style={{ padding: '12px 14px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: m.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: m.c }}>{m.label}</span>
                  {mostraHorario ? (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: done ? t.muted : t.primary, background: dark ? '#1a212c' : '#f1efe8', padding: '2px 8px', borderRadius: 7, flexShrink: 0 }}>
                      <MobileIcon name="clock" size={11} />{e.time}
                    </span>
                  ) : done ? (
                    <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: t.muted, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><MobileIcon name="check" size={11} /> Concluída</span>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25, color: done ? t.muted : t.primary, textDecoration: done ? 'line-through' : 'none' }}>{e.title}</div>
                  <span style={{ color: t.muted, flexShrink: 0, display: 'flex', marginTop: 2 }}><MobileIcon name="chevronRight" size={15} /></span>
                </div>

                {partes && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 3, lineHeight: 1.35 }}>{partes}</div>}

                {e.processo_numero && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                    {pasta && <span style={{ fontSize: 9, fontWeight: 700, color: t.secondary, letterSpacing: '0.03em', background: dark ? '#161c26' : '#f3f1ea', padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>{pasta}</span>}
                    <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.processo_numero}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 7, padding: '10px 12px 12px', borderTop: `1px solid ${t.borderSubtle}` }}>
                <ActBtn icon="calendar" label="Reagendar" variant="neutral" dark={dark} onClick={() => onResched(e)} />
                <ActBtn icon="clock" label="Horas" variant="teal" dark={dark} onClick={() => onHoras(e)} />
                <ActBtn icon={done ? 'clock' : 'check'} label={done ? 'Reabrir' : 'Concluir'} variant={done ? 'neutral' : 'green'} dark={dark} onClick={() => onConcluir(e)} />
              </div>
            </div>
          </div>
        )
      })}
      <button type="button" onClick={onVerTudo} style={ghostBtn(t)}>Ver agenda completa <MobileIcon name="chevronRight" size={13} /></button>
    </div>
  )
}

// ---------- folha de reagendamento ----------
function RescheduleSheet({ dark, item, onClose, onReagendar }: { dark: boolean; item: AgendaItemDashboard; onClose: () => void; onReagendar: (d: Date) => void }) {
  const t = mTokens(dark)
  // mesmas opções do desktop, relativas a HOJE
  const hoje = new Date()
  const opts: { label: string; date: Date }[] = [
    { label: 'Hoje', date: hoje },
    { label: 'Amanhã', date: addDays(hoje, 1) },
    { label: 'Daqui a 2 dias', date: addDays(hoje, 2) },
    { label: 'Próxima segunda', date: nextMonday(hoje) },
    { label: 'Daqui a 7 dias', date: addDays(hoje, 7) },
  ]
  return (
    <MobileSheet dark={dark} onClose={onClose}>
      {(close) => (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Reagendar</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: t.primary, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{item.title}</div>
            {item.subtitle && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 2 }}>{item.subtitle}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {opts.map((o) => (
              <button key={o.label} type="button" onClick={() => { onReagendar(o.date); close() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left' }}>
                <span style={{ color: t.teal }}><MobileIcon name="calendar" size={17} /></span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: t.primary }}>{o.label}</span>
                <MobileIcon name="chevronRight" size={15} style={{ color: t.muted }} />
              </button>
            ))}
          </div>
          <button type="button" onClick={close} style={{ width: '100%', marginTop: 14, height: 50, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, color: t.primary, fontSize: 14.5, fontWeight: 600 }}>Cancelar</button>
        </>
      )}
    </MobileSheet>
  )
}

// ---------- ranking da equipe ----------
function TeamRanking({ dark, equipe, currentUserId }: { dark: boolean; equipe: EquipeMember[]; currentUserId: string | null }) {
  const t = mTokens(dark)
  if (equipe.length === 0) return <div style={{ fontSize: 13, color: t.muted, padding: '4px 2px' }}>Sem horas lançadas este mês.</div>
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {equipe.map((m, i) => {
          // Barra cheia (100%) dividida proporcionalmente entre cobrável e
          // não-cobrável do PRÓPRIO total do membro (igual ao desktop) — sem
          // área em branco relativa ao líder.
          const cobravelPerc = m.horas > 0 ? Math.round((m.horasCobraveis / m.horas) * 100) : 0
          const billablePct = m.horas > 0 ? (m.horasCobraveis / m.horas) * 100 : 0
          const naoCobravelPct = 100 - billablePct
          const you = m.id === currentUserId
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ width: 18, fontSize: 12, fontWeight: 700, color: i === 0 ? t.primary : t.muted, fontFamily: 'var(--font-mono)', textAlign: 'center', flexShrink: 0, paddingTop: 1 }}>{i + 1}º</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: you ? 600 : 500, color: t.primary, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                    {you && <span style={{ fontSize: 8.5, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: t.tealSoft, color: t.teal, letterSpacing: '0.06em', flexShrink: 0 }}>VOCÊ</span>}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{fmtHM(m.horas)}</span>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, background: dark ? '#1e2733' : '#f3f1ea', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ width: `${billablePct}%`, background: 'linear-gradient(90deg,#34495e,#46627f)' }} />
                  <div style={{ width: `${naoCobravelPct}%`, background: t.teal, opacity: 0.55 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: t.muted }}>
                  <span>{cobravelPerc}% cobrável</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.borderSubtle}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.secondary }}><span style={{ width: 10, height: 6, borderRadius: 2, background: 'linear-gradient(90deg,#34495e,#46627f)' }} />Cobráveis</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.secondary }}><span style={{ width: 10, height: 6, borderRadius: 2, background: t.teal, opacity: 0.55 }} />Não-cobráveis</span>
      </div>
    </div>
  )
}

// ---------- últimas horas lançadas ----------
function RecentHours({ dark, itens, onVerTudo }: { dark: boolean; itens: TimesheetEntryRecente[]; onVerTudo: () => void }) {
  const t = mTokens(dark)
  if (itens.length === 0) return <div style={{ fontSize: 13, color: t.muted, padding: '4px 2px' }}>Nenhum lançamento recente.</div>
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {itens.map((h, i) => {
          const display = h.faturado ? 'faturado' : h.status === 'pendente' ? 'pendente' : 'aprovado'
          const st = hsStatus(display, dark)
          const last = i === itens.length - 1
          const cliente = h.cliente_nome || h.processo_titulo || h.consulta_titulo || '—'
          return (
            <div key={h.id} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '11px 0', borderBottom: last ? 'none' : `1px solid ${t.borderSubtle}` }}>
              <div style={{ width: 3, height: 30, borderRadius: 2, background: st.c, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.atividade}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: st.bg, color: st.fg, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>{display}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)' }}>{fmtHM(h.horas)}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{quandoLabel(h.data_trabalho)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={onVerTudo} style={ghostBtn(t)}>Ver todos os lançamentos <MobileIcon name="chevronRight" size={13} /></button>
    </div>
  )
}

function ghostBtn(t: ReturnType<typeof mTokens>) {
  return {
    width: '100%', marginTop: 12, height: 38, borderRadius: 10,
    border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer',
    color: t.primary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  } as const
}
