'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Scale,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RefreshCw,
  Heart,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { ContratoHonorario, GrupoClientes, ContratoComissaoPadrao } from '@/hooks/useContratosHonorarios'
import { cn, formatHoras } from '@/lib/utils'

interface ContratoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: ContratoHonorario | null
  onEdit?: (contrato: ContratoHonorario) => void
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

interface ReajusteData {
  reajuste_ativo: boolean
  valor_atualizado: number | null
  data_ultimo_reajuste: string | null
  indice_reajuste: string | null
}

const FORMA_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  fixo: { label: 'Valor Fixo', icon: DollarSign },
  por_hora: { label: 'Por Hora', icon: Clock },
  por_cargo: { label: 'Por Cargo', icon: Users },
  por_pasta: { label: 'Por Pasta', icon: Folder },
  por_ato: { label: 'Por Ato', icon: Activity },
  por_etapa: { label: 'Por Etapa', icon: Target },
  misto: { label: 'Misto', icon: PieChart },
  pro_bono: { label: 'Pró-Bono', icon: Heart },
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

const PROCESSOS_LIMITE_INICIAL = 6

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)

const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`

interface ValorFixoItem {
  descricao?: string
  valor: number
  periodicidade?: 'mensal_fixo' | 'parcelado'
  dia_vencimento?: number
  numero_parcelas?: number
}

interface ValorCargoItem {
  cargo_id: string
  cargo_nome?: string
  valor_negociado?: number
}

interface AtoItem {
  ato_tipo_id: string
  ato_nome?: string
  percentual_valor_causa?: number
  valor_fixo?: number
}

interface ItemValor {
  key: string
  rotulo: React.ReactNode
  valor: string
}

export default function ContratoDetailModal({
  open,
  onOpenChange,
  contrato,
  onEdit,
}: ContratoDetailModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [processosVinculados, setProcessosVinculados] = useState<ProcessoVinculado[]>([])
  const [processosExpandidos, setProcessosExpandidos] = useState(false)
  const [grupoExpandido, setGrupoExpandido] = useState(false)
  const [comissoesExpandida, setComissoesExpandida] = useState(false)
  const [selectedIndice, setSelectedIndice] = useState<string>('INPC')
  const [loadingReajuste, setLoadingReajuste] = useState(false)
  const [reajusteData, setReajusteData] = useState<ReajusteData | null>(null)

  // Dados derivados do prop contrato (sem query duplicada)
  const derived = useMemo(() => {
    if (!contrato) {
      return {
        formas: [] as string[],
        valoresFixos: [] as ValorFixoItem[],
        valoresCargo: [] as ValorCargoItem[],
        atos: [] as AtoItem[],
        etapasValores: {} as Record<string, number>,
        configFixo: null as { valores_fixos: ValorFixoItem[]; valor_total: number } | null,
        configHora: null as { valor_hora: number; horas_estimadas?: number } | null,
        configPasta: null as { valor_por_processo: number; dia_cobranca?: number } | null,
        configExito: null as { percentual: number; valor_minimo?: number } | null,
        temPeriodicidadeConfigurada: false,
        grupoClientes: null as GrupoClientes | null,
        comissoesPadrao: [] as ContratoComissaoPadrao[],
      }
    }

    const configData = contrato.config?.[0] as Record<string, unknown> | undefined

    const formas = (contrato.formas_cobranca || []).map((f) => String(f))

    const valoresFixos = Array.isArray(configData?.valores_fixos)
      ? (configData.valores_fixos as ValorFixoItem[])
      : []

    const configFixo = valoresFixos.length > 0
      ? {
          valores_fixos: valoresFixos,
          valor_total: valoresFixos.reduce((sum, v) => sum + (v.valor || 0), 0),
        }
      : configData?.valor_fixo
      ? {
          valores_fixos: [{ descricao: 'Valor Fixo', valor: Number(configData.valor_fixo) }],
          valor_total: Number(configData.valor_fixo),
        }
      : null

    const temPeriodicidadeConfigurada = valoresFixos.some((v) => v.periodicidade)

    const configHora = configData?.valor_hora
      ? {
          valor_hora: Number(configData.valor_hora),
          horas_estimadas: configData.horas_estimadas ? Number(configData.horas_estimadas) : undefined,
        }
      : null

    const configPasta = configData?.valor_por_processo
      ? {
          valor_por_processo: Number(configData.valor_por_processo),
          dia_cobranca: configData.dia_cobranca ? Number(configData.dia_cobranca) : undefined,
        }
      : null

    const configExito = configData?.percentual_exito
      ? {
          percentual: Number(configData.percentual_exito),
          valor_minimo: configData.valor_minimo_exito ? Number(configData.valor_minimo_exito) : undefined,
        }
      : null

    const valoresCargo = (Array.isArray(configData?.valores_por_cargo)
      ? (configData.valores_por_cargo as ValorCargoItem[])
      : []
    ).map((c) => ({
      cargo_id: c.cargo_id,
      cargo_nome: c.cargo_nome || 'Cargo',
      valor_negociado: c.valor_negociado || 0,
    }))

    const atos = (Array.isArray(configData?.atos_configurados)
      ? (configData.atos_configurados as AtoItem[])
      : []
    ).map((a) => ({
      ato_tipo_id: a.ato_tipo_id,
      ato_nome: a.ato_nome || 'Ato',
      percentual_valor_causa: a.percentual_valor_causa,
      valor_fixo: a.valor_fixo,
    }))

    const etapasValores = (configData?.etapas_valores || {}) as Record<string, number>

    const grupoData = contrato.grupo_clientes as GrupoClientes | null
    const grupoClientes = grupoData?.habilitado ? grupoData : null

    const comissoesPadrao = (contrato.comissoes_padrao || []).filter(
      (c) => c.ativo !== false && c.percentual > 0,
    )

    return {
      formas,
      valoresFixos,
      valoresCargo,
      atos,
      etapasValores,
      configFixo,
      configHora,
      configPasta,
      configExito,
      temPeriodicidadeConfigurada,
      grupoClientes,
      comissoesPadrao,
    }
  }, [contrato])

  // Carrega processos vinculados e dados de reajuste (campos não inclusos no prop)
  useEffect(() => {
    const load = async () => {
      if (!contrato || !open) return

      setProcessosExpandidos(false)
      setGrupoExpandido(false)
      setComissoesExpandida(false)
      setLoading(true)
      try {
        const [reajusteRes, processosRes] = await Promise.all([
          supabase
            .from('financeiro_contratos_honorarios')
            .select('reajuste_ativo, valor_atualizado, data_ultimo_reajuste, indice_reajuste')
            .eq('id', contrato.id)
            .eq('escritorio_id', contrato.escritorio_id)
            .single(),
          supabase
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
            .eq('escritorio_id', contrato.escritorio_id)
            .order('numero_pasta', { ascending: true }),
        ])

        if (reajusteRes.data) {
          setReajusteData({
            reajuste_ativo: reajusteRes.data.reajuste_ativo || false,
            valor_atualizado: reajusteRes.data.valor_atualizado,
            data_ultimo_reajuste: reajusteRes.data.data_ultimo_reajuste,
            indice_reajuste: reajusteRes.data.indice_reajuste,
          })
          if (reajusteRes.data.indice_reajuste) {
            setSelectedIndice(reajusteRes.data.indice_reajuste)
          }
        }

        if (processosRes.data) {
          setProcessosVinculados(
            processosRes.data.map((p: any) => ({
              id: p.id,
              numero_pasta: p.numero_pasta,
              numero_cnj: p.numero_cnj,
              cliente_nome:
                (p.cliente as { nome_completo: string } | null)?.nome_completo || 'N/A',
              parte_contraria: p.parte_contraria,
              status: p.status,
              area: p.area,
            })),
          )
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do contrato:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [contrato, open, supabase])

  const aplicarReajuste = async () => {
    if (!contrato) return

    setLoadingReajuste(true)
    try {
      const { error } = await supabase.rpc('aplicar_reajuste_contrato', {
        p_contrato_id: contrato.id,
        p_indice: selectedIndice,
      })

      if (error) {
        console.error('Erro ao aplicar reajuste:', error)
        return
      }

      const { data: contratoAtualizado } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('valor_atualizado, data_ultimo_reajuste, indice_reajuste')
        .eq('id', contrato.id)
        .eq('escritorio_id', contrato.escritorio_id)
        .single()

      if (contratoAtualizado) {
        setReajusteData((prev) =>
          prev
            ? {
                ...prev,
                valor_atualizado: contratoAtualizado.valor_atualizado,
                data_ultimo_reajuste: contratoAtualizado.data_ultimo_reajuste,
                indice_reajuste: contratoAtualizado.indice_reajuste,
              }
            : prev,
        )
      }
    } catch (error) {
      console.error('Erro ao aplicar reajuste:', error)
    } finally {
      setLoadingReajuste(false)
    }
  }

  if (!contrato) return null

  const statusBadge = contrato.inadimplente
    ? {
        label: 'Inadimplente',
        class:
          'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30',
        Icon: AlertTriangle,
      }
    : contrato.ativo
    ? {
        label: 'Ativo',
        class:
          'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
        Icon: CheckCircle,
      }
    : {
        label: 'Encerrado',
        class:
          'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
        Icon: XCircle,
      }

  const {
    formas,
    valoresCargo,
    atos,
    etapasValores,
    configFixo,
    configHora,
    configPasta,
    configExito,
    temPeriodicidadeConfigurada,
    grupoClientes,
    comissoesPadrao,
  } = derived

  const tituloPrincipal = contrato.titulo?.trim() || `Contrato ${contrato.numero_contrato}`

  const periodoTexto = contrato.data_fim
    ? `${formatBrazilDate(parseDateInBrazil(contrato.data_inicio))} → ${formatBrazilDate(parseDateInBrazil(contrato.data_fim))}`
    : `${formatBrazilDate(parseDateInBrazil(contrato.data_inicio))} → Indeterminado`

  const reajusteAplicavel =
    reajusteData?.reajuste_ativo &&
    (formas.includes('fixo') || formas.includes('por_pasta'))

  // Constrói os dados de cada forma de cobrança
  const buildFormaCardData = (forma: string, ordem: number): FormaCardData | null => {
    const info = FORMA_LABELS[forma] || FORMA_LABELS.fixo
    const ordemLabel = ordem === 0 ? 'Cobrança principal' : 'Cobrança adicional'
    const baseProps = {
      icone: info.icon,
      label: info.label,
      ordemLabel,
    }

    switch (forma) {
      case 'fixo': {
        if (!configFixo) return { ...baseProps, status: 'vazio' }
        if (configFixo.valores_fixos.length === 1) {
          const v = configFixo.valores_fixos[0]
          return {
            ...baseProps,
            status: 'inline',
            valorPrincipal: formatCurrency(v.valor),
            valorSub: v.descricao,
          }
        }
        const items: ItemValor[] = configFixo.valores_fixos.map((v, i) => ({
          key: `${i}`,
          rotulo: (
            <>
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {v.descricao || `Parcela ${i + 1}`}
              </span>
              {v.periodicidade && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 border-[#89bcbe]/30 text-[#46627f] dark:text-slate-400 bg-white dark:bg-slate-800/50 flex-shrink-0"
                >
                  {v.periodicidade === 'mensal_fixo'
                    ? `Mensal · dia ${v.dia_vencimento || 10}`
                    : `${v.numero_parcelas || 6}× · dia ${v.dia_vencimento || 10}`}
                </Badge>
              )}
            </>
          ),
          valor: formatCurrency(v.valor),
        }))
        return {
          ...baseProps,
          status: 'lista',
          valorPrincipal: formatCurrency(configFixo.valor_total),
          valorSub: temPeriodicidadeConfigurada ? 'mensal' : 'total',
          items,
        }
      }

      case 'por_hora': {
        if (!configHora?.valor_hora) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'inline',
          valorPrincipal: `${formatCurrency(configHora.valor_hora)}/h`,
          valorSub: configHora.horas_estimadas
            ? `${formatHoras(configHora.horas_estimadas, 'curto')} estimadas`
            : undefined,
        }
      }

      case 'por_pasta': {
        if (!configPasta?.valor_por_processo) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'inline',
          valorPrincipal: `${formatCurrency(configPasta.valor_por_processo)} / processo`,
          valorSub: configPasta.dia_cobranca ? `Cobrado dia ${configPasta.dia_cobranca}` : undefined,
        }
      }

      case 'por_etapa': {
        const entries = Object.entries(etapasValores)
        if (entries.length === 0) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'lista',
          items: entries.map(([etapa, valor]) => ({
            key: etapa,
            rotulo: (
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {ETAPAS_LABELS[etapa] || etapa}
              </span>
            ),
            valor: formatCurrency(valor),
          })),
        }
      }

      case 'misto': {
        if (!configExito?.percentual) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'inline',
          valorPrincipal: `${formatPercent(configExito.percentual)} de êxito`,
          valorSub: configExito.valor_minimo
            ? `Mínimo ${formatCurrency(configExito.valor_minimo)}`
            : undefined,
        }
      }

      case 'por_cargo': {
        if (valoresCargo.length === 0) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'lista',
          items: valoresCargo.map((cargo) => ({
            key: cargo.cargo_id,
            rotulo: (
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {cargo.cargo_nome || 'Cargo'}
              </span>
            ),
            valor: `${formatCurrency(cargo.valor_negociado || 0)}/h`,
          })),
        }
      }

      case 'por_ato': {
        if (atos.length === 0) return { ...baseProps, status: 'vazio' }
        return {
          ...baseProps,
          status: 'lista',
          items: atos.map((ato) => {
            let valor = '—'
            if (ato.percentual_valor_causa) {
              valor = formatPercent(ato.percentual_valor_causa)
              if (ato.valor_fixo) valor += ` · mín. ${formatCurrency(ato.valor_fixo)}`
            } else if (ato.valor_fixo) {
              valor = formatCurrency(ato.valor_fixo)
            }
            return {
              key: ato.ato_tipo_id,
              rotulo: (
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  {ato.ato_nome || 'Ato'}
                </span>
              ),
              valor,
            }
          }),
        }
      }

      default:
        return { ...baseProps, status: 'vazio' }
    }
  }

  const formaCards: FormaCardData[] = formas
    .map((forma, i) => buildFormaCardData(forma, i))
    .filter((f): f is FormaCardData => f !== null)

  // Cobrança por pasta adicional (contratos não-pasta com valor_por_processo)
  if (configPasta?.valor_por_processo && !formas.includes('por_pasta')) {
    const data = buildFormaCardData('por_pasta', formaCards.length)
    if (data) {
      data.ordemLabel = 'Cobrança adicional'
      formaCards.push(data)
    }
  }

  const processosVisiveis = processosExpandidos
    ? processosVinculados
    : processosVinculados.slice(0, PROCESSOS_LIMITE_INICIAL)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[92vh] !p-0 gap-0 overflow-hidden flex flex-col">
        {/* ===== HEADER — duas colunas: contrato + cliente ===== */}
        <DialogHeader className="px-6 pt-8 pb-6 border-b border-[#89bcbe]/25 dark:border-teal-500/20 space-y-0 bg-gradient-to-br from-[#e8f5f5] via-[#f0f9f9] to-white dark:from-teal-500/15 dark:via-teal-500/5 dark:to-surface-1 shadow-[0_1px_0_0_rgba(137,188,190,0.15),0_2px_4px_-2px_rgba(52,73,94,0.06)]">
          <div className="flex flex-col md:flex-row md:items-stretch gap-5">
            {/* Coluna 1 — Contrato */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#89bcbe] to-[#6a9a9c] dark:from-teal-500/70 dark:to-teal-700/70 shadow-md shadow-[#89bcbe]/30 dark:shadow-teal-900/40 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#46627f] dark:text-slate-400 font-semibold">
                  Contrato Nº {contrato.numero_contrato}
                </p>
                <DialogTitle className="text-[22px] font-semibold text-[#34495e] dark:text-slate-100 mt-0.5 truncate leading-tight">
                  {tituloPrincipal}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                  <Badge className={cn('text-[10px]', statusBadge.class)}>
                    <statusBadge.Icon className="w-3 h-3 mr-1" />
                    {statusBadge.label}
                  </Badge>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {periodoTexto}
                  </span>
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="hidden md:block w-px bg-[#89bcbe]/30 dark:bg-teal-500/20" />

            {/* Coluna 2 — Cliente */}
            <div className="md:w-[38%] min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#46627f] dark:text-slate-400 font-semibold">
                Cliente
              </p>
              <p className="text-base font-semibold text-[#34495e] dark:text-slate-100 mt-1 truncate">
                {contrato.cliente_nome}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {TIPO_SERVICO_LABELS[contrato.tipo_servico] || contrato.tipo_servico}
              </p>
              {grupoClientes && grupoClientes.clientes && (
                <button
                  type="button"
                  onClick={() => setGrupoExpandido(!grupoExpandido)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#89bcbe] hover:text-[#46627f] transition-colors"
                >
                  <Users className="w-3 h-3" />
                  <span>Grupo econômico · {grupoClientes.clientes.length} empresas</span>
                  {grupoExpandido ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Expansão do grupo de clientes (inline no header) */}
          {grupoExpandido && grupoClientes && grupoClientes.clientes && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                {grupoClientes.clientes.map((cliente) => (
                  <div
                    key={cliente.cliente_id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[#34495e] dark:text-slate-200 truncate">
                        {cliente.nome}
                      </span>
                    </div>
                    {grupoClientes.cliente_pagador_id === cliente.cliente_id && (
                      <Badge className="text-[9px] bg-[#89bcbe]/10 text-[#46627f] dark:text-slate-300 border border-[#89bcbe]/30 flex-shrink-0">
                        CNPJ Pagador
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 italic">
                Faturamento consolidado para o CNPJ pagador.
              </p>
            </div>
          )}
        </DialogHeader>

        {/* ===== CORPO ===== */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
            </div>
          ) : (
            <div className="px-6 py-6 space-y-7">
              {/* Bloco 1 — Regras de Cobrança (foco principal) */}
              <section>
                <SectionTitle className="mb-3">Regras de Cobrança</SectionTitle>
                <div className="space-y-2.5">
                  {formaCards.length === 0 ? (
                    <EmptyInline texto="Nenhuma forma de cobrança configurada." />
                  ) : (
                    formaCards.map((data, i) => <FormaCard key={i} data={data} />)
                  )}

                  {/* Reajuste como sub-cláusula */}
                  {reajusteAplicavel && reajusteData && (
                    <div className="rounded-lg border border-[#89bcbe]/30 dark:border-teal-500/30 bg-[#f0f9f9] dark:bg-teal-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md bg-white dark:bg-surface-1 border border-[#89bcbe]/30 dark:border-teal-500/30 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-[#89bcbe]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                                Reajuste Monetário
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {reajusteData.valor_atualizado && reajusteData.data_ultimo_reajuste
                                  ? `Atualizado em ${formatBrazilDate(parseDateInBrazil(reajusteData.data_ultimo_reajuste))}`
                                  : 'Nenhum reajuste aplicado ainda'}
                              </p>
                            </div>
                            {reajusteData.valor_atualizado && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-base font-semibold text-[#34495e] dark:text-slate-100">
                                  {formatCurrency(reajusteData.valor_atualizado)}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  valor atualizado
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#89bcbe]/30 dark:border-teal-500/20">
                            <Select value={selectedIndice} onValueChange={setSelectedIndice}>
                              <SelectTrigger className="h-9 text-xs bg-white dark:bg-surface-1 border-slate-200 dark:border-slate-700 flex-1">
                                <SelectValue placeholder="Selecione o índice" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INPC">INPC — Preços ao Consumidor</SelectItem>
                                <SelectItem value="IPCA">IPCA — Inflação Oficial</SelectItem>
                                <SelectItem value="IGP-M">IGP-M — Aluguéis</SelectItem>
                                <SelectItem value="SELIC">SELIC — Juros Básicos</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={aplicarReajuste}
                              disabled={loadingReajuste}
                              className="h-9 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
                            >
                              {loadingReajuste ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Bloco 2 — Processos Vinculados (logo abaixo das regras) */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>
                    Processos Vinculados{' '}
                    <span className="text-slate-400 font-normal">
                      ({processosVinculados.length})
                    </span>
                  </SectionTitle>
                  {processosVinculados.length > PROCESSOS_LIMITE_INICIAL && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200"
                      onClick={() => setProcessosExpandidos(!processosExpandidos)}
                    >
                      {processosExpandidos ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Recolher
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Ver todos
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {processosVinculados.length === 0 ? (
                  <EmptyInline texto="Nenhum processo vinculado a este contrato." />
                ) : (
                  <div
                    className={cn(
                      'grid grid-cols-1 md:grid-cols-2 gap-2.5',
                      processosExpandidos && 'max-h-[360px] overflow-y-auto pr-1',
                    )}
                  >
                    {processosVisiveis.map((processo) => (
                      <Link
                        key={processo.id}
                        href={`/dashboard/processos/${processo.id}`}
                        className="flex items-start gap-3 p-3.5 bg-white dark:bg-surface-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-[#89bcbe]/50 hover:bg-[#f0f9f9]/40 dark:hover:bg-teal-500/5 hover:-translate-y-0.5 transition-all duration-150 group min-w-0"
                      >
                        <div className="w-10 h-10 rounded-md bg-[#f0f9f9] dark:bg-teal-500/10 border border-[#89bcbe]/30 dark:border-teal-500/30 flex items-center justify-center flex-shrink-0">
                          <Scale className="w-4 h-4 text-[#89bcbe]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200 truncate">
                              {processo.numero_pasta}
                            </span>
                            <Badge
                              className={cn(
                                'text-[9px] px-1.5 py-0 flex-shrink-0',
                                processo.status === 'ativo'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
                              )}
                            >
                              {processo.status}
                            </Badge>
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {processo.cliente_nome}
                            {processo.parte_contraria && (
                              <span className="text-slate-400">
                                {' '}
                                vs {processo.parte_contraria}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                            {processo.numero_cnj}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#89bcbe] transition-colors flex-shrink-0 mt-0.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Bloco 3 — Observações (só quando houver) */}
              {contrato.observacoes && (
                <section>
                  <SectionTitle className="mb-3">Observações</SectionTitle>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-0 p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {contrato.observacoes}
                    </p>
                  </div>
                </section>
              )}

              {/* Bloco 4 — Comissão Padrão (colapsável, só quando configurada) */}
              {comissoesPadrao.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setComissoesExpandida(!comissoesExpandida)}
                    className="flex items-center gap-2 w-full text-left group py-1"
                  >
                    <SectionTitle>
                      Comissão Padrão{' '}
                      <span className="text-slate-400 font-normal">
                        ({comissoesPadrao.length}{' '}
                        {comissoesPadrao.length === 1 ? 'advogado' : 'advogados'})
                      </span>
                    </SectionTitle>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-slate-400 ml-auto transition-transform group-hover:text-[#46627f]',
                        comissoesExpandida && 'rotate-180',
                      )}
                    />
                  </button>
                  {comissoesExpandida && (
                    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-0 p-4 space-y-2.5">
                      {comissoesPadrao.map((c, i) => (
                        <div
                          key={c.id || `${c.user_id}-${i}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-[#34495e] dark:text-slate-200 truncate">
                              {c.nome || 'Advogado'}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200 flex-shrink-0">
                            {formatPercent(c.percentual)}
                          </span>
                        </div>
                      ))}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 mt-1 border-t border-slate-200 dark:border-slate-700">
                        Pré-preenche o rateio ao registrar recebimentos.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-2/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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

