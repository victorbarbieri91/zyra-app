'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Gavel,
  ExternalLink,
  Edit,
  X,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Video,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatBrazilDateTime,
  formatBrazilDate,
  parseDBDate
} from '@/lib/timezone'
import { differenceInMinutes, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

interface AudienciaDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  audiencia: {
    id: string
    titulo: string
    descricao?: string
    data_inicio: string
    data_fim?: string
    tipo_audiencia?: string
    modalidade?: 'presencial' | 'virtual'
    local?: string
    link_virtual?: string
    status?: 'agendada' | 'realizada' | 'cancelada' | 'remarcada'
    // Vinculações
    processo_id?: string
    processo_numero?: string
    // Detalhes do processo
    cliente_nome?: string
    responsavel_id?: string
    responsavel_nome?: string
    tribunal?: string
    comarca?: string
    vara?: string
    // Participantes
    juiz_nome?: string
    promotor_nome?: string
    parte_contraria?: string
    advogado_contrario?: string
    // Preparação
    observacoes?: string
    documentos_necessarios?: string
    // Metadata
    created_at?: string
    updated_at?: string
  }
  onEdit?: () => void
  onReagendar?: () => void
  onCancelar?: () => void
  onRealizar?: () => void
  onProcessoClick?: (processoId: string) => void
}

