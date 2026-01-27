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
import { Phone, Video, Mail, MessageCircle, Users, Calendar, FileText, Briefcase, FileCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { InteracaoJSONB } from '@/types/crm'

type TipoInteracao = InteracaoJSONB['tipo']

interface InteracaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId?: string
  pessoaNome?: string
  oportunidadeId?: string
  onSave?: (interacao: Omit<InteracaoJSONB, 'id'>) => Promise<void>
  onSuccess?: () => void
}

const tiposInteracao: { value: TipoInteracao; label: string; icon: any }[] = [
  { value: 'ligacao', label: 'Ligacao', icon: Phone },
  { value: 'reuniao', label: 'Reuniao', icon: Users },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'videochamada', label: 'Videochamada', icon: Video },
  { value: 'visita', label: 'Visita', icon: Calendar },
  { value: 'proposta_enviada', label: 'Proposta Enviada', icon: Briefcase },
  { value: 'contrato_enviado', label: 'Contrato Enviado', icon: FileCheck },
  { value: 'outros', label: 'Outros', icon: FileText },
]

export function InteracaoModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
  oportunidadeId,
  onSave,
  onSuccess,
}: InteracaoModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState({
    tipo: '' as TipoInteracao | '',
    descricao: '',
    data: new Date().toISOString().slice(0, 16),
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({
      tipo: '',
      descricao: '',
      data: new Date().toISOString().slice(0, 16),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tipo || !formData.descricao) return

    setSaving(true)
    try {
      // Se tem oportunidadeId, salvar direto no banco
      if (oportunidadeId) {
        // Buscar usuário atual
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('Usuário não autenticado')

        const { data: profile } = await supabase
          .from('profiles')
          .select('nome_completo')
          .eq('id', userData.user.id)
          .single()

        // Buscar interações atuais da oportunidade
        const { data: oportunidade, error: fetchError } = await supabase
          .from('crm_oportunidades')
          .select('interacoes')
          .eq('id', oportunidadeId)
          .single()

        if (fetchError) throw fetchError

        // Criar nova interação
        const novaInteracao: InteracaoJSONB = {
          id: crypto.randomUUID(),
          tipo: formData.tipo as TipoInteracao,
          descricao: formData.descricao,
          data: new Date(formData.data).toISOString(),
          user_id: userData.user.id,
          user_nome: profile?.nome_completo || 'Usuário',
        }

        // Adicionar ao array
        const interacoesAtualizadas = [...(oportunidade?.interacoes || []), novaInteracao]

        // Salvar
        const { error: updateError } = await supabase
          .from('crm_oportunidades')
          .update({
            interacoes: interacoesAtualizadas,
            updated_at: new Date().toISOString()
          })
          .eq('id', oportunidadeId)

        if (updateError) throw updateError

        toast.success('Interação registrada com sucesso!')
        onSuccess?.()
      } else if (onSave) {
        // Fallback para o callback manual
        await onSave({
          tipo: formData.tipo as TipoInteracao,
          descricao: formData.descricao,
          data: formData.data,
          user_id: '',
        })
      }

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar interação:', error)
      toast.error('Erro ao salvar interação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Interação</DialogTitle>
          <DialogDescription>
            {pessoaNome ? `Registrar interação com ${pessoaNome}` : 'Registrar nova interação'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Interação */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Interação *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoInteracao })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposInteracao.map((tipo) => {
                  const Icon = tipo.icon
                  return (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {tipo.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Hora */}
          <div className="space-y-2">
            <Label htmlFor="data">Data e Hora *</Label>
            <Input
              id="data"
              type="datetime-local"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva os detalhes da interação..."
              rows={4}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
              disabled={saving || !formData.tipo || !formData.descricao}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Registrar Interação'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
