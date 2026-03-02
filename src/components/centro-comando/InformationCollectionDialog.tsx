'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Loader2 } from 'lucide-react'
import { CampoNecessario, PendingInput } from '@/types/centro-comando'

interface InformationCollectionDialogProps {
  pendingInput: PendingInput | null
  onSubmit: (dados: Record<string, any>) => void
  onCancel: () => void
  loading?: boolean
}

export function InformationCollectionDialog({ pendingInput, onSubmit, onCancel, loading }: InformationCollectionDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!pendingInput) return
    const initialData: Record<string, any> = {}
    pendingInput.schema.fields.forEach((campo) => {
      initialData[campo.campo] = campo.valor_padrao ?? ''
    })
    setFormData(initialData)
    setErrors({})
  }, [pendingInput])

  if (!pendingInput) return null

  const campos = pendingInput.schema.fields
  const options = pendingInput.schema.options || []

  const validarForm = () => {
    const novosErros: Record<string, string> = {}
    campos.forEach((campo) => {
      if (campo.obrigatorio && !String(formData[campo.campo] ?? '').trim()) novosErros[campo.campo] = 'Campo obrigatorio'
    })
    setErrors(novosErros)
    return Object.keys(novosErros).length === 0
  }

  const handleSubmit = () => {
    if (!validarForm()) return
    onSubmit(formData)
  }

  const handleChange = (campo: string, valor: any) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }))
    if (errors[campo]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[campo]
        return next
      })
    }
  }

  const renderInput = (campo: CampoNecessario) => {
    const valor = formData[campo.campo] || ''
    const erro = errors[campo.campo]
    if (pendingInput.tipo === 'disambiguation' && campo.campo === 'selected_option') {
      return (
        <Select value={valor} onValueChange={(v) => handleChange(campo.campo, v)}>
          <SelectTrigger className={`text-sm ${erro ? 'border-red-300' : ''}`}>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opcao) => (
              <SelectItem key={opcao.id} value={opcao.id}>
                {opcao.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    switch (campo.tipo) {
      case 'selecao':
        return (
          <Select value={valor} onValueChange={(v) => handleChange(campo.campo, v)}>
            <SelectTrigger className={`text-sm ${erro ? 'border-red-300' : ''}`}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {campo.opcoes?.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'data':
        return <Input type="date" value={valor} onChange={(e) => handleChange(campo.campo, e.target.value)} className={`text-sm ${erro ? 'border-red-300' : ''}`} />
      case 'numero':
        return <Input type="number" value={valor} onChange={(e) => handleChange(campo.campo, e.target.value)} className={`text-sm ${erro ? 'border-red-300' : ''}`} />
      default: {
        const usarTextarea = campo.descricao.toLowerCase().includes('descricao') || campo.descricao.toLowerCase().includes('detalhes') || campo.descricao.toLowerCase().includes('observacao')
        return usarTextarea
          ? <Textarea value={valor} onChange={(e) => handleChange(campo.campo, e.target.value)} className={`text-sm ${erro ? 'border-red-300' : ''}`} rows={3} />
          : <Input type="text" value={valor} onChange={(e) => handleChange(campo.campo, e.target.value)} className={`text-sm ${erro ? 'border-red-300' : ''}`} />
      }
    }
  }

  return (
    <Dialog open={!!pendingInput} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[#34495e]">Informacoes necessarias</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">{pendingInput.contexto}</DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-4">
          {pendingInput.tipo === 'disambiguation' && options.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              {options.map((opcao) => (
                <div key={opcao.id} className="text-xs text-slate-600">
                  <div className="font-medium">{opcao.label}</div>
                  {opcao.description && <div className="text-slate-400">{opcao.description}</div>}
                </div>
              ))}
            </div>
          )}
          {campos.map((campo) => (
            <div key={campo.campo} className="space-y-1.5">
              <Label htmlFor={campo.campo} className="text-xs font-medium text-slate-600">
                {campo.descricao}
                {campo.obrigatorio && <span className="text-red-400 ml-0.5">*</span>}
              </Label>
              {renderInput(campo)}
              {errors[campo.campo] && <p className="text-[11px] text-red-500">{errors[campo.campo]}</p>}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} size="sm" className="text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} size="sm" className="bg-[#34495e] hover:bg-[#46627f] text-xs">
            {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Enviando...</> : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
