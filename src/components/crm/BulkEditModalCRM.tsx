'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StatusPessoa, TipoCadastro, TIPO_CADASTRO_LABELS } from '@/types/crm'

type EditFieldCRM = 'status' | 'categoria'

interface BulkEditModalCRMProps {
  open: boolean
  onClose: () => void
  field: EditFieldCRM
  selectedIds: string[]
  onSuccess: () => void
}

const STATUS_OPTIONS: { value: StatusPessoa; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'arquivado', label: 'Arquivado' },
]

const CATEGORIA_OPTIONS: { value: TipoCadastro; label: string }[] = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'prospecto', label: 'Prospecto' },
  { value: 'parte_contraria', label: 'Parte Contraria' },
  { value: 'correspondente', label: 'Correspondente' },
  { value: 'testemunha', label: 'Testemunha' },
  { value: 'perito', label: 'Perito' },
  { value: 'juiz', label: 'Juiz' },
  { value: 'promotor', label: 'Promotor' },
  { value: 'outros', label: 'Outros' },
]

export function BulkEditModalCRM({
  open,
  onClose,
  field,
  selectedIds,
  onSuccess,
}: BulkEditModalCRMProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fieldConfig = {
    status: {
      title: 'Alterar Status',
      description: `Alterar o status de ${selectedIds.length} ${selectedIds.length === 1 ? 'pessoa' : 'pessoas'}`,
      label: 'Novo Status',
      options: STATUS_OPTIONS,
      dbField: 'status',
    },
    categoria: {
      title: 'Alterar Categoria',
      description: `Alterar a categoria de ${selectedIds.length} ${selectedIds.length === 1 ? 'pessoa' : 'pessoas'}`,
      label: 'Nova Categoria',
      options: CATEGORIA_OPTIONS,
      dbField: 'tipo_cadastro',
    },
  }

  const config = fieldConfig[field]

  const handleSubmit = async () => {
    if (!value) {
      setError('Selecione um valor')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('crm_pessoas')
        .update({ [config.dbField]: value })
        .in('id', selectedIds)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      setError('Erro ao atualizar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setValue('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{config.title}</DialogTitle>
          <DialogDescription className="text-xs">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{config.label}</Label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {config.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !value}
            className="h-8 text-xs bg-gradient-to-r from-[#34495e] to-[#46627f]"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
