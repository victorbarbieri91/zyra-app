'use client'

// MobileProcessoDetalhe — ficha do processo (mobile). Portado fielmente de
// components/MobileProcessoDetalhe.jsx do Claude Design, ligado a dados reais:
// processo (processos_processos + joins), partes (useProcessoPartes), andamentos
// (processos_movimentacoes), agenda vinculada (RPC get_agenda_processo) e resumo
// financeiro (useProcessoFinanceiro). Cores via mTokens; ícones via MobileIcon.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, formatBrazilTime, parseDBDate } from '@/lib/timezone'
import { formatCurrency } from '@/lib/utils'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useProcessoPartes, getTipoLabel, type ProcessoParte } from '@/hooks/useProcessoPartes'
import { useProcessoFinanceiro } from '@/hooks/useProcessoFinanceiro'
import {
  ANDAMENTO_TIPOS,
  classificarTribunal,
  TRIBUNAL_CATEGORIAS,
  type AndamentoTipo,
} from '@/lib/constants/andamento-tipos'
import { PROCESSO_STATUS_LABELS, PROCESSO_STATUS_ENCERRADO } from '@/lib/constants/processo-enums'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileScreenHeader from '../shell/MobileScreenHeader'
import MobileSection from '../shell/MobileSection'
import { useMobileNav } from '../MobileApp'

// ---------- tipos do processo carregado ----------
interface ProcDetalhe {
  id: string
  numero_pasta: string | null
  numero_cnj: string | null
  area: string
  fase: string
  instancia: string
  rito: string | null
  tribunal: string | null
  comarca: string | null
  vara: string | null
  data_distribuicao: string | null
  objeto_acao: string | null
  cliente_nome: string
  parte_contraria: string | null
  polo_cliente: string | null
  responsavel_nome: string
  status: string
  valor_causa: number | null
  valor_atualizado: number | null
  data_ultima_atualizacao_monetaria: string | null
  contrato_id: string | null
}

interface Movimentacao {
  id: string
  data_movimento: string
  tipo_codigo: AndamentoTipo | null
  tipo_descricao: string | null
  descricao: string
  conteudo_completo: string | null
  origem: string | null
  codigo_cnj_movimento: number | null
  lida: boolean | null
  created_by: string | null
  autor_nome?: string | null
}

interface AgendaProcItem {
  id: string
  tipo_entidade: string
  titulo: string
  data_inicio: string
  status: string | null
  prazo_data_limite: string | null
  responsaveis_nomes: string[] | null
  responsavel_nome: string | null
}

// ---------- helpers de formatação ----------
const AREA_LABELS: Record<string, string> = {
  civel: 'Cível', trabalhista: 'Trabalhista', tributaria: 'Tributária',
  familia: 'Família', criminal: 'Criminal', previdenciaria: 'Previdenciária',
  consumidor: 'Consumidor', empresarial: 'Empresarial', ambiental: 'Ambiental', outra: 'Outra',
}
const FASE_LABELS: Record<string, string> = {
  conhecimento: 'Conhecimento', recurso: 'Recurso', execucao: 'Execução',
  cumprimento_sentenca: 'Cumprimento de sentença',
}
const INSTANCIA_LABELS: Record<string, string> = {
  '1a': '1ª', '2a': '2ª', '3a': '3ª', stj: 'STJ', stf: 'STF', tst: 'TST', administrativa: 'Administrativa',
}
function rotulo(map: Record<string, string>, v: string | null | undefined): string {
  if (!v) return '—'
  return map[v] || v
}

function iniciais(nome: string): string {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '—'
  if (p.length === 1) return p[0].charAt(0).toUpperCase()
  return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase()
}