export default function AudienciaDetailModal({
  open,
  onOpenChange,
  audiencia,
  onEdit,
  onReagendar,
  onCancelar,
  onRealizar,
  onProcessoClick,
}: AudienciaDetailModalProps) {
  const supabase = createClient()
  const [processoInfo, setProcessoInfo] = useState<any>(null)
  const [loadingProcesso, setLoadingProcesso] = useState(false)

  // Carregar informações completas do processo
  useEffect(() => {
    const fetchProcessoInfo = async () => {
      if (!audiencia.processo_id || !open) return

      setLoadingProcesso(true)
      try {
        const { data, error } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            status,
            valor_causa,
            tribunal,
            comarca,
            vara,
            parte_contraria,
            crm_pessoas!cliente_id(nome_completo, nome_fantasia)
          `)
          .eq('id', audiencia.processo_id)
          .single()

        if (error) {
          console.error('[AudienciaDetail] Erro ao carregar processo:', error)
          return
        }

        if (data) {
          setProcessoInfo({
            id: data.id,
            numero_pasta: data.numero_pasta,
            numero_cnj: data.numero_cnj,
            status: data.status,
            valor_causa: data.valor_causa,
            tribunal: data.tribunal,
            comarca: data.comarca,
            vara: data.vara,
            cliente: data.crm_pessoas,
            parte_contraria: data.parte_contraria
          })
        }
      } catch (err) {
        console.error('[AudienciaDetail] Erro ao carregar processo:', err)
      } finally {
        setLoadingProcesso(false)
      }
    }

    fetchProcessoInfo()
  }, [audiencia.processo_id, open, supabase])

  // Calcular duração
  const duracao = audiencia.data_fim && audiencia.data_inicio
    ? differenceInMinutes(parseISO(audiencia.data_fim), parseISO(audiencia.data_inicio))
    : null

  // Status config
  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      agendada: 'Agendada',
      realizada: 'Realizada',
      cancelada: 'Cancelada',
      remarcada: 'Remarcada',
    }
    return labels[status || 'agendada'] || status
  }

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      agendada: 'text-blue-600',
      realizada: 'text-emerald-600',
      cancelada: 'text-red-600',
      remarcada: 'text-amber-600',
    }
    return colors[status || 'agendada'] || 'text-slate-600'
  }

  const tipoAudienciaLabels: Record<string, string> = {
    inicial: 'Inicial',
    instrucao: 'Instrução',
    conciliacao: 'Conciliação',
    julgamento: 'Julgamento',
    una: 'Una',
    justificacao: 'Justificação',
    outras: 'Outras'
  }

  // Helper para formatar partes do processo
  const formatProcessoPartes = (processo: any) => {
    const clienteNome = processo?.cliente?.nome_completo || processo?.cliente?.nome_fantasia
    if (clienteNome && processo?.parte_contraria) {
      return `${clienteNome} × ${processo.parte_contraria}`
    }
    if (clienteNome) return clienteNome
    if (processo?.parte_contraria) return processo.parte_contraria
    return null
  }

  const isAgendada = audiencia.status === 'agendada' || !audiencia.status

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Detalhes da Audiência</DialogTitle>
        <div className="bg-white rounded-lg">

          {/* Header Minimalista */}
          <div className="p-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  {audiencia.titulo}
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{tipoAudienciaLabels[audiencia.tipo_audiencia || 'outras'] || audiencia.tipo_audiencia || 'Audiência'}</span>
                  <span className={cn("font-medium", getStatusColor(audiencia.status))}>
                    {getStatusLabel(audiencia.status)}
                  </span>
                  {audiencia.modalidade && (
                    <span className={cn(
                      "font-medium",
                      audiencia.modalidade === 'virtual' ? 'text-teal-600' : 'text-slate-600'
                    )}>
                      {audiencia.modalidade === 'virtual' ? 'Virtual' : 'Presencial'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Metadata sutil */}
            {audiencia.created_at && (
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Criada {formatBrazilDate(audiencia.created_at)}</span>
              </div>
            )}
          </div>

          {/* Conteúdo Principal */}
          <div className="p-6 space-y-4">

            {/* DESCRIÇÃO */}
            <div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Descrição
              </div>
              {audiencia.descricao ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {audiencia.descricao}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Sem descrição
                </p>
              )}
            </div>

            {/* PROCESSO VINCULADO */}
            {audiencia.processo_id && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Processo Vinculado
                </div>
                {processoInfo ? (
                  <button
                    onClick={() => onProcessoClick?.(processoInfo.id)}
                    className="w-full text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <span>Processo {processoInfo.numero_pasta || 'S/N'}</span>
                          {processoInfo.status && (
                            <span className="text-[10px] text-slate-500">{processoInfo.status}</span>
                          )}
                        </div>
                        {processoInfo.numero_cnj && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            CNJ: {processoInfo.numero_cnj}
                          </div>
                        )}
                        {formatProcessoPartes(processoInfo) && (
                          <div className="text-xs text-slate-600 mt-2">
                            {formatProcessoPartes(processoInfo)}
                          </div>
                        )}
                        {(processoInfo.tribunal || processoInfo.comarca || processoInfo.vara) && (
                          <div className="text-[10px] text-slate-500 mt-1.5 space-y-0.5">
                            {processoInfo.tribunal && <div>Tribunal: {processoInfo.tribunal}</div>}
                            {processoInfo.comarca && <div>Comarca: {processoInfo.comarca}</div>}
                            {processoInfo.vara && <div>Vara: {processoInfo.vara}</div>}
                          </div>
                        )}
                        {processoInfo.valor_causa && (
                          <div className="text-[10px] text-slate-500 mt-1.5">
                            Valor da Causa: R$ {processoInfo.valor_causa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md text-xs text-slate-400 italic">
                    {loadingProcesso ? 'Carregando informações do processo...' : 'Erro ao carregar processo'}
                  </div>
                )}
              </div>
            )}

            {/* INFORMAÇÕES ORGANIZADAS EM LAYOUT FLUIDO */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {/* Data e Hora */}
              <div className="min-w-[140px]">
                <div className="text-[10px] text-slate-500 mb-1 h-4">
                  <Calendar className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                  Data e Hora
                </div>
                <div className="h-5 leading-5">
                  <span className="text-xs text-slate-700">
                    {audiencia.data_inicio ? formatBrazilDateTime(parseDBDate(audiencia.data_inicio)) : '-'}
                  </span>
                </div>
              </div>

              {/* Duração */}
              {duracao && (
                <div className="min-w-[100px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Duração Estimada
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {duracao} minutos
                    </span>
                  </div>
                </div>
              )}

              {/* Responsável */}
              {audiencia.responsavel_nome && (
                <div className="min-w-[120px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    <User className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                    Responsável
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {audiencia.responsavel_nome}
                    </span>
                  </div>
                </div>
              )}

              {/* Local / Link Virtual */}
              {audiencia.modalidade === 'presencial' && audiencia.local && (
                <div className="min-w-[200px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    <MapPin className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                    Local
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {audiencia.local}
                    </span>
                  </div>
                </div>
              )}

              {audiencia.modalidade === 'virtual' && audiencia.link_virtual && (
                <div className="min-w-[200px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    <Video className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                    Link Virtual
                  </div>
                  <div className="h-5 leading-5">
                    <a
                      href={audiencia.link_virtual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#89bcbe] hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate max-w-[150px]">Acessar reunião</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* PARTICIPANTES */}
            {(audiencia.juiz_nome || audiencia.promotor_nome || audiencia.parte_contraria || audiencia.advogado_contrario) && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Participantes
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
                  {audiencia.juiz_nome && (
                    <div>
                      <span className="text-[10px] text-slate-500">Juiz(a):</span> {audiencia.juiz_nome}
                    </div>
                  )}
                  {audiencia.promotor_nome && (
                    <div>
                      <span className="text-[10px] text-slate-500">Promotor(a):</span> {audiencia.promotor_nome}
                    </div>
                  )}
                  {audiencia.parte_contraria && (
                    <div>
                      <span className="text-[10px] text-slate-500">Parte Contrária:</span> {audiencia.parte_contraria}
                    </div>
                  )}
                  {audiencia.advogado_contrario && (
                    <div>
                      <span className="text-[10px] text-slate-500">Advogado(a) Contrário(a):</span> {audiencia.advogado_contrario}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DOCUMENTOS NECESSÁRIOS */}
            {audiencia.documentos_necessarios && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Documentos Necessários
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {audiencia.documentos_necessarios}
                </p>
              </div>
            )}

            {/* OBSERVAÇÕES */}
            {audiencia.observacoes && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Observações
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {audiencia.observacoes}
                </p>
              </div>
            )}
          </div>

          {/* Footer com Ações */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              {isAgendada && (
                <>
                  {onRealizar && (
                    <Button
                      onClick={onRealizar}
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Marcar como Realizada
                    </Button>
                  )}

                  {onReagendar && (
                    <Button
                      onClick={onReagendar}
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-slate-200"
                    >
                      Reagendar
                    </Button>
                  )}
                </>
              )}

              {onEdit && (
                <Button
                  onClick={onEdit}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              )}

              {isAgendada && onCancelar && (
                <Button
                  onClick={onCancelar}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
