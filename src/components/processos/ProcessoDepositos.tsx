'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Landmark,
  Plus,
  Loader2,
  Calendar,
  FileText,
  ArrowUpRight,
  Pencil,
  Trash2,
  AlertCircle,
  Wallet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate, formatDateForDB, parseDateInBrazil } from '@/lib/timezone'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Deposito {
  id: string
  tipo: 'recursal' | 'embargo' | 'caucao' | 'outro'
  descricao: string | null
  valor: number
  data_deposito: string
  banco: string | null
  agencia: string | null
  conta: string | null
  numero_guia: string | null
  status: 'ativo' | 'levantado' | 'convertido' | 'perdido'
  data_levantamento: string | null
  valor_levantado: number | null
  observacoes: string | null
  created_at: string
}

interface ProcessoDepositosProps {
  processoId: string
}

const TIPO_LABELS: Record<string, string> = {
  recursal: 'Depósito Recursal',
  embargo: 'Depósito para Embargo',
  caucao: 'Caução',
  outro: 'Outro',
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  levantado: 'Levantado',
  convertido: 'Convertido',
  perdido: 'Perdido',
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-blue-50 text-blue-700 border-blue-200',
  levantado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  convertido: 'bg-amber-50 text-amber-700 border-amber-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
}

const initialFormState = {
  tipo: 'recursal' as 'recursal' | 'embargo' | 'caucao' | 'outro',
  descricao: '',
  valor: '',
  data_deposito: format(new Date(), 'yyyy-MM-dd'),
  banco: '',
  agencia: '',
  conta: '',
  numero_guia: '',
  status: 'ativo' as 'ativo' | 'levantado' | 'convertido' | 'perdido',
  data_levantamento: '',
  valor_levantado: '',
  observacoes: '',
}

