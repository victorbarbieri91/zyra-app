'use client'

// MobileNovaTarefa — formulário full-screen (phone-only) de criação de tarefa.
// Porta o caminho de criação real do desktop (TarefaWizard + useTarefas.createTarefa)
// para a linguagem visual mobile (mTokens, MobileIcon, MobileScreenHeader).
// Recorrência fica fora do escopo desta tela: toda tarefa criada aqui é única.

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'
import { useTarefas, type TarefaFormData } from '@/hooks/useTarefas'
import {
  CONTENCIOSO_TIPOS,
  CONSULTIVO_TIPOS,
  type CategoriaTarefa,
  type TipoTarefa,
  type TipoTarefaConfig,
} from '@/lib/constants/tarefa-tipos'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileScreenHeader from '../shell/MobileScreenHeader'
import MobileFullScreen from '../shell/MobileFullScreen'

// ============================================================
// Tipos locais
// ============================================================

type Prioridade = 'alta' | 'media' | 'baixa'

interface MobileNovaTarefaProps {
  dark: boolean
  prefill?: { processoId?: string | null; consultivoId?: string | null }
  onClose: () => void
  onSuccess?: () => void
}

// Mapa: cada um dos ~10 tipos reais → ícone do MobileIcon (adaptador lucide).
// Os tipos reais vivem em '@/lib/constants/tarefa-tipos'; aqui só escolhemos
// o nome do ícone equivalente no MobileIcon para manter a paleta de ícones.
const TIPO_ICON: Record<string, string> = {
  // Contencioso
  prazo_processual: 'scale',
  acompanhamento: 'eye',
  follow_up: 'clock',
  administrativo: 'fileText',
  outro: 'briefcase',
  // Consultivo
  cons_parecer: 'scale',
  cons_contrato: 'fileText',
  cons_pesquisa: 'search',
  cons_providencia: 'check',
  cons_outro: 'briefcase',
}

// ============================================================
// Componente principal
// ============================================================

