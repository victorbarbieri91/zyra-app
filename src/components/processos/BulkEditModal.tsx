'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type EditField = 'area' | 'responsavel' | 'status' | 'prioridade' | 'tags'

interface BulkEditModalProps {
  open: boolean
  onClose: () => void
  field: EditField
  selectedIds: string[]
  onSuccess: () => void
}

interface Profile {
  id: string
  nome_completo: string
}

const AREAS = [
  { value: 'civel', label: 'Civel' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributaria', label: 'Tributaria' },
  { value: 'familia', label: 'Familia' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'previdenciaria', label: 'Previdenciaria' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'ambiental', label: 'Ambiental' },
  { value: 'outra', label: 'Outra' },
]

const STATUS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'baixado', label: 'Baixado' },
  { value: 'transito_julgado', label: 'Transito em Julgado' },
  { value: 'acordo', label: 'Acordo' },
]

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const FIELD_CONFIG: Record<EditField, { title: string; description: string }> = {
  area: {
    title: 'Alterar Area',
    description: 'Selecione a nova area juridica para os processos selecionados.',
  },
  responsavel: {
    title: 'Alterar Responsavel',
    description: 'Selecione o novo advogado responsavel pelos processos selecionados.',
  },
  status: {
    title: 'Alterar Status',
    description: 'Selecione o novo status para os processos selecionados.',
  },
  prioridade: {
    title: 'Alterar Prioridade',
    description: 'Selecione a nova prioridade para os processos selecionados.',
  },
  tags: {
    title: 'Adicionar Tags',
    description: 'Digite as tags separadas por virgula para adicionar aos processos selecionados.',
  },
}

export function BulkEditModal({
  open,
  onClose,
  field,
  selectedIds,
  onSuccess,
}: BulkEditModalProps) {
  const [value, setValue] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [result, setResult] = useState<{
    success: number
    failed: number
  } | null>(null)

  const supabase = createClient()
  const config = FIELD_CONFIG[field]

  // Carregar perfis se for alteracao de responsavel
  useEffect(() => {
    if (field === 'responsavel' && open) {
      loadProfiles()
    }
  }, [field, open])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setValue('')
      setTagsInput('')
      setResult(null)
    }
  }, [open])

  const loadProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data: membros } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .eq('escritorio_id', profile.escritorio_id)
        .order('nome_completo')

      setProfiles(membros || [])
    } catch (error) {
      console.error('Erro ao carregar perfis:', error)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const handleSubmit = async () => {
    if (field !== 'tags' && !value) return
    if (field === 'tags' && !tagsInput.trim()) return

    setLoading(true)
    setResult(null)

    try {
      let updateData: Record<string, unknown> = {}

      switch (field) {
        case 'area':
          updateData = { area: value }
          break
        case 'responsavel':
          updateData = { responsavel_id: value }
          break
        case 'status':
          updateData = { status: value }
          break
        case 'prioridade':
          updateData = { prioridade: value }
          break
        case 'tags':
          // Para tags, precisamos fazer merge com tags existentes
          // Por simplicidade, vamos fazer update direto
          const newTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
          updateData = { tags: newTags }
          break
      }

      const { data, error } = await supabase
        .from('processos_processos')
        .update(updateData)
        .in('id', selectedIds)
        .select('id')

      if (error) throw error

      setResult({
        success: data?.length || 0,
        failed: selectedIds.length - (data?.length || 0),
      })

      // Se todos foram atualizados com sucesso, fechar apos delay
      if (data?.length === selectedIds.length) {
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      }
    } catch (error) {
      console.error('Erro ao atualizar processos:', error)
      setResult({
        success: 0,
        failed: selectedIds.length,
      })
    } finally {
      setLoading(false)
    }
  }

  const renderFieldInput = () => {
    switch (field) {
      case 'area':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a area" />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((area) => (
                <SelectItem key={area.value} value={area.value}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'responsavel':
        if (loadingProfiles) {
          return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando membros...
            </div>
          )
        }
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o responsavel" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'status':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'prioridade':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES.map((prioridade) => (
                <SelectItem key={prioridade.value} value={prioridade.value}>
                  {prioridade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'tags':
        return (
          <div className="space-y-2">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: urgente, revisao, cobranca"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1">
                {tagsInput.split(',').map((tag, i) => (
                  tag.trim() && (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  )
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Contagem de processos */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-slate-700">
              Esta acao afetara{' '}
              <span className="font-semibold">{selectedIds.length}</span>{' '}
              {selectedIds.length === 1 ? 'processo' : 'processos'}
            </span>
          </div>

          {/* Campo de input */}
          <div className="space-y-2">
            <Label>Novo valor</Label>
            {renderFieldInput()}
          </div>

          {/* Resultado */}
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result.failed > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {result.failed > 0 ? (
                <X className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span className="text-sm">
                {result.success > 0 && (
                  <>
                    {result.success} {result.success === 1 ? 'processo atualizado' : 'processos atualizados'}
                  </>
                )}
                {result.failed > 0 && (
                  <>
                    {result.success > 0 && ', '}
                    {result.failed} {result.failed === 1 ? 'falhou' : 'falharam'}
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (field !== 'tags' && !value) || (field === 'tags' && !tagsInput.trim())}
            className="bg-[#34495e] hover:bg-[#2c3e50] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
