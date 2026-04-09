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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Users,
  Briefcase,
  AlertCircle,
  Loader2,
  Pencil,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { validarCPF, validarCNPJ, mascaraCPF, mascaraCNPJ, mascaraTelefone, mascaraCEP } from '@/lib/validators'
import { toast } from 'sonner'
import type { TipoPessoa, TipoCadastro, StatusPessoa, OrigemCRM } from '@/types/crm'

interface PessoaEditarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId: string | null
  escritorioId: string | null
  onSaved: () => void
}

export function PessoaEditarModal({ open, onOpenChange, pessoaId, escritorioId, onSaved }: PessoaEditarModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    tipo_pessoa: 'pf' as TipoPessoa,
    tipo_cadastro: 'cliente' as TipoCadastro,
    status: 'ativo' as StatusPessoa,
    nome_completo: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    origem: '' as OrigemCRM | '',
    observacoes: '',
  })

  // Carregar dados da pessoa ao abrir
  useEffect(() => {
    if (open && pessoaId) {
      loadPessoa()
    }
  }, [open, pessoaId])

  const loadPessoa = async () => {
    if (!pessoaId) return
    setLoading(true)
    setErrors({})

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('crm_pessoas')
        .select('*')
        .eq('id', pessoaId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Pessoa nao encontrada')

      setForm({
        tipo_pessoa: data.tipo_pessoa || 'pf',
        tipo_cadastro: data.tipo_cadastro || 'cliente',
        status: data.status || 'ativo',
        nome_completo: data.nome_completo || '',
        nome_fantasia: data.nome_fantasia || '',
        cpf_cnpj: data.cpf_cnpj || '',
        telefone: data.telefone || '',
        email: data.email || '',
        cep: data.cep || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        origem: data.origem || '',
        observacoes: data.observacoes || '',
      })
    } catch (error: any) {
      console.error('Erro ao carregar pessoa:', error)
      toast.error('Erro ao carregar dados da pessoa')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCpfCnpjChange = (value: string) => {
    const mascara = form.tipo_pessoa === 'pf' ? mascaraCPF(value) : mascaraCNPJ(value)
    handleChange('cpf_cnpj', mascara)
  }

  const handleTelefoneChange = (value: string) => {
    handleChange('telefone', mascaraTelefone(value))
  }

  const handleCepChange = (value: string) => {
    handleChange('cep', mascaraCEP(value))
  }

  const buscarCEP = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    setBuscandoCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()

      if (!data.erro) {
        handleChange('logradouro', data.logradouro || '')
        handleChange('bairro', data.bairro || '')
        handleChange('cidade', data.localidade || '')
        handleChange('uf', data.uf || '')
      } else {
        setErrors(prev => ({ ...prev, cep: 'CEP nao encontrado' }))
      }
    } catch {
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  const validateCpfCnpj = () => {
    const doc = form.cpf_cnpj
    if (!doc || doc.replace(/\D/g, '').length === 0) {
      setErrors(prev => ({ ...prev, cpf_cnpj: '' }))
      return
    }

    const numbers = doc.replace(/\D/g, '')
    if (form.tipo_pessoa === 'pf') {
      if (numbers.length > 0 && numbers.length < 11) {
        setErrors(prev => ({ ...prev, cpf_cnpj: 'CPF incompleto' }))
      } else if (numbers.length === 11 && !validarCPF(doc)) {
        setErrors(prev => ({ ...prev, cpf_cnpj: 'CPF invalido' }))
      } else {
        setErrors(prev => ({ ...prev, cpf_cnpj: '' }))
      }
    } else {
      if (numbers.length > 0 && numbers.length < 14) {
        setErrors(prev => ({ ...prev, cpf_cnpj: 'CNPJ incompleto' }))
      } else if (numbers.length === 14 && !validarCNPJ(doc)) {
        setErrors(prev => ({ ...prev, cpf_cnpj: 'CNPJ invalido' }))
      } else {
        setErrors(prev => ({ ...prev, cpf_cnpj: '' }))
      }
    }
  }

  const handleSalvar = async () => {
    // Validar campos obrigatorios
    const newErrors: Record<string, string> = {}
    if (!form.nome_completo.trim()) {
      newErrors.nome_completo = 'Nome/Razao Social e obrigatorio'
    }
    if (form.cpf_cnpj) {
      const numbers = form.cpf_cnpj.replace(/\D/g, '')
      if (form.tipo_pessoa === 'pf' && numbers.length === 11 && !validarCPF(form.cpf_cnpj)) {
        newErrors.cpf_cnpj = 'CPF invalido'
      } else if (form.tipo_pessoa === 'pj' && numbers.length === 14 && !validarCNPJ(form.cpf_cnpj)) {
        newErrors.cpf_cnpj = 'CNPJ invalido'
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      // Verificar CPF/CNPJ duplicado (excluindo o proprio registro)
      if (form.cpf_cnpj && escritorioId) {
        const cpfCnpjLimpo = form.cpf_cnpj.replace(/\D/g, '')
        if (cpfCnpjLimpo.length >= 11) {
          const { data: existente } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioId)
            .eq('cpf_cnpj', form.cpf_cnpj)
            .neq('id', pessoaId)
            .maybeSingle()

          if (existente) {
            toast.error(`Ja existe uma pessoa com este CPF/CNPJ: ${existente.nome_completo}`)
            setSubmitting(false)
            return
          }
        }
      }

      const updateData = {
        tipo_pessoa: form.tipo_pessoa,
        tipo_cadastro: form.tipo_cadastro,
        status: form.status,
        nome_completo: form.nome_completo,
        nome_fantasia: form.nome_fantasia || null,
        cpf_cnpj: form.cpf_cnpj || null,
        telefone: form.telefone || null,
        email: form.email || null,
        cep: form.cep || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        uf: form.uf || null,
        origem: form.origem || null,
        observacoes: form.observacoes || null,
      }

      const query = supabase
        .from('crm_pessoas')
        .update(updateData)
        .eq('id', pessoaId)

      // Defense-in-depth: filtrar por escritorio_id se disponivel
      if (escritorioId) {
        query.eq('escritorio_id', escritorioId)
      }

      const { error } = await query

      if (error) throw error

      toast.success('Pessoa atualizada com sucesso!')
      onOpenChange(false)
      onSaved()
    } catch (error: any) {
      console.error('Erro ao atualizar pessoa:', error)
      toast.error(error.message || 'Erro ao atualizar pessoa')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] !flex !flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4 text-[#34495e] dark:text-slate-300" />
            Editar Pessoa
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-5 p-1 pr-4">
              {/* Secao: Dados Basicos */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Dados Basicos
                </h3>
                <div className="space-y-3">
                  {/* Tipo de Pessoa */}
                  <div>
                    <Label className="text-xs mb-1.5 block">Tipo de Pessoa</Label>
                    <RadioGroup
                      value={form.tipo_pessoa}
                      onValueChange={(value) => handleChange('tipo_pessoa', value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pf" id="edit-pf" className="w-3.5 h-3.5" />
                        <Label htmlFor="edit-pf" className="cursor-pointer text-xs">
                          Pessoa Fisica
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pj" id="edit-pj" className="w-3.5 h-3.5" />
                        <Label htmlFor="edit-pj" className="cursor-pointer text-xs">
                          Pessoa Juridica
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Categoria */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Categoria
                      </Label>
                      <Select
                        value={form.tipo_cadastro}
                        onValueChange={(value) => handleChange('tipo_cadastro', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente" className="text-xs">Cliente</SelectItem>
                          <SelectItem value="prospecto" className="text-xs">Prospecto</SelectItem>
                          <SelectItem value="parte_contraria" className="text-xs">Parte Contraria</SelectItem>
                          <SelectItem value="correspondente" className="text-xs">Correspondente</SelectItem>
                          <SelectItem value="testemunha" className="text-xs">Testemunha</SelectItem>
                          <SelectItem value="perito" className="text-xs">Perito</SelectItem>
                          <SelectItem value="juiz" className="text-xs">Juiz</SelectItem>
                          <SelectItem value="promotor" className="text-xs">Promotor</SelectItem>
                          <SelectItem value="outros" className="text-xs">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Status
                      </Label>
                      <Select
                        value={form.status}
                        onValueChange={(value) => handleChange('status', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo" className="text-xs">Ativo</SelectItem>
                          <SelectItem value="inativo" className="text-xs">Inativo</SelectItem>
                          <SelectItem value="arquivado" className="text-xs">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="space-y-1">
                    <Label htmlFor="edit-nome" className="text-xs">
                      {form.tipo_pessoa === 'pf' ? 'Nome Completo' : 'Razao Social'} *
                    </Label>
                    <div className="relative">
                      {form.tipo_pessoa === 'pf' ? (
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      )}
                      <Input
                        id="edit-nome"
                        value={form.nome_completo}
                        onChange={(e) => handleChange('nome_completo', e.target.value)}
                        className={`pl-8 h-8 text-xs ${errors.nome_completo ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    {errors.nome_completo && (
                      <p className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.nome_completo}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Nome Fantasia (PJ) */}
                    {form.tipo_pessoa === 'pj' && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-fantasia" className="text-xs">Nome Fantasia</Label>
                        <Input
                          id="edit-fantasia"
                          value={form.nome_fantasia}
                          onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {/* CPF/CNPJ */}
                    <div className="space-y-1">
                      <Label htmlFor="edit-cpfcnpj" className="text-xs">
                        {form.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
                      </Label>
                      <Input
                        id="edit-cpfcnpj"
                        value={form.cpf_cnpj}
                        onChange={(e) => handleCpfCnpjChange(e.target.value)}
                        onBlur={validateCpfCnpj}
                        placeholder={form.tipo_pessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                        className={`h-8 text-xs ${errors.cpf_cnpj ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {errors.cpf_cnpj && (
                        <p className="text-[10px] text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.cpf_cnpj}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secao: Contato */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-telefone" className="text-xs">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        id="edit-telefone"
                        value={form.telefone}
                        onChange={(e) => handleTelefoneChange(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email" className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        id="edit-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="email@exemplo.com"
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Secao: Endereco */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Endereco
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-cep" className="text-xs">CEP</Label>
                    <div className="flex gap-2 items-center">
                      <div className="relative">
                        <Input
                          id="edit-cep"
                          value={form.cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          onBlur={buscarCEP}
                          placeholder="00000-000"
                          className={`h-8 text-xs w-32 ${errors.cep ? 'border-red-500' : ''}`}
                        />
                        {buscandoCep && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {buscandoCep ? 'Buscando...' : 'Preenche automaticamente'}
                      </span>
                    </div>
                    {errors.cep && (
                      <p className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.cep}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 space-y-1">
                      <Label htmlFor="edit-logradouro" className="text-xs">Logradouro</Label>
                      <Input
                        id="edit-logradouro"
                        value={form.logradouro}
                        onChange={(e) => handleChange('logradouro', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-numero" className="text-xs">Numero</Label>
                      <Input
                        id="edit-numero"
                        value={form.numero}
                        onChange={(e) => handleChange('numero', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-complemento" className="text-xs">Complemento</Label>
                      <Input
                        id="edit-complemento"
                        value={form.complemento}
                        onChange={(e) => handleChange('complemento', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-bairro" className="text-xs">Bairro</Label>
                      <Input
                        id="edit-bairro"
                        value={form.bairro}
                        onChange={(e) => handleChange('bairro', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 space-y-1">
                      <Label htmlFor="edit-cidade" className="text-xs">Cidade</Label>
                      <Input
                        id="edit-cidade"
                        value={form.cidade}
                        onChange={(e) => handleChange('cidade', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-uf" className="text-xs">UF</Label>
                      <Input
                        id="edit-uf"
                        value={form.uf}
                        onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="SP"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Secao: CRM */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Origem e Observacoes
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Como conheceu o escritorio?</Label>
                    <Select
                      value={form.origem}
                      onValueChange={(value) => handleChange('origem', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indicacao" className="text-xs">Indicacao</SelectItem>
                        <SelectItem value="site" className="text-xs">Site</SelectItem>
                        <SelectItem value="google" className="text-xs">Google</SelectItem>
                        <SelectItem value="redes_sociais" className="text-xs">Redes Sociais</SelectItem>
                        <SelectItem value="evento" className="text-xs">Evento</SelectItem>
                        <SelectItem value="parceria" className="text-xs">Parceria</SelectItem>
                        <SelectItem value="outros" className="text-xs">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-observacoes" className="text-xs">Observacoes</Label>
                    <Textarea
                      id="edit-observacoes"
                      value={form.observacoes}
                      onChange={(e) => handleChange('observacoes', e.target.value)}
                      placeholder="Anotacoes sobre a pessoa..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={loading || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