export default function MobileNovaTarefa({ dark, prefill, onClose, onSuccess }: MobileNovaTarefaProps) {
  const t = mTokens(dark)
  const { user } = useAuth()
  const { escritorioAtivo } = useEscritorioAtivo()
  const { membros } = useEscritorioMembros(escritorioAtivo || undefined)
  const { createTarefa } = useTarefas(escritorioAtivo || undefined)

  // Natureza inicial: consultivo se veio prefill de consulta, senão contencioso.
  const [categoria, setCategoria] = useState<CategoriaTarefa>(
    prefill?.consultivoId ? 'consultivo' : 'contencioso',
  )

  const tiposAtuais = categoria === 'contencioso' ? CONTENCIOSO_TIPOS : CONSULTIVO_TIPOS

  const [tipo, setTipo] = useState<TipoTarefa>(
    prefill?.consultivoId ? 'cons_parecer' : 'outro',
  )
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataExecucao, setDataExecucao] = useState('')
  const [prazoFatal, setPrazoFatal] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('media')
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(user?.id ? [user.id] : [])
  const [adicionando, setAdicionando] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // dirty = começou a preencher → confirma descarte ao fechar
  const dirty = titulo.trim().length > 0 || descricao.trim().length > 0
  const closeApiRef = useRef<{ close: () => void; forceClose: () => void } | null>(null)

  // Vínculo (read-only quando vem por prefill; sem prefill, criação fica sem vínculo).
  const processoId = prefill?.processoId || null
  const consultivoId = prefill?.consultivoId || null
  const temVinculo = Boolean(processoId || consultivoId)

  // ---------- validação ----------
  const tituloOk = titulo.trim().length >= 3
  const dataOk = dataExecucao !== ''
  const podeSalvar = tituloOk && responsaveisIds.length > 0 && dataOk

  // ---------- helpers ----------
  const selecionarCategoria = (nova: CategoriaTarefa) => {
    if (nova === categoria) return
    setCategoria(nova)
    // ao trocar de natureza, reposiciona o tipo no padrão da nova categoria
    setTipo(nova === 'consultivo' ? 'cons_parecer' : 'outro')
  }

  const toggleResponsavel = (uid: string) => {
    setResponsaveisIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    )
  }

  const responsaveisSelecionados = useMemo(
    () =>
      responsaveisIds.map((id) => ({
        id,
        nome: membros.find((m) => m.user_id === id)?.nome || 'Usuário',
      })),
    [responsaveisIds, membros],
  )

  const membrosDisponiveis = useMemo(
    () => membros.filter((m) => !responsaveisIds.includes(m.user_id)),
    [membros, responsaveisIds],
  )

  // ---------- submit ----------
  async function handleCriar() {
    if (!podeSalvar || isSubmitting) return
    if (!escritorioAtivo) {
      toast.error('Nenhum escritório ativo selecionado.')
      return
    }

    setIsSubmitting(true)
    try {
      const toISO = (d: string) => (d ? `${d}T12:00:00` : undefined)

      const formData: TarefaFormData = {
        escritorio_id: escritorioAtivo,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        data_inicio: toISO(dataExecucao),
        data_fim: prazoFatal ? toISO(prazoFatal) : undefined,
        prioridade,
        responsaveis_ids: responsaveisIds,
        responsavel_id: responsaveisIds[0],
        processo_id: processoId,
        consultivo_id: consultivoId,
        prazo_data_limite:
          tipo === 'prazo_processual' && prazoFatal ? prazoFatal : undefined,
      }

      await createTarefa(formData)
      toast.success('Tarefa criada com sucesso!')
      onSuccess?.()
      ;(closeApiRef.current?.forceClose ?? onClose)()
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erro ao criar tarefa. Verifique os dados e tente novamente.'
      console.error('Erro ao criar tarefa:', error)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <MobileFullScreen
      dark={dark}
      isDirty={dirty}
      confirmTitle="Descartar tarefa?"
      confirmMessage="O que você preencheu será perdido."
      onClose={onClose}
    >
      {({ close, forceClose }) => {
        closeApiRef.current = { close, forceClose }
        return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: t.page,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <MobileScreenHeader title="Nova tarefa" onBack={close} dark={dark} />

      {/* ===== corpo rolável (formulário vertical) ===== */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)' }}>
        {/* Natureza: Contencioso / Consultivo */}
        <Field label="Natureza" dark={dark}>
          <Segmented
            dark={dark}
            value={categoria}
            onChange={(v) => selecionarCategoria(v as CategoriaTarefa)}
            options={[
              { v: 'contencioso', l: 'Contencioso', icon: 'scale' },
              { v: 'consultivo', l: 'Consultivo', icon: 'briefcase' },
            ]}
          />
        </Field>

        {/* Tipo de tarefa — grade de cards */}
        <Field label="Tipo de tarefa" dark={dark}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>
            {(Object.entries(tiposAtuais) as [string, TipoTarefaConfig][]).map(([key, config]) => (
              <TipoCard
                key={key}
                dark={dark}
                icon={TIPO_ICON[key] || 'briefcase'}
                label={config.label}
                selected={tipo === key}
                onClick={() => setTipo(key as TipoTarefa)}
              />
            ))}
          </div>
        </Field>

        {/* Título */}
        <Field label="Título" required dark={dark}>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Apresentar contestação"
            style={inputStyle(t)}
          />
          {!tituloOk && titulo.length > 0 && (
            <div style={{ fontSize: 11, color: t.muted, marginTop: 5 }}>
              Use ao menos 3 caracteres.
            </div>
          )}
        </Field>

        {/* Descrição */}
        <Field label="Descrição" hint="Opcional" dark={dark}>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Pauta, observações, contexto…"
            rows={3}
            style={{ ...inputStyle(t), minHeight: 84, resize: 'vertical', lineHeight: 1.45, paddingTop: 12 }}
          />
        </Field>

        {/* Datas */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FieldLabel label="Data de execução" required dark={dark} icon="calendar" />
            <input
              type="date"
              value={dataExecucao}
              onChange={(e) => setDataExecucao(e.target.value)}
              style={inputStyle(t)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FieldLabel label="Prazo fatal" hint="Opcional" dark={dark} icon="clock" />
            <input
              type="date"
              value={prazoFatal}
              onChange={(e) => setPrazoFatal(e.target.value)}
              style={inputStyle(t)}
            />
          </div>
        </div>

        {/* Prioridade */}
        <Field label="Prioridade" dark={dark}>
          <Segmented
            dark={dark}
            value={prioridade}
            onChange={(v) => setPrioridade(v as Prioridade)}
            options={[
              { v: 'alta', l: 'Alta', icon: 'arrowUp' },
              { v: 'media', l: 'Média', icon: 'trending' },
              { v: 'baixa', l: 'Baixa', icon: 'arrowDown' },
            ]}
          />
        </Field>

        {/* Responsáveis */}
        <Field label="Responsáveis" required dark={dark}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {responsaveisSelecionados.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 12px',
                  borderRadius: 13,
                  background: t.card,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Avatar nome={p.nome} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nome}
                  </div>
                  <div style={{ fontSize: 10.5, color: t.muted, marginTop: 1 }}>
                    {p.id === user?.id ? 'Você' : 'Colaborador'}
                  </div>
                </div>
                {responsaveisSelecionados.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleResponsavel(p.id)}
                    aria-label={`Remover ${p.nome}`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.muted, display: 'flex', padding: 4 }}
                  >
                    <MobileIcon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}

            {/* botão adicionar / lista de membros disponíveis */}
            {membrosDisponiveis.length > 0 && (
              <>
                {!adicionando ? (
                  <button
                    type="button"
                    onClick={() => setAdicionando(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: 13,
                      border: `1px dashed ${t.border}`,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: t.secondary,
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <MobileIcon name="plus" size={15} /> Adicionar responsável
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6, borderRadius: 13, border: `1px solid ${t.border}`, background: t.card }}>
                    {membrosDisponiveis.map((m) => (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          toggleResponsavel(m.user_id)
                          if (membrosDisponiveis.length <= 1) setAdicionando(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        <Avatar nome={m.nome} size={24} />
                        <span style={{ fontSize: 13, color: t.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.nome}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAdicionando(false)}
                      style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: t.muted, fontSize: 11.5, fontWeight: 600, padding: '4px 6px' }}
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Field>

        {/* Vínculo */}
        <Field label="Vínculo" dark={dark}>
          {temVinculo ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 13px',
                borderRadius: 13,
                background: t.tealSoft,
                border: `1px solid ${dark ? 'rgba(137,188,190,0.3)' : '#cfe7e7'}`,
              }}
            >
              <span style={{ color: t.teal, display: 'flex', flexShrink: 0 }}>
                <MobileIcon name={processoId ? 'scale' : 'briefcase'} size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.teal }}>
                  {processoId ? 'Processo' : 'Consulta'}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: t.primary, marginTop: 1 }}>
                  Vínculo pré-selecionado
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '11px 13px',
                borderRadius: 13,
                border: `1px dashed ${t.border}`,
                color: t.muted,
                fontSize: 12,
              }}
            >
              <MobileIcon name="fileText" size={14} /> Nenhum vínculo — opcional
            </div>
          )}
        </Field>
      </div>

      {/* ===== rodapé fixo (ações) ===== */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 10,
          padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 14px)',
          borderTop: `1px solid ${t.border}`,
          background: t.card,
        }}
      >
        <button
          type="button"
          onClick={close}
          disabled={isSubmitting}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 14,
            cursor: isSubmitting ? 'default' : 'pointer',
            fontFamily: 'inherit',
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.primary,
            fontSize: 14.5,
            fontWeight: 600,
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCriar}
          disabled={!podeSalvar || isSubmitting}
          style={{
            flex: 1.6,
            height: 50,
            borderRadius: 14,
            border: 'none',
            cursor: podeSalvar && !isSubmitting ? 'pointer' : 'default',
            fontFamily: 'inherit',
            background:
              podeSalvar && !isSubmitting
                ? 'linear-gradient(135deg,#34495e,#46627f)'
                : dark
                  ? '#1e2733'
                  : '#d8d4c9',
            color: podeSalvar && !isSubmitting ? '#fff' : t.muted,
            fontSize: 14.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: podeSalvar && !isSubmitting ? '0 10px 22px -10px rgba(52,73,94,0.55)' : 'none',
          }}
        >
          <MobileIcon name={isSubmitting ? 'clock' : 'check'} size={18} />
          {isSubmitting ? 'Criando…' : 'Criar tarefa'}
        </button>
      </div>
    </div>
        )
      }}
    </MobileFullScreen>
  )
}

