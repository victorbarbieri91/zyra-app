'use client'

// MobileAgenda — Módulo Agenda (visão Lista) para mobile. Portado fielmente de
// components/MobileAgenda.jsx, ligado a dados reais (v_agenda_consolidada via
// useAgendaConsolidada). Período (Atrasados · Hoje · Próximos), filtros por tipo,
// itens agrupados por dia. Ações Reagendar/Horas/Concluir via supabase + refresh.
// Cores via mTokens; ícones via MobileIcon.

import { useMemo, useState } from 'react'
import { addDays, nextMonday, startOfDay, endOfDay, subDays, isBefore, isToday } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { parseDBDate, formatDateTimeForDB } from '@/lib/timezone'
import { useAuth } from '@/contexts/AuthContext'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useAgendaConsolidada, type AgendaItem } from '@/hooks/useAgendaConsolidada'
import { mTokens, agendaMeta } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileSheet from '../shell/MobileSheet'
import { useMobileNav } from '../MobileApp'

// ---------- tabela + coluna de data por tipo (conclusão/reagendamento) ----------
const TABELA: Record<string, { table: string; dateCol: string; doneStatus: string }> = {
  tarefa: { table: 'agenda_tarefas', dateCol: 'data_inicio', doneStatus: 'concluida' },
  evento: { table: 'agenda_eventos', dateCol: 'data_inicio', doneStatus: 'realizado' },
  audiencia: { table: 'agenda_audiencias', dateCol: 'data_hora', doneStatus: 'realizada' },
}

const COMPLETED = ['concluida', 'concluido', 'realizada', 'realizado']

type Bucket = 'atrasado' | 'hoje' | 'proximo'
type TipoFiltro = 'todos' | 'tarefa' | 'audiencia' | 'evento'

// tipo_entidade ('evento') → kind visual ('compromisso')
function tipoDisplay(tipo: string): 'audiencia' | 'compromisso' | 'tarefa' {
  return tipo === 'audiencia' ? 'audiencia' : tipo === 'evento' ? 'compromisso' : 'tarefa'
}

// área inferida (Contencioso = tem processo · Consultivo = tem consulta)
function areaDe(item: AgendaItem): string | null {
  if (item.processo_numero) return 'Contencioso'
  if (item.consultivo_titulo) return 'Consultivo'
  return null
}

// hora "HH:mm" do item. Só audiência e compromisso (evento) têm horário;
// tarefa NUNCA mostra hora (data_inicio à meia-noite viraria "00:00").
function horaDe(item: AgendaItem): string | null {
  if (item.tipo_entidade === 'tarefa') return null
  if (item.dia_inteiro) return null
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(parseDBDate(item.data_inicio))
  return f === '00:00' ? null : f
}

// prazo fatal "dd/MM" (só tarefas)
function prazoFatalDe(item: AgendaItem): string | null {
  if (item.tipo_entidade !== 'tarefa' || !item.prazo_data_limite) return null
  const d = parseDBDate(item.prazo_data_limite)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

// rótulo do dia (Hoje / Ontem / Amanhã / "qua, 25 jun")
function diaLabel(data: Date): string {
  const hoje = startOfDay(new Date())
  const alvo = startOfDay(data)
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === -1) return 'Ontem'
  if (diff === 1) return 'Amanhã'
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'short' }).format(data)
  return f.replace('.', '').replace('.', '')
}

function diaSemana(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(data)
}

