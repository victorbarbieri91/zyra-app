'use client'

// MobileTaskDetailSheet — detalhe de tarefa/audiência/compromisso em bottom sheet
// (variante tall). Compartilhado entre a Home e a Agenda. Mostra descrição,
// vínculo (processo → abre a pasta; CNJ → link do tribunal via useCnjLink, igual
// ao desktop), responsáveis, execução/prazo/status, e ações Concluir/Reagendar/Lançar.

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseDBDate } from '@/lib/timezone'
import { useCnjLink } from '@/hooks/useCnjLink'
import { mTokens, agendaMeta, prioMeta } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileSheet from './MobileSheet'
import { useMobileNav } from '../MobileApp'

export interface MobileTaskItem {
  id: string
  tipo: 'tarefa' | 'audiencia' | 'compromisso'
  title: string
  descricao?: string | null
  status?: string | null
  prioridade?: string | null
  processoId?: string | null
  numeroCnj?: string | null
  casoTitulo?: string | null
  consultivoId?: string | null
  consultivoTitulo?: string | null
  dataInicio?: string | null
  prazoDataLimite?: string | null
  responsaveis?: string | null
  createdAt?: string | null
}

function iniciais(nome: string): string {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function fmtDataBR(s?: string | null): string {
  if (!s) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDBDate(s))
}