// ============================================================
// Subcomponentes de UI
// ============================================================

function FieldLabel({ label, required, hint, dark, icon }: { label: string; required?: boolean; hint?: string; dark: boolean; icon?: string }) {
  const t = mTokens(dark)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
      {icon && <span style={{ color: t.teal, display: 'flex' }}><MobileIcon name={icon} size={13} /></span>}
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: t.secondary }}>
        {label}
      </span>
      {required && <span style={{ color: dark ? '#d6a87a' : '#a85a3e', fontSize: 11 }}>*</span>}
      {hint && <span style={{ marginLeft: 'auto', fontSize: 10, color: t.muted, fontWeight: 500, letterSpacing: 0 }}>{hint}</span>}
    </div>
  )
}

function Field({ label, required, hint, dark, children }: { label: string; required?: boolean; hint?: string; dark: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel label={label} required={required} hint={hint} dark={dark} />
      {children}
    </div>
  )
}

interface SegOption {
  v: string
  l: string
  icon?: string
}
function Segmented({ value, onChange, options, dark }: { value: string; onChange: (v: string) => void; options: SegOption[]; dark: boolean }) {
  const t = mTokens(dark)
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: dark ? '#10151d' : '#ece9e2' }}>
      {options.map((o) => {
        const on = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              background: on ? t.card : 'transparent',
              color: on ? t.primary : t.muted,
              boxShadow: on ? t.shadow : 'none',
            }}
          >
            {o.icon && <MobileIcon name={o.icon} size={14} />}
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

function TipoCard({ icon, label, selected, onClick, dark }: { icon: string; label: string; selected: boolean; onClick: () => void; dark: boolean }) {
  const t = mTokens(dark)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 12px',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        background: selected ? t.tealSoft : t.card,
        border: `1px solid ${selected ? (dark ? 'rgba(137,188,190,0.45)' : '#a9d2d3') : t.border}`,
        boxShadow: selected ? 'none' : t.shadow,
        transition: 'background 0.12s ease, border-color 0.12s ease',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? (dark ? 'rgba(137,188,190,0.2)' : '#d7ecec') : (dark ? '#10151d' : '#f1efe8'),
          color: selected ? t.teal : t.secondary,
        }}
      >
        <MobileIcon name={icon} size={16} />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? t.primary : t.secondary, lineHeight: 1.2 }}>
        {label}
      </span>
    </button>
  )
}

function Avatar({ nome, size = 30 }: { nome: string; size?: number }) {
  const cores = ['#34495e', '#46627f', '#3f7376', '#6b9e84', '#8a6438', '#a85a3e', '#415a7e']
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  const bg = cores[h % cores.length]
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const ini = partes.length === 0
    ? '—'
    : partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.38,
      }}
    >
      {ini}
    </span>
  )
}

function inputStyle(t: ReturnType<typeof mTokens>): React.CSSProperties {
  return {
    width: '100%',
    height: 46,
    borderRadius: 13,
    border: `1px solid ${t.border}`,
    background: t.card,
    color: t.primary,
    fontFamily: 'inherit',
    fontSize: 14.5,
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
  }
}
