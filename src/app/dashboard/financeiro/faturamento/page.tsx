'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  FileOutput,
  RefreshCw,
  Building2,
  ChevronDown,
  Check,
  FolderOpen,
  Search,
  X,
  Landmark,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useFaturamento } from '@/hooks/useFaturamento'
import { useFechamentosPasta } from '@/hooks/useFechamentosPasta'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { PreviewCollapsible } from '@/components/faturamento/PreviewCollapsible'
import { EditarLancamentoModal } from '@/components/faturamento/EditarLancamentoModal'
import { FaturasTable } from '@/components/faturamento/FaturasTable'
import { ClientesTable } from '@/components/faturamento/ClientesTable'
import { ModalRecebimento, type ModalRecebimentoItem } from '@/components/financeiro/ModalRecebimento'
import NotasDebitoContent from '@/components/financeiro/NotasDebitoContent'
import { useNotasDebito } from '@/hooks/useNotasDebito'
import { createClient } from '@/lib/supabase/client'
import { cn, formatHoras } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  ClienteParaFaturar,
  LancamentoProntoFaturar,
  FaturaGerada,
  ContractLimits,
} from '@/hooks/useFaturamento'

/** Adiciona N dias úteis a uma data (pula sáb/dom) */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

export default function FaturamentoPage() {
  const { escritorioAtivo } = useEscritorioAtivo()

  // Multi-escritório states
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  console.log('FaturamentoPage: escritoriosSelecionados =', escritoriosSelecionados)

  const {
    loading,
    error: faturamentoError,
    loadClientesParaFaturar,
    loadLancamentosPorCliente,
    loadFaturasGeradas,
    gerarFatura,
    desmontarFatura,
    loadContractLimits,
    loadContasBancarias,
    editarLancamentoHonorario,
    excluirLancamentoHonorario,
  } = useFaturamento(escritoriosSelecionados)

  const {
    loading: loadingPasta,
    removerProcesso: removerProcessoPasta,
    cancelarFechamento,
    executarFechamentoManual,
  } = useFechamentosPasta(escritoriosSelecionados)

  const { notas: notasDebito, clientesComDespesas } = useNotasDebito()

  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<'prontos' | 'faturados' | 'notas_debito'>('prontos')

  const [clientes, setClientes] = useState<ClienteParaFaturar[]>([])
  const [faturas, setFaturas] = useState<FaturaGerada[]>([])
  const [selectedCliente, setSelectedCliente] = useState<ClienteParaFaturar | null>(null)
  const [lancamentos, setLancamentos] = useState<LancamentoProntoFaturar[]>([])
  const [selectedLancamentosIds, setSelectedLancamentosIds] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Estado para modal de recebimento
  const [faturaParaReceber, setFaturaParaReceber] = useState<FaturaGerada | null>(null)
  const [comissoesPadraoDaFatura, setComissoesPadraoDaFatura] = useState<
    import('@/hooks/useContratosHonorarios').ContratoComissaoPadrao[]
  >([])

  // Estado para editar/excluir lançamentos
  const [editLancamento, setEditLancamento] = useState<LancamentoProntoFaturar | null>(null)
  const [deleteLancamento, setDeleteLancamento] = useState<LancamentoProntoFaturar | null>(null)

  // Contadores para badges das abas
  const faturasEmAberto = useMemo(() =>
    faturas.filter(f => f.status !== 'paga' && f.status !== 'cancelada').length,
    [faturas]
  )
  const notasEmAberto = useMemo(() =>
    notasDebito.filter(n => n.status !== 'paga' && n.status !== 'cancelada').length,
    [notasDebito]
  )
  const notasDisponivelGerar = clientesComDespesas.length

  // Pesquisa e filtros de faturas
  const [searchFaturas, setSearchFaturas] = useState('')
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<string>>(new Set())

  const toggleFiltro = (filtro: string) => {
    setFiltrosAtivos(prev => {
      const next = new Set(prev)
      if (next.has(filtro)) {
        next.delete(filtro)
      } else {
        next.add(filtro)
      }
      return next
    })
  }

  const faturasFiltradas = useMemo(() => {
    let resultado = [...faturas]

    // Filtro por texto (número, cliente ou valor)
    if (searchFaturas.trim()) {
      const termo = searchFaturas.toLowerCase().trim()
      resultado = resultado.filter(
        (f) =>
          f.numero_fatura.toLowerCase().includes(termo) ||
          f.cliente_nome.toLowerCase().includes(termo) ||
          f.valor_total.toFixed(2).includes(termo)
      )
    }

    // Filtros toggle (combinação OR entre ativos)
    if (filtrosAtivos.size > 0) {
      resultado = resultado.filter((f) => {
        const cat = f.categoria_status
        if (filtrosAtivos.has('em_dia') && ['pendente', 'parcial'].includes(cat)) return true
        if (filtrosAtivos.has('vencidas') && ['vencido', 'parcial_vencido', 'atrasado'].includes(cat)) return true
        if (filtrosAtivos.has('quitadas') && cat === 'pago') return true
        if (filtrosAtivos.has('canceladas') && cat === 'cancelado') return true
        return false
      })
    }

    // Ordenação: em dia (recentes primeiro) → vencidas → pagas/canceladas
    resultado.sort((a, b) => {
      const catOrder = (cat: string) => {
        if (['pago', 'cancelado'].includes(cat)) return 2
        if (['vencido', 'parcial_vencido', 'atrasado'].includes(cat)) return 1
        return 0
      }
      const ordemA = catOrder(a.categoria_status)
      const ordemB = catOrder(b.categoria_status)
      if (ordemA !== ordemB) return ordemA - ordemB
      return new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()
    })

    return resultado
  }, [faturas, searchFaturas, filtrosAtivos])

  const filtroContagem = useMemo(() => {
    let emDia = 0, vencidas = 0, quitadas = 0, canceladas = 0
    for (const f of faturas) {
      const cat = f.categoria_status
      if (['pendente', 'parcial'].includes(cat)) emDia++
      else if (['vencido', 'parcial_vencido', 'atrasado'].includes(cat)) vencidas++
      else if (cat === 'pago') quitadas++
      else if (cat === 'cancelado') canceladas++
    }
    return { em_dia: emDia, vencidas, quitadas, canceladas }
  }, [faturas])

  // Dialog de confirmação para desmontar fatura
  const [faturaParaDesmontar, setFaturaParaDesmontar] = useState<string | null>(null)

  // Modal de confirmação para gerar fatura
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [contasBancarias, setContasBancarias] = useState<{ id: string; banco: string; agencia: string; numero_conta: string; saldo_atual: number }[]>([])
  const [contaBancariaSelecionada, setContaBancariaSelecionada] = useState<string>('')
  const [advogadosEscritorio, setAdvogadosEscritorio] = useState<Array<{ id: string; user_id: string; nome: string; percentual_comissao: number | null }>>([])


  // Limites contratuais para preview
  const [contractLimits, setContractLimits] = useState<Record<string, ContractLimits>>({})

  // Modal de execução manual de fechamento de pastas
  const [showExecutarModal, setShowExecutarModal] = useState(false)
  const [competenciaManual, setCompetenciaManual] = useState('')

  // Carregar escritórios do grupo (com todos selecionados por padrão)
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        // Iniciar com TODOS selecionados (visão consolidada padrão)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Funções do seletor de escritórios
  const toggleEscritorio = (escritorioId: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(escritorioId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== escritorioId)
      } else {
        return [...prev, escritorioId]
      }
    })
  }

  // Mapa de cores por escritório (mesmo padrão de receitas-despesas)
  const ESCRITORIO_COLORS = [
    'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
    'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/40',
    'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
  ]
  const escritorioColorMap = new Map<string, string>()
  escritoriosGrupo.forEach((e, i) => {
    escritorioColorMap.set(e.id, ESCRITORIO_COLORS[i % ESCRITORIO_COLORS.length])
  })

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (escritorioId: string) => {
    setEscritoriosSelecionados([escritorioId])
  }

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) {
      return 'Todos os escritórios'
    } else if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    } else {
      return `${escritoriosSelecionados.length} escritórios`
    }
  }

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadData()
    }
  }, [escritoriosSelecionados])

  const loadData = async () => {
    const supabase = createClient()
    const [clientesData, faturasData] = await Promise.all([
      loadClientesParaFaturar(),
      loadFaturasGeradas(),
    ])
    // Enriquecer cada cliente com o nome do escritório (apelido quando disponível)
    const enriched = clientesData.map(c => {
      const esc = escritoriosGrupo.find(e => e.id === c.escritorio_id)
      return { ...c, escritorio_nome: esc?.apelido || esc?.nome || '' }
    })
    setClientes(enriched)
    setFaturas(faturasData)

    // Carregar advogados do escritório para participação
    if (advogadosEscritorio.length === 0) {
      const { data: advData } = await supabase
        .from('escritorios_usuarios')
        .select('id, user_id, percentual_comissao, profiles!usuarios_escritorios_user_id_fkey!inner(nome_completo)')
        .in('escritorio_id', escritoriosSelecionados)
        .eq('ativo', true)
      if (advData) {
        // Deduplicar por user_id (mesmo usuário pode estar em múltiplos escritórios do grupo)
        const seen = new Set<string>()
        const unique = advData.filter((u: any) => {
          if (seen.has(u.user_id)) return false
          seen.add(u.user_id)
          return true
        })
        setAdvogadosEscritorio(unique.map((u: any) => ({
          id: u.id,
          user_id: u.user_id,
          nome: u.profiles?.nome_completo || 'Usuário',
          percentual_comissao: u.percentual_comissao,
        })))
      }
    }
  }

  const handlePreview = async (cliente: ClienteParaFaturar) => {
    setSelectedCliente(cliente)
    const lancamentosData = await loadLancamentosPorCliente(cliente.cliente_id, cliente.escritorio_id)
    setLancamentos(lancamentosData)
    // Pré-selecionar apenas lançamentos do período (vencimento até fim do mês atual)
    // Honorários futuros ficam desmarcados — usuário inclui manualmente se quiser antecipar
    const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    const fimMesStr = fimMes.toISOString().split('T')[0]
    setSelectedLancamentosIds(
      lancamentosData
        .filter((l) => l.tipo_lancamento !== 'honorario' || (l.data_vencimento || '') <= fimMesStr)
        .map((l) => l.lancamento_id)
    )

    // Carregar limites contratuais (min/max mensal) dos contratos envolvidos
    const contratoIds = [...new Set(lancamentosData.map(l => l.contrato_id).filter(Boolean))] as string[]
    const limits = await loadContractLimits(contratoIds)
    setContractLimits(limits)

    setShowPreview(true)
  }

  const handleToggleLancamento = (id: string) => {
    setSelectedLancamentosIds((prev) =>
      prev.includes(id) ? prev.filter((lid) => lid !== id) : [...prev, id]
    )
  }

  const handleGerarFatura = async () => {
    if (!selectedCliente) return

    // Calcular defaults — 5 dias úteis à frente
    const hoje = new Date()
    const vencimento = addBusinessDays(hoje, 5)

    const toYMD = (d: Date) => d.toISOString().split('T')[0]
    setDataEmissao(toYMD(hoje))
    setDataVencimento(toYMD(vencimento))
    setContaBancariaSelecionada('')

    // Carregar contas bancárias disponíveis
    const contas = await loadContasBancarias()
    setContasBancarias(contas)

    setShowConfirmModal(true)
  }

  const handleConfirmarFatura = async () => {
    if (!selectedCliente) return

    const honorariosIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'honorario')
    )
    const timesheetIds = selectedLancamentosIds.filter((id) =>
      lancamentos.find((l) => l.lancamento_id === id && l.tipo_lancamento === 'timesheet')
    )
    const fechamentosIds = lancamentos
      .filter(
        (l) =>
          l.tipo_lancamento === 'pasta' &&
          selectedLancamentosIds.includes(l.lancamento_id) &&
          l.fechamento_id
      )
      .map((l) => l.fechamento_id as string)

    const faturaId = await gerarFatura(
      selectedCliente.cliente_id,
      honorariosIds,
      timesheetIds,
      undefined, // observações
      dataVencimento || undefined,
      selectedCliente.escritorio_id, // escritorioIdOverride — gerar no escritório correto
      fechamentosIds,
      dataEmissao || undefined,
      contaBancariaSelecionada || undefined
    )

    if (faturaId) {
      toast.success('Fatura gerada com sucesso!')
      setShowConfirmModal(false)
      setSelectedCliente(null)
      setShowPreview(false)
      setSelectedLancamentosIds([])
      setLancamentos([])
      loadData()
      setActiveTab('faturados')
    } else {
      toast.error(faturamentoError || 'Erro ao gerar fatura. Tente novamente.')
    }
  }

  const handleDesmontarFatura = async (faturaId: string) => {
    const success = await desmontarFatura(faturaId)

    if (success) {
      toast.success('Fatura desmontada com sucesso!')
      setFaturaParaDesmontar(null)
      loadData()
      setActiveTab('prontos')
    } else {
      toast.error('Erro ao desmontar fatura. Tente novamente.')
    }
  }

  const handleRemoverProcessoPasta = async (fechamentoId: string, processoId: string) => {
    const success = await removerProcessoPasta(fechamentoId, processoId)
    if (success) {
      if (selectedCliente) {
        const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id)
        setLancamentos(lancamentosData)
      }
      loadData()
    }
  }

  const handleExcluirPasta = async (fechamentoId: string) => {
    const success = await cancelarFechamento(fechamentoId)
    if (success) {
      toast.success('Fechamento excluído')
      if (selectedCliente) {
        const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id)
        setLancamentos(lancamentosData)
        setSelectedLancamentosIds((prev) =>
          prev.filter((id) => lancamentosData.some((l) => l.lancamento_id === id))
        )
      }
      loadData()
    } else {
      toast.error('Erro ao excluir fechamento')
    }
  }

  const handleExecutarFechamento = async () => {
    const competencia = competenciaManual ? `${competenciaManual}-01` : undefined
    const result = await executarFechamentoManual(competencia)
    if (result.success) {
      const qtd = result.fechamentos_criados ?? 0
      toast.success(
        qtd > 0
          ? `${qtd} fechamento${qtd !== 1 ? 's' : ''} gerado${qtd !== 1 ? 's' : ''} com sucesso`
          : 'Nenhum fechamento novo gerado (contratos já processados para este mês)'
      )
      setShowExecutarModal(false)
      setCompetenciaManual('')
      loadData()
    } else {
      toast.error('Erro ao executar fechamento de pastas')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#34495e] dark:text-slate-200">Faturamento Inteligente</h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gere faturas consolidadas automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Seletor de Escritórios */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2"
                >
                  <Building2 className="h-4 w-4 mr-2 text-[#34495e] dark:text-slate-200" />
                  <span className="text-sm">{getSeletorLabel()}</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-slate-400 dark:text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1">
                  {/* Opção: Todos */}
                  <button
                    onClick={selecionarTodos}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      escritoriosSelecionados.length === escritoriosGrupo.length
                        ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                        : 'hover:bg-slate-100 dark:hover:bg-surface-3 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <span className="font-medium">Todos os escritórios</span>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

                  {/* Lista de escritórios */}
                  {escritoriosGrupo.map((escritorio) => (
                    <div
                      key={escritorio.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2"
                    >
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label
                        htmlFor={`esc-${escritorio.id}`}
                        className="flex-1 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {escritorio.nome}
                      </label>
                      <button
                        onClick={() => selecionarApenas(escritorio.id)}
                        className="text-[10px] text-[#1E3A8A] hover:underline"
                      >
                        apenas
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const hoje = new Date()
              setCompetenciaManual(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)
              setShowExecutarModal(true)
            }}
            className="border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          >
            <FolderOpen className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Fechamento de Pastas</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={cn('h-4 w-4 md:mr-2', loading && 'animate-spin')} />
            <span className="hidden md:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabs: Prontos para Faturar | Faturados */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'prontos' | 'faturados' | 'notas_debito')}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="prontos">
            Prontos para Faturar
            {clientes.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {clientes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="faturados">
            Faturados
            {faturasEmAberto > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {faturasEmAberto}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notas_debito">
            <FileOutput className="h-4 w-4 mr-1.5" />
            Notas de Débito
            {(notasEmAberto > 0 || notasDisponivelGerar > 0) && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {notasEmAberto + notasDisponivelGerar}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Prontos para Faturar */}
        <TabsContent value="prontos" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Lista de Clientes — sempre full-width */}
            <div className="xl:col-span-12">
              <ClientesTable
                clientes={clientes}
                selectedCliente={selectedCliente}
                onSelectCliente={handlePreview}
                loading={loading}
                showEscritorio={escritoriosGrupo.length > 1}
                escritorioColorMap={escritorioColorMap}
              />
            </div>
          </div>

          {/* Modal de Preview — Dialog fora do grid */}
          {selectedCliente && (
            <PreviewCollapsible
              open={showPreview}
              onOpenChange={(open) => {
                if (!open) {
                  setShowPreview(false)
                  setSelectedCliente(null)
                  setSelectedLancamentosIds([])
                  setLancamentos([])
                }
              }}
              clienteNome={selectedCliente.cliente_nome}
              lancamentos={lancamentos}
              selectedIds={selectedLancamentosIds}
              onToggleLancamento={handleToggleLancamento}
              onSetSelectedIds={setSelectedLancamentosIds}
              onGerarFatura={handleGerarFatura}
              pastas={selectedCliente.pastas}
              onRemoverProcessoPasta={handleRemoverProcessoPasta}
              onExcluirPasta={handleExcluirPasta}
              onEditLancamento={(l) => setEditLancamento(l)}
              onDeleteLancamento={(l) => setDeleteLancamento(l)}
              contractLimits={contractLimits}
            />
          )}

          {/* Modal de Edição de Lançamento */}
          <EditarLancamentoModal
            open={!!editLancamento}
            onOpenChange={(open) => { if (!open) setEditLancamento(null) }}
            lancamento={editLancamento}
            onSalvar={async (lancamentoId, dados, escopo, regraId) => {
              const success = await editarLancamentoHonorario(lancamentoId, dados, escopo, regraId)
              if (success) {
                toast.success(escopo === 'este_e_proximos' ? 'Lançamento e próximos meses atualizados' : 'Lançamento atualizado')
                if (selectedCliente) {
                  const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id, selectedCliente.escritorio_id)
                  setLancamentos(lancamentosData)
                }
                loadData()
              } else {
                toast.error('Erro ao editar lançamento')
              }
              return success
            }}
          />

          {/* Dialog de Exclusão de Lançamento */}
          <AlertDialog open={!!deleteLancamento} onOpenChange={(open) => { if (!open) setDeleteLancamento(null) }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteLancamento && (
                    <>
                      Deseja excluir o lançamento <strong>{deleteLancamento.descricao}</strong> de{' '}
                      <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deleteLancamento.valor || 0)}</strong>?
                      {deleteLancamento.regra_recorrencia_id && (
                        <span className="block mt-2 text-amber-600">
                          Este lançamento faz parte de uma recorrência. A exclusão cancelará apenas este mês.
                        </span>
                      )}
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                {deleteLancamento?.regra_recorrencia_id && (
                  <AlertDialogAction
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={async () => {
                      if (!deleteLancamento) return
                      const success = await excluirLancamentoHonorario(deleteLancamento.lancamento_id, 'este_e_cancelar', deleteLancamento.regra_recorrencia_id)
                      if (success) {
                        toast.success('Lançamento excluído e recorrência cancelada')
                        if (selectedCliente) {
                          const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id, selectedCliente.escritorio_id)
                          setLancamentos(lancamentosData)
                          setSelectedLancamentosIds(prev => prev.filter(id => lancamentosData.some(l => l.lancamento_id === id)))
                        }
                        loadData()
                      } else {
                        toast.error('Erro ao excluir lançamento')
                      }
                      setDeleteLancamento(null)
                    }}
                  >
                    Excluir e cancelar recorrência
                  </AlertDialogAction>
                )}
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    if (!deleteLancamento) return
                    const success = await excluirLancamentoHonorario(deleteLancamento.lancamento_id, 'este', deleteLancamento.regra_recorrencia_id)
                    if (success) {
                      toast.success('Lançamento excluído')
                      if (selectedCliente) {
                        const lancamentosData = await loadLancamentosPorCliente(selectedCliente.cliente_id, selectedCliente.escritorio_id)
                        setLancamentos(lancamentosData)
                        setSelectedLancamentosIds(prev => prev.filter(id => lancamentosData.some(l => l.lancamento_id === id)))
                      }
                      loadData()
                    } else {
                      toast.error('Erro ao excluir lançamento')
                    }
                    setDeleteLancamento(null)
                  }}
                >
                  Excluir somente este
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Tab: Faturados */}
        <TabsContent value="faturados" className="mt-6">
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader className="pb-2 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Faturas Geradas
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    {faturasFiltradas.length === faturas.length
                      ? `${faturas.length} ${faturas.length === 1 ? 'fatura' : 'faturas'}`
                      : `${faturasFiltradas.length} de ${faturas.length}`}
                  </Badge>
                </div>
              </div>

              {/* Barra de pesquisa e filtros toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* Pesquisa */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Buscar fatura, cliente ou valor..."
                    value={searchFaturas}
                    onChange={(e) => setSearchFaturas(e.target.value)}
                    className="pl-9 pr-8 h-8 text-sm border-slate-200 dark:border-slate-700"
                  />
                  {searchFaturas && (
                    <button
                      onClick={() => setSearchFaturas('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros toggle on/off */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {filtroContagem.em_dia > 0 && (
                    <button
                      onClick={() => toggleFiltro('em_dia')}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                        filtrosAtivos.has('em_dia')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-surface-2 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                      )}
                    >
                      Em dia ({filtroContagem.em_dia})
                    </button>
                  )}
                  {filtroContagem.vencidas > 0 && (
                    <button
                      onClick={() => toggleFiltro('vencidas')}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                        filtrosAtivos.has('vencidas')
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white dark:bg-surface-2 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10'
                      )}
                    >
                      Vencidas ({filtroContagem.vencidas})
                    </button>
                  )}
                  {filtroContagem.quitadas > 0 && (
                    <button
                      onClick={() => toggleFiltro('quitadas')}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                        filtrosAtivos.has('quitadas')
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-surface-2 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                      )}
                    >
                      Quitadas ({filtroContagem.quitadas})
                    </button>
                  )}
                  {filtroContagem.canceladas > 0 && (
                    <button
                      onClick={() => toggleFiltro('canceladas')}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                        filtrosAtivos.has('canceladas')
                          ? 'bg-slate-600 text-white border-slate-600'
                          : 'bg-white dark:bg-surface-2 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/30 hover:bg-slate-50 dark:hover:bg-slate-500/10'
                      )}
                    >
                      Canceladas ({filtroContagem.canceladas})
                    </button>
                  )}
                  {(filtrosAtivos.size > 0 || searchFaturas) && (
                    <button
                      onClick={() => { setFiltrosAtivos(new Set()); setSearchFaturas('') }}
                      className="px-2 py-1 rounded-full text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <FaturasTable
                faturas={faturasFiltradas}
                onDesmontar={(id) => setFaturaParaDesmontar(id)}
                onReceber={async (fatura) => {
                  if (contasBancarias.length === 0) {
                    const contas = await loadContasBancarias()
                    setContasBancarias(contas)
                  }
                  setFaturaParaReceber(fatura)
                  setComissoesPadraoDaFatura([])

                  // Buscar contrato_id da primeira receita vinculada à fatura
                  try {
                    const { data: receitaContrato } = await supabase
                      .from('financeiro_receitas')
                      .select('contrato_id')
                      .eq('fatura_id', fatura.fatura_id)
                      .not('contrato_id', 'is', null)
                      .limit(1)
                      .maybeSingle()

                    const contratoId = receitaContrato?.contrato_id ?? null
                    if (!contratoId) return

                    const { data: comissoes } = await supabase
                      .from('financeiro_contratos_comissao_padrao')
                      .select('id, user_id, percentual, ordem, ativo, observacoes')
                      .eq('contrato_id', contratoId)
                      .eq('ativo', true)
                      .order('ordem', { ascending: true })

                    if (!comissoes || comissoes.length === 0) return

                    const hidratadas = comissoes.map((c: {
                      id: string
                      user_id: string
                      percentual: number | string
                      ordem?: number
                      ativo?: boolean
                      observacoes?: string | null
                    }) => {
                      const adv = advogadosEscritorio.find((a) => a.user_id === c.user_id)
                      return {
                        id: c.id,
                        user_id: c.user_id,
                        nome: adv?.nome || '',
                        percentual: Number(c.percentual),
                        ordem: c.ordem,
                        ativo: c.ativo,
                        observacoes: c.observacoes ?? null,
                      }
                    })
                    setComissoesPadraoDaFatura(hidratadas)
                  } catch (err) {
                    console.error('[faturamento] Erro ao carregar comissões do contrato:', err)
                  }
                }}
                loading={loading}
                showEscritorio={escritoriosGrupo.length > 1}
                escritoriosMap={new Map(escritoriosGrupo.map(e => [e.id, e.apelido || e.nome]))}
                escritorioColorMap={escritorioColorMap}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notas de Débito */}
        <TabsContent value="notas_debito" className="mt-6">
          <NotasDebitoContent
            embedded
            showEscritorio={escritoriosGrupo.length > 1}
            escritoriosMap={new Map(escritoriosGrupo.map(e => [e.id, e.apelido || e.nome]))}
            escritorioColorMap={escritorioColorMap}
          />
        </TabsContent>

      </Tabs>

      {/* Dialog de Confirmação - Desmontar Fatura */}
      <AlertDialog
        open={faturaParaDesmontar !== null}
        onOpenChange={() => setFaturaParaDesmontar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmontar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desmontar esta fatura? Os lançamentos retornarão para o
              estado "pronto para faturar" e a fatura será cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (faturaParaDesmontar) {
                  handleDesmontarFatura(faturaParaDesmontar)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, desmontar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Gerar Fatura */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200 text-sm">
              <FileText className="h-4 w-4" />
              Confirmar Geração de Fatura
            </DialogTitle>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-3">
              {/* Resumo */}
              <div className="bg-slate-50 dark:bg-surface-0 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                  <span className="font-medium text-[#34495e] dark:text-slate-200">{selectedCliente.cliente_nome}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Itens</span>
                  <span className="font-medium text-[#34495e] dark:text-slate-200">
                    {selectedLancamentosIds.length} {selectedLancamentosIds.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Valor Total</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {(() => {
                      const selectedLancs = lancamentos.filter(l => selectedLancamentosIds.includes(l.lancamento_id))
                      let total = selectedLancs.reduce((sum, l) => sum + (l.valor || 0), 0)

                      // Aplicar ajustes contratuais (min/max)
                      const contratoIds = [...new Set(selectedLancs.map(l => l.contrato_id).filter(Boolean))] as string[]
                      for (const cid of contratoIds) {
                        const limits = contractLimits[cid]
                        if (!limits) continue
                        const subtotalHoras = selectedLancs
                          .filter(l => l.contrato_id === cid && l.tipo_lancamento === 'timesheet')
                          .reduce((sum, l) => sum + (l.valor || 0), 0)
                        if (subtotalHoras === 0) continue
                        if (limits.min !== null && subtotalHoras < limits.min) {
                          total += (limits.min - subtotalHoras)
                        } else if (limits.max !== null && subtotalHoras > limits.max) {
                          total += (limits.max - subtotalHoras)
                        }
                      }

                      return formatCurrency(total)
                    })()}
                  </span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                    Data de Emissão
                  </Label>
                  <DateInput
                    value={dataEmissao}
                    onChange={setDataEmissao}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                    Data de Vencimento
                  </Label>
                  <DateInput
                    value={dataVencimento}
                    onChange={setDataVencimento}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Conta Bancária */}
              {contasBancarias.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    Conta Bancária
                  </Label>
                  <Select value={contaBancariaSelecionada} onValueChange={setContaBancariaSelecionada}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione uma conta (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id} className="text-xs">
                          {conta.banco} — Ag {conta.agencia} / CC {conta.numero_conta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="border-slate-200 dark:border-slate-700 text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarFatura}
              disabled={loading || !dataVencimento}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              {loading ? 'Gerando...' : 'Gerar Fatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recebimento */}
      <ModalRecebimento
        open={faturaParaReceber !== null}
        onClose={() => {
          setFaturaParaReceber(null)
          setComissoesPadraoDaFatura([])
        }}
        item={faturaParaReceber ? {
          id: faturaParaReceber.fatura_id,
          origem_id: faturaParaReceber.fatura_id,
          origem: 'fatura',
          descricao: `Fatura ${faturaParaReceber.numero_fatura}`,
          valor: faturaParaReceber.valor_total,
          valor_pago: faturaParaReceber.valor_pago || 0,
          data_vencimento: faturaParaReceber.data_vencimento,
          conta_bancaria_id: faturaParaReceber.conta_bancaria_id,
          cliente_id: faturaParaReceber.cliente_id,
          processo_id: null,
          escritorio_id: faturaParaReceber.escritorio_id,
          entidade: faturaParaReceber.cliente_nome,
        } : null}
        contasBancarias={contasBancarias}
        advogados={advogadosEscritorio.map(a => ({ id: a.id, user_id: a.user_id, nome: a.nome, percentual_comissao: a.percentual_comissao }))}
        comissoesPadrao={comissoesPadraoDaFatura}
        onPagamentoRealizado={loadData}
      />

      {/* Dialog: Executar Fechamento de Pastas */}
      <Dialog open={showExecutarModal} onOpenChange={setShowExecutarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              Fechamento de Pastas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gera fechamentos mensais para todos os contratos por pasta ativos. Se já existe um
              fechamento ativo para o mês selecionado, ele não será duplicado.
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              O sistema executa este processo automaticamente todo dia 1º de cada mês às 3h (horário de Brasília).
              Use este botão para execução manual quando necessário.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="competencia-manual" className="text-xs text-slate-600">
                Mês de Referência (Competência)
              </Label>
              <Input
                id="competencia-manual"
                type="month"
                value={competenciaManual}
                onChange={(e) => setCompetenciaManual(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Deixe em branco para usar o mês atual
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowExecutarModal(false)}
              className="border-slate-200 text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExecutarFechamento}
              disabled={loadingPasta}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
            >
              {loadingPasta ? 'Executando...' : 'Executar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