export default function MobileAgenda({ dark }: { dark: boolean }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { user } = useAuth()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [bucket, setBucket] = useState<Bucket>('hoje')
  const [tipo, setTipo] = useState<TipoFiltro>('todos')
  const [reschedItem, setReschedItem] = useState<AgendaItem | null>(null)

  // janela ampla (passado p/ atrasados + futuro p/ próximos) numa única busca.
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = startOfDay(new Date())
    return { dataInicio: startOfDay(subDays(hoje, 30)), dataFim: endOfDay(addDays(hoje, 30)) }
  }, [])

  const agendaFilters = useMemo(
    () => ({ data_inicio: dataInicio.toISOString(), data_fim: dataFim.toISOString() }),
    [dataInicio, dataFim],
  )

  const { items, loading, refreshItems } = useAgendaConsolidada(escritorioAtivo || undefined, agendaFilters)

  // filtro por usuário (responsáveis incluem o usuário OU item sem responsável)
  const itemsDoUsuario = useMemo(() => {
    if (!items) return []
    if (!user) return items
    return items.filter((i) => !i.responsaveis_ids?.length || i.responsaveis_ids.includes(user.id))
  }, [items, user])

  // classifica cada item por bucket (atrasado / hoje / próximo)
  const buckets = useMemo(() => {
    const hoje = startOfDay(new Date())
    const result: Record<Bucket, AgendaItem[]> = { atrasado: [], hoje: [], proximo: [] }
    itemsDoUsuario.forEach((i) => {
      const d = startOfDay(parseDBDate(i.data_inicio))
      const concluido = COMPLETED.includes(i.status || '')
      if (isBefore(d, hoje)) {
        // atrasados: só pendentes (não mostrar concluídos vencidos)
        if (!concluido) result.atrasado.push(i)
      } else if (isToday(d)) {
        result.hoje.push(i)
      } else {
        if (!concluido) result.proximo.push(i)
      }
    })
    return result
  }, [itemsDoUsuario])

  const overdueCount = buckets.atrasado.length

  // itens visíveis no bucket atual, aplicando filtro de tipo
  const visiveis = useMemo(() => {
    const lista = buckets[bucket]
    if (tipo === 'todos') return lista
    return lista.filter((i) => i.tipo_entidade === tipo)
  }, [buckets, bucket, tipo])

  // agrupa por dia (yyyy-MM-dd) e ordena (audiência > tarefa > compromisso, depois hora)
  const grupos = useMemo(() => {
    const map: Record<string, AgendaItem[]> = {}
    visiveis.forEach((i) => {
      const d = parseDBDate(i.data_inicio)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(i)
    })
    const tipoOrdem: Record<string, number> = { audiencia: 1, tarefa: 2, evento: 3 }
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const oa = tipoOrdem[a.tipo_entidade] ?? 99
        const ob = tipoOrdem[b.tipo_entidade] ?? 99
        if (oa !== ob) return oa - ob
        return parseDBDate(a.data_inicio).getTime() - parseDBDate(b.data_inicio).getTime()
      })
    })
    const chaves = Object.keys(map).sort((a, b) => (bucket === 'atrasado' ? b.localeCompare(a) : a.localeCompare(b)))
    return chaves.map((k) => ({ data: parseDBDate(k), rows: map[k] }))
  }, [visiveis, bucket])

  const totalAbertos = useMemo(
    () => itemsDoUsuario.filter((i) => !COMPLETED.includes(i.status || '')).length,
    [itemsDoUsuario],
  )

  // ---------- ações ----------
  async function concluir(item: AgendaItem) {
    const cfg = TABELA[item.tipo_entidade] || TABELA.tarefa
    const concluido = COMPLETED.includes(item.status || '')
    const novoStatus = concluido ? 'pendente' : cfg.doneStatus
    const supabase = createClient()
    const { error } = await supabase.from(cfg.table).update({ status: novoStatus }).eq('id', item.id)
    if (error) { toast.error('Não foi possível concluir'); return }
    toast.success(concluido ? 'Reaberto' : 'Concluído')
    refreshItems()
  }

  async function reagendar(item: AgendaItem, novaData: Date) {
    const cfg = TABELA[item.tipo_entidade] || TABELA.tarefa
    const supabase = createClient()
    const { error } = await supabase.from(cfg.table).update({ [cfg.dateCol]: formatDateTimeForDB(novaData) }).eq('id', item.id)
    setReschedItem(null)
    if (error) { toast.error('Não foi possível reagendar'); return }
    toast.success('Reagendado')
    refreshItems()
  }

  const tabs: { id: Bucket; label: string; badge?: number }[] = [
    { id: 'atrasado', label: 'Atrasados', badge: overdueCount },
    { id: 'hoje', label: 'Hoje' },
    { id: 'proximo', label: 'Próximos' },
  ]
  const tipos: [TipoFiltro, string][] = [
    ['todos', 'Todos'],
    ['tarefa', 'Tarefas'],
    ['audiencia', 'Audiências'],
    ['evento', 'Compromissos'],
  ]

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>

      {/* ===== app bar ===== */}
      <div style={{ flexShrink: 0, background: t.card, borderBottom: `1px solid ${t.border}`, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 12px' }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 600, color: t.primary, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>Agenda</div>
            <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 1 }}>{totalAbertos} {totalAbertos === 1 ? 'item' : 'itens'} · próximos dias</div>
          </div>
          <button type="button" onClick={() => nav.openNovaTarefa()} style={{ height: 40, padding: '0 16px', borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 8px 18px -10px rgba(52,73,94,0.5)' }}>
            <MobileIcon name="plus" size={16} /> Tarefa
          </button>
        </div>

        {/* período */}
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 12px' }}>
          {tabs.map((b) => {
            const on = bucket === b.id
            return (
              <button key={b.id} type="button" onClick={() => setBucket(b.id)} style={{ flex: 1, height: 38, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${on ? '#34495e' : t.border}`, background: on ? 'linear-gradient(135deg,#34495e,#46627f)' : t.page, color: on ? '#fff' : t.secondary }}>
                {b.label}
                {b.badge ? (
                  <span style={{ minWidth: 17, height: 17, padding: '0 5px', borderRadius: 9, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,0.22)' : (dark ? 'rgba(181,106,106,0.2)' : '#f4e6e6'), color: on ? '#fff' : (dark ? '#c98080' : '#9e4848') }}>{b.badge}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== filtros por tipo ===== */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 7, padding: '12px 18px 10px', overflowX: 'auto', background: t.page }}>
        {tipos.map(([v, l]) => {
          const on = tipo === v
          return (
            <button key={v} type="button" onClick={() => setTipo(v)} style={{ flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? (dark ? '#3a4757' : '#cdd5dd') : t.border}`, background: on ? (dark ? '#1c2530' : '#eef1f4') : t.card, color: on ? t.primary : t.secondary }}>{l}</button>
          )
        })}
      </div>

      {/* ===== lista agrupada por dia ===== */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 18px 28px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted, fontSize: 13 }}>Carregando…</div>
        ) : grupos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.muted }}>
            <div style={{ color: t.secondary, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><MobileIcon name="calendar" size={28} /></div>
            <div style={{ fontSize: 13.5, color: t.secondary, fontWeight: 600 }}>Nada por aqui</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Sem itens neste período ou filtro.</div>
          </div>
        ) : grupos.map((g) => {
          const overdue = bucket === 'atrasado'
          const ehHoje = isToday(g.data)
          const label = diaLabel(g.data)
          return (
            <div key={g.data.toISOString()} style={{ marginBottom: 18 }}>
              {/* cabeçalho do dia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12, paddingTop: 4 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: overdue ? (dark ? 'rgba(181,106,106,0.16)' : '#f4e6e6') : (ehHoje ? 'linear-gradient(135deg,#34495e,#46627f)' : t.card), border: ehHoje ? 'none' : `1px solid ${t.border}`, color: overdue ? (dark ? '#c98080' : '#9e4848') : (ehHoje ? '#fff' : t.primary) }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{String(g.data.getDate()).padStart(2, '0')}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: overdue ? (dark ? '#c98080' : '#9e4848') : t.primary, letterSpacing: '-0.01em' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: t.muted }}>{diaSemana(g.data)} · {g.rows.length} {g.rows.length === 1 ? 'item' : 'itens'}</div>
                </div>
              </div>

              {/* cards do dia (timeline) */}
              <AgendaTimeline
                dark={dark}
                items={g.rows}
                overdue={overdue}
                onConcluir={concluir}
                onHoras={(i) => nav.openRegistrarHoras(i.processo_id ? { processoId: i.processo_id, tarefaId: i.tipo_entidade === 'tarefa' ? i.id : undefined } : i.consultivo_id ? { consultaId: i.consultivo_id } : {})}
                onResched={setReschedItem}
                onProcessoClick={(pid) => nav.navigate(`/dashboard/processos/${pid}`)}
              />
            </div>
          )
        })}
      </div>

      {reschedItem && (
        <RescheduleSheet dark={dark} item={reschedItem} onClose={() => setReschedItem(null)} onReagendar={(d) => reagendar(reschedItem, d)} />
      )}
    </div>
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

