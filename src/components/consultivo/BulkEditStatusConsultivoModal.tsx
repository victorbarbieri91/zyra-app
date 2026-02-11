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
import { toast } from 'sonner'

interface BulkEditStatusConsultivoModalProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'arquivado', label: 'Arquivado' },
]

export function BulkEditStatusConsultivoModal({
  open,
  onClose,
  selectedIds,
  onSuccess,
}: BulkEditStatusConsultivoModalProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async () => {
    if (!value) {
      setError('Selecione um status')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('consultivo_consultas')
        .update({ status: value })
        .in('id', selectedIds)

      if (updateError) throw updateError

      toast.success(`Status de ${selectedIds.length} ${selectedIds.length === 1 ? 'pasta' : 'pastas'} atualizado`)
      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
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
          <DialogTitle className="text-sm">Alterar Status</DialogTitle>
          <DialogDescription className="text-xs">
            Alterar o status de {selectedIds.length} {selectedIds.length === 1 ? 'pasta' : 'pastas'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Novo Status</Label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                {STATUS_OPTIONS.map((opt) => (
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
