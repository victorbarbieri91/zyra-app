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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Receipt, Loader2, AlertCircle, FileText, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DespesaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId?: string
  clienteId?: string
  onSuccess?: () => void
}

interface FormData {
  categoria: string
  descricao: string
  valor: string
  data: string
  comprovante_url: string
  reembolsavel: boolean
  observacao_reembolso: string
}

const CATEGORIAS_DESPESA = [
  { value: 'custas', label: 'Custas Processuais' },
  { value: 'honorarios_perito', label: 'Honorários de Perito' },
  { value: 'oficial_justica', label: 'Oficial de Justiça' },
  { value: 'correios', label: 'Correios / Envios' },
  { value: 'cartorio', label: 'Cartório' },
  { value: 'copia', label: 'Cópias / Impressões' },
  { value: 'deslocamento', label: 'Deslocamento / Transporte' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'publicacao', label: 'Publicação' },
  { value: 'certidao', label: 'Certidões' },
  { value: 'protesto', label: 'Protesto' },
  { value: 'outra', label: 'Outra Despesa' },
]

const initialFormData: FormData = {
  categoria: '',
  descricao: '',
  valor: '',
  data: new Date().toISOString().split('T')[0],
  comprovante_url: '',
  reembolsavel: false,
  observacao_reembolso: '',
}

export default function DespesaModal({
  open,
  onOpenChange,
  processoId,
  clienteId,
  onSuccess,
}: DespesaModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [processoInfo, setProcessoInfo] = useState<{ numero_cnj: string; cliente_nome: string } | null>(null)
  const supabase = createClient()

  // Carregar info do processo se fornecido
  useEffect(() => {
    const loadProcessoInfo = async () => {
      if (!processoId) {
        setProcessoInfo(null)
        return
      }

      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          numero_cnj,
          clientes:cliente_id(nome)
        `)
        .eq('id', processoId)
        .single()

      if (!error && data) {
        setProcessoInfo({
          numero_cnj: data.numero_cnj,
          cliente_nome: (data.clientes as any)?.nome || 'Cliente não identificado',
        })
      }
    }

    if (open) {
      loadProcessoInfo()
    }
  }, [processoId, open, supabase])

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      setFormData(initialFormData)
    }
  }, [open])

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validações
    if (!formData.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição da despesa')
      return
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data) {
      toast.error('Informe a data da despesa')
      return
    }

    try {
      setLoading(true)

      const despesaData = {
        processo_id: processoId || null,
        cliente_id: clienteId || null,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_despesa: formData.data,
        comprovante_url: formData.comprovante_url || null,
        reembolsavel: formData.reembolsavel,
        reembolso_status: formData.reembolsavel ? 'pendente' : null,
        observacao_reembolso: formData.reembolsavel ? formData.observacao_reembolso : null,
        status: 'pendente',
      }

      const { error } = await supabase.from('financeiro_despesas').insert(despesaData)

      if (error) throw error

      toast.success('Despesa lançada com sucesso!')
      setFormData(initialFormData)
      onOpenChange(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Erro ao lançar despesa:', error)
      toast.error('Erro ao lançar despesa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Receipt className="w-5 h-5" />
            Nova Despesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do processo */}
          {processoInfo && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Processo:</span>
                <span className="font-medium text-[#34495e]">{processoInfo.numero_cnj}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1 text-slate-500">
                <span>Cliente: {processoInfo.cliente_nome}</span>
              </div>
            </div>
          )}

          {/* Categoria */}
          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={formData.categoria} onValueChange={(v) => updateField('categoria', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_DESPESA.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva a despesa..."
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
              rows={2}
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) => updateField('valor', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => updateField('data', e.target.value)}
              />
            </div>
          </div>

          {/* Comprovante */}
          <div>
            <Label htmlFor="comprovante_url">URL do Comprovante</Label>
            <Input
              id="comprovante_url"
              type="url"
              placeholder="https://..."
              value={formData.comprovante_url}
              onChange={(e) => updateField('comprovante_url', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Link para o comprovante armazenado (ex: Drive, Dropbox)
            </p>
          </div>

          {/* Reembolsável */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="reembolsavel"
                checked={formData.reembolsavel}
                onCheckedChange={(checked) => updateField('reembolsavel', !!checked)}
              />
              <div className="flex-1">
                <Label htmlFor="reembolsavel" className="cursor-pointer">
                  <span className="font-medium">Despesa reembolsável pelo cliente</span>
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marque se esta despesa será cobrada do cliente posteriormente
                </p>
              </div>
            </div>

            {formData.reembolsavel && (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    Será incluída em fatura
                  </Badge>
                </div>
                <Label htmlFor="observacao_reembolso">Observação para fatura</Label>
                <Textarea
                  id="observacao_reembolso"
                  placeholder="Ex: NF nº 12345, data X..."
                  value={formData.observacao_reembolso}
                  onChange={(e) => updateField('observacao_reembolso', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Informe dados da nota fiscal ou observações para cobrança
                </p>
              </div>
            )}
          </div>

          {/* Aviso se não vincular a processo */}
          {!processoId && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">Despesa sem vínculo a processo</p>
                <p>Esta despesa será registrada como despesa geral do escritório.</p>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Lançar Despesa
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