function diaSemana(d: Date): string {
  return (['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()] ?? '')
}

// status do processo sobre o header escuro
function heroStatusMeta(status: string): { dot: string; fg: string; label: string } {
  const map: Record<string, { dot: string; fg: string }> = {
    ativo: { dot: '#8fce9f', fg: '#a7d4b8' },
    suspenso: { dot: '#e6c79a', fg: '#e6c79a' },
    acordo: { dot: '#8fce9f', fg: '#bfe6cf' },
    arquivado: { dot: '#c2cad3', fg: '#cbd5e1' },
    baixado: { dot: '#c2cad3', fg: '#cbd5e1' },
    transito_julgado: { dot: '#b9a9d6', fg: '#cfc0e6' },
  }
  const s = map[status] || map.ativo
  return { ...s, label: PROCESSO_STATUS_LABELS[status] || status }
}

export default function MobileProcessoDetalhe({ dark, id }: { dark: boolean; id: string }) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [proc, setProc] = useState<ProcDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [agenda, setAgenda] = useState<AgendaProcItem[]>([])

  const { partes, loading: loadingPartes } = useProcessoPartes(id)
  const { resumo, contratoInfo, loading: loadingFin } = useProcessoFinanceiro(id)

  const [andTab, setAndTab] = useState<'escritorio' | 'tribunal'>('escritorio')
  const [open, setOpen] = useState({
    ficha: true, andamentos: true, agenda: false, financeiro: false, partes: false,
  })
  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }))

  // ---------- carregar processo ----------
  useEffect(() => {
    if (!id || !escritorioAtivo) return
    let cancel = false
    const supabase = createClient()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          id, numero_pasta, numero_cnj, area, fase, instancia, rito, tribunal,
          comarca, vara, data_distribuicao, objeto_acao, parte_contraria, polo_cliente,
          status, valor_causa, valor_atualizado, data_ultima_atualizacao_monetaria, contrato_id,
          cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
          responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo)
        `)
        .eq('id', id)
        .eq('escritorio_id', escritorioAtivo)
        .single()

      if (cancel) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const row = data as unknown as {
        id: string; numero_pasta: string | null; numero_cnj: string | null
        area: string; fase: string; instancia: string; rito: string | null
        tribunal: string | null; comarca: string | null; vara: string | null
        data_distribuicao: string | null; objeto_acao: string | null
        parte_contraria: string | null; polo_cliente: string | null; status: string
        valor_causa: number | null; valor_atualizado: number | null
        data_ultima_atualizacao_monetaria: string | null; contrato_id: string | null
        cliente: { nome_completo: string | null } | null
        responsavel: { nome_completo: string | null } | null
      }
      setProc({
        id: row.id,
        numero_pasta: row.numero_pasta,
        numero_cnj: row.numero_cnj,
        area: row.area,
        fase: row.fase,
        instancia: row.instancia,
        rito: row.rito,
        tribunal: row.tribunal,
        comarca: row.comarca,
        vara: row.vara,
        data_distribuicao: row.data_distribuicao,
        objeto_acao: row.objeto_acao,
        cliente_nome: row.cliente?.nome_completo || '—',
        parte_contraria: row.parte_contraria,
        polo_cliente: row.polo_cliente,
        responsavel_nome: row.responsavel?.nome_completo || '—',
        status: row.status,
        valor_causa: row.valor_causa,
        valor_atualizado: row.valor_atualizado,
        data_ultima_atualizacao_monetaria: row.data_ultima_atualizacao_monetaria,
        contrato_id: row.contrato_id,
      })
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [id, escritorioAtivo])

  // ---------- carregar andamentos ----------
  useEffect(() => {
    if (!id) return
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from('processos_movimentacoes')
        .select('id, data_movimento, tipo_codigo, tipo_descricao, descricao, conteudo_completo, origem, codigo_cnj_movimento, lida, created_by')
        .eq('processo_id', id)
        .order('data_movimento', { ascending: false })

      if (cancel || !data) return
      const movs = data as Movimentacao[]
      const ids = [...new Set(movs.map((m) => m.created_by).filter((v): v is string => !!v))]
      const nomes = new Map<string, string>()
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, nome_completo').in('id', ids)
        ;(profs as { id: string; nome_completo: string }[] | null)?.forEach((p) => nomes.set(p.id, p.nome_completo))
      }
      if (cancel) return
      setMovimentacoes(movs.map((m) => ({ ...m, autor_nome: m.created_by ? (nomes.get(m.created_by) ?? null) : null })))
    })()
    return () => { cancel = true }
  }, [id])

  // ---------- carregar agenda vinculada ----------
  useEffect(() => {
    if (!id) return
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.rpc('get_agenda_processo', { p_processo_id: id })
      if (cancel || !data) return
      setAgenda(data as AgendaProcItem[])
    })()
    return () => { cancel = true }
  }, [id])

  // ---------- divisão dos andamentos (escritório x tribunal) ----------
  const movEscritorio = useMemo(
    () => movimentacoes.filter((m) => m.origem === 'sistema' || m.origem === 'manual'),
    [movimentacoes],
  )
  const movTribunal = useMemo(
    () => movimentacoes.filter((m) => m.origem !== 'sistema' && m.origem !== 'manual'),
    [movimentacoes],
  )
  const movAtivas = andTab === 'escritorio' ? movEscritorio : movTribunal

  // ---------- loading / erro ----------
  if (loading) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.page, fontFamily: 'var(--font-sans)' }}>
        <div style={{ fontSize: 13, color: t.muted }}>Carregando processo…</div>
      </div>
    )
  }
  if (notFound || !proc) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: t.page, fontFamily: 'var(--font-sans)' }}>
        <MobileScreenHeader title="Processo" onBack={() => nav.navigate('/dashboard/processos')} backLabel="Processos" dark={dark} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.primary }}>Processo não encontrado</div>
          <button type="button" onClick={() => nav.navigate('/dashboard/processos')} style={ghostBtnPD(t)}>Voltar para processos</button>
        </div>
      </div>
    )
  }

  const hs = heroStatusMeta(proc.status)
  const isEncerrado = (PROCESSO_STATUS_ENCERRADO as readonly string[]).includes(proc.status)
  const poloAtivo = proc.polo_cliente === 'ativo'
  const poloClienteLabel = poloAtivo ? 'POLO ATIVO · AUTOR' : proc.polo_cliente === 'passivo' ? 'POLO PASSIVO · RÉU' : 'PARTE'
  const poloContrariaLabel = poloAtivo ? 'POLO PASSIVO · RÉU' : proc.polo_cliente === 'passivo' ? 'POLO ATIVO · AUTOR' : 'PARTE CONTRÁRIA'
  const valorAtualizadoVisivel = proc.valor_atualizado != null && proc.valor_atualizado !== proc.valor_causa

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.page, fontFamily: 'var(--font-sans)' }}>

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}>

        {/* ===== header slate ===== */}
        <div style={{ background: 'linear-gradient(160deg,#2c3e50,#34495e 58%,#3f566f)', padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 20px 22px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button type="button" aria-label="Voltar para processos" onClick={() => nav.navigate('/dashboard/processos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 11, padding: '8px 14px 8px 10px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ display: 'flex' }}><MobileIcon name="chevronLeft" size={16} /></span> Processos
            </button>
          </div>

          {/* área + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{rotulo(AREA_LABELS, proc.area)}</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: hs.fg }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: hs.dot }} /> {hs.label}
            </span>
          </div>

          {/* título — cliente protagonista + parte contrária */}
          <div style={{ fontSize: 27, fontWeight: 500, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{proc.cliente_nome}</div>
          {proc.parte_contraria && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 7 }}>
              <span style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-fraunces), Georgia, serif', flexShrink: 0 }}>v.</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{proc.parte_contraria}</span>
            </div>
          )}

          {/* bloco de dados agrupado */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex' }}>
              <HdrCell label="Pasta" value={proc.numero_pasta || '—'} mono />
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <HdrCell label="Valor da causa" value={proc.valor_causa != null ? formatCurrency(proc.valor_causa) : '—'} />
            </div>
            {proc.numero_cnj && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>CNJ</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.92)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proc.numero_cnj}</span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.45)', flexShrink: 0, display: 'flex' }}><MobileIcon name="fileText" size={13} /></span>
                </div>
              </>
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(255,255,255,0.16)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{iniciais(proc.responsavel_nome)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Responsável</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 1, letterSpacing: '-0.01em' }}>{proc.responsavel_nome}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== seções ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px 0' }}>

          <MobileSection title="Ficha do processo" summary="Dados, valores e objeto da ação" open={open.ficha} onToggle={() => toggle('ficha')} dark={dark}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FichaField dark={dark} label="Cliente" value={proc.cliente_nome} tag={poloClienteLabel} tagTone="ativo" />
                <FichaField dark={dark} label="Parte contrária" value={proc.parte_contraria || '—'} tag={poloContrariaLabel} tagTone="passivo" />
              </div>
              <div style={{ height: 1, background: t.borderSubtle }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <FichaField dark={dark} label="Fase" value={rotulo(FASE_LABELS, proc.fase)} />
                <FichaField dark={dark} label="Instância" value={rotulo(INSTANCIA_LABELS, proc.instancia)} />
                <FichaField dark={dark} label="Rito" value={proc.rito || '—'} />
                <FichaField dark={dark} label="Tribunal" value={proc.tribunal || '—'} />
                <FichaField dark={dark} label="Vara" value={proc.vara || '—'} />
                <FichaField dark={dark} label="Comarca" value={proc.comarca || '—'} />
              </div>
              <div style={{ height: 1, background: t.borderSubtle }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FichaField dark={dark} label="Distribuição" value={proc.data_distribuicao ? formatBrazilDate(parseDBDate(proc.data_distribuicao)) : '—'} />
                {valorAtualizadoVisivel && (
                  <div>
                    <FieldLabel dark={dark}>Valor atualizado</FieldLabel>
                    <div style={{ fontSize: 16, fontWeight: 600, color: dark ? '#8db8a0' : '#3f6a54', fontFamily: 'var(--font-fraunces), Georgia, serif', marginTop: 5 }}>{formatCurrency(proc.valor_atualizado as number)}</div>
                    {proc.data_ultima_atualizacao_monetaria && (
                      <div style={{ fontSize: 10.5, color: t.muted, marginTop: 1 }}>em {formatBrazilDate(parseDBDate(proc.data_ultima_atualizacao_monetaria))}</div>
                    )}
                  </div>
                )}
              </div>
              {proc.objeto_acao && (
                <div>
                  <FieldLabel dark={dark}>Objeto da ação</FieldLabel>
                  <div style={{ fontSize: 14, color: t.primary, marginTop: 5, lineHeight: 1.4 }}>{proc.objeto_acao}</div>
                </div>
              )}
            </div>
          </MobileSection>

          <MobileSection title="Andamentos" summary={`${movEscritorio.length + movTribunal.length} registros`} open={open.andamentos} onToggle={() => toggle('andamentos')} dark={dark}>
            <div style={{ display: 'flex', gap: 5, background: dark ? '#11161f' : '#efece4', padding: 4, borderRadius: 11, marginBottom: 14 }}>
              {([['escritorio', 'Escritório'], ['tribunal', 'Tribunal']] as const).map(([v, l]) => {
                const on = andTab === v
                return (
                  <button key={v} onClick={() => setAndTab(v)} style={{ flex: 1, height: 32, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, border: 'none', background: on ? t.card : 'transparent', color: on ? t.primary : t.secondary, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>{l}</button>
                )
              })}
            </div>
            {movAtivas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: t.muted }}>
                <div style={{ fontSize: 12.5 }}>{andTab === 'escritorio' ? 'Nenhum andamento do escritório.' : 'Nenhum andamento do tribunal sincronizado.'}</div>
              </div>
            ) : (
              <div>
                {movAtivas.map((mov, i) => {
                  const isEscritorio = andTab === 'escritorio'
                  const cfgEsc = mov.tipo_codigo ? ANDAMENTO_TIPOS[mov.tipo_codigo] : null
                  const tribCat = !isEscritorio ? TRIBUNAL_CATEGORIAS[classificarTribunal(mov.codigo_cnj_movimento, mov.tipo_descricao)] : null
                  const cor = isEscritorio ? (cfgEsc?.cor ?? '#89bcbe') : (tribCat?.cor ?? '#6a85a8')
                  const label = isEscritorio ? (cfgEsc?.label ?? (mov.tipo_descricao || 'Andamento')) : (tribCat?.label ?? 'Tribunal')
                  const d = parseDBDate(mov.data_movimento)
                  const last = i === movAtivas.length - 1
                  const texto = isEscritorio
                    ? mov.descricao
                    : ([mov.conteudo_completo, mov.descricao].map((x) => (x || '').trim()).find((x) => x && x !== (mov.tipo_descricao || '').trim()) || mov.descricao)
                  return (
                    <div key={mov.id} style={{ display: 'flex', gap: 11 }}>
                      <div style={{ width: 44, flexShrink: 0, textAlign: 'right', paddingTop: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)' }}>{formatBrazilDate(d, 'dd/MM/yy')}</div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: t.muted, letterSpacing: '0.05em' }}>{diaSemana(d)}</div>
                      </div>
                      <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                        {!last && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4, minHeight: 26 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
                        <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, color: cor, background: `${cor}22`, padding: '2px 8px', borderRadius: 6, marginBottom: 5 }}>{label}</span>
                        {isEscritorio && mov.autor_nome && (
                          <span style={{ marginLeft: 6, fontSize: 10.5, color: t.muted }}>{mov.autor_nome.split(' ')[0]}</span>
                        )}
                        {!isEscritorio && mov.tipo_descricao && (
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: t.primary, marginBottom: 3 }}>{mov.tipo_descricao}</div>
                        )}
                        <div style={{ fontSize: 12.5, color: t.secondary, lineHeight: 1.4 }}>{texto}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </MobileSection>

          <MobileSection title="Agenda vinculada" summary={agenda.length > 0 ? `${agenda.length} ${agenda.length === 1 ? 'agendamento' : 'agendamentos'}` : 'Nenhum agendamento'} open={open.agenda} onToggle={() => toggle('agenda')} dark={dark}>
            {agenda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 16px 4px', color: t.muted }}>
                <div style={{ fontSize: 12.5, marginBottom: 12 }}>Nenhum agendamento vinculado a este processo.</div>
                <button type="button" onClick={() => nav.openNovaTarefa({ processoId: id })} style={ghostBtnPD(t)}><MobileIcon name="plus" size={13} /> Nova tarefa</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {agenda.map((ag) => {
                  const dataRef = parseDBDate(ag.data_inicio)
                  const isTarefa = ag.tipo_entidade === 'tarefa'
                  const prazo = isTarefa ? ag.prazo_data_limite : null
                  const urgente = !!prazo && (parseDBDate(prazo).getTime() - new Date().setHours(0, 0, 0, 0)) <= 3 * 86400000
                  const barColor = urgente ? '#a85a3e' : ag.tipo_entidade === 'audiencia' ? '#3f7376' : ag.tipo_entidade === 'evento' ? '#6a85a8' : '#89bcbe'
                  const resps = (ag.responsaveis_nomes?.length ? ag.responsaveis_nomes : ag.responsavel_nome ? [ag.responsavel_nome] : [])
                  return (
                    <div key={ag.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: dark ? '#10151d' : '#faf8f2', border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ width: 38, textAlign: 'center', flexShrink: 0, paddingTop: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: urgente ? '#a85a3e' : t.primary, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{formatBrazilDate(dataRef, 'dd')}</div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', marginTop: 2, color: urgente ? '#c98080' : t.muted }}>{diaSemana(dataRef)}</div>
                      </div>
                      <div style={{ width: 3, alignSelf: 'stretch', minHeight: 30, borderRadius: 2, background: barColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: t.primary, lineHeight: 1.3, letterSpacing: '-0.005em' }}>{ag.titulo}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                          <span style={{ fontSize: 10.5, color: t.muted, fontFamily: 'var(--font-mono)' }}>
                            {isTarefa ? formatBrazilDate(dataRef) : `${formatBrazilDate(dataRef)} · ${formatBrazilTime(dataRef)}`}
                          </span>
                          {urgente && prazo && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#a85a3e' }}>
                              <MobileIcon name="clock" size={11} /> Fatal {formatBrazilDate(parseDBDate(prazo))}
                            </span>
                          )}
                          {resps.length > 0 && (
                            <div style={{ display: 'flex', marginLeft: 'auto' }}>
                              {resps.slice(0, 3).map((nome, j) => (
                                <span key={j} title={nome} style={{ width: 16, height: 16, borderRadius: 8, marginLeft: j === 0 ? 0 : -4, background: 'linear-gradient(135deg,#89bcbe,#6ba9ab)', border: `1.5px solid ${dark ? '#10151d' : '#faf8f2'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 700, color: '#fff' }}>{iniciais(nome)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button type="button" onClick={() => nav.navigate(`/dashboard/agenda?processo_id=${id}`)} style={ghostBtnPD(t)}>Ver todos os agendamentos <MobileIcon name="chevronRight" size={13} /></button>
              </div>
            )}
          </MobileSection>

          <MobileSection title="Financeiro" summary={contratoInfo ? `Contrato ${contratoInfo.numero_contrato}` : 'Sem contrato vinculado'} open={open.financeiro} onToggle={() => toggle('financeiro')} dark={dark}>
            {loadingFin ? (
              <div style={{ textAlign: 'center', padding: '16px', color: t.muted, fontSize: 12.5 }}>Carregando…</div>
            ) : !contratoInfo ? (
              <div style={{ textAlign: 'center', padding: '8px 16px 4px', color: t.muted }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: dark ? '#1a212c' : '#f1efe8', color: t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><MobileIcon name="dollar" size={19} /></div>
                <div style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.4 }}>Vincule um contrato no desktop para gerenciar o financeiro deste processo.</div>
                <button type="button" onClick={() => nav.openRegistrarHoras({ processoId: id })} style={ghostBtnPD(t)}><MobileIcon name="clock" size={13} /> Lançar horas</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FinStat dark={dark} label="Honorários" value={formatCurrency(resumo.totalHonorarios)} />
                  <FinStat dark={dark} label="Recebido" value={formatCurrency(resumo.totalHonorariosPagos)} accent />
                  <FinStat dark={dark} label="Horas trabalhadas" value={fmtHoras(resumo.horasTrabalhadas)} />
                  <FinStat dark={dark} label="Despesas" value={formatCurrency(resumo.totalDespesas)} />
                </div>
                <button type="button" onClick={() => nav.openRegistrarHoras({ processoId: id })} style={ghostBtnPD(t)}><MobileIcon name="clock" size={13} /> Lançar horas</button>
              </div>
            )}
          </MobileSection>

          <MobileSection title="Partes" summary={loadingPartes ? 'Carregando…' : `${partes.length} ${partes.length === 1 ? 'envolvido' : 'envolvidos'}`} open={open.partes} onToggle={() => toggle('partes')} dark={dark}>
            {partes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 16px 4px', color: t.muted, fontSize: 12.5 }}>Nenhuma parte cadastrada.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {partes.map((p: ProcessoParte) => {
                  const ehAtivo = p.tipo === 'autor'
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? '#10151d' : '#faf8f2', border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ehAtivo ? (dark ? 'rgba(90,130,200,0.18)' : '#e7eefb') : (dark ? 'rgba(160,140,100,0.18)' : '#f3ecdd'), color: ehAtivo ? (dark ? '#8fb0e6' : '#3a5ba8') : (dark ? '#c5ab7e' : '#8a6d3a') }}>
                        <MobileIcon name="user" size={17} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{getTipoLabel(p.tipo)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </MobileSection>

          {!isEncerrado && (
            <div style={{ marginTop: 4, height: 46, borderRadius: 13, border: `1px solid ${t.border}`, background: 'transparent', color: t.muted, fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textAlign: 'center', padding: '0 16px' }}>
              Encerre o processo pelo desktop
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ---------- subcomponentes ----------
function HdrCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: mono ? 14 : 16, fontWeight: 600, color: '#fff', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-fraunces), Georgia, serif', letterSpacing: mono ? '0.02em' : '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function FieldLabel({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  const t = mTokens(dark)
  return <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>{children}</div>
}

function FichaField({ dark, label, value, tag, tagTone }: { dark: boolean; label: string; value: string; tag?: string; tagTone?: 'ativo' | 'passivo' }) {
  const t = mTokens(dark)
  const tone = tagTone === 'ativo'
    ? { bg: dark ? 'rgba(90,130,200,0.16)' : '#e7eefb', fg: dark ? '#8fb0e6' : '#3a5ba8' }
    : { bg: dark ? 'rgba(160,140,100,0.16)' : '#f3ecdd', fg: dark ? '#c5ab7e' : '#8a6d3a' }
  return (
    <div style={{ minWidth: 0 }}>
      <FieldLabel dark={dark}>{label}</FieldLabel>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: value === '—' ? t.muted : t.primary, marginTop: 5, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{value}</div>
      {tag && <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: tone.fg, background: tone.bg, padding: '3px 7px', borderRadius: 6, marginTop: 6 }}>{tag}</span>}
    </div>
  )
}

function FinStat({ dark, label, value, accent }: { dark: boolean; label: string; value: string; accent?: boolean }) {
  const t = mTokens(dark)
  return (
    <div style={{ background: dark ? '#10151d' : '#faf8f2', border: `1px solid ${t.borderSubtle}`, borderRadius: 12, padding: '11px 13px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em', color: accent ? (dark ? '#8db8a0' : '#3f6a54') : t.primary, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function fmtHoras(decimal: number): string {
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

function ghostBtnPD(t: ReturnType<typeof mTokens>) {
  return {
    width: '100%', height: 40, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${t.border}`, background: 'transparent', color: t.primary,
    fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  } as const
}

