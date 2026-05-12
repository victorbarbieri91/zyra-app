'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Ban, CalendarDays, Loader2, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBrazilDateTime } from '@/lib/timezone'
import { createClient } from '@/lib/supabase/client'

type Escopo = 'instancia' | 'serie'
export type TipoAgenda = 'tarefa' | 'evento' | 'audiencia'

interface AgendaCancelarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: TipoAgenda
  registro: {
    id: string
    titulo: string
    data: string
    recorrencia_id?: string | null
  } | null
  onSuccess: () => void
}

const TIPO_LABEL: Record<TipoAgenda, string> = {
  tarefa: 'Tarefa',
  evento: 'Compromisso',
  audiencia: 'Audiência',
}

// Pronome demonstrativo com concordância de gênero por tipo
const DEMONSTRATIVO: Record<TipoAgenda, string> = {
  tarefa: 'Esta',
  evento: 'Este',
  audiencia: 'Esta',
}

const STATUS_CANCELADO: Record<TipoAgenda, string> = {
  tarefa: 'cancelada',
  evento: 'cancelado',
  audiencia: 'cancelada',
}

const TABELA: Record<TipoAgenda, 'agenda_tarefas' | 'agenda_eventos' | 'agenda_audiencias'> = {
  tarefa: 'agenda_tarefas',
  evento: 'agenda_eventos',
  audiencia: 'agenda_audiencias',
}

const STATUS_CONCLUIDO: Record<TipoAgenda, string> = {
  tarefa: 'concluida',
  evento: 'realizado',
  audiencia: 'realizada',
}

export default function AgendaCancelarModal({
  open,
  onOpenChange,
  tipo,
  registro,
  onSuccess,
}: AgendaCancelarModalProps) {
  const tipoLabel = TIPO_LABEL[tipo]
  // Toda a série está disponível sempre que houver recorrência (audiências não têm).
  // Virtuais também podem cancelar a série inteira — desativar a regra cobre todas.
  const podeCancelarSerie = !!registro?.recorrencia_id && tipo !== 'audiencia'
  const [escopo, setEscopo] = useState<Escopo>('instancia')
  const [executando, setExecutando] = useState(false)
  const [ocorrenciasNaoConcluidas, setOcorrenciasNaoConcluidas] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !registro) {
      setEscopo('instancia')
      setOcorrenciasNaoConcluidas(null)
      return
    }
    if (!podeCancelarSerie || !registro.recorrencia_id) return

    const supabase = createClient()
    let cancelado = false
    ;(async () => {
      const { count } = await supabase
        .from(TABELA[tipo])
        .select('id', { count: 'exact', head: true })
        .eq('recorrencia_id', registro.recorrencia_id)
        .not('status', 'in', `(${STATUS_CANCELADO[tipo]},${STATUS_CONCLUIDO[tipo]})`)
      if (!cancelado) setOcorrenciasNaoConcluidas(count ?? 0)
    })()
    return () => {
      cancelado = true
    }
  }, [open, registro, podeCancelarSerie, tipo])

  const handleCancelar = async () => {
    if (!registro) return
    setExecutando(true)
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const userId = user?.id

      const cancelarPayload = {
        status: STATUS_CANCELADO[tipo],
        cancelado_em: new Date().toISOString(),
        cancelado_por: userId,
      }

      if (escopo === 'instancia') {
        const { error } = await supabase
          .from(TABELA[tipo])
          .update(cancelarPayload)
          .eq('id', registro.id)
        if (error) throw error
      } else {
        if (!registro.recorrencia_id) throw new Error('Recorrência não encontrada')
        const { error: updateError } = await supabase
          .from(TABELA[tipo])
          .update(cancelarPayload)
          .eq('recorrencia_id', registro.recorrencia_id)
          .not('status', 'in', `(${STATUS_CANCELADO[tipo]},${STATUS_CONCLUIDO[tipo]})`)
        if (updateError) throw updateError
        const { error: regraError } = await supabase
          .from('agenda_recorrencias')
          .update({ ativo: false })
          .eq('id', registro.recorrencia_id)
        if (regraError) throw regraError
      }

      toast.success(
        escopo === 'serie'
          ? `Série cancelada${ocorrenciasNaoConcluidas !== null ? ` (${ocorrenciasNaoConcluidas} ${ocorrenciasNaoConcluidas === 1 ? 'ocorrência' : 'ocorrências'})` : ''}.`
          : tipo === 'evento'
            ? 'Compromisso cancelado com sucesso.'
            : `${tipoLabel} cancelada com sucesso.`,
      )
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao cancelar:', err)
      toast.error(err?.message || `Erro ao cancelar ${tipoLabel.toLowerCase()}`)
    } finally {
      setExecutando(false)
    }
  }

  const demonstrativo = DEMONSTRATIVO[tipo]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!executando) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-2xl !p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-3 text-[#34495e] dark:text-slate-200">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Ban className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-lg font-semibold">Cancelar {tipoLabel}</span>
          </DialogTitle>
          {registro && (
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 pl-[52px]">
                <span className="text-sm font-medium text-[#34495e] dark:text-slate-300">
                  {registro.titulo}
                </span>
                {registro.data && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {formatBrazilDateTime(registro.data)}
                  </span>
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {podeCancelarSerie && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-surface-2 rounded-lg">
              <button
                type="button"
                onClick={() => setEscopo('instancia')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  escopo === 'instancia'
                    ? 'bg-[#34495e] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Apenas esta
              </button>
              <button
                type="button"
                onClick={() => setEscopo('serie')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                  escopo === 'serie'
                    ? 'bg-[#34495e] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                <Repeat className="w-4 h-4" />
                Toda a série{ocorrenciasNaoConcluidas !== null ? ` (${ocorrenciasNaoConcluidas})` : ''}
              </button>
            </div>
          )}

          <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-4 h-4 text-[#46627f] dark:text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-[#46627f] dark:text-slate-300 space-y-2">
              <p className="font-medium text-[#34495e] dark:text-slate-200">
                O que vai acontecer
              </p>
              {escopo === 'serie' ? (
                <ul className="list-disc list-outside pl-4 space-y-1 text-[13px] leading-relaxed">
                  <li>
                    <strong className="text-[#34495e] dark:text-slate-200">
                      {ocorrenciasNaoConcluidas ?? '...'}
                    </strong>{' '}
                    {ocorrenciasNaoConcluidas === 1
                      ? 'ocorrência ainda não concluída será cancelada.'
                      : 'ocorrências ainda não concluídas serão canceladas.'}
                  </li>
                  <li>
                    A repetição automática será interrompida — nenhuma nova ocorrência será criada.
                  </li>
                  <li>Ocorrências que já foram concluídas não serão afetadas.</li>
                </ul>
              ) : (
                <ul className="list-disc list-outside pl-4 space-y-1 text-[13px] leading-relaxed">
                  <li>
                    {demonstrativo} {tipoLabel.toLowerCase()} sairá da sua agenda, da ficha do
                    processo e das demais listagens.
                  </li>
                  <li>
                    Você poderá consultar o histórico mais tarde, caso precise saber o que
                    aconteceu.
                  </li>
                  {podeCancelarSerie && (
                    <li>As demais ocorrências da série continuam normalmente.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-2/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executando}>
            Voltar
          </Button>
          <Button
            onClick={handleCancelar}
            disabled={executando}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            {executando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2" />
                {escopo === 'serie' ? 'Cancelar série' : 'Confirmar cancelamento'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
