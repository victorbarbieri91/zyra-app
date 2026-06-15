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
  Plus,
  Upload,
  X,
  Check,
  FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PessoaWizardModal } from '@/components/crm/PessoaWizardModal'
import { ContratoModal } from '@/components/financeiro/ContratoModal'
import { useContratosHonorarios } from '@/hooks/useContratosHonorarios'
import { AREAS_JURIDICAS_OPTIONS } from '@/lib/constants/areas-juridicas'
import { TIPOS_CONSULTA, TIPOS_CONSULTA_LISTA, type TipoConsulta } from '@/lib/constants/consultivo-tipos'

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

interface Contrato {
  id: string
  titulo: string
  forma_cobranca: string
  valor_fixo: number | null
  percentual_exito: number | null
}

const AREAS = AREAS_JURIDICAS_OPTIONS

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const MAX_FILE_SIZE = 52428800 // 50MB

function inferTipoArquivo(file: File): string {
  const m = file.type
  if (m.includes('pdf')) return 'PDF'
  if (m.includes('word')) return 'Word'
  if (m.includes('sheet') || m.includes('excel')) return 'Excel'
  if (m.includes('presentation') || m.includes('powerpoint')) return 'PowerPoint'
  if (m.startsWith('image/')) return 'Imagem'
  if (m.includes('zip')) return 'ZIP'
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return ext.toUpperCase() || 'Documento'
}

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
    contrato_id: '',
    tipo: '' as TipoConsulta | '',
    area: '',
    prioridade: 'media',
    prazo: '',
    responsavel_id: '',
  })
  const [responsaveisExtras, setResponsaveisExtras] = useState<string[]>([])
  const [arquivos, setArquivos] = useState<File[]>([])

  const { createContrato } = useContratosHonorarios()

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

  // Modal de criar cliente
  const [pessoaModalOpen, setPessoaModalOpen] = useState(false)

  // Contratos
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loadingContratos, setLoadingContratos] = useState(false)
  const [contratoModalOpen, setContratoModalOpen] = useState(false)

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

  // Funcao para carregar clientes (reutilizavel)
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

  // Load clientes
  useEffect(() => {
    const debounce = setTimeout(loadClientes, 300)
    return () => clearTimeout(debounce)
  }, [currentEscritorioId, open, clienteSearch])

  // Carregar contratos do cliente
  const loadContratosCliente = async (clienteId: string) => {
    if (!clienteId) {
      setContratos([])
      return
    }

    setLoadingContratos(true)
    try {
      const { data, error } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('id, titulo, forma_cobranca, config')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('titulo')

      if (error) throw error

      const contratosFormatados = (data || []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo || `Contrato ${c.forma_cobranca}`,
        forma_cobranca: c.forma_cobranca,
        valor_fixo: c.config?.valor_fixo || null,
        percentual_exito: c.config?.percentual_exito || null,
      }))

      setContratos(contratosFormatados)
    } catch (err) {
      console.error('Erro ao carregar contratos:', err)
      setContratos([])
    } finally {
      setLoadingContratos(false)
    }
  }

  // Carregar contratos quando cliente muda
  useEffect(() => {
    if (formData.cliente_id) {
      loadContratosCliente(formData.cliente_id)
    } else {
      setContratos([])
      setFormData(prev => ({ ...prev, contrato_id: '' }))
    }
  }, [formData.cliente_id])

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const toggleExtra = (id: string) => {
    setResponsaveisExtras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addArquivos = (files: FileList | null) => {
    if (!files) return
    const novos = Array.from(files).filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" excede o limite de 50MB`)
        return false
      }
      return true
    })
    setArquivos(prev => [...prev, ...novos])
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

  // Upload dos arquivos depois que a consulta é criada (não bloqueia)
  const uploadArquivos = async (consultaId: string, userId: string) => {
    for (const file of arquivos) {
      try {
        const uniqueId = crypto.randomUUID()
        const safeName = file.name
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^\w.-]/g, '_')
          .substring(0, 100)
        const storagePath = `${currentEscritorioId}/${consultaId}/${uniqueId}-${safeName}`

        const { error: upErr } = await supabase.storage
          .from('documentos')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })
        if (upErr) throw upErr

        const { data: doc, error: insErr } = await supabase
          .from('documentos')
          .insert({
            escritorio_id: currentEscritorioId,
            consulta_id: consultaId,
            nome: file.name,
            tipo: inferTipoArquivo(file),
            tamanho: file.size,
            mime_type: file.type || null,
            storage_path: storagePath,
            created_by: userId,
          })
          .select('id')
          .single()
        if (insErr) {
          await supabase.storage.from('documentos').remove([storagePath])
          throw insErr
        }

        await supabase.from('consultivo_movimentacoes').insert({
          consulta_id: consultaId,
          escritorio_id: currentEscritorioId,
          data_movimento: new Date().toISOString(),
          tipo_codigo: 'documento_anexado',
          tipo_descricao: 'Documento anexado',
          descricao: `Documento "${file.name}" anexado`,
          origem: 'sistema',
          created_by: userId,
          referencia_tipo: 'documentos',
          referencia_id: doc?.id ?? null,
        })
      } catch (e) {
        console.error('Erro ao enviar documento na criação:', file.name, e)
      }
    }
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!currentEscritorioId) {
      toast.error('Escritório não identificado')
      return
    }

    setSaving(true)
    try {
      const { data: nova, error } = await supabase
        .from('consultivo_consultas')
        .insert({
          escritorio_id: currentEscritorioId,
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim() || null,
          cliente_id: formData.cliente_id,
          contrato_id: formData.contrato_id || null,
          tipo: formData.tipo || null,
          area: formData.area,
          prioridade: formData.prioridade,
          prazo: formData.prazo || null,
          responsavel_id: formData.responsavel_id,
          responsaveis_ids: responsaveisExtras,
          created_by: currentUserId,
          status: 'ativo',
          anexos: [],
        })
        .select('id')
        .single()

      if (error) throw error

      if (nova?.id && arquivos.length > 0 && currentUserId) {
        await uploadArquivos(nova.id, currentUserId)
      }

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

  const handleSaveContrato = async (data: any): Promise<string | null | boolean> => {
    try {
      const contratoId = await createContrato(data)
      if (contratoId) {
        await loadContratosCliente(formData.cliente_id)
        handleChange('contrato_id', contratoId)
        toast.success('Contrato criado e vinculado!')
        setContratoModalOpen(false)
        return contratoId
      }
      return null
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      toast.error('Erro ao criar contrato')
      return null
    }
  }

  const handleClose = () => {
    setFormData({
      titulo: '',
      descricao: '',
      cliente_id: '',
      contrato_id: '',
      tipo: '',
      area: '',
      prioridade: 'media',
      prazo: '',
      responsavel_id: currentUserId || '',
    })
    setResponsaveisExtras([])
    setArquivos([])
    setErrors({})
    setClienteSearch('')
    setContratos([])
    onOpenChange(false)
  }

  const lbl = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500 mb-1.5 block'
  const tipoSel = formData.tipo ? TIPOS_CONSULTA[formData.tipo] : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-visible">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-[#f0ede3] dark:border-[#1d2a3c]">
          <DialogTitle className="text-[19px] font-semibold text-[#2c3e50] dark:text-slate-200" style={{ fontFamily: 'var(--font-fraunces)', letterSpacing: '-0.02em' }}>
            Abrir nova consulta
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#9aa1a8] dark:text-slate-400">
            Consultas, pareceres e análises consultivas. O número é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5 max-h-[70vh] overflow-y-auto">
          {/* ── Coluna esquerda: dados da consulta ── */}
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
                  <div className="px-2 py-1.5 border-b border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPessoaModalOpen(true) }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Criar novo cliente
                    </Button>
                  </div>
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : clientes.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">Nenhum cliente encontrado.</div>
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

            {/* Documentos */}
            <div>
              <Label className={lbl}>Documentos</Label>
              <label className="block border border-dashed border-[#d5cfc3] dark:border-[#2d4058] rounded-[10px] px-4 py-5 text-center cursor-pointer bg-[#faf8f2] dark:bg-[#0f141c] hover:border-[#89bcbe] transition-colors">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addArquivos(e.target.files); e.target.value = '' }}
                />
                <Upload className="w-5 h-5 text-[#9aa1a8] mx-auto mb-1.5" />
                <span className="block text-[12px] text-[#5a6775] dark:text-slate-400">Contratos, minutas, e-mails ou legislação aplicável</span>
                <span className="block text-[11px] text-[#89bcbe] font-semibold mt-0.5">Selecionar arquivos</span>
              </label>
              {arquivos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {arquivos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] text-[#46627f] dark:text-slate-300 bg-slate-50 dark:bg-surface-2 rounded-md px-2.5 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#89bcbe] flex-shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button type="button" onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Coluna direita: atribuição e contrato ── */}
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

            {/* Contrato vinculado */}
            <div>
              <Label className={lbl}>Contrato vinculado</Label>
              <Select
                value={formData.contrato_id}
                onValueChange={(v) => handleChange('contrato_id', v)}
                disabled={!formData.cliente_id}
              >
                <SelectTrigger className={cn('h-10 text-sm', !formData.cliente_id && 'opacity-50')}>
                  <SelectValue placeholder={formData.cliente_id ? 'Selecione o contrato...' : 'Selecione o cliente primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 border-b border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContratoModalOpen(true) }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Criar novo contrato
                    </Button>
                  </div>
                  {loadingContratos ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                  ) : contratos.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">Nenhum contrato encontrado.</div>
                  ) : (
                    contratos.map((contrato) => (
                      <SelectItem key={contrato.id} value={contrato.id} className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{contrato.titulo}</span>
                          <span className="text-[10px] text-slate-500">
                            {contrato.forma_cobranca === 'fixo' && contrato.valor_fixo && (<>Fixo: R$ {contrato.valor_fixo.toLocaleString('pt-BR')}</>)}
                            {contrato.forma_cobranca === 'exito' && contrato.percentual_exito && (<>Êxito: {contrato.percentual_exito}%</>)}
                            {contrato.forma_cobranca === 'por_hora' && <>Por hora</>}
                            {contrato.forma_cobranca === 'por_ato' && <>Por ato</>}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">A forma de cobrança vem do contrato vinculado.</p>
            </div>

            {/* resumo do tipo selecionado */}
            {tipoSel && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] bg-[#f0f9f9] border border-[#89bcbe]/40 dark:bg-teal-500/10 dark:border-teal-500/30">
                <tipoSel.Icon className="w-4 h-4 text-[#3f7376] dark:text-teal-300 mt-0.5 flex-shrink-0" />
                <div className="text-[12px] text-[#46627f] dark:text-slate-300">
                  <strong className="text-[#34495e] dark:text-slate-200">{tipoSel.label}</strong> — {tipoSel.descricao}
                </div>
              </div>
            )}
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
            Abrir consulta
          </Button>
        </div>
      </DialogContent>

      {/* Modal para criar novo cliente */}
      <PessoaWizardModal
        open={pessoaModalOpen}
        onOpenChange={setPessoaModalOpen}
        onSave={async (data) => {
          try {
            if (!currentEscritorioId) throw new Error('Escritório não encontrado')

            if (data.cpf_cnpj) {
              const cpfCnpjLimpo = data.cpf_cnpj.replace(/\D/g, '')
              if (cpfCnpjLimpo.length >= 11) {
                const { data: existente } = await supabase
                  .from('crm_pessoas')
                  .select('id, nome_completo')
                  .eq('escritorio_id', currentEscritorioId)
                  .eq('cpf_cnpj', data.cpf_cnpj)
                  .maybeSingle()

                if (existente) {
                  throw new Error(`Já existe uma pessoa com este CPF/CNPJ: ${existente.nome_completo}`)
                }
              }
            }

            const insertData = {
              escritorio_id: currentEscritorioId,
              tipo_pessoa: data.tipo_pessoa,
              tipo_cadastro: data.tipo_cadastro || 'cliente',
              status: data.status || 'ativo',
              nome_completo: data.nome_completo,
              nome_fantasia: data.nome_fantasia || null,
              cpf_cnpj: data.cpf_cnpj || null,
              telefone: data.telefone || null,
              email: data.email || null,
              cep: data.cep || null,
              logradouro: data.logradouro || null,
              numero: data.numero || null,
              complemento: data.complemento || null,
              bairro: data.bairro || null,
              cidade: data.cidade || null,
              uf: data.uf || null,
              origem: data.origem || null,
              observacoes: data.observacoes || null,
            }

            const { data: novoCliente, error } = await supabase
              .from('crm_pessoas')
              .insert(insertData)
              .select('id, nome_completo')
              .single()

            if (error) throw error

            toast.success('Cliente criado com sucesso!')
            await loadClientes()
            if (novoCliente) handleChange('cliente_id', novoCliente.id)
          } catch (error: any) {
            console.error('Erro ao criar cliente:', error)
            toast.error(error.message || 'Erro ao criar cliente')
          }
        }}
      />

      {/* Modal para criar novo contrato */}
      <ContratoModal
        open={contratoModalOpen}
        onOpenChange={setContratoModalOpen}
        defaultClienteId={formData.cliente_id}
        onSave={handleSaveContrato}
      />
    </Dialog>
  )
}