// ---------- timeline de cards do dia ----------
function AgendaTimeline({ dark, items, overdue, onConcluir, onHoras, onResched, onProcessoClick }: {
  dark: boolean
  items: AgendaItem[]
  overdue: boolean
  onConcluir: (i: AgendaItem) => void
  onHoras: (i: AgendaItem) => void
  onResched: (i: AgendaItem) => void
  onProcessoClick: (processoId: string) => void
}) {
  const t = mTokens(dark)
  return (
    <div>
      {items.map((e, i) => {
        const kind = tipoDisplay(e.tipo_entidade)
        const m = agendaMeta(kind, dark)
        const last = i === items.length - 1
        const done = COMPLETED.includes(e.status || '')
        const hora = horaDe(e)
        const area = areaDe(e)
        const prazo = prazoFatalDe(e)
        return (
          <div key={e.id} style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: done ? t.card : m.c, border: done ? `2px solid ${m.c}` : 'none', flexShrink: 0 }} />
              {!last && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4, minHeight: 18 }} />}
            </div>

            <div style={{ flex: 1, minWidth: 0, marginBottom: 12, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow, overflow: 'hidden', opacity: done ? 0.72 : 1 }}>
              <div style={{ padding: '12px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: m.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: m.c }}>{m.label}</span>
                  {hora ? (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: done ? t.muted : t.primary, background: dark ? '#1a212c' : '#f1efe8', padding: '2px 8px', borderRadius: 7, flexShrink: 0 }}>
                      <MobileIcon name="clock" size={11} />{hora}
                    </span>
                  ) : done ? (
                    <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: t.muted, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><MobileIcon name="check" size={11} /> Concluída</span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: t.muted, flexShrink: 0 }}>Sem horário</span>
                  )}
                </div>

                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25, color: done ? t.muted : t.primary, textDecoration: done ? 'line-through' : 'none' }}>{e.titulo}</div>

                {e.consultivo_titulo && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.consultivo_titulo}</div>}
                {!e.consultivo_titulo && e.local && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.local}</div>}

                {(area || prazo) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
                    {area && (
                      <span
                        onClick={area === 'Contencioso' && e.processo_id ? () => onProcessoClick(e.processo_id as string) : undefined}
                        style={{ fontSize: 9, fontWeight: 700, color: t.secondary, letterSpacing: '0.03em', background: dark ? '#161c26' : '#f3f1ea', padding: '2px 6px', borderRadius: 5, flexShrink: 0, cursor: area === 'Contencioso' && e.processo_id ? 'pointer' : 'default' }}
                      >{area}</span>
                    )}
                    {e.processo_numero && (
                      <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.processo_numero}</span>
                    )}
                    {prazo && (
                      <span style={{ marginLeft: area && !e.processo_numero ? 0 : 'auto', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.02em', color: overdue ? (dark ? '#c98080' : '#9e4848') : (dark ? '#d6a87a' : '#8a6438'), background: overdue ? (dark ? 'rgba(181,106,106,0.16)' : '#f4e6e6') : (dark ? 'rgba(194,149,107,0.16)' : '#f7eede'), padding: '2px 7px', borderRadius: 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <MobileIcon name="alert" size={10} /> {prazo}
                      </span>
                    )}
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
    </div>
  )
}

