'use client'

// MobileConsultaDetalhe — Detalhe da consulta (mobile). Portado de
// components/MobileConsultaDetalhe.jsx, ligado a dados reais (consultivo_consultas
// + cliente/responsável, consultivo_movimentacoes, agenda vinculada e financeiro
// via useConsultivoFinanceiro). Cores via mTokens; ícones via MobileIcon.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, parseDBDate } from '@/lib/timezone'
import { formatCurrency } from '@/lib/utils'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useConsultivoFinanceiro } from '@/hooks/useConsultivoFinanceiro'
import { TIPOS_CONSULTA, type TipoConsulta } from '@/lib/constants/consultivo-tipos'
import {
  CONSULTIVO_ANDAMENTO_TIPOS,
  type ConsultivoAndamentoTipo,
} from '@/lib/constants/consultivo-andamento-tipos'
import { mTokens, consultivoAreaMeta, prioMeta, type MobileTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileSection from '../shell/MobileSection'
import { useMobileNav } from '../MobileApp'

// ---------- helpers ----------
function iniciais(nome: string): string {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '—'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

const DOW_CURTO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
function dowDe(date: Date): string {
  return DOW_CURTO[date.getDay()] ?? ''
}

function fmtHM(decimalHoras: number): string {
  const h = Math.floor(decimalHoras)
  const m = Math.round((decimalHoras - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

function formatArea(area: string): string {
  const map: Record<string, string> = {
    civel: 'Cível', trabalhista: 'Trabalhista',
    tributaria: 'Tributária', tributario: 'Tributário',
    societaria: 'Societária', societario: 'Societário',
    empresarial: 'Empresarial', contratual: 'Contratual', familia: 'Família',
    criminal: 'Criminal', previdenciaria: 'Previdenciária',
    consumidor: 'Consumidor', ambiental: 'Ambiental', imobiliario: 'Imobiliário',
    propriedade_intelectual: 'Prop. Intelectual', compliance: 'Compliance',
    outra: 'Outra', outros: 'Outros',
  }
  return map[area] || area
}

// ---------- tipos locais ----------
interface ConsultaDet {
  id: string
  numero: string | null
  titulo: string
  descricao: string | null
  cliente_id: string
  cliente_nome: string
  tipo: string | null
  area: string
  status: string
  prioridade: string
  prazo: string | null
  responsavel_nome: string
  created_at: string
}

interface MovDet {
  id: string
  data: string
  tipo: string
  tipo_descricao: string | null
  descricao: string
}

interface AgendaDet {
  id: string
  titulo: string
  data_inicio: string
  responsavel_nome: string | null
  tipo_entidade: 'tarefa' | 'evento' | 'audiencia'
}

export default function MobileConsultaDetalhe({ dark, id }: { dark: boolean; id: string }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [consulta, setConsulta] = useState<ConsultaDet | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<MovDet[]>([])
  const [agenda, setAgenda] = useState<AgendaDet[]>([])

  const fin = useConsultivoFinanceiro(id)

  const [open, setOpen] = useState({ consulta: true, andamentos: true, agenda: false, financeiro: false })
  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }))

  // ---------- carregar consulta + cliente + responsável ----------
  useEffect(() => {
    let cancel = false
    if (!id || !escritorioAtivo) return
    const supabase = createClient()
    void (async () => {
      setLoading(true)
      setErro(false)
      const { data, error } = await supabase
        .from('consultivo_consultas')
        .select('*')
        .eq('id', id)
        .eq('escritorio_id', escritorioAtivo)
        .single()

      if (error || !data) {
        if (!cancel) { setErro(true); setLoading(false) }
        return
      }
      const row = data as {
        id: string; numero: string | null; titulo: string; descricao: string | null
        cliente_id: string; tipo: string | null; area: string; status: string
        prioridade: string; prazo: string | null; responsavel_id: string; created_at: string
      }

      const [clienteRes, respRes] = await Promise.all([
        supabase.from('crm_pessoas').select('nome_completo').eq('id', row.cliente_id).single(),
        supabase.from('profiles').select('nome_completo').eq('id', row.responsavel_id).single(),
      ])

      if (cancel) return
      setConsulta({
        id: row.id,
        numero: row.numero,
        titulo: row.titulo,
        descricao: row.descricao,
        cliente_id: row.cliente_id,
        cliente_nome: (clienteRes.data as { nome_completo?: string } | null)?.nome_completo || 'N/A',
        tipo: row.tipo,
        area: row.area,
        status: row.status,
        prioridade: row.prioridade,
        prazo: row.prazo,
        responsavel_nome: (respRes.data as { nome_completo?: string } | null)?.nome_completo || 'N/A',
        created_at: row.created_at,
      })
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [id, escritorioAtivo])

  // ---------- carregar andamentos ----------
  useEffect(() => {
    let cancel = false
    if (!id) return
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from('consultivo_movimentacoes')
        .select('id, data_movimento, tipo_codigo, tipo_descricao, descricao')
        .eq('consulta_id', id)
        .order('data_movimento', { ascending: false })

      if (cancel) return
      const rows = (data || []) as {
        id: string; data_movimento: string; tipo_codigo: string
        tipo_descricao: string | null; descricao: string
      }[]
      setMovimentacoes(rows.map((m) => ({
        id: m.id,
        data: m.data_movimento,
        tipo: m.tipo_codigo,
        tipo_descricao: m.tipo_descricao,
        descricao: m.descricao,
      })))
    })()
    return () => { cancel = true }
  }, [id])

  // ---------- carregar agenda vinculada (ativos) ----------
  useEffect(() => {
    let cancel = false
    if (!id) return
    const supabase = createClient()
    void (async () => {
      const [tarefasRes, eventosRes, audienciasRes] = await Promise.all([
        supabase
          .from('agenda_tarefas')
          .select('id, titulo, status, data_inicio, profiles!agenda_tarefas_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', id)
          .neq('status', 'cancelada')
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_eventos')
          .select('id, titulo, status, data_inicio, profiles!agenda_eventos_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', id)
          .neq('status', 'cancelado')
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_audiencias')
          .select('id, titulo, status, data_hora, profiles!agenda_audiencias_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', id)
          .neq('status', 'cancelada')
          .order('data_hora', { ascending: true }),
      ])

      if (cancel) return
      const items: AgendaDet[] = []
      const tarefas = (tarefasRes.data || []) as { id: string; titulo: string; status: string; data_inicio: string; profiles: { nome_completo: string } | null }[]
      const eventos = (eventosRes.data || []) as { id: string; titulo: string; status: string; data_inicio: string; profiles: { nome_completo: string } | null }[]
      const audiencias = (audienciasRes.data || []) as { id: string; titulo: string; status: string; data_hora: string; profiles: { nome_completo: string } | null }[]

      tarefas.forEach((r) => items.push({ id: r.id, titulo: r.titulo, data_inicio: r.data_inicio, responsavel_nome: r.profiles?.nome_completo ?? null, tipo_entidade: 'tarefa' }))
      eventos.forEach((r) => items.push({ id: r.id, titulo: r.titulo, data_inicio: r.data_inicio, responsavel_nome: r.profiles?.nome_completo ?? null, tipo_entidade: 'evento' }))
      audiencias.forEach((r) => items.push({ id: r.id, titulo: r.titulo, data_inicio: r.data_hora, responsavel_nome: r.profiles?.nome_completo ?? null, tipo_entidade: 'audiencia' }))

      const ativos = items.filter((i) => {
        const st = (eventos.find((e) => e.id === i.id)?.status)
          ?? (tarefas.find((tt) => tt.id === i.id)?.status)
          ?? (audiencias.find((a) => a.id === i.id)?.status)
        return st !== 'concluida' && st !== 'realizada' && st !== 'realizado' && st !== 'cancelada'
      })
      ativos.sort((a, b) => parseDBDate(a.data_inicio).getTime() - parseDBDate(b.data_inicio).getTime())
      setAgenda(ativos)
    })()
    return () => { cancel = true }
  }, [id])

  // ---------- financeiro ----------
  useEffect(() => {
    void fin.loadDados()
  }, [fin.loadDados])

  const am = useMemo(() => consultivoAreaMeta(consulta?.area || '', dark), [consulta?.area, dark])
  const pm = useMemo(() => prioMeta(consulta?.prioridade || '', dark), [consulta?.prioridade, dark])

  // ===== estados de carregamento / erro =====
  if (loading) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.page, fontFamily: 'var(--font-sans)' }}>
        <div style={{ width: 26, height: 26, border: `2.5px solid ${t.border}`, borderTopColor: t.teal, borderRadius: '50%', animation: 'dcSpin 0.8s linear infinite' }} />
        <style>{`@keyframes dcSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (erro || !consulta) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: t.page, fontFamily: 'var(--font-sans)', padding: 24 }}>
        <span style={{ color: t.muted }}><MobileIcon name="consultivo" size={40} /></span>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, textAlign: 'center' }}>Consulta não encontrada</div>
        <button type="button" onClick={() => nav.navigate('/dashboard/consultivo')} style={{ height: 44, padding: '0 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', fontSize: 13.5, fontWeight: 600 }}>
          Voltar para o Consultivo
        </button>
      </div>
    )
  }

  const tipoLabel = consulta.tipo
    ? (TIPOS_CONSULTA[consulta.tipo as TipoConsulta]?.label ?? 'Não classificado')
    : 'Não classificado'
  const areaLabel = formatArea(consulta.area)
  const ativo = consulta.status === 'ativo'

  const honorariosFmt = formatCurrency(fin.resumo.totalHonorarios || 0)
  const despesasFmt = formatCurrency(fin.resumo.totalDespesas || 0)
  const timesheetFmt = fmtHM(fin.resumo.horasTrabalhadas || 0)
  const entradasTimesheet = fin.timesheet.length

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}>

        {/* ===== hero ===== */}
        <div style={{ background: t.card, padding: 'calc(env(safe-area-inset-top, 0px) + 22px) 20px 22px', position: 'relative', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button type="button" aria-label="Voltar para o consultivo" onClick={() => nav.navigate('/dashboard/consultivo')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.page, border: `1px solid ${t.border}`, borderRadius: 11, padding: '8px 14px 8px 10px', cursor: 'pointer', fontFamily: 'inherit', color: t.primary, fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ display: 'flex' }}><MobileIcon name="chevronLeft" size={16} /></span> Consultivo
            </button>
          </div>

          {/* área · prioridade · status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: am.bg, color: am.fg }}>{areaLabel}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: pm.bg, color: pm.fg }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: pm.dot }} /> Prioridade {pm.label}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: ativo ? (dark ? '#8db8a0' : '#3f6a54') : t.muted }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: ativo ? (dark ? '#8db8a0' : '#6b9e84') : t.muted }} /> {ativo ? 'Ativo' : 'Arquivado'}
            </span>
          </div>

          {/* nº + título + cliente */}
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginBottom: 6 }}>{consulta.numero || 'S/N'}</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: t.primary, lineHeight: 1.12, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{consulta.titulo}</div>
          <div style={{ fontSize: 13.5, color: t.secondary, marginTop: 7, lineHeight: 1.3 }}>{consulta.cliente_nome}</div>

          {/* bloco de dados */}
          <div style={{ marginTop: 20, background: t.page, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex' }}>
              <HdrCellC dark={dark} label="Tipo" value={tipoLabel} />
              <div style={{ width: 1, background: t.border }} />
              <HdrCellC dark={dark} label="Criado em" value={formatBrazilDate(consulta.created_at)} mono />
              <div style={{ width: 1, background: t.border }} />
              <HdrCellC dark={dark} label="Prazo" value={consulta.prazo ? formatBrazilDate(parseDBDate(consulta.prazo)) : '—'} mono accent={!!consulta.prazo} />
            </div>
            <div style={{ height: 1, background: t.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{iniciais(consulta.responsavel_nome)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>Responsável</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.primary, marginTop: 1, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{consulta.responsavel_nome}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== virou contencioso? ===== */}
        {ativo && (
          <div style={{ padding: '16px 18px 0' }}>
            <div style={{ background: dark ? 'rgba(137,188,190,0.08)' : '#f0f7f7', border: `1px solid ${dark ? 'rgba(137,188,190,0.25)' : '#d6e9e9'}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: t.teal }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.teal }}>Próximo passo</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em' }}>Virou contencioso?</div>
              <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 3, lineHeight: 1.4 }}>Quando esta consulta evoluir para processo judicial, mantenha o histórico vinculado.</div>
              <button type="button" onClick={() => nav.navigate(`/dashboard/consultivo/${id}`)} style={{ width: '100%', marginTop: 13, height: 46, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 22px -10px rgba(52,73,94,0.5)' }}>
                Transformar em processo <MobileIcon name="chevronRight" size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ===== seções ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px 0' }}>

          {/* Consulta */}
          <MobileSection title="Consulta" summary="Descrição e área" open={open.consulta} onToggle={() => toggle('consulta')} dark={dark}>
            {consulta.descricao ? (
              <div style={{ fontSize: 14, color: t.primary, lineHeight: 1.45 }}>{consulta.descricao}</div>
            ) : (
              <div style={{ fontSize: 13.5, color: t.muted, fontStyle: 'italic' }}>Sem descrição.</div>
            )}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {consulta.tipo && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: t.tealSoft, color: t.teal }}>{tipoLabel}</span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: am.bg, color: am.fg }}>{areaLabel}</span>
            </div>
          </MobileSection>

          {/* Andamentos */}
          <MobileSection title="Andamentos" summary={`${movimentacoes.length} registro${movimentacoes.length === 1 ? '' : 's'}`} open={open.andamentos} onToggle={() => toggle('andamentos')} dark={dark}>
            {movimentacoes.length === 0 ? (
              <div style={{ fontSize: 13, color: t.muted, padding: '4px 2px' }}>Nenhum andamento registrado.</div>
            ) : (
              <div>
                {movimentacoes.map((a, i) => {
                  const cfg = CONSULTIVO_ANDAMENTO_TIPOS[a.tipo as ConsultivoAndamentoTipo]
                  const label = a.tipo_descricao || cfg?.label || a.tipo
                  const cor = cfg?.cor || t.teal
                  const last = i === movimentacoes.length - 1
                  const dataRef = parseDBDate(a.data)
                  return (
                    <div key={a.id} style={{ display: 'flex', gap: 11 }}>
                      <div style={{ width: 44, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)' }}>{formatBrazilDate(dataRef, 'dd/MM/yy')}</div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: t.muted, letterSpacing: '0.05em' }}>{dowDe(dataRef)}</div>
                      </div>
                      <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                        {!last && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4, minHeight: 26 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
                        <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, color: cor, background: t.tealSoft, padding: '2px 8px', borderRadius: 6, marginBottom: 5 }}>{label}</span>
                        <div style={{ fontSize: 12.5, color: t.secondary, lineHeight: 1.4 }}>{a.descricao}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </MobileSection>

          {/* Agenda vinculada */}
          <MobileSection title="Agenda vinculada" summary={agenda.length === 1 ? '1 agendamento' : `${agenda.length} agendamentos`} open={open.agenda} onToggle={() => toggle('agenda')} dark={dark}>
            {agenda.length === 0 ? (
              <div style={{ fontSize: 13, color: t.muted, padding: '4px 2px' }}>Nenhum agendamento vinculado.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {agenda.map((ev) => {
                  const dataRef = parseDBDate(ev.data_inicio)
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.cardAlt, border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.tealSoft, color: t.teal }}>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{formatBrazilDate(dataRef, 'dd')}</span>
                        <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.05em', marginTop: 1 }}>{dowDe(dataRef)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{ev.titulo}</div>
                        <div style={{ fontSize: 11, color: t.muted, marginTop: 1, fontFamily: 'var(--font-mono)' }}>{formatBrazilDate(dataRef)}</div>
                      </div>
                      {ev.responsavel_nome && (
                        <span title={ev.responsavel_nome} style={{ width: 22, height: 22, borderRadius: 7, background: dark ? '#1c2530' : '#eef1f4', color: t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{iniciais(ev.responsavel_nome)}</span>
                      )}
                    </div>
                  )
                })}
                <button type="button" onClick={() => nav.navigate(`/dashboard/agenda?consultivo_id=${id}`)} style={ghostBtnCD(t)}>Ver agenda completa <MobileIcon name="chevronRight" size={13} /></button>
              </div>
            )}
          </MobileSection>

          {/* Financeiro */}
          <MobileSection
            title="Financeiro"
            summary={fin.contratoInfo ? `${fin.contratoInfo.numero_contrato} · ${timesheetFmt} lançadas` : `${timesheetFmt} lançadas`}
            open={open.financeiro}
            onToggle={() => toggle('financeiro')}
            dark={dark}
          >
            {fin.contratoInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)', background: dark ? '#161c26' : '#f3f1ea', padding: '3px 8px', borderRadius: 6 }}>{fin.contratoInfo.numero_contrato}</span>
                {fin.contratoInfo.forma_cobranca && <span style={{ fontSize: 11, color: t.muted }}>· {fin.contratoInfo.forma_cobranca}</span>}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.cardAlt, border: `1px solid ${t.borderSubtle}`, borderRadius: 14, padding: '13px 15px', marginBottom: 10 }}>
              <div style={{ color: t.teal, flexShrink: 0 }}><MobileIcon name="clock" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>Timesheet</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: t.primary, fontFamily: 'var(--font-fraunces), Georgia, serif', lineHeight: 1.1, marginTop: 2 }}>{timesheetFmt}</div>
              </div>
              <span style={{ fontSize: 11, color: t.muted }}>{entradasTimesheet} {entradasTimesheet === 1 ? 'entrada' : 'entradas'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: t.cardAlt, border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.muted, marginBottom: 3 }}>Honorários</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, fontFamily: 'var(--font-mono)' }}>{honorariosFmt}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{fin.honorarios.length === 0 ? 'Nenhum lançamento' : `${fin.honorarios.length} ${fin.honorarios.length === 1 ? 'lançamento' : 'lançamentos'}`}</div>
              </div>
              <div style={{ background: t.cardAlt, border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.muted, marginBottom: 3 }}>Despesas</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, fontFamily: 'var(--font-mono)' }}>{despesasFmt}</div>
                <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{fin.despesas.length === 0 ? 'Nenhum item' : `${fin.despesas.length} ${fin.despesas.length === 1 ? 'item' : 'itens'}`}</div>
              </div>
            </div>
          </MobileSection>
        </div>
      </div>

    </div>
  )
}

// ---------- subcomponentes ----------
function HdrCellC({ label, value, mono, accent, dark }: { label: string; value: string; mono?: boolean; accent?: boolean; dark: boolean }) {
  const t = mTokens(dark)
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 13px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: mono ? 13 : 13.5, fontWeight: 600, color: accent ? (dark ? '#d6a87a' : '#9e4848') : t.primary, fontFamily: mono ? 'var(--font-mono)' : 'inherit', letterSpacing: mono ? '0.01em' : '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function ghostBtnCD(t: MobileTokens) {
  return {
    width: '100%', height: 40, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${t.border}`, background: 'transparent', color: t.primary,
    fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  } as const
}