export default function MobileTaskDetailSheet({
  dark, item, escritorioId, onClose, onConcluir, onReagendar, onLancar,
}: {
  dark: boolean
  item: MobileTaskItem
  escritorioId: string | null
  onClose: () => void
  onConcluir: () => void
  onReagendar: () => void
  onLancar: () => void
}) {
  const t = mTokens(dark)
  const nav = useMobileNav()
  const m = agendaMeta(item.tipo, dark)
  const done = ['concluida', 'realizado', 'realizada'].includes(item.status || '')
  const pm = prioMeta(item.prioridade || 'baixa', dark)
  const isProcesso = !!item.processoId
  const isConsultivo = !!item.consultivoId
  const resps = (item.responsaveis || '').split(',').map((s) => s.trim()).filter(Boolean)

  // pasta + status do processo (não vêm na agenda)
  const [pasta, setPasta] = useState<{ pasta?: string; status?: string } | null>(null)
  useEffect(() => {
    if (!item.processoId) { setPasta(null); return }
    let cancel = false
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.from('processos_processos').select('numero_pasta, status').eq('id', item.processoId).single()
      if (!cancel) {
        const row = data as { numero_pasta?: string | null; status?: string | null } | null
        setPasta(row ? { pasta: row.numero_pasta || undefined, status: row.status || undefined } : null)
      }
    })()
    return () => { cancel = true }
  }, [item.processoId])

  // link do CNJ para o tribunal (mesmo hook do desktop)
  const { link } = useCnjLink({ numeroCnj: item.numeroCnj, processoId: item.processoId, escritorioId })

  const abrirVinculo = () => {
    if (isProcesso && item.processoId) nav.navigate('/dashboard/processos/' + item.processoId)
    else if (isConsultivo && item.consultivoId) nav.navigate('/dashboard/consultivo/' + item.consultivoId)
  }

  return (
    <MobileSheet
      dark={dark}
      onClose={onClose}
      tall
      showClose
      footer={(close) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', background: t.card, borderTop: `1px solid ${t.border}` }}>
          <SheetAction icon={done ? 'clock' : 'check'} label={done ? 'Reabrir' : 'Concluir'} primary={!done} dark={dark} onClick={() => { onConcluir(); close() }} />
          <SheetAction icon="calendar" label="Reagendar" dark={dark} onClick={() => { onReagendar(); close() }} />
          <SheetAction icon="clock" label="Lançar" dark={dark} onClick={() => { onLancar(); close() }} />
        </div>
      )}
    >
      {/* tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: dark ? 'rgba(139,161,192,0.16)' : '#eef1f5', color: m.c }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: m.c }} />{m.label}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: pm.bg, color: pm.fg }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: pm.dot }} />Prioridade {pm.label}
        </span>
      </div>

      <div style={{ fontSize: 21, fontWeight: 600, color: t.primary, letterSpacing: '-0.015em', lineHeight: 1.22, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{item.title}</div>

      <div style={{ marginTop: 18 }}>
        <SheetLabel dark={dark} icon="fileText">Descrição</SheetLabel>
        <div style={{ fontSize: 14, color: item.descricao ? t.primary : t.muted, lineHeight: 1.45, fontStyle: item.descricao ? 'normal' : 'italic' }}>{item.descricao || item.title}</div>
      </div>

      {/* vínculo: processo (abre pasta) + CNJ (link do tribunal) ou consulta */}
      {(isProcesso || isConsultivo) && (
        <div style={{ marginTop: 18 }}>
          <SheetLabel dark={dark} icon={isProcesso ? 'scale' : 'consultivo'}>{isProcesso ? 'Processo vinculado' : 'Consulta vinculada'}</SheetLabel>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <button type="button" onClick={abrirVinculo} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: 'none', padding: '13px 14px', textAlign: 'left' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: t.tealSoft, color: t.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MobileIcon name={isProcesso ? 'scale' : 'consultivo'} size={15} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isProcesso ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em' }}>{pasta?.pasta || 'Abrir pasta'}</span>
                      {pasta?.status && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: dark ? '#8db8a0' : '#3f6a54' }}><span style={{ width: 5, height: 5, borderRadius: 3, background: dark ? '#8db8a0' : '#6b9e84' }} />{pasta.status}</span>}
                    </div>
                    {item.casoTitulo && <div style={{ fontSize: 12, color: t.secondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.casoTitulo}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.primary }}>{item.consultivoTitulo || 'Consulta'}</div>
                )}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: t.teal, flexShrink: 0 }}>Ver <MobileIcon name="chevronRight" size={13} /></span>
            </button>

            {isProcesso && item.numeroCnj && (
              <a
                href={link?.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if (!link) e.preventDefault() }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderTop: `1px solid ${t.borderSubtle}`, textDecoration: 'none', color: link ? t.teal : t.muted, fontFamily: 'var(--font-mono)', fontSize: 11.5, cursor: link ? 'pointer' : 'default' }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.numeroCnj}</span>
                {link ? <><span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600 }}>tribunal</span><MobileIcon name="external" size={12} /></> : null}
              </a>
            )}
          </div>
        </div>
      )}

      {resps.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SheetLabel dark={dark} icon="user" noMargin>Responsáveis</SheetLabel>
            {item.createdAt && <span style={{ fontSize: 10.5, color: t.muted }}>criada {fmtDataBR(item.createdAt)}</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {resps.map((r, k) => (
              <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '5px 12px 5px 5px' }}>
                <span style={{ width: 24, height: 24, borderRadius: 12, background: 'linear-gradient(135deg,#34495e,#46627f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700 }}>{iniciais(r)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.primary }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', gap: 14, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 15px' }}>
        <DetailField dark={dark} icon="calendar" label="Execução"><span style={{ fontSize: 13, fontWeight: 700, color: t.primary, fontFamily: 'var(--font-mono)' }}>{fmtDataBR(item.dataInicio)}</span></DetailField>
        <div style={{ width: 1, background: t.borderSubtle }} />
        <DetailField dark={dark} icon="alert" label="Prazo fatal"><span style={{ fontSize: 13, fontWeight: 700, color: item.prazoDataLimite ? (dark ? '#d6a87a' : '#8a6438') : t.muted, fontFamily: 'var(--font-mono)' }}>{item.prazoDataLimite ? fmtDataBR(item.prazoDataLimite) : '—'}</span></DetailField>
        <div style={{ width: 1, background: t.borderSubtle }} />
        <DetailField dark={dark} icon="clock" label="Status"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: done ? (dark ? '#8db8a0' : '#3f6a54') : (dark ? '#d6a87a' : '#8a6438') }}><span style={{ width: 6, height: 6, borderRadius: 3, background: done ? (dark ? '#8db8a0' : '#6b9e84') : '#c2956b' }} />{done ? 'Concluída' : 'Pendente'}</span></DetailField>
      </div>
    </MobileSheet>
  )
}

function SheetLabel({ dark, icon, children, noMargin }: { dark: boolean; icon: string; children: ReactNode; noMargin?: boolean }) {
  const t = mTokens(dark)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: noMargin ? 0 : 8 }}>
      <span style={{ color: t.muted, display: 'flex' }}><MobileIcon name={icon} size={13} /></span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted }}>{children}</span>
    </div>
  )
}

function DetailField({ dark, icon, label, children }: { dark: boolean; icon: string; label: string; children: ReactNode }) {
  const t = mTokens(dark)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ color: t.muted, display: 'flex' }}><MobileIcon name={icon} size={12} /></span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function SheetAction({ icon, label, primary, dark, onClick }: { icon: string; label: string; primary?: boolean; dark: boolean; onClick?: () => void }) {
  const t = mTokens(dark)
  return (
    <button type="button" onClick={onClick} style={{ height: 60, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, border: primary ? 'none' : `1px solid ${t.border}`, background: primary ? 'linear-gradient(135deg,#4f7d63,#5f9075)' : t.page, color: primary ? '#fff' : t.primary, boxShadow: primary ? '0 8px 18px -10px rgba(79,125,99,0.8)' : 'none' }}>
      <MobileIcon name={icon} size={17} />
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  )
}
