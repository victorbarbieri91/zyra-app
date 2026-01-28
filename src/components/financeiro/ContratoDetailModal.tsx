'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Calendar,
  Clock,
  DollarSign,
  User,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit,
  TrendingUp,
  Users,
  Target,
  Folder,
  PieChart,
  Activity,
  Loader2,
  Info,
  Scale,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { ContratoHonorario } from '@/hooks/useContratosHonorarios'
import { cn } from '@/lib/utils'

interface ContratoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: ContratoHonorario | null
  onEdit?: (contrato: ContratoHonorario) => void
}

interface ContratoForma {
  id: string
  forma_cobranca: string
  ativo: boolean
  ordem: number
}

interface ValorCargo {
  cargo_id: string
  cargo_nome?: string
  valor_hora_negociado: number
}

interface AtoConfigured {
  ato_tipo_id: string
  ato_nome?: string
  percentual_valor_causa?: number
  valor_fixo?: number
}

interface ProcessoVinculado {
  id: string
  numero_pasta: string
  numero_cnj: string
  cliente_nome: string
  parte_contraria: string | null
  status: string
  area: string
}

const FORMA_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  fixo: { label: 'Valor Fixo', icon: DollarSign },
  por_hora: { label: 'Por Hora', icon: Clock },
  por_cargo: { label: 'Por Cargo', icon: Users },
  por_pasta: { label: 'Por Pasta', icon: Folder },
  por_ato: { label: 'Por Ato', icon: Activity },
  por_etapa: { label: 'Por Etapa', icon: Target },
  misto: { label: 'Misto', icon: PieChart },
}

const TIPO_SERVICO_LABELS: Record<string, string> = {
  processo: 'Processos Judiciais',
  consultoria: 'Consultoria Jurídica',
  avulso: 'Serviços Avulsos',
  misto: 'Misto',
}

