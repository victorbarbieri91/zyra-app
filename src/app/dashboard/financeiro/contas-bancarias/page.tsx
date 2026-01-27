'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Landmark, Pencil, Trash2, MoreVertical, ChevronDown, Check, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'

interface ContaBancaria {
  id: string
  escritorio_id: string
  banco: string
  agencia: string
  numero_conta: string
  tipo_conta: 'corrente' | 'poupanca' | 'investimento' | 'caixa'
  titular: string
  saldo_atual: number
  saldo_inicial?: number
  ativa: boolean
  created_at: string
  updated_at: string
  escritorio_nome?: string
}

interface ContaForm {
  id?: string
  escritorio_id: string
  banco: string
  agencia: string
  numero_conta: string
  tipo_conta: 'corrente' | 'poupanca' | 'investimento' | 'caixa'
  titular: string
  saldo_atual: string
}

const TIPO_CONTA_LABELS: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  caixa: 'Caixa',
}

// Funções para máscara de moeda brasileira
const formatCurrencyInput = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')

  // Converte para número com 2 casas decimais
  const numValue = parseInt(digits || '0', 10) / 100

  // Formata como moeda brasileira
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const parseCurrencyToNumber = (value: string): number => {
  // Remove R$, pontos e espaços, troca vírgula por ponto
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  return parseFloat(cleaned) || 0
}

