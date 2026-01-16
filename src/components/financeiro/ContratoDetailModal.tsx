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
} from 'lucide-react'
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

  // Carregar dados complementares do contrato
  useEffect(() => {
    const loadContratoDetails = async () => {
      if (!contrato || !open) return

      setLoading(true)
      try {
        // Buscar formas de cobrança
        const { data: formasData } = await supabase
          .from('financeiro_contratos_formas')
          .select('id, forma_cobranca, ativo, ordem')
          .eq('contrato_id', contrato.id)
          .eq('ativo', true)
          .order('ordem')

        setFormas(formasData || [])

        // Buscar valores por cargo
        const { data: cargoData } = await supabase
          .from('financeiro_contratos_valores_cargo')
          .select(`
            cargo_id,
            valor_hora_negociado,
            escritorios_cargos (nome)
          `)
          .eq('contrato_id', contrato.id)

        setValoresCargo(
          (cargoData || []).map(c => ({
            cargo_id: c.cargo_id,
            cargo_nome: (c.escritorios_cargos as { nome: string } | null)?.nome || 'Cargo',
            valor_hora_negociado: c.valor_hora_negociado,
          }))
        )

        // Buscar atos configurados
        const { data: atosData } = await supabase
          .from('financeiro_contratos_atos')
          .select(`
            ato_tipo_id,
            percentual_valor_causa,
            valor_fixo,
            financeiro_atos_processuais_tipos (nome)
          `)
          .eq('contrato_id', contrato.id)

        setAtos(
          (atosData || []).map(a => ({
            ato_tipo_id: a.ato_tipo_id,
            ato_nome: (a.financeiro_atos_processuais_tipos as { nome: string } | null)?.nome || 'Ato',
            percentual_valor_causa: a.percentual_valor_causa,
            valor_fixo: a.valor_fixo,
          }))
        )
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

  // Parse config para extrair valores
  const getConfigValue = (tipoConfig: string) => {
    return contrato.config?.find(c => c.tipo_config === tipoConfig)
  }

  const configFixo = getConfigValue('fixo')
  const configHora = getConfigValue('hora')
  const configEtapa = getConfigValue('etapa')
  const configExito = getConfigValue('exito')
  const configPasta = getConfigValue('pasta')

  // Parse etapas_valores do campo descricao
  let etapasValores: Record<string, number> = {}
  if (configEtapa?.descricao) {
    try {
      etapasValores = JSON.parse(configEtapa.descricao as string)
    } catch {
      // ignore
    }
  }

  // Parse exito do campo descricao
  let exitoConfig: { percentual?: number; valor_minimo?: number } = {}
  if (configExito?.descricao) {
    try {
      exitoConfig = JSON.parse(configExito.descricao as string)
    } catch {
      // ignore
    }
  }

  // Parse horas estimadas do campo descricao
  let horasEstimadas: number | null = null
  if (configHora?.descricao) {
    const match = configHora.descricao.match(/Horas estimadas:\s*(\d+)/)
    if (match) {
      horasEstimadas = parseInt(match[1], 10)
    }
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
                      : ato.valor_fixo
                      ? formatCurrency(ato.valor_fixo)
                      : '-'}
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
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-[#34495e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#89bcbe]" />
                {contrato.numero_contrato}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">{contrato.cliente_nome}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px]', statusBadge.class)}>
                <statusBadge.Icon className="w-3 h-3 mr-1" />
                {statusBadge.label}
              </Badge>
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
