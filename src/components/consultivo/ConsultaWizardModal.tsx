'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Scale,
  User,
  Calendar,
  Loader2,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ConsultaWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  escritorioId?: string
}

interface Cliente {
  id: string
  nome_completo: string
}

interface Responsavel {
  id: string
  nome_completo: string
}

const AREAS = [
  { value: 'civel', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'societario', label: 'Societário' },
  { value: 'contratual', label: 'Contratual' },
  { value: 'familia', label: 'Família' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'ambiental', label: 'Ambiental' },
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'propriedade_intelectual', label: 'Propriedade Intelectual' },
  { value: 'outros', label: 'Outros' },
]

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  { value: 'media', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'alta', label: 'Alta', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700' },
]

export function ConsultaWizardModal({
  open,
  onOpenChange,
  onSuccess,
  escritorioId,
}: ConsultaWizardModalProps) {
  const supabase = createClient()

  // Form data
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    cliente_id: '',
    area: '',
    prioridade: 'media',
    prazo: '',
    responsavel_id: '',
  })

  // States
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Data loading
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [currentEscritorioId, setCurrentEscritorioId] = useState<string | null>(escritorioId || null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        if (!currentEscritorioId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('escritorio_id')
            .eq('id', user.id)
            .single()

          if (profile) {
            setCurrentEscritorioId(profile.escritorio_id)
          }
        }
      }
    }
    if (open) {
      loadUserData()
    }
  }, [open, currentEscritorioId])

  // Load clientes
  useEffect(() => {
    const loadClientes = async () => {
      if (!currentEscritorioId || !open) return

      setLoadingClientes(true)
      try {
        let query = supabase
          .from('crm_pessoas')
          .select('id, nome_completo')
          .eq('escritorio_id', currentEscritorioId)
          .eq('status', 'ativo')
          .in('tipo_cadastro', ['cliente', 'prospecto'])
          .order('nome_completo')
          .limit(50)

        if (clienteSearch) {
          query = query.ilike('nome_completo', `%${clienteSearch}%`)
        }

        const { data, error } = await query

        if (error) throw error
        setClientes(data || [])
      } catch (err) {
        console.error('Erro ao carregar clientes:', err)
      } finally {
        setLoadingClientes(false)
      }
    }

    const debounce = setTimeout(loadClientes, 300)
    return () => clearTimeout(debounce)
  }, [currentEscritorioId, open, clienteSearch])

  // Load responsaveis
  useEffect(() => {
    const loadResponsaveis = async () => {
      if (!currentEscritorioId || !open) return

      setLoadingResponsaveis(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('escritorio_id', currentEscritorioId)
          .order('nome_completo')

        if (error) throw error
        setResponsaveis(data || [])

        // Set current user as default responsavel
        if (currentUserId && !formData.responsavel_id) {
          setFormData(prev => ({ ...prev, responsavel_id: currentUserId }))
        }
      } catch (err) {
        console.error('Erro ao carregar responsáveis:', err)
      } finally {
        setLoadingResponsaveis(false)
      }
    }

    loadResponsaveis()
  }, [currentEscritorioId, open, currentUserId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Informe o título da consulta'
    }
    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Selecione o cliente'
    }
    if (!formData.area) {
      newErrors.area = 'Selecione a área jurídica'
    }
    if (!formData.responsavel_id) {
      newErrors.responsavel_id = 'Selecione o responsável'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!currentEscritorioId) {
      toast.error('Escritório não identificado')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('consultivo_consultas')
        .insert({
          escritorio_id: currentEscritorioId,
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim() || null,
          cliente_id: formData.cliente_id,
          area: formData.area,
          prioridade: formData.prioridade,
          prazo: formData.prazo || null,
          responsavel_id: formData.responsavel_id,
          created_by: currentUserId,
          status: 'ativo',
          anexos: [],
          andamentos: [],
        })

      if (error) throw error

      toast.success('Consulta criada com sucesso')
      onSuccess?.()
      handleClose()
    } catch (err: any) {
      console.error('Erro ao criar consulta:', err)
      toast.error(err?.message || 'Erro ao criar consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setFormData({
      titulo: '',
      descricao: '',
      cliente_id: '',
      area: '',
      prioridade: 'media',
      prazo: '',
      responsavel_id: currentUserId || '',
    })
    setErrors({})
    setClienteSearch('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Scale className="w-5 h-5 text-[#89bcbe]" />
            Nova Consulta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="titulo" className="text-xs font-medium">
              Título da Consulta <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Ex: Análise de contrato de prestação de serviços"
              className={cn('h-9 text-sm', errors.titulo && 'border-red-300')}
            />
            {errors.titulo && (
              <p className="text-[10px] text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.titulo}
              </p>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label htmlFor="cliente" className="text-xs font-medium">
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => handleChange('cliente_id', value)}
            >
              <SelectTrigger className={cn('h-9 text-sm', errors.cliente_id && 'border-red-300')}>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="h-8 text-xs pl-7"
                    />
                  </div>
                </div>
                {loadingClientes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : clientes.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    Nenhum cliente encontrado
                  </div>
                ) : (
                  clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {cliente.nome_completo}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.cliente_id && (
              <p className="text-[10px] text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.cliente_id}
              </p>
            )}
          </div>

          {/* Área e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="area" className="text-xs font-medium">
                Área Jurídica <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.area}
                onValueChange={(value) => handleChange('area', value)}
              >
                <SelectTrigger className={cn('h-9 text-sm', errors.area && 'border-red-300')}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area.value} value={area.value} className="text-xs">
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.area && (
                <p className="text-[10px] text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.area}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prioridade" className="text-xs font-medium">
                Prioridade
              </Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => handleChange('prioridade', value)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', p.color)}>
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prazo e Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prazo" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Prazo
              </Label>
              <Input
                id="prazo"
                type="date"
                value={formData.prazo}
                onChange={(e) => handleChange('prazo', e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsavel" className="text-xs font-medium">
                Responsável <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(value) => handleChange('responsavel_id', value)}
              >
                <SelectTrigger className={cn('h-9 text-sm', errors.responsavel_id && 'border-red-300')}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {loadingResponsaveis ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    responsaveis.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id} className="text-xs">
                        {resp.nome_completo}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.responsavel_id && (
                <p className="text-[10px] text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.responsavel_id}
                </p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao" className="text-xs font-medium">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descreva os detalhes da consulta, questões específicas, documentos relevantes..."
              className="text-sm min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 text-xs bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Consulta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