const ETAPAS_LABELS: Record<string, string> = {
  inicial: 'Fase Inicial',
  instrucao: 'Fase de Instrução',
  sentenca: 'Sentença',
  recursos: 'Recursos',
  execucao: 'Execução',
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export default function ContratoDetailModal({
  open,
  onOpenChange,
  contrato,
  onEdit,
}: ContratoDetailModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formas, setFormas] = useState<ContratoForma[]>([])
  const [valoresCargo, setValoresCargo] = useState<ValorCargo[]>([])
  const [atos, setAtos] = useState<AtoConfigured[]>([])
  const [processosVinculados, setProcessosVinculados] = useState<ProcessoVinculado[]>([])

  // Carregar dados complementares do contrato (agora dos campos JSONB)
  useEffect(() => {
    const loadContratoDetails = async () => {
      if (!contrato || !open) return

      setLoading(true)
      try {
        // Buscar contrato com campos JSONB
        const { data: contratoData } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('formas_pagamento, config')
          .eq('id', contrato.id)
          .single()

        if (contratoData) {
          // Extrair formas de cobrança do JSONB formas_pagamento
          const formasPagamento = (contratoData.formas_pagamento || []) as Array<{ forma: string; ordem?: number }>
          setFormas(
            formasPagamento.map((f, index) => ({
              id: `${contrato.id}-${index}`,
              forma_cobranca: f.forma,
              ativo: true,
              ordem: f.ordem ?? index,
            }))
          )

          // Extrair valores por cargo do JSONB config
          const config = (contratoData.config || {}) as Record<string, unknown>
          const valoresPorCargoJsonb = (config.valores_por_cargo || []) as Array<{
            cargo_id: string
            cargo_nome?: string
            valor_negociado?: number
          }>
          setValoresCargo(
            valoresPorCargoJsonb.map(c => ({
              cargo_id: c.cargo_id,
              cargo_nome: c.cargo_nome || 'Cargo',
              valor_hora_negociado: c.valor_negociado || 0,
            }))
          )

          // Extrair atos configurados do JSONB config
          const atosConfigurados = (config.atos_configurados || []) as Array<{
            ato_tipo_id: string
            ato_nome?: string
            percentual_valor_causa?: number
            valor_fixo?: number
          }>
          setAtos(
            atosConfigurados.map(a => ({
              ato_tipo_id: a.ato_tipo_id,
              ato_nome: a.ato_nome || 'Ato',
              percentual_valor_causa: a.percentual_valor_causa,
              valor_fixo: a.valor_fixo,
            }))
          )
        }

        // Buscar processos vinculados a este contrato
        const { data: processosData } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            parte_contraria,
            status,
            area,
            cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo)
          `)
          .eq('contrato_id', contrato.id)
          .order('numero_pasta', { ascending: true })

        if (processosData) {
          setProcessosVinculados(
            processosData.map(p => ({
              id: p.id,
              numero_pasta: p.numero_pasta,
              numero_cnj: p.numero_cnj,
              cliente_nome: (p.cliente as { nome_completo: string } | null)?.nome_completo || 'N/A',
              parte_contraria: p.parte_contraria,
              status: p.status,
              area: p.area,
            }))
          )
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do contrato:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContratoDetails()
  }, [contrato, open, supabase])

  if (!contrato) return null

  const statusBadge = contrato.inadimplente
    ? { label: 'Inadimplente', class: 'bg-red-100 text-red-700', Icon: AlertTriangle }
    : contrato.ativo
    ? { label: 'Ativo', class: 'bg-green-100 text-green-700', Icon: CheckCircle }
    : { label: 'Encerrado', class: 'bg-gray-100 text-gray-700', Icon: XCircle }

  // Parse config - o config é um objeto JSONB direto, não um array com tipo_config
  // O hook coloca em [config], então pegamos o primeiro elemento
  const configData = contrato.config?.[0] as Record<string, unknown> | undefined

  // Criar objetos de config baseados no configData
  const configFixo = configData?.valor_fixo ? { valor_fixo: Number(configData.valor_fixo) } : null
  const configHora = configData?.valor_hora ? {
    valor_hora: Number(configData.valor_hora),
    descricao: configData.horas_estimadas ? `Horas estimadas: ${configData.horas_estimadas}` : undefined
  } : null
  const configEtapa = configData?.etapas_valores ? {
    descricao: JSON.stringify(configData.etapas_valores)
  } : null
  const configExito = configData?.percentual_exito ? {
    percentual: Number(configData.percentual_exito),
    valor_minimo: configData.valor_minimo_exito ? Number(configData.valor_minimo_exito) : undefined
  } : null
  const configPasta = configData?.valor_por_processo ? {
    valor_por_processo: Number(configData.valor_por_processo),
    dia_cobranca: configData.dia_cobranca ? Number(configData.dia_cobranca) : undefined
  } : null

  // Parse etapas_valores diretamente do configData
  let etapasValores: Record<string, number> = {}
  if (configData?.etapas_valores) {
    etapasValores = configData.etapas_valores as Record<string, number>
  }

  // Exito config já extraído do configData
  let exitoConfig: { percentual?: number; valor_minimo?: number } = {}
  if (configExito) {
    exitoConfig = {
      percentual: configExito.percentual,
      valor_minimo: configExito.valor_minimo,
    }
  }

  // Horas estimadas diretamente do configData
  let horasEstimadas: number | null = null
  if (configData?.horas_estimadas) {
    horasEstimadas = Number(configData.horas_estimadas)
  }

  // Função para renderizar valores de cada forma
  const renderFormaValores = (formaCobranca: string) => {
    switch (formaCobranca) {
      case 'fixo':
        if (configFixo?.valor_fixo) {
          return (
            <span className="text-sm font-semibold text-[#34495e]">
              {formatCurrency(configFixo.valor_fixo)}
            </span>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'por_hora':
        if (configHora?.valor_hora) {
          return (
            <div className="text-right">
              <span className="text-sm font-semibold text-[#34495e]">
                {formatCurrency(configHora.valor_hora)}/h
              </span>
              {horasEstimadas && (
                <p className="text-[10px] text-slate-500">{horasEstimadas}h estimadas</p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'por_pasta':
        if (configPasta?.valor_por_processo) {
          return (
            <div className="text-right">
              <span className="text-sm font-semibold text-[#34495e]">
                {formatCurrency(configPasta.valor_por_processo)}/processo
              </span>
              {configPasta.dia_cobranca && (
                <p className="text-[10px] text-slate-500">Dia {configPasta.dia_cobranca}</p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'por_etapa':
        if (Object.keys(etapasValores).length > 0) {
          return (
            <div className="text-right space-y-0.5">
              {Object.entries(etapasValores).slice(0, 2).map(([etapa, valor]) => (
                <p key={etapa} className="text-xs">
                  <span className="text-slate-500">{ETAPAS_LABELS[etapa] || etapa}:</span>{' '}
                  <span className="font-semibold text-[#34495e]">{formatCurrency(valor)}</span>
                </p>
              ))}
              {Object.keys(etapasValores).length > 2 && (
                <p className="text-[10px] text-slate-400">
                  +{Object.keys(etapasValores).length - 2} etapas
                </p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'misto':
        if (exitoConfig.percentual) {
          return (
            <div className="text-right">
              <span className="text-sm font-semibold text-[#34495e]">
                {exitoConfig.percentual}% êxito
              </span>
              {exitoConfig.valor_minimo && (
                <p className="text-[10px] text-slate-500">
                  mín. {formatCurrency(exitoConfig.valor_minimo)}
                </p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'por_cargo':
        if (valoresCargo.length > 0) {
          return (
            <div className="text-right space-y-0.5">
              {valoresCargo.slice(0, 2).map(cargo => (
                <p key={cargo.cargo_id} className="text-xs">
                  <span className="text-slate-500">{cargo.cargo_nome}:</span>{' '}
                  <span className="font-semibold text-[#34495e]">
                    {formatCurrency(cargo.valor_hora_negociado)}/h
                  </span>
                </p>
              ))}
              {valoresCargo.length > 2 && (
                <p className="text-[10px] text-slate-400">
                  +{valoresCargo.length - 2} cargos
                </p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      case 'por_ato':
        if (atos.length > 0) {
          return (
            <div className="text-right space-y-0.5">
              {atos.slice(0, 2).map(ato => (
                <p key={ato.ato_tipo_id} className="text-xs">
                  <span className="text-slate-500">{ato.ato_nome}:</span>{' '}
                  <span className="font-semibold text-[#34495e]">
                    {ato.percentual_valor_causa
                      ? `${ato.percentual_valor_causa}%`
                      : ''}
                    {ato.percentual_valor_causa && ato.valor_fixo && (
                      <span className="font-normal text-[10px] text-slate-400 ml-0.5">
                        (mín: {formatCurrency(ato.valor_fixo)})
                      </span>
                    )}
                    {!ato.percentual_valor_causa && ato.valor_fixo
                      ? formatCurrency(ato.valor_fixo)
                      : ''}
                    {!ato.percentual_valor_causa && !ato.valor_fixo && '-'}
                  </span>
                </p>
              ))}
              {atos.length > 2 && (
                <p className="text-[10px] text-slate-400">
                  +{atos.length - 2} atos
                </p>
              )}
            </div>
          )
        }
        return <span className="text-xs text-slate-400 italic">Não configurado</span>

      default:
        return <span className="text-xs text-slate-400 italic">Não configurado</span>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-100 pr-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-[#34495e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#89bcbe]" />
                {contrato.numero_contrato}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-500">{contrato.cliente_nome}</p>
                <Badge className={cn('text-[10px]', statusBadge.class)}>
                  <statusBadge.Icon className="w-3 h-3 mr-1" />
                  {statusBadge.label}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#89bcbe]" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Informações Básicas */}
            <div>
              <p className="text-xs font-semibold text-[#46627f] uppercase tracking-wide mb-3">
                Informações
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Tipo</p>
                    <p className="text-xs font-medium text-[#34495e]">
                      {TIPO_SERVICO_LABELS[contrato.tipo_servico] || contrato.tipo_servico}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Início</p>
                    <p className="text-xs font-medium text-[#34495e]">
                      {formatBrazilDate(parseDateInBrazil(contrato.data_inicio))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Fim</p>
                    <p className="text-xs font-medium text-[#34495e]">
                      {contrato.data_fim
                        ? formatBrazilDate(parseDateInBrazil(contrato.data_fim))
                        : 'Indeterminado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Cliente</p>
                    <p className="text-xs font-medium text-[#34495e] truncate max-w-[140px]">
                      {contrato.cliente_nome}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formas de Cobrança */}
            <div>
              <p className="text-xs font-semibold text-[#46627f] uppercase tracking-wide mb-3">
                Formas de Cobrança
              </p>
              {formas.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-lg">
                  <Info className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs text-slate-400">Nenhuma forma configurada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formas.map(forma => {
                    const info = FORMA_LABELS[forma.forma_cobranca] || FORMA_LABELS.fixo
                    const Icon = info.icon
                    return (
                      <div
                        key={forma.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-[#89bcbe]" />
                          </div>
                          <span className="text-sm font-medium text-[#34495e]">
                            {info.label}
                          </span>
                        </div>
                        {renderFormaValores(forma.forma_cobranca)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Processos Vinculados */}
            <div>
              <p className="text-xs font-semibold text-[#46627f] uppercase tracking-wide mb-3">
                Processos Vinculados ({processosVinculados.length})
              </p>
              {processosVinculados.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-lg">
                  <Scale className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs text-slate-400">Nenhum processo vinculado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {processosVinculados.map(processo => (
                    <Link
                      key={processo.id}
                      href={`/dashboard/processos/${processo.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 hover:border-[#89bcbe]/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <Scale className="w-3.5 h-3.5 text-[#89bcbe]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#34495e]">
                              {processo.numero_pasta}
                            </span>
                            <Badge
                              className={cn(
                                'text-[9px] px-1.5 py-0',
                                processo.status === 'ativo'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {processo.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {processo.cliente_nome}
                            {processo.parte_contraria && (
                              <span className="text-slate-400"> vs {processo.parte_contraria}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {processo.numero_cnj}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#89bcbe] transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Observações */}
            {contrato.observacoes && (
              <div>
                <p className="text-xs font-semibold text-[#46627f] uppercase tracking-wide mb-2">
                  Observações
                </p>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {contrato.observacoes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {onEdit && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false)
                onEdit(contrato)
              }}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Editar Contrato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
