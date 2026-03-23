'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Upload,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Trash2,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoComFaturaAtual,
  FaturaCartao,
} from '@/hooks/useCartoesCredito'
import { createClient } from '@/lib/supabase/client'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'

interface ResumoFaturaMes {
  fatura_id: string | null
  valor_total: number
  status: string // 'aberta' | 'fechada' | 'paga' | 'projetada' | 'vazia'
  total_lancamentos: number
  data_vencimento: string
  data_fechamento: string
}
import { cn } from '@/lib/utils'
import CartaoModal from '@/components/financeiro/cartoes/CartaoModal'
import ImportarFaturaModal from '@/components/financeiro/cartoes/ImportarFaturaModal'
import FaturaDetailSheet from '@/components/financeiro/cartoes/FaturaDetailSheet'
import DespesaCartaoModal from '@/components/financeiro/cartoes/DespesaCartaoModal'
import { toast } from 'sonner'

const MESES_COMPLETO: Record<number, string> = {
  0: 'Janeiro', 1: 'Fevereiro', 2: 'Março', 3: 'Abril', 4: 'Maio', 5: 'Junho',
  6: 'Julho', 7: 'Agosto', 8: 'Setembro', 9: 'Outubro', 10: 'Novembro', 11: 'Dezembro',
}

const MESES_ABREV: Record<number, string> = {
  0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
  6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez',
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export default function CartoesPage() {
  const { escritorioAtivo } = useEscritorioAtivo()

  // States
  const [cartoes, setCartoes] = useState<CartaoComFaturaAtual[]>([])
  const [faturasPorCartao, setFaturasPorCartao] = useState<Record<string, FaturaCartao | null>>({})
  const [resumosPorCartao, setResumosPorCartao] = useState<Record<string, ResumoFaturaMes | null>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)

  // Multi-escritório states
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Modais
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [despesaModalOpen, setDespesaModalOpen] = useState(false)
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false)
  const [cartaoParaEditar, setCartaoParaEditar] = useState<CartaoComFaturaAtual | null>(null)
  const [cartaoParaExcluir, setCartaoParaExcluir] = useState<string | null>(null)

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedCartao, setSelectedCartao] = useState<CartaoComFaturaAtual | null>(null)

  const { loadCartoesComFaturaAtual, loadFaturas, deleteCartao } = useCartoesCredito(escritoriosSelecionados)
  const supabase = createClient()

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
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
      }
      return [...prev, escritorioId]
    })
  }

  const selecionarTodos = () => setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  const selecionarApenas = (escritorioId: string) => setEscritoriosSelecionados([escritorioId])

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) {
      return escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])?.nome || 'Escritório'
    }
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Carregar cartões e resumo da fatura do mês selecionado
  const loadData = useCallback(async () => {
    if (escritoriosSelecionados.length === 0) return

    setLoading(true)
    try {
      const data = await loadCartoesComFaturaAtual()
      setCartoes(data)

      // Carregar faturas (para o sheet de detalhe que ainda usa faturaExistente)
      const todasFaturas = await loadFaturas()
      const faturaMap: Record<string, FaturaCartao | null> = {}
      for (const cartao of data) {
        const faturaDoMes = todasFaturas.find(f => {
          const vencMes = f.data_vencimento?.substring(0, 7)
          return f.cartao_id === cartao.id && vencMes === selectedMonth
        })
        faturaMap[cartao.id] = faturaDoMes || null
      }
      setFaturasPorCartao(faturaMap)

      // Buscar resumo via RPC para cada cartão (inclui projeções para meses futuros)
      const resumoMap: Record<string, ResumoFaturaMes | null> = {}
      await Promise.all(
        data.map(async (cartao) => {
          const { data: resumo } = await supabase
            .rpc('obter_resumo_fatura_cartao_mes', {
              p_cartao_id: cartao.id,
              p_mes_vencimento: selectedMonth,
            })
          const r = resumo?.[0]
          resumoMap[cartao.id] = r ? {
            fatura_id: r.fatura_id,
            valor_total: Number(r.valor_total) || 0,
            status: r.status,
            total_lancamentos: Number(r.total_lancamentos) || 0,
            data_vencimento: r.data_vencimento,
            data_fechamento: r.data_fechamento,
          } : null
        })
      )
      setResumosPorCartao(resumoMap)
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
      toast.error('Erro ao carregar cartões')
    } finally {
      setLoading(false)
    }
  }, [escritoriosSelecionados, loadCartoesComFaturaAtual, loadFaturas, selectedMonth, supabase])

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadData()
    }
  }, [loadData, escritoriosSelecionados])

  // Navegação de meses
  const navigateMonth = (direction: -1 | 1) => {
    const [ano, mes] = selectedMonth.split('-').map(Number)
    const date = new Date(ano, mes - 1 + direction, 1)
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }

  const getMonthLabel = () => {
    const [ano, mes] = selectedMonth.split('-').map(Number)
    return `${MESES_COMPLETO[mes - 1]} de ${ano}`
  }

  // Filtrar cartões
  const cartoesFiltrados = cartoes.filter((cartao) => {
    if (!searchTerm) return true
    const termo = searchTerm.toLowerCase()
    return (
      cartao.nome.toLowerCase().includes(termo) ||
      cartao.banco.toLowerCase().includes(termo) ||
      cartao.ultimos_digitos.includes(termo)
    )
  })

  // Calcular vencimento formatado para o mês selecionado
  const getVencimentoFormatado = (cartao: CartaoComFaturaAtual) => {
    const fatura = faturasPorCartao[cartao.id]
    if (fatura?.data_vencimento) {
      const [ano, mes, dia] = fatura.data_vencimento.split('-').map(Number)
      return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
    }
    // Sem fatura no banco — vencimento é dia_vencimento no mês selecionado
    const [anoSel, mesSel] = selectedMonth.split('-').map(Number)
    return `${String(cartao.dia_vencimento).padStart(2, '0')}/${String(mesSel).padStart(2, '0')}/${anoSel}`
  }

  // Total do mês selecionado (usa resumo que inclui projeções)
  const totalMesSelecionado = cartoesFiltrados.reduce((acc, c) => {
    const resumo = resumosPorCartao[c.id]
    return acc + (resumo?.valor_total || 0)
  }, 0)

  // Handlers
  const handleRowClick = (cartao: CartaoComFaturaAtual) => {
    setSelectedCartao(cartao)
    setSheetOpen(true)
  }

  const handleNewCartao = () => {
    setCartaoParaEditar(null)
    setModalCartaoOpen(true)
  }

  const handleEditCartao = (cartao: CartaoComFaturaAtual) => {
    setCartaoParaEditar(cartao)
    setModalCartaoOpen(true)
  }

  const handleDeleteCartao = async () => {
    if (!cartaoParaExcluir) return
    const success = await deleteCartao(cartaoParaExcluir)
    if (success) {
      toast.success('Cartão desativado com sucesso')
      loadData()
    } else {
      toast.error('Erro ao desativar cartão')
    }
    setCartaoParaExcluir(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-[#34495e] dark:text-slate-200">Cartões de Crédito</h1>
        <div className="flex items-center gap-2">
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200 dark:border-slate-700">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  {getSeletorLabel()}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1">
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
                    {escritoriosSelecionados.length === escritoriosGrupo.length && <Check className="h-4 w-4" />}
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                  {escritoriosGrupo.map((escritorio) => (
                    <div key={escritorio.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2">
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label htmlFor={`esc-${escritorio.id}`} className="flex-1 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        {escritorio.nome}
                      </label>
                      <button onClick={() => selecionarApenas(escritorio.id)} className="text-[10px] text-[#1E3A8A] hover:underline">
                        apenas
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDespesaModalOpen(true)}
            className="h-9 text-xs border-slate-200 dark:border-slate-700"
          >
            <Receipt className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Novo Lançamento</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="h-9 text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-sm"
          >
            <Upload className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Importar PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNewCartao}
            className="h-9 text-xs bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469] shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Novo Cartão</span>
          </Button>
        </div>
      </div>

      {/* Navegador de meses — centralizado */}
      <div className="flex flex-col items-center gap-1 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-3"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold text-[#34495e] dark:text-slate-200 min-w-[200px] text-center">
            {getMonthLabel()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-3"
            onClick={() => navigateMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          {formatCurrency(totalMesSelecionado)}
        </p>
      </div>

      {/* Busca */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar cartão..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Lista de Cartões */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="h-8 w-8 mx-auto border-4 border-slate-200 dark:border-slate-700 border-t-[#1E3A8A] rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Carregando cartões...</p>
        </div>
      ) : cartoesFiltrados.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {searchTerm ? 'Nenhum cartão encontrado com esse termo' : 'Nenhum cartão cadastrado ainda'}
            </p>
            {!searchTerm && (
              <Button onClick={handleNewCartao} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Cartão
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Cartão</TableHead>
                <TableHead className="text-xs">Banco</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                {escritoriosSelecionados.length > 1 && (
                  <TableHead className="text-xs">Escritório</TableHead>
                )}
                <TableHead className="text-xs text-right">Fatura</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartoesFiltrados.map((cartao) => {
                const fatura = faturasPorCartao[cartao.id]
                const resumo = resumosPorCartao[cartao.id]
                const faturaValor = resumo?.valor_total || 0
                const faturaStatus = resumo?.status

                return (
                  <TableRow
                    key={cartao.id}
                    className="hover:bg-slate-50 dark:hover:bg-surface-2 cursor-pointer"
                    onClick={() => handleRowClick(cartao)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: cartao.cor }}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#34495e] dark:text-slate-200">{cartao.nome}</p>
                          <p className="text-[10px] text-slate-400">•••• {cartao.ultimos_digitos}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {cartao.banco}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {getVencimentoFormatado(cartao)}
                    </TableCell>
                    {escritoriosSelecionados.length > 1 && (
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {cartao.escritorio_nome || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        faturaValor > 0
                          ? "text-[#34495e] dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-500"
                      )}>
                        {formatCurrency(faturaValor)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {faturaStatus && faturaStatus !== 'vazia' ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            faturaStatus === 'aberta' && "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
                            faturaStatus === 'fechada' && "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            faturaStatus === 'paga' && "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                            faturaStatus === 'projetada' && "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          )}
                        >
                          {faturaStatus === 'aberta' && 'Aberta'}
                          {faturaStatus === 'fechada' && 'Fechada'}
                          {faturaStatus === 'paga' && 'Paga'}
                          {faturaStatus === 'projetada' && 'Prevista'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditCartao(cartao)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => setCartaoParaExcluir(cartao.id)}
                          title="Desativar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Sheet de Detalhe da Fatura */}
      <FaturaDetailSheet
        cartao={selectedCartao}
        mesReferencia={selectedMonth}
        faturaExistente={selectedCartao ? faturasPorCartao[selectedCartao.id] : null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        escritorioIds={escritoriosSelecionados}
        onDataChange={loadData}
      />

      {/* Modal de Novo Lançamento */}
      {escritorioAtivo && (
        <DespesaCartaoModal
          open={despesaModalOpen}
          onOpenChange={setDespesaModalOpen}
          escritorioId={escritorioAtivo}
          onSuccess={loadData}
        />
      )}

      {/* Modal de Importação de Fatura */}
      <ImportarFaturaModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={loadData}
      />

      {/* Modal de Cartão */}
      {escritorioAtivo && (
        <CartaoModal
          open={modalCartaoOpen}
          onOpenChange={setModalCartaoOpen}
          escritorioId={escritorioAtivo}
          escritorios={escritoriosGrupo}
          cartaoParaEditar={cartaoParaEditar}
          onSuccess={loadData}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!cartaoParaExcluir} onOpenChange={() => setCartaoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar este cartão? As despesas e faturas existentes
              serão mantidas, mas você não poderá adicionar novas despesas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCartao} className="bg-red-600 hover:bg-red-700">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
