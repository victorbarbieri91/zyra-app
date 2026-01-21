'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Plus,
  Search,
  AlertCircle,
  FileText,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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
  CartaoCredito,
} from '@/hooks/useCartoesCredito'
import CartaoModal from '@/components/financeiro/cartoes/CartaoModal'
import CartaoCard from '@/components/financeiro/cartoes/CartaoCard'
import DespesaCartaoModal from '@/components/financeiro/cartoes/DespesaCartaoModal'
import { toast } from 'sonner'

export default function CartoesPage() {
  const router = useRouter()
  const { escritorioAtivo } = useEscritorioAtivo()

  // States
  const [cartoes, setCartoes] = useState<CartaoComFaturaAtual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [modalCartaoOpen, setModalCartaoOpen] = useState(false)
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [cartaoParaEditar, setCartaoParaEditar] = useState<CartaoComFaturaAtual | null>(null)
  const [cartaoParaDespesa, setCartaoParaDespesa] = useState<string | undefined>()
  const [cartaoParaExcluir, setCartaoParaExcluir] = useState<string | null>(null)

  const { loadCartoesComFaturaAtual, deleteCartao } = useCartoesCredito(escritorioAtivo)

  // Carregar cartões
  const loadData = useCallback(async () => {
    if (!escritorioAtivo) return

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
  }, [escritorioAtivo, loadCartoesComFaturaAtual])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const handleAddExpense = (cartaoId: string) => {
    setCartaoParaDespesa(cartaoId)
    setModalDespesaOpen(true)
  }

  const handleViewDetails = (cartaoId: string) => {
    router.push(`/dashboard/financeiro/cartoes/${cartaoId}`)
  }

  const handleViewInvoice = (cartaoId: string) => {
    router.push(`/dashboard/financeiro/cartoes/${cartaoId}?tab=faturas`)
  }

  // Calcular resumo
  const totalFaturaAtual = cartoes.reduce(
    (acc, c) => acc + (c.fatura_atual?.valor_total || 0),
    0
  )
  const cartoesComFaturaAberta = cartoes.filter(
    (c) => c.fatura_atual?.status === 'aberta'
  ).length
  const cartoesComFaturaVencendo = cartoes.filter(
    (c) =>
      c.fatura_atual?.status === 'fechada' &&
      (c.fatura_atual?.dias_para_vencimento || 0) <= 5
  ).length

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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-gradient-to-br from-[#34495e] to-[#46627f] text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">Total Faturas Abertas</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalFaturaAtual)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Cartões Ativos</p>
                <p className="text-2xl font-bold text-[#34495e] mt-1">{cartoes.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Faturas Abertas</p>
                <p className="text-2xl font-bold text-[#34495e] mt-1">{cartoesComFaturaAberta}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Vencendo em 5 dias</p>
                <p className="text-2xl font-bold text-[#34495e] mt-1">{cartoesComFaturaVencendo}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoesFiltrados.map((cartao) => (
            <CartaoCard
              key={cartao.id}
              cartao={cartao}
              onViewDetails={handleViewDetails}
              onAddExpense={handleAddExpense}
              onViewInvoice={handleViewInvoice}
              onEdit={handleEditCartao}
              onDelete={(id) => setCartaoParaExcluir(id)}
            />
          ))}
        </div>
      )}

      {/* Modal de Cartão */}
      {escritorioAtivo && (
        <CartaoModal
          open={modalCartaoOpen}
          onOpenChange={setModalCartaoOpen}
          escritorioId={escritorioAtivo}
          cartaoParaEditar={cartaoParaEditar}
          onSuccess={loadData}
        />
      )}

      {/* Modal de Despesa */}
      {escritorioAtivo && (
        <DespesaCartaoModal
          open={modalDespesaOpen}
          onOpenChange={(open) => {
            setModalDespesaOpen(open)
            if (!open) setCartaoParaDespesa(undefined)
          }}
          escritorioId={escritorioAtivo}
          cartaoId={cartaoParaDespesa}
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