export default function ContasBancariasPage() {
  const { escritorioAtivo, escritorios } = useEscritorioAtivo()
  const supabase = createClient()

  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [showContaDialog, setShowContaDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [contaParaExcluir, setContaParaExcluir] = useState<ContaBancaria | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [contaForm, setContaForm] = useState<ContaForm>({
    escritorio_id: '',
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo_conta: 'corrente',
    titular: '',
    saldo_atual: 'R$ 0,00',
  })
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  // Estados para multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        // Iniciar com todos os escritórios selecionados (visão consolidada)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Funções de seleção
  const toggleEscritorio = (id: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(id)) {
        // Não permitir desmarcar se for o único selecionado
        if (prev.length === 1) return prev
        return prev.filter(e => e !== id)
      }
      return [...prev, id]
    })
  }

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (id: string) => {
    setEscritoriosSelecionados([id])
  }

  // Texto do botão do seletor
  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === 0) return 'Selecione'
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    }
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Recarregar contas quando escritórios selecionados mudarem
  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadContas()
    }
  }, [escritoriosSelecionados])

  const loadContas = useCallback(async () => {
    if (escritoriosSelecionados.length === 0) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financeiro_contas_bancarias')
        .select('*, escritorios:escritorio_id(nome)')
        .in('escritorio_id', escritoriosSelecionados)
        .eq('ativa', true)
        .order('banco', { ascending: true })

      if (error) throw error

      // Mapear os dados para incluir o nome do escritório
      const contasComEscritorio = (data || []).map((conta: any) => ({
        ...conta,
        escritorio_nome: conta.escritorios?.nome || '',
      }))

      setContas(contasComEscritorio)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }, [escritoriosSelecionados, supabase])

  const handleOpenCreate = () => {
    setEditMode(false)
    setContaForm({
      escritorio_id: escritorioAtivo || '',
      banco: '',
      agencia: '',
      numero_conta: '',
      tipo_conta: 'corrente',
      titular: '',
      saldo_atual: 'R$ 0,00',
    })
    setShowContaDialog(true)
  }

  const handleOpenEdit = (conta: ContaBancaria) => {
    setEditMode(true)
    const saldoFormatado = (conta.saldo_atual || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    setContaForm({
      id: conta.id,
      escritorio_id: conta.escritorio_id,
      banco: conta.banco,
      agencia: conta.agencia || '',
      numero_conta: conta.numero_conta || '',
      tipo_conta: conta.tipo_conta,
      titular: conta.titular || '',
      saldo_atual: saldoFormatado,
    })
    setShowContaDialog(true)
  }

  const handleOpenDelete = (conta: ContaBancaria) => {
    setContaParaExcluir(conta)
    setShowDeleteDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const escritorioId = contaForm.escritorio_id || escritorioAtivo
    if (!escritorioId) return

    setSubmitting(true)
    try {
      const saldoNumerico = parseCurrencyToNumber(contaForm.saldo_atual)

      if (editMode && contaForm.id) {
        // Atualizar conta existente
        const { error } = await supabase
          .from('financeiro_contas_bancarias')
          .update({
            banco: contaForm.banco,
            agencia: contaForm.agencia || null,
            numero_conta: contaForm.numero_conta || null,
            tipo_conta: contaForm.tipo_conta,
            titular: contaForm.titular || null,
            saldo_atual: saldoNumerico,
          })
          .eq('id', contaForm.id)

        if (error) throw error
      } else {
        // Criar nova conta
        const { error } = await supabase
          .from('financeiro_contas_bancarias')
          .insert({
            escritorio_id: escritorioId,
            banco: contaForm.banco,
            agencia: contaForm.agencia || null,
            numero_conta: contaForm.numero_conta || null,
            tipo_conta: contaForm.tipo_conta,
            titular: contaForm.titular || null,
            saldo_inicial: saldoNumerico,
            saldo_atual: saldoNumerico,
            ativa: true,
          })

        if (error) throw error
      }

      setShowContaDialog(false)
      loadContas()
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      alert('Erro ao salvar conta bancária. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!contaParaExcluir) return

    setSubmitting(true)
    try {
      // Desativar conta ao invés de excluir
      const { error } = await supabase
        .from('financeiro_contas_bancarias')
        .update({ ativa: false })
        .eq('id', contaParaExcluir.id)

      if (error) throw error

      setShowDeleteDialog(false)
      setContaParaExcluir(null)
      loadContas()
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Erro ao excluir conta bancária. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getTotalSaldos = () => {
    return contas.reduce((sum, c) => sum + (Number(c.saldo_atual) || 0), 0)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Contas Bancárias</h1>
          <p className="text-sm text-slate-600 mt-1">
            Consolidação e gestão de contas bancárias do escritório
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de Escritórios - só aparece se tem mais de 1 no grupo */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 px-3 gap-2 border-slate-200 hover:bg-slate-50",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "border-[#89bcbe] bg-[#f0f9f9]/50"
                  )}
                >
                  <Building2 className="h-4 w-4 text-[#89bcbe]" />
                  <span className="text-sm text-[#34495e] font-medium">
                    {getSeletorLabel()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-[#34495e]">Visualizar contas de:</p>
                </div>

                {/* Opção "Todos" */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "bg-[#f0f9f9]"
                  )}
                  onClick={selecionarTodos}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    escritoriosSelecionados.length === escritoriosGrupo.length
                      ? "bg-[#89bcbe] border-[#89bcbe]"
                      : "border-slate-300"
                  )}>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#34495e]">Todos os escritórios</p>
                    <p className="text-[10px] text-slate-500">Visão consolidada do grupo</p>
                  </div>
                </div>

                {/* Lista de escritórios */}
                <div className="max-h-64 overflow-y-auto">
                  {escritoriosGrupo.map((escritorio) => {
                    const isSelected = escritoriosSelecionados.includes(escritorio.id)
                    const isAtivo = escritorio.id === escritorioAtivo

                    return (
                      <div
                        key={escritorio.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0",
                          isSelected && escritoriosSelecionados.length < escritoriosGrupo.length && "bg-[#f0f9f9]/50"
                        )}
                        onClick={() => toggleEscritorio(escritorio.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEscritorio(escritorio.id)}
                          className="data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#34495e] truncate">
                              {escritorio.nome}
                            </p>
                            {isAtivo && (
                              <span className="text-[9px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1.5 py-0.5 rounded">
                                Atual
                              </span>
                            )}
                          </div>
                          {escritorio.cnpj && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {escritorio.cnpj}
                            </p>
                          )}
                        </div>
                        {/* Botão "Apenas este" */}
                        {escritoriosSelecionados.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              selecionarApenas(escritorio.id)
                            }}
                            className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] hover:underline whitespace-nowrap"
                          >
                            Apenas
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rodapé com info */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 text-center">
                    {escritoriosSelecionados.length === 1
                      ? 'Exibindo contas de 1 escritório'
                      : `Exibindo contas de ${escritoriosSelecionados.length} escritórios`}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="text-xs"
          >
            {viewMode === 'cards' ? (
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Landmark className="w-3.5 h-3.5 mr-1.5" />
            )}
            {viewMode === 'cards' ? 'Lista' : 'Cards'}
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white border-0 shadow-sm"
          >
            <Landmark className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Saldo Consolidado */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] w-fit">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[#34495e]/70" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[#34495e]/80">Saldo Consolidado:</span>
              <span className="text-lg font-bold text-[#34495e]">
                {formatCurrency(getTotalSaldos())}
              </span>
              <span className="text-[10px] text-[#34495e]/60">
                ({contas.length} {contas.length === 1 ? 'conta' : 'contas'})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Suas Contas</h2>

        {loading ? (
          <div className="py-12 text-center">
            <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-2">Carregando...</p>
          </div>
        ) : contas.length === 0 ? (
          <Card className="border-slate-200 border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">Nenhuma conta cadastrada</p>
              <p className="text-xs text-slate-400 mt-1">Clique em "Nova Conta" para adicionar</p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Banco</TableHead>
                  <TableHead className="text-xs">Agência / Conta</TableHead>
                  <TableHead className="text-xs">Titular</TableHead>
                  {escritoriosSelecionados.length > 1 && (
                    <TableHead className="text-xs">Escritório</TableHead>
                  )}
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Saldo Atual</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm font-semibold text-[#34495e]">
                      {conta.banco}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {conta.agencia && `Ag ${conta.agencia}`}
                      {conta.agencia && conta.numero_conta && ' • '}
                      {conta.numero_conta && `C/C ${conta.numero_conta}`}
                      {!conta.agencia && !conta.numero_conta && '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {conta.titular || '-'}
                    </TableCell>
                    {escritoriosSelecionados.length > 1 && (
                      <TableCell className="text-xs text-slate-500">
                        {conta.escritorio_nome || '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          conta.tipo_conta === 'corrente' && "bg-blue-100 text-blue-700",
                          conta.tipo_conta === 'poupanca' && "bg-emerald-100 text-emerald-700",
                          conta.tipo_conta === 'investimento' && "bg-purple-100 text-purple-700",
                          conta.tipo_conta === 'caixa' && "bg-amber-100 text-amber-700",
                        )}
                      >
                        {TIPO_CONTA_LABELS[conta.tipo_conta] || conta.tipo_conta}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-semibold",
                        Number(conta.saldo_atual) >= 0 ? "text-[#34495e]" : "text-red-600"
                      )}>
                        {formatCurrency(Number(conta.saldo_atual))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleOpenEdit(conta)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleOpenDelete(conta)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contas.map((conta) => (
              <Card key={conta.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#34495e] truncate">
                        {conta.banco}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {conta.agencia && `Ag ${conta.agencia}`}
                        {conta.agencia && conta.numero_conta && ' • '}
                        {conta.numero_conta && `C/C ${conta.numero_conta}`}
                      </p>
                      {conta.titular && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {conta.titular}
                        </p>
                      )}
                      {/* Mostrar escritório quando exibindo múltiplos */}
                      {escritoriosSelecionados.length > 1 && conta.escritorio_nome && (
                        <Badge variant="outline" className="text-[9px] mt-1.5 font-normal text-slate-500 border-slate-200">
                          {conta.escritorio_nome}
                        </Badge>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mr-2">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(conta)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(conta)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Saldo Atual</p>
                        <p className={cn(
                          "text-xl font-bold mt-0.5",
                          Number(conta.saldo_atual) >= 0 ? "text-[#34495e]" : "text-red-600"
                        )}>
                          {formatCurrency(Number(conta.saldo_atual))}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          conta.tipo_conta === 'corrente' && "bg-blue-100 text-blue-700",
                          conta.tipo_conta === 'poupanca' && "bg-emerald-100 text-emerald-700",
                          conta.tipo_conta === 'investimento' && "bg-purple-100 text-purple-700",
                          conta.tipo_conta === 'caixa' && "bg-amber-100 text-amber-700",
                        )}
                      >
                        {TIPO_CONTA_LABELS[conta.tipo_conta] || conta.tipo_conta}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Criar/Editar Conta */}
      <Dialog open={showContaDialog} onOpenChange={setShowContaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">
              {editMode ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Atualize as informações da conta bancária.'
                : 'Adicione uma nova conta bancária para consolidação.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Escritório (apenas na criação e se tiver mais de 1) */}
            {!editMode && escritorios && escritorios.length > 1 && (
              <div>
                <Label htmlFor="escritorio_id">Escritório *</Label>
                <select
                  id="escritorio_id"
                  value={contaForm.escritorio_id || escritorioAtivo || ''}
                  onChange={(e) => setContaForm({ ...contaForm, escritorio_id: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  required
                >
                  {escritorios.map((esc) => (
                    <option key={esc.id} value={esc.id}>
                      {esc.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Banco */}
            <div>
              <Label htmlFor="banco">Banco *</Label>
              <Input
                id="banco"
                value={contaForm.banco}
                onChange={(e) => setContaForm({ ...contaForm, banco: e.target.value })}
                placeholder="Ex: Banco do Brasil, Itaú, Bradesco"
                required
              />
            </div>

            {/* Agência e Número */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  value={contaForm.agencia}
                  onChange={(e) => setContaForm({ ...contaForm, agencia: e.target.value })}
                  placeholder="0000"
                />
              </div>
              <div>
                <Label htmlFor="numero_conta">Número da Conta</Label>
                <Input
                  id="numero_conta"
                  value={contaForm.numero_conta}
                  onChange={(e) => setContaForm({ ...contaForm, numero_conta: e.target.value })}
                  placeholder="00000-0"
                />
              </div>
            </div>

            {/* Titular */}
            <div>
              <Label htmlFor="titular">Titular</Label>
              <Input
                id="titular"
                value={contaForm.titular}
                onChange={(e) => setContaForm({ ...contaForm, titular: e.target.value })}
                placeholder="Nome do titular da conta"
              />
            </div>

            {/* Tipo de Conta */}
            <div>
              <Label htmlFor="tipo_conta">Tipo de Conta *</Label>
              <select
                id="tipo_conta"
                value={contaForm.tipo_conta}
                onChange={(e) => setContaForm({ ...contaForm, tipo_conta: e.target.value as any })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="investimento">Investimento</option>
                <option value="caixa">Caixa</option>
              </select>
            </div>

            {/* Saldo */}
            <div>
              <Label htmlFor="saldo_atual">
                {editMode ? 'Saldo Atual' : 'Saldo Inicial'}
              </Label>
              <Input
                id="saldo_atual"
                type="text"
                inputMode="numeric"
                value={contaForm.saldo_atual}
                onChange={(e) => setContaForm({ ...contaForm, saldo_atual: formatCurrencyInput(e.target.value) })}
                placeholder="R$ 0,00"
                className="font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                {editMode
                  ? 'Atualize o saldo conforme seu extrato bancário.'
                  : 'Informe o saldo atual da conta para iniciar a consolidação.'}
              </p>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContaDialog(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:from-[#2c3e50] hover:to-[#3d5469]"
                disabled={submitting}
              >
                {submitting ? 'Salvando...' : (editMode ? 'Salvar' : 'Criar Conta')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Bancária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{contaParaExcluir?.banco}</strong>
              {contaParaExcluir?.numero_conta && ` (${contaParaExcluir.numero_conta})`}?
              <br /><br />
              Esta ação irá desativar a conta. Os dados históricos serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