// =====================================================================
// Helpers de UI
// =====================================================================

interface FormaCardData {
  icone: React.ElementType
  label: string
  ordemLabel: string
  status: 'inline' | 'lista' | 'vazio'
  valorPrincipal?: string
  valorSub?: string
  items?: ItemValor[]
}

const ITENS_LIMITE_INICIAL = 6

function FormaCard({ data }: { data: FormaCardData }) {
  const [expanded, setExpanded] = useState(false)
  const { icone: Icon, label, ordemLabel, status, valorPrincipal, valorSub, items } = data
  const isLista = status === 'lista'
  const allItems = items || []
  const hasMore = allItems.length > ITENS_LIMITE_INICIAL
  const itemsVisiveis = expanded || !hasMore ? allItems : allItems.slice(0, ITENS_LIMITE_INICIAL)
  const useDuasColunas = isLista && itemsVisiveis.length >= 4

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-[#f0f9f9] dark:bg-teal-500/10 border border-[#89bcbe]/30 dark:border-teal-500/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[#89bcbe]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">{label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{ordemLabel}</p>
          </div>
        </div>

        {status === 'vazio' && (
          <span className="text-xs text-slate-400 italic flex-shrink-0">Não configurado</span>
        )}

        {valorPrincipal && (
          <div className="text-right flex-shrink-0">
            <p className="text-base font-semibold text-[#34495e] dark:text-slate-100">
              {valorPrincipal}
            </p>
            {valorSub && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{valorSub}</p>
            )}
          </div>
        )}
      </div>

      {isLista && allItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div
            className={cn(
              'grid gap-x-8 gap-y-2',
              useDuasColunas ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
            )}
          >
            {itemsVisiveis.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 text-sm min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">{item.rotulo}</div>
                <span className="font-semibold text-[#34495e] dark:text-slate-200 flex-shrink-0">
                  {item.valor}
                </span>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#89bcbe] hover:text-[#46627f] transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Ver mais ({allItems.length - ITENS_LIMITE_INICIAL})
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-wider text-[#46627f] dark:text-slate-400',
        className,
      )}
    >
      {children}
    </p>
  )
}

function EmptyInline({ texto }: { texto: string }) {
  return (
    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1 py-2">{texto}</p>
  )
}