export default function ProcessoDepositos({ processoId }: ProcessoDepositosProps) {
  const supabase = createClient()

  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeposito, setEditingDeposito] = useState<Deposito | null>(null)
  const [formData, setFormData] = useState(initialFormState)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [depositoToDelete, setDepositoToDelete] = useState<string | null>(null)

  // Carregar escritório do usuário
  useEffect(() => {
    const loadEscritorio = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('escritorios_usuarios')
          .select('escritorio_id')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .single()

        if (data) {
          setEscritorioId(data.escritorio_id)
        }
      }
    }
    loadEscritorio()
  }, [])

  // Carregar depósitos
  const loadDepositos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('processos_depositos')
        .select('*')
        .eq('processo_id', processoId)
        .order('data_deposito', { ascending: false })

      if (error) throw error
      setDepositos(data || [])
    } catch (error) {
      console.error('Erro ao carregar depósitos:', error)
      toast.error('Erro ao carregar depósitos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (processoId) {
      loadDepositos()
    }
  }, [processoId])

  // Calcular totais
  const totais = depositos.reduce(
    (acc, dep) => {
      if (dep.status === 'ativo') {
        acc.ativo += dep.valor
        acc.countAtivo++
      } else if (dep.status === 'levantado') {
        acc.levantado += dep.valor_levantado || dep.valor
        acc.countLevantado++
      } else if (dep.status === 'convertido') {
        acc.convertido += dep.valor
        acc.countConvertido++
      } else if (dep.status === 'perdido') {
        acc.perdido += dep.valor
        acc.countPerdido++
      }
      return acc
    },
    { ativo: 0, levantado: 0, convertido: 0, perdido: 0, countAtivo: 0, countLevantado: 0, countConvertido: 0, countPerdido: 0 }
  )

  // Abrir modal para novo
  const handleNovoDeposito = () => {
    setEditingDeposito(null)
    setFormData(initialFormState)
    setModalOpen(true)
  }

  // Abrir modal para editar
  const handleEditDeposito = (deposito: Deposito) => {
    setEditingDeposito(deposito)
    setFormData({
      tipo: deposito.tipo,
      descricao: deposito.descricao || '',
      valor: deposito.valor.toString(),
      data_deposito: deposito.data_deposito,
      banco: deposito.banco || '',
      agencia: deposito.agencia || '',
      conta: deposito.conta || '',
      numero_guia: deposito.numero_guia || '',
      status: deposito.status,
      data_levantamento: deposito.data_levantamento || '',
      valor_levantado: deposito.valor_levantado?.toString() || '',
      observacoes: deposito.observacoes || '',
    })
    setModalOpen(true)
  }

  // Salvar depósito
  const handleSave = async () => {
    if (!formData.valor || !formData.data_deposito) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (!escritorioId) {
      toast.error('Escritório não identificado')
      return
    }

    try {
      setSaving(true)

      const depositoData = {
        processo_id: processoId,
        escritorio_id: escritorioId,
        tipo: formData.tipo,
        descricao: formData.descricao || null,
        valor: parseFloat(formData.valor.replace(/[^\d.,]/g, '').replace(',', '.')),
        data_deposito: formData.data_deposito,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        numero_guia: formData.numero_guia || null,
        status: formData.status,
        data_levantamento: formData.data_levantamento || null,
        valor_levantado: formData.valor_levantado
          ? parseFloat(formData.valor_levantado.replace(/[^\d.,]/g, '').replace(',', '.'))
          : null,
        observacoes: formData.observacoes || null,
      }

      if (editingDeposito) {
        const { error } = await supabase
          .from('processos_depositos')
          .update(depositoData)
          .eq('id', editingDeposito.id)

        if (error) throw error
        toast.success('Depósito atualizado com sucesso')
      } else {
        const { error } = await supabase
          .from('processos_depositos')
          .insert(depositoData)

        if (error) throw error
        toast.success('Depósito cadastrado com sucesso')
      }

      setModalOpen(false)
      loadDepositos()
    } catch (error) {
      console.error('Erro ao salvar depósito:', error)
      toast.error('Erro ao salvar depósito')
    } finally {
      setSaving(false)
    }
  }

  // Deletar depósito
  const handleDelete = async () => {
    if (!depositoToDelete) return

    try {
      const { error } = await supabase
        .from('processos_depositos')
        .delete()
        .eq('id', depositoToDelete)

      if (error) throw error
      toast.success('Depósito excluído com sucesso')
      setDeleteConfirmOpen(false)
      setDepositoToDelete(null)
      loadDepositos()
    } catch (error) {
      console.error('Erro ao excluir depósito:', error)
      toast.error('Erro ao excluir depósito')
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#34495e] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#89bcbe]" />
              Depósitos Judiciais
            </CardTitle>
            <Button
              size="sm"
              onClick={handleNovoDeposito}
              className="h-8 px-3 text-xs bg-[#34495e] hover:bg-[#46627f]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Novo Depósito
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Totais */}
          {depositos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Ativo</p>
                <p className="text-sm font-semibold text-blue-700">{formatCurrency(totais.ativo)}</p>
                <p className="text-[10px] text-slate-400">{totais.countAtivo} depósito(s)</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Levantado</p>
                <p className="text-sm font-semibold text-emerald-700">{formatCurrency(totais.levantado)}</p>
                <p className="text-[10px] text-slate-400">{totais.countLevantado} depósito(s)</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Convertido</p>
                <p className="text-sm font-semibold text-amber-700">{formatCurrency(totais.convertido)}</p>
                <p className="text-[10px] text-slate-400">{totais.countConvertido} depósito(s)</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Perdido</p>
                <p className="text-sm font-semibold text-red-700">{formatCurrency(totais.perdido)}</p>
                <p className="text-[10px] text-slate-400">{totais.countPerdido} depósito(s)</p>
              </div>
            </div>
          )}

          {/* Lista de Depósitos */}
          {depositos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">Nenhum depósito cadastrado</p>
              <p className="text-xs text-slate-500 mb-4">
                Cadastre depósitos recursais, de embargo, caução ou outros
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNovoDeposito}
                className="text-xs h-8 border-[#89bcbe] text-[#34495e] hover:bg-[#89bcbe]/10"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Cadastrar Depósito
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {depositos.map((deposito) => (
                <div
                  key={deposito.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#34495e] uppercase tracking-wide">
                          {TIPO_LABELS[deposito.tipo]}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium h-5 ${STATUS_COLORS[deposito.status]}`}
                        >
                          {STATUS_LABELS[deposito.status]}
                        </Badge>
                      </div>

                      {deposito.descricao && (
                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                          {deposito.descricao}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-[#34495e] text-base">
                          {formatCurrency(deposito.valor)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatBrazilDate(deposito.data_deposito)}
                        </span>

                        {deposito.numero_guia && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Guia: {deposito.numero_guia}
                          </span>
                        )}
                      </div>

                      {deposito.status === 'levantado' && deposito.valor_levantado && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Levantado: {formatCurrency(deposito.valor_levantado)}
                          {deposito.data_levantamento && (
                            <span className="text-slate-500">
                              em {formatBrazilDate(deposito.data_levantamento)}
                            </span>
                          )}
                        </div>
                      )}

                      {deposito.observacoes && (
                        <p className="mt-2 text-xs text-slate-500 italic">
                          {deposito.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDeposito(deposito)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDepositoToDelete(deposito.id)
                          setDeleteConfirmOpen(true)
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e]">
              {editingDeposito ? 'Editar Depósito' : 'Novo Depósito'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Tipo de Depósito *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recursal">Depósito Recursal</SelectItem>
                  <SelectItem value="embargo">Depósito para Embargo</SelectItem>
                  <SelectItem value="caucao">Caução</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Valor *</Label>
                <Input
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Data do Depósito *</Label>
                <Input
                  type="date"
                  value={formData.data_deposito}
                  onChange={(e) => setFormData({ ...formData, data_deposito: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Descrição</Label>
              <Textarea
                placeholder="Descreva o motivo do depósito..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>

            {/* Número da Guia */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Número da Guia</Label>
              <Input
                type="text"
                placeholder="Ex: 2025.0012345-6"
                value={formData.numero_guia}
                onChange={(e) => setFormData({ ...formData, numero_guia: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            {/* Dados Bancários */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Banco</Label>
                <Input
                  type="text"
                  placeholder="Ex: CEF"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Agência</Label>
                <Input
                  type="text"
                  placeholder="0000"
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Conta</Label>
                <Input
                  type="text"
                  placeholder="00000-0"
                  value={formData.conta}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Seção de Status/Levantamento (apenas na edição) */}
            {editingDeposito && (
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Situação do Depósito
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo (Aguardando)</SelectItem>
                      <SelectItem value="levantado">Levantado (Sacado)</SelectItem>
                      <SelectItem value="convertido">Convertido em Renda</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status !== 'ativo' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Data do Levantamento</Label>
                      <Input
                        type="date"
                        value={formData.data_levantamento}
                        onChange={(e) => setFormData({ ...formData, data_levantamento: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    {formData.status === 'levantado' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Valor Levantado</Label>
                        <Input
                          type="text"
                          placeholder="R$ 0,00"
                          value={formData.valor_levantado}
                          onChange={(e) => setFormData({ ...formData, valor_levantado: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Observações</Label>
                  <Textarea
                    placeholder="Observações sobre o levantamento ou conversão..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-xs h-9 bg-[#34495e] hover:bg-[#46627f]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Depósito
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir este depósito? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="text-xs h-9 bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
