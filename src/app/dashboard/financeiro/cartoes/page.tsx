'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Plus,
  Search,
  Upload,
  Building2,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Eye,
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
} from '@/hooks/useCartoesCredito'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { cn } from '@/lib/utils'
import CartaoModal from '@/components/financeiro/cartoes/CartaoModal'
import { toast } from 'sonner'

export default function CartoesPage() {
  const router = useRouter()
  const { escritorioAtivo } = useEscritorioAtivo()

  // States
  const [cartoes, setCartoes] = useState<CartaoComFaturaAtual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Multi-escritório states
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Modais
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false)
  const [cartaoParaEditar, setCartaoParaEditar] = useState<CartaoComFaturaAtual | null>(null)
  const [cartaoParaExcluir, setCartaoParaExcluir] = useState<string | null>(null)

  const { loadCartoesComFaturaAtual, deleteCartao } = useCartoesCredito(escritoriosSelecionados)

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

  // Carregar cartões
  const loadData = useCallback(async () => {
    if (escritoriosSelecionados.length === 0) return

    setLoading(true)
    try {
      const data = await loadCartoesComFaturaAtual()
      setCartoes(data)
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
      toast.error('Erro ao carregar cartões')
    } finally {
      setLoading(false)
    }
  }, [escritoriosSelecionados, loadCartoesComFaturaAtual])

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadData()
    }
  }, [loadData, escritoriosSelecionados])

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

  // Handlers
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

  const handleViewDetails = (cartaoId: string) => {
    router.push(`/dashboard/financeiro/cartoes/${cartaoId}`)
  }

  // Calcular total das faturas abertas
  const totalFaturaAtual = cartoes.reduce(
    (acc, c) => acc + (c.fatura_atual?.valor_total || 0),
    0
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Cartões de Crédito</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie os cartões de crédito e suas faturas
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Seletor de Escritórios */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4 mr-2 text-[#34495e]" />
                  <span className="text-sm">{getSeletorLabel()}</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
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
                        : 'hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <span className="font-medium">Todos os escritórios</span>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-px bg-slate-200 my-2" />

                  {/* Lista de escritórios */}
                  {escritoriosGrupo.map((escritorio) => (
                    <div
                      key={escritorio.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label
                        htmlFor={`esc-${escritorio.id}`}
                        className="flex-1 text-sm text-slate-700 cursor-pointer"
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
            onClick={() => router.push('/dashboard/financeiro/cartoes/importar')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar PDF
          </Button>
          <Button
            onClick={handleNewCartao}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469] shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cartão
          </Button>
        </div>
      </div>

      {/* Card de Resumo */}
      <Card className="border-slate-200 bg-gradient-to-br from-[#34495e] to-[#46627f] text-white max-w-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/90">Total Faturas Abertas</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalFaturaAtual)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cartão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Cartões */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Carregando cartões...</p>
        </div>
      ) : cartoesFiltrados.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500 mt-2">
              {searchTerm
                ? 'Nenhum cartão encontrado com esse termo'
                : 'Nenhum cartão cadastrado ainda'}
            </p>
            {!searchTerm && (
              <Button
                onClick={handleNewCartao}
                variant="outline"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Cartão
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Cartão</TableHead>
                <TableHead className="text-xs">Banco</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                {escritoriosSelecionados.length > 1 && (
                  <TableHead className="text-xs">Escritório</TableHead>
                )}
                <TableHead className="text-xs text-right">Fatura Atual</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartoesFiltrados.map((cartao) => {
                const faturaStatus = cartao.fatura_atual?.status
                const faturaValor = cartao.fatura_atual?.valor_total || 0

                return (
                  <TableRow
                    key={cartao.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleViewDetails(cartao.id)}
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
                          <p className="text-sm font-medium text-[#34495e]">{cartao.nome}</p>
                          <p className="text-[10px] text-slate-400">•••• {cartao.ultimos_digitos}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {cartao.banco}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      Dia {cartao.dia_vencimento}
                    </TableCell>
                    {escritoriosSelecionados.length > 1 && (
                      <TableCell className="text-xs text-slate-500">
                        {cartao.escritorio_nome || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-[#34495e]">
                        {formatCurrency(faturaValor)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {faturaStatus ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            faturaStatus === 'aberta' && "bg-blue-100 text-blue-700",
                            faturaStatus === 'fechada' && "bg-amber-100 text-amber-700",
                            faturaStatus === 'paga' && "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {faturaStatus === 'aberta' && 'Aberta'}
                          {faturaStatus === 'fechada' && 'Fechada'}
                          {faturaStatus === 'paga' && 'Paga'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleViewDetails(cartao.id)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
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
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </div>
      )}

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
            <AlertDialogAction
              onClick={handleDeleteCartao}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
