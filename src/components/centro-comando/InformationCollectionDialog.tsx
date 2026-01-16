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
import { ToolResult, CampoNecessario } from '@/types/centro-comando'

interface InformationCollectionDialogProps {
  toolResult: ToolResult | null
  onSubmit: (dados: Record<string, any>) => void
  onCancel: () => void
  loading?: boolean
}

export function InformationCollectionDialog({
  toolResult,
  onSubmit,
  onCancel,
  loading,
}: InformationCollectionDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form quando toolResult mudar
  useEffect(() => {
    if (toolResult?.campos_necessarios) {
      const initialData: Record<string, any> = {}
      toolResult.campos_necessarios.forEach((campo) => {
        initialData[campo.campo] = ''
      })
      setFormData(initialData)
      setErrors({})
    }
  }, [toolResult])

  if (!toolResult || !toolResult.campos_necessarios) return null

  const campos = toolResult.campos_necessarios

  // Validar campos obrigatorios
  const validarForm = (): boolean => {
    const novosErros: Record<string, string> = {}

    campos.forEach((campo) => {
      if (campo.obrigatorio && !formData[campo.campo]?.toString().trim()) {
        novosErros[campo.campo] = 'Campo obrigatório'
      }
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
        const newErrors = { ...prev }
        delete newErrors[campo]
        return newErrors
      })
    }
  }

  // Renderizar input baseado no tipo
  const renderInput = (campo: CampoNecessario) => {
    const valor = formData[campo.campo] || ''
    const erro = errors[campo.campo]

    switch (campo.tipo) {
      case 'selecao':
        return (
          <Select
            value={valor}
            onValueChange={(v) => handleChange(campo.campo, v)}
          >
            <SelectTrigger className={`text-sm ${erro ? 'border-red-300' : ''}`}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {campo.opcoes?.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'data':
        return (
          <Input
            type="date"
            value={valor}
            onChange={(e) => handleChange(campo.campo, e.target.value)}
            className={`text-sm ${erro ? 'border-red-300' : ''}`}
          />
        )

      case 'numero':
        return (
          <Input
            type="number"
            value={valor}
            onChange={(e) => handleChange(campo.campo, e.target.value)}
            placeholder={campo.descricao}
            className={`text-sm ${erro ? 'border-red-300' : ''}`}
          />
        )

      case 'texto':
      default:
        const usarTextarea = campo.descricao.toLowerCase().includes('descricao') ||
          campo.descricao.toLowerCase().includes('observacao') ||
          campo.descricao.toLowerCase().includes('detalhes')

        if (usarTextarea) {
          return (
            <Textarea
              value={valor}
              onChange={(e) => handleChange(campo.campo, e.target.value)}
              placeholder={campo.descricao}
              className={`text-sm ${erro ? 'border-red-300' : ''}`}
              rows={3}
            />
          )
        }

        return (
          <Input
            type="text"
            value={valor}
            onChange={(e) => handleChange(campo.campo, e.target.value)}
            placeholder={campo.descricao}
            className={`text-sm ${erro ? 'border-red-300' : ''}`}
          />
        )
    }
  }

  return (
    <Dialog open={!!toolResult} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[#34495e]">
            Informações necessárias
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {toolResult.contexto || 'Preencha os dados para continuar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4">
          {campos.map((campo) => (
            <div key={campo.campo} className="space-y-1.5">
              <Label htmlFor={campo.campo} className="text-xs font-medium text-slate-600">
                {campo.descricao}
                {campo.obrigatorio && <span className="text-red-400 ml-0.5">*</span>}
              </Label>
              {renderInput(campo)}
              {errors[campo.campo] && (
                <p className="text-[11px] text-red-500">{errors[campo.campo]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            size="sm"
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="sm"
            className="bg-[#34495e] hover:bg-[#46627f] text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
