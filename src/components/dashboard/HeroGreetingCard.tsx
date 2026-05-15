'use client'

// Card hero do novo dashboard — saudação + frase contextual da IA + métrica grande.
// Container "warm" — NÃO usar <Card> shadcn dentro.

import { Fragment, type ReactNode } from 'react'
import { ArrowUp, ArrowDown, Loader2, RefreshCw } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { getNowInBrazil } from '@/lib/timezone'

/**
 * Renderiza a frase IA reconhecendo apenas `**texto**` como negrito.
 * Parser próprio (sem dangerouslySetInnerHTML) — React escapa o resto automaticamente.
 * Resiliente a asteriscos órfãos (`**` solto sem par) — limpa antes de renderizar
 * para evitar que apareçam como texto literal na UI.
 */
function renderMensagemComNegrito(texto: string): ReactNode {
  // 1. Se a contagem de `**` for ímpar, remove o último órfão.
  let limpo = texto
  const contadorAsteriscos = (limpo.match(/\*\*/g) || []).length
  if (contadorAsteriscos % 2 !== 0) {
    const idx = limpo.lastIndexOf('**')
    if (idx >= 0) limpo = limpo.slice(0, idx) + limpo.slice(idx + 2)
  }

  // 2. Faz match em pares `**texto**` e split em partes intercaladas.
  const partes = limpo.split(/(\*\*[^*\n]+\*\*)/g)

  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[#6ba9ab] dark:text-teal-300">
          {parte.slice(2, -2)}
        </strong>
      )
    }
    // 3. Rede final: qualquer `**` residual nas partes-texto é removido.
    const semOrfaos = parte.replace(/\*\*/g, '')
    return <Fragment key={i}>{semOrfaos}</Fragment>
  })
}

interface HeroGreetingCardProps {
  className?: string
  nomeUsuario: string
  saudacao: string // "Bom dia" | "Boa tarde" | "Boa noite"
  mensagemIA?: string
  loadingResumo?: boolean
  tempoDesdeAtualizacao?: string
  onRefresh?: () => void
  // Horas cobráveis do usuário no mês corrente (não do escritório)
  horasUsuario: number
  // Diferença absoluta vs mesmo período do mês anterior (em horas)
  horasTrendValor: number
}

export default function HeroGreetingCard({
  className,
  nomeUsuario,
  saudacao,
  mensagemIA,
  loadingResumo,
  tempoDesdeAtualizacao,
  onRefresh,
  horasUsuario,
  horasTrendValor,
}: HeroGreetingCardProps) {
  const now = getNowInBrazil()
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' })

  // Percent é derivado: anterior = atual - trend; percent = (trend / anterior) * 100
  // Quando anterior = 0 e atual > 0, mostramos +100% (entrada nova).
  const horasMesAnterior = horasUsuario - horasTrendValor
  let trendPercent = 0
  if (horasMesAnterior > 0) {
    trendPercent = Math.round((horasTrendValor / horasMesAnterior) * 100)
  } else if (horasUsuario > 0) {
    trendPercent = 100
  }
  const trendUp = trendPercent >= 0
  const trendAbs = Math.abs(trendPercent).toFixed(0)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[18px] border border-warm',
        'bg-[linear-gradient(135deg,#ffffff,#faf8f2)] dark:bg-[linear-gradient(135deg,#1a2330,#141922)]',
        'px-6 py-5 flex flex-col gap-3',
        className,
      )}
    >
      {/* Halo decorativo */}
      <div
        aria-hidden
        className="absolute -top-[50px] -right-[50px] w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(137,188,190,0.18), transparent 70%)',
        }}
      />

      {/* Saudação + refresh */}
      <div className="relative flex items-start justify-between gap-4">
        <h1
          className="font-serif text-warm-primary m-0 leading-[1.05] flex items-baseline gap-2 flex-wrap"
          style={{ letterSpacing: '-0.03em' }}
        >
          <span style={{ fontSize: 26, fontWeight: 500 }}>{saudacao},</span>
          <span className="italic" style={{ fontSize: 34, fontWeight: 600 }}>
            {nomeUsuario || 'você'}
          </span>
          <span style={{ fontSize: 26, fontWeight: 500 }}>.</span>
        </h1>

        {onRefresh && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {tempoDesdeAtualizacao && !loadingResumo && (
              <span className="text-[10px] text-warm-muted">{tempoDesdeAtualizacao}</span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loadingResumo}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-warm-muted hover:text-warm-primary hover:bg-card-warm transition-colors disabled:opacity-50"
              aria-label="Atualizar resumo"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loadingResumo && 'animate-spin')} />
            </button>
          </div>
        )}
      </div>

      {/* Frase IA — centralizada vertical no espaço entre saudação e métrica */}
      <div className="relative flex-1 flex items-center min-h-[40px]">
        {loadingResumo ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-teal-300" />
            <span className="text-[12.5px] text-warm-secondary/60">Analisando seu dia...</span>
          </div>
        ) : (
          <p
            className="text-warm-secondary leading-relaxed"
            style={{ fontSize: 13.5, letterSpacing: '0.005em', wordSpacing: '0.02em' }}
          >
            {renderMensagemComNegrito(mensagemIA || 'Sem novidades por enquanto.')}
          </p>
        )}
      </div>

      {/* Métrica destaque */}
      <div className="relative">
        <div
          className="font-semibold text-warm-muted tracking-[0.1em] uppercase mb-1"
          style={{ fontSize: 10.5 }}
        >
          Horas cobráveis em {mesNome}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div
            className="font-serif text-warm-primary leading-none"
            style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.04em' }}
          >
            {formatHoras(horasUsuario, 'curto')}
          </div>
          {trendPercent !== 0 && (
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold',
                trendUp
                  ? 'bg-state-success-bg text-state-success-fg'
                  : 'bg-state-danger-bg text-state-danger-fg',
              )}
            >
              {trendUp ? (
                <ArrowUp className="w-[11px] h-[11px]" />
              ) : (
                <ArrowDown className="w-[11px] h-[11px]" />
              )}
              {trendUp ? '+' : '−'}{trendAbs}% vs mês passado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
