'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  User,
  Loader2,
  Search,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AREAS_JURIDICAS_OPTIONS } from '@/lib/constants/areas-juridicas'
import { TIPOS_CONSULTA, TIPOS_CONSULTA_LISTA, type TipoConsulta } from '@/lib/constants/consultivo-tipos'

interface EditarConsultivoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consulta: {
    id: string
    titulo: string
    descricao: string | null
    cliente_id: string
    cliente_nome?: string
    area: string
    prioridade: string
    prazo: string | null
    responsavel_id: string
    responsavel_nome?: string
    tipo?: string | null
    responsaveis_ids?: string[] | null
  }
  onSuccess?: () => void
}

interface Cliente {
  id: string
  nome_completo: string
}

interface Responsavel {
  id: string
  nome_completo: string
}

const AREAS = AREAS_JURIDICAS_OPTIONS

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

export default function EditarConsultivoModal({
  open,
  onOpenChange,
  consulta,
  onSuccess,
}: EditarConsultivoModalProps) {
  const supabase = createClient()

  // Form data - inicializado com os dados da consulta
  const [formData, setFormData] = useState({
    titulo: consulta.titulo,
    descricao: consulta.descricao || '',
    cliente_id: consulta.cliente_id,
    tipo: (consulta.tipo as TipoConsulta | '') || '',
    area: consulta.area,
    prioridade: consulta.prioridade,
    prazo: consulta.prazo || '',
    responsavel_id: consulta.responsavel_id,
  })
  const [responsaveisExtras, setResponsaveisExtras] = useState<string[]>(consulta.responsaveis_ids || [])

  // States
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Data loading
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteAtual, setClienteAtual] = useState<Cliente | null>(null)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  // Atualizar formData e carregar cliente atual quando consulta mudar
  useEffect(() => {
    if (open && consulta) {
      setFormData({
        titulo: consulta.titulo,
        descricao: consulta.descricao || '',
        cliente_id: consulta.cliente_id,
        tipo: (consulta.tipo as TipoConsulta | '') || '',
        area: consulta.area,
        prioridade: consulta.prioridade,
        prazo: consulta.prazo || '',
        responsavel_id: consulta.responsavel_id,
      })
      setResponsaveisExtras(consulta.responsaveis_ids || [])

      if (consulta.cliente_nome) {
        setClienteAtual({
          id: consulta.cliente_id,
          nome_completo: consulta.cliente_nome,
        })
      } else if (consulta.cliente_id) {
        const loadClienteAtual = async () => {
          try {
            const { data, error } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .eq('id', consulta.cliente_id)
              .single()

            if (error) throw error
            if (data) {
              setClienteAtual(data)
            }
          } catch (err) {
            console.error('Erro ao carregar cliente atual:', err)
          }
        }
        loadClienteAtual()
      }
    }
  }, [open, consulta, supabase])

  // Load escritorioId
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    if (open) {
      loadEscritorioId()
    }
  }, [open, supabase])

  // Load clientes
  useEffect(() => {
    const loadClientes = async () => {
      if (!escritorioId || !open) return

      setLoadingClientes(true)
      try {
        let query = supabase
          .from('crm_pessoas')
          .select('id, nome_completo')
          .eq('escritorio_id', escritorioId)
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
  }, [escritorioId, open, clienteSearch, supabase])

  // Load responsaveis
  useEffect(() => {
    const loadResponsaveis = async () => {
      if (!escritorioId || !open) return

      setLoadingResponsaveis(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('escritorio_id', escritorioId)
          .order('nome_completo')

        if (error) throw error
        setResponsaveis(data || [])
      } catch (err) {
        console.error('Erro ao carregar responsáveis:', err)
      } finally {
        setLoadingResponsaveis(false)
      }
    }

    loadResponsaveis()
  }, [escritorioId, open, supabase])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const toggleExtra = (id: string) => {
    setResponsaveisExtras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.titulo.trim()) newErrors.titulo = 'Informe o título da consulta'
    if (!formData.cliente_id) newErrors.cliente_id = 'Selecione o cliente'
    if (!formData.tipo) newErrors.tipo = 'Selecione o tipo'
    if (!formData.area) newErrors.area = 'Selecione a área jurídica'
    if (!formData.responsavel_id) newErrors.responsavel_id = 'Selecione o responsável'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('consultivo_consultas')
        .update({
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim() || null,
          cliente_id: formData.cliente_id,
          tipo: formData.tipo || null,
          area: formData.area,
          prioridade: formData.prioridade,
          prazo: formData.prazo || null,
          responsavel_id: formData.responsavel_id,
          responsaveis_ids: responsaveisExtras.filter(id => id !== formData.responsavel_id),
          updated_at: new Date().toISOString(),
        })
        .eq('id', consulta.id)

      if (error) throw error

      toast.success('Consulta atualizada com sucesso')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao atualizar consulta:', err)
      toast.error(err?.message || 'Erro ao atualizar consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setErrors({})
    setClienteSearch('')
    setClienteAtual(null)
    onOpenChange(false)
  }

  const lbl = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500 mb-1.5 block'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-visible">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-[#f0ede3] dark:border-[#1d2a3c]">
          <DialogTitle className="text-[19px] font-semibold text-[#2c3e50] dark:text-slate-200" style={{ fontFamily: 'var(--font-fraunces)', letterSpacing: '-0.02em' }}>
            Editar consulta
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#9aa1a8] dark:text-slate-400">
            Atualize os dados da consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5 max-h-[70vh] overflow-y-auto">
          {/* ── Coluna esquerda ── */}
          <div className="space-y-4">
            {/* Cliente */}
            <div>
              <Label className={lbl}>Cliente <span className="text-[#a85a3e]">*</span></Label>
              <Select value={formData.cliente_id} onValueChange={(v) => handleChange('cliente_id', v)}>
                <SelectTrigger className={cn('h-10 text-sm', errors.cliente_id && 'border-red-300')}>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="h-8 text-xs pl-7"
                      />
                    </div>
                  </div>
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                  ) : (
                    <>
                      {clienteAtual && !clientes.some(c => c.id === clienteAtual.id) && (
                        <SelectItem key={clienteAtual.id} value={clienteAtual.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#89bcbe]" />
                            {clienteAtual.nome_completo}
                            <span className="text-[10px] text-slate-400">(atual)</span>
                          </div>
                        </SelectItem>
                      )}
                      {clientes.length === 0 && !clienteAtual ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">Nenhum cliente encontrado</div>
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
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.cliente_id && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.cliente_id}</p>}
            </div>

            {/* Título */}
            <div>
              <Label className={lbl}>Título / assunto <span className="text-[#a85a3e]">*</span></Label>
              <Input
                value={formData.titulo}
                onChange={(e) => handleChange('titulo', e.target.value)}
                placeholder="Ex: Análise de minuta de aditivo contratual"
                className={cn('h-10 text-sm', errors.titulo && 'border-red-300')}
              />
              {errors.titulo && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.titulo}</p>}
            </div>

            {/* Tipo + Área */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={lbl}>Tipo <span className="text-[#a85a3e]">*</span></Label>
                <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                  <SelectTrigger className={cn('h-10 text-sm', errors.tipo && 'border-red-300')}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONSULTA_LISTA.map((t) => {
                      const o = TIPOS_CONSULTA[t]
                      return (
                        <SelectItem key={t} value={t} className="text-xs">
                          <div className="flex flex-col py-0.5">
                            <span className="font-medium text-[#2c3e50] dark:text-slate-200">{o.label}</span>
                            <span className="text-[10px] text-slate-500">{o.descricao}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.tipo}</p>}
              </div>
              <div>
                <Label className={lbl}>Área <span className="text-[#a85a3e]">*</span></Label>
                <Select value={formData.area} onValueChange={(v) => handleChange('area', v)}>
                  <SelectTrigger className={cn('h-10 text-sm', errors.area && 'border-red-300')}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((area) => (
                      <SelectItem key={area.value} value={area.value} className="text-xs">{area.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.area && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.area}</p>}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label className={lbl}>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descreva a consulta, contexto e perguntas específicas..."
                className="text-sm min-h-[90px] resize-y"
              />
            </div>
          </div>

          {/* ── Coluna direita ── */}
          <div className="space-y-4">
            {/* Prioridade + Prazo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={lbl}>Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(v) => handleChange('prioridade', v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={lbl}>Prazo</Label>
                <Input
                  type="date"
                  value={formData.prazo}
                  onChange={(e) => handleChange('prazo', e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>

            {/* Responsável principal */}
            <div>
              <Label className={lbl}>Responsável <span className="text-[#a85a3e]">*</span></Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => handleChange('responsavel_id', v)}>
                <SelectTrigger className={cn('h-10 text-sm', errors.responsavel_id && 'border-red-300')}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {loadingResponsaveis ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                  ) : (
                    responsaveis.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id} className="text-xs">{resp.nome_completo}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.responsavel_id && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.responsavel_id}</p>}
            </div>

            {/* Co-responsáveis */}
            <div>
              <Label className={lbl}>Outros responsáveis</Label>
              <div className="flex flex-wrap gap-1.5">
                {responsaveis.filter(r => r.id !== formData.responsavel_id).length === 0 ? (
                  <span className="text-[11px] text-slate-400">Nenhum outro membro disponível</span>
                ) : (
                  responsaveis.filter(r => r.id !== formData.responsavel_id).map((r) => {
                    const on = responsaveisExtras.includes(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleExtra(r.id)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                          on
                            ? 'bg-[#34495e] text-white border-[#34495e]'
                            : 'bg-white dark:bg-surface-1 text-[#5a6775] dark:text-slate-400 border-[#e6e3da] dark:border-[#253345] hover:border-[#89bcbe]',
                        )}
                      >
                        {on && <Check className="w-3 h-3" />}
                        {r.nome_completo}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0ede3] dark:border-[#1d2a3c] bg-slate-50/60 dark:bg-[#0f141c]/60 flex justify-end gap-2.5">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
