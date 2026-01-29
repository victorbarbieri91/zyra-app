'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Loader2, Search, User, FileText, Briefcase, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ReceitaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string
  clienteId?: string
  consultaId?: string
  contratoId?: string
  onSuccess?: () => void
}

interface FormData {
  tipo: string
  categoria: string
  descricao: string
  valor: string
  data_competencia: string
  data_vencimento: string
  cliente_id: string
  processo_id: string
  observacoes: string
}

interface Cliente {
  id: string
  nome: string
  tipo_pessoa: string
  documento: string | null
}

const TIPOS_RECEITA = [
  { value: 'avulso', label: 'Receita Avulsa' },
  { value: 'honorario', label: 'Honorário' },
  { value: 'reembolso', label: 'Reembolso de Custas' },
]

const CATEGORIAS_RECEITA = [
  { value: 'honorarios', label: 'Honorários' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'custas_reembolsadas', label: 'Custas Reembolsadas' },
  { value: 'exito', label: 'Êxito' },
  { value: 'outros', label: 'Outros' },
]

const initialFormData: FormData = {
  tipo: 'avulso',
  categoria: 'honorarios',
  descricao: '',
  valor: '',
  data_competencia: new Date().toISOString().split('T')[0],
  data_vencimento: new Date().toISOString().split('T')[0],
  cliente_id: '',
  processo_id: '',
  observacoes: '',
}

export default function ReceitaModal({
  open,
  onOpenChange,
  processoId,
  clienteId,
  consultaId,
  contratoId,
  onSuccess,
}: ReceitaModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(false)

  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        cliente_id: clienteId || '',
        processo_id: processoId || '',
      })
      setClienteSearch('')
      setClienteSelecionado(null)

      // Se tiver clienteId, carregar dados do cliente
      if (clienteId) {
        loadClienteById(clienteId)
      }
    }
  }, [open, clienteId, processoId])

  // Buscar clientes quando digitar
  useEffect(() => {
    const searchClientes = async () => {
      if (!clienteSearch || clienteSearch.length < 2 || !escritorioAtivo) {
        setClientes([])
        return
      }

      setLoadingClientes(true)
      try {
        const { data, error } = await supabase
          .from('crm_pessoas')
          .select('id, nome, tipo_pessoa, documento')
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'ativo')
          .or(`nome.ilike.%${clienteSearch}%,documento.ilike.%${clienteSearch}%`)
          .limit(10)

        if (!error && data) {
          setClientes(data)
        }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
      } finally {
        setLoadingClientes(false)
      }
    }

    const debounce = setTimeout(searchClientes, 300)
    return () => clearTimeout(debounce)
  }, [clienteSearch, escritorioAtivo, supabase])

  const loadClienteById = async (id: string) => {
    const { data, error } = await supabase
      .from('crm_pessoas')
      .select('id, nome, tipo_pessoa, documento')
      .eq('id', id)
      .single()

    if (!error && data) {
      setClienteSelecionado(data)
    }
  }

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente)
    updateField('cliente_id', cliente.id)
    setClienteSearch('')
    setClientePopoverOpen(false)
  }

  const handleRemoveCliente = () => {
    setClienteSelecionado(null)
    updateField('cliente_id', '')
  }

  const handleSubmit = async () => {
    // Validações
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição da receita')
      return
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_vencimento) {
      toast.error('Informe a data de vencimento')
      return
    }

    try {
      setLoading(true)

      // Obter usuário logado para responsavel_id
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Usuário não autenticado')
        return
      }

      const receitaData = {
        escritorio_id: escritorioAtivo,
        tipo: formData.tipo,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_competencia: formData.data_competencia,
        data_vencimento: formData.data_vencimento,
        cliente_id: formData.cliente_id || null,
        processo_id: formData.processo_id || null,
        consulta_id: consultaId || null,
        contrato_id: contratoId || null,
        observacoes: formData.observacoes || null,
        status: 'pendente',
        responsavel_id: user.id,
        created_by: user.id,
      }

      const { error } = await supabase.from('financeiro_receitas').insert(receitaData)

      if (error) throw error

      toast.success('Receita lançada com sucesso!')
      setFormData(initialFormData)
      setClienteSelecionado(null)
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Erro ao lançar receita:', error)
      toast.error('Erro ao lançar receita. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Nova Receita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => updateField('tipo', v)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RECEITA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Categoria</Label>
              <Select value={formData.categoria} onValueChange={(v) => updateField('categoria', v)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_RECEITA.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <Label className="text-xs text-slate-600">Cliente</Label>
            {clienteSelecionado ? (
              <div className="flex items-center gap-2 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#34495e] truncate">
                    {clienteSelecionado.nome}
                  </p>
                  {clienteSelecionado.documento && (
                    <p className="text-[10px] text-slate-500">
                      {clienteSelecionado.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}: {clienteSelecionado.documento}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  onClick={handleRemoveCliente}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar cliente por nome ou documento..."
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value)
                        if (e.target.value.length >= 2) {
                          setClientePopoverOpen(true)
                        }
                      }}
                      onFocus={() => clienteSearch.length >= 2 && setClientePopoverOpen(true)}
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : clientes.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto">
                      {clientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          onClick={() => handleSelectCliente(cliente)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                        >
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#34495e] truncate">
                              {cliente.nome}
                            </p>
                            {cliente.documento && (
                              <p className="text-[10px] text-slate-500">
                                {cliente.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}: {cliente.documento}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : clienteSearch.length >= 2 ? (
                    <div className="py-4 text-center text-sm text-slate-500">
                      Nenhum cliente encontrado
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs text-slate-600">Descrição *</Label>
            <Textarea
              placeholder="Descreva a receita..."
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          {/* Valor e Datas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-600">Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) => updateField('valor', e.target.value)}
                className="h-9 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Competência</Label>
              <Input
                type="date"
                value={formData.data_competencia}
                onChange={(e) => updateField('data_competencia', e.target.value)}
                className="h-9 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Vencimento *</Label>
              <Input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => updateField('data_vencimento', e.target.value)}
                className="h-9 mt-1 text-sm"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs text-slate-600">Observações</Label>
            <Textarea
              placeholder="Observações adicionais (opcional)..."
              value={formData.observacoes}
              onChange={(e) => updateField('observacoes', e.target.value)}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Lançar Receita
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
