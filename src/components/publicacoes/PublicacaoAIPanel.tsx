'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Clock,
  Lightbulb,
  CheckSquare,
  CalendarPlus,
  Gavel,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================
// TIPOS
// ============================================

export interface AnaliseIA {
  resumo: string
  tipo_publicacao: string
  tem_prazo: boolean
  prazo_dias?: number
  prazo_tipo?: 'uteis' | 'corridos'
  data_limite_sugerida?: string
  acao_sugerida?: string
  fundamentacao_legal?: string
}

interface PublicacaoAIPanelProps {
  publicacaoId: string
  analise: AnaliseIA | null
  onAnaliseLoaded: (analise: AnaliseIA) => void
  onCriarTarefa: () => void
  onCriarEvento: () => void
  onCriarAudiencia: () => void
  compact?: boolean
}

// ============================================
// COMPONENTE
// ============================================

export default function PublicacaoAIPanel({
  publicacaoId,
  analise,
  onAnaliseLoaded,
  onCriarTarefa,
  onCriarEvento,
  onCriarAudiencia,
  compact = false,
}: PublicacaoAIPanelProps) {
  const [analisando, setAnalisando] = useState(false)

  const analisarComIA = async () => {
    setAnalisando(true)
    try {
      const response = await fetch('/api/publicacoes/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicacao_id: publicacaoId }),
      })

      const data = await response.json()

      if (!data.sucesso) {
        throw new Error(data.error || 'Erro ao analisar')
      }

      onAnaliseLoaded(data.analise)
      toast.success(data.cached ? 'Analise carregada do cache' : 'Analise concluida!')
    } catch (err: any) {
      console.error('Erro ao analisar:', err)
      toast.error(err.message || 'Erro ao analisar publicacao')
    } finally {
      setAnalisando(false)
    }
  }

  // Skeleton de carregamento
  if (analisando) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="w-4 h-4 animate-spin text-[#34495e]" />
          <span className="text-xs font-medium text-slate-500">Analisando...</span>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  // Sem analise - botao para analisar
  if (!analise) {
    return (
      <div className={cn('text-center', compact ? 'py-4' : 'py-6')}>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Extraia prazos e ações sugeridas
        </p>
        <Button
          onClick={analisarComIA}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Analisar com IA
        </Button>
      </div>
    )
  }

  // Com analise
  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Resumo</p>
        <p className="text-xs text-slate-700 leading-relaxed">{analise.resumo}</p>
      </div>

      {/* Prazo */}
      {analise.tem_prazo && (
        <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">
              Prazo Identificado
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-700">
              <strong>{analise.prazo_dias}</strong> dias {analise.prazo_tipo}
            </p>
            {analise.data_limite_sugerida && (
              <p className="text-xs text-slate-600">
                Limite: <strong>{new Date(analise.data_limite_sugerida + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
              </p>
            )}
            {analise.fundamentacao_legal && (
              <p className="text-[10px] text-slate-500 mt-1">{analise.fundamentacao_legal}</p>
            )}
          </div>
        </div>
      )}

      {/* Acao sugerida */}
      {analise.acao_sugerida && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ação Sugerida</p>
          </div>
          <p className="text-xs text-slate-700">{analise.acao_sugerida}</p>
        </div>
      )}

      {/* Botoes de agendamento */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Agendar</p>
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onCriarTarefa() }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Criar Tarefa
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onCriarEvento() }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Criar Compromisso
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onCriarAudiencia() }}
          >
            <Gavel className="w-3.5 h-3.5" />
            Criar Audiência
          </Button>
        </div>
      </div>

      {/* Re-analisar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); analisarComIA() }}
        className="w-full text-slate-400 hover:text-slate-600 h-7 text-[10px]"
      >
        <RefreshCw className="w-3 h-3 mr-1.5" />
        Re-analisar
      </Button>
    </div>
  )
}