// ---------- folha de reagendamento ----------
function RescheduleSheet({ dark, item, onClose, onReagendar }: { dark: boolean; item: AgendaItem; onClose: () => void; onReagendar: (d: Date) => void }) {
  const t = mTokens(dark)
  const base = item.data_inicio ? parseDBDate(item.data_inicio) : new Date()
  const opts: { label: string; date: Date }[] = [
    { label: 'Amanhã', date: addDays(base, 1) },
    { label: 'Em 2 dias', date: addDays(base, 2) },
    { label: 'Próxima semana', date: nextMonday(base) },
  ]
  const subtitulo = item.consultivo_titulo || item.processo_numero || item.local || ''
  return (
    <MobileSheet dark={dark} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Reagendar</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: t.primary, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{item.titulo}</div>
        {subtitulo && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitulo}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {opts.map((o) => (
          <button key={o.label} type="button" onClick={() => onReagendar(o.date)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left' }}>
            <span style={{ color: t.teal }}><MobileIcon name="calendar" size={17} /></span>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: t.primary }}>{o.label}</span>
            <MobileIcon name="chevronRight" size={15} style={{ color: t.muted }} />
          </button>
        ))}
      </div>
      <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 14, height: 50, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, color: t.primary, fontSize: 14.5, fontWeight: 600 }}>Cancelar</button>
    </MobileSheet>
  )
}
