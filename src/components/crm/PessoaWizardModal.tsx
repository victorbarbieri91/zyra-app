'use client'

import { useState } from 'react'
import { WizardWrapper, WizardStep } from '@/components/wizards/WizardWrapper'
import { Card } from '@/components/ui/card'
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
} from 'lucide-react'
import { validarCPF, validarCNPJ, mascaraCPF, mascaraCNPJ, mascaraTelefone, mascaraCEP } from '@/lib/validators'

// Tipos baseados nos ENUMs do banco
type TipoPessoa = 'pf' | 'pj'
type TipoCadastro = 'cliente' | 'prospecto' | 'parte_contraria' | 'correspondente' | 'testemunha' | 'perito' | 'juiz' | 'promotor' | 'outros'
type StatusPessoa = 'ativo' | 'inativo' | 'arquivado'
type OrigemCRM = 'indicacao' | 'site' | 'google' | 'redes_sociais' | 'evento' | 'parceria' | 'outros' | ''

interface PessoaWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (data: any) => Promise<void>
}

export function PessoaWizardModal({ open, onOpenChange, onSave }: PessoaWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
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
    origem: '' as OrigemCRM,
    observacoes: '',
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando usuario começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Handler especifico para CPF/CNPJ com mascara e validacao
  const handleCpfCnpjChange = (value: string) => {
    const mascara = formData.tipo_pessoa === 'pf' ? mascaraCPF(value) : mascaraCNPJ(value)
    handleChange('cpf_cnpj', mascara)
  }

  // Handler para telefone com mascara
  const handleTelefoneChange = (value: string) => {
    handleChange('telefone', mascaraTelefone(value))
  }

  // Handler para CEP com mascara
  const handleCepChange = (value: string) => {
    handleChange('cep', mascaraCEP(value))
  }

  // Estado para loading do CEP
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Buscar endereco pelo CEP usando ViaCEP
  const buscarCEP = async () => {
    const cepLimpo = formData.cep.replace(/\D/g, '')
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
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  // Validar CPF/CNPJ ao sair do campo
  const validateCpfCnpj = () => {
    const doc = formData.cpf_cnpj
    if (!doc || doc.replace(/\D/g, '').length === 0) {
      // Campo vazio e permitido (nao obrigatorio)
      setErrors(prev => ({ ...prev, cpf_cnpj: '' }))
      return
    }

    const numbers = doc.replace(/\D/g, '')
    if (formData.tipo_pessoa === 'pf') {
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

  const handleComplete = async () => {
    if (onSave) {
      await onSave(formData)
    }
    onOpenChange(false)
  }

  // Step 1: Tipo e Dados Basicos
  const dadosBasicosStep = (
    <div className="space-y-3">
      <Card className="p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Tipo de Pessoa
        </h3>
        <RadioGroup
          value={formData.tipo_pessoa}
          onValueChange={(value) => handleChange('tipo_pessoa', value as TipoPessoa)}
          className="grid grid-cols-2 gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pf" id="pf" className="w-3.5 h-3.5" />
            <Label htmlFor="pf" className="cursor-pointer text-xs">
              Pessoa Fisica
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pj" id="pj" className="w-3.5 h-3.5" />
            <Label htmlFor="pj" className="cursor-pointer text-xs">
              Pessoa Juridica
            </Label>
          </div>
        </RadioGroup>
      </Card>

      <Card className="p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          Categoria
        </h3>
        <Select
          value={formData.tipo_cadastro}
          onValueChange={(value) => handleChange('tipo_cadastro', value as TipoCadastro)}
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
      </Card>

      <Card className="p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2">
          Dados Principais
        </h3>
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="nome_completo" className="text-xs">
              {formData.tipo_pessoa === 'pf' ? 'Nome Completo' : 'Razao Social'} *
            </Label>
            <div className="relative">
              {formData.tipo_pessoa === 'pf' ? (
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              )}
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                className={`pl-8 h-8 text-xs ${errors.nome_completo ? 'border-red-500 focus:ring-red-500' : ''}`}
                required
              />
            </div>
            {errors.nome_completo && (
              <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" />
                {errors.nome_completo}
              </p>
            )}
          </div>

          {formData.tipo_pessoa === 'pj' && (
            <div className="space-y-1">
              <Label htmlFor="nome_fantasia" className="text-xs">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cpf_cnpj" className="text-xs">
              {formData.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
            </Label>
            <Input
              id="cpf_cnpj"
              value={formData.cpf_cnpj}
              onChange={(e) => handleCpfCnpjChange(e.target.value)}
              onBlur={validateCpfCnpj}
              placeholder={formData.tipo_pessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
              className={`h-8 text-xs ${errors.cpf_cnpj ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.cpf_cnpj && (
              <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" />
                {errors.cpf_cnpj}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 2: Contato
  const contatoStep = (
    <div className="space-y-3">
      <Card className="p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          Telefone
        </h3>
        <div className="space-y-1">
          <Label htmlFor="telefone" className="text-xs">Telefone / Celular / WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Email
        </h3>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 3: Endereco
  const enderecoStep = (
    <Card className="p-3">
      <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        Endereco
      </h3>
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="cep" className="text-xs">CEP</Label>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Input
                id="cep"
                value={formData.cep}
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
            <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3" />
              {errors.cep}
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-3 space-y-1">
            <Label htmlFor="logradouro" className="text-xs">Logradouro</Label>
            <Input
              id="logradouro"
              value={formData.logradouro}
              onChange={(e) => handleChange('logradouro', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="numero" className="text-xs">Numero</Label>
            <Input
              id="numero"
              value={formData.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="complemento" className="text-xs">Complemento</Label>
            <Input
              id="complemento"
              value={formData.complemento}
              onChange={(e) => handleChange('complemento', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bairro" className="text-xs">Bairro</Label>
            <Input
              id="bairro"
              value={formData.bairro}
              onChange={(e) => handleChange('bairro', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-3 space-y-1">
            <Label htmlFor="cidade" className="text-xs">Cidade</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => handleChange('cidade', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uf" className="text-xs">UF</Label>
            <Input
              id="uf"
              value={formData.uf}
              onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="SP"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </Card>
  )

  // Step 4: Informacoes CRM
  const crmStep = (
    <Card className="p-3">
      <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        Origem e Observacoes
      </h3>
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="origem" className="text-xs">Como conheceu o escritorio?</Label>
          <Select
            value={formData.origem}
            onValueChange={(value) => handleChange('origem', value as OrigemCRM)}
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
          <Label htmlFor="observacoes" className="text-xs">Observacoes</Label>
          <Textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Anotacoes sobre o cliente..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>
      </div>
    </Card>
  )

  const steps: WizardStep[] = [
    {
      id: 'dados_basicos',
      title: 'Dados Basicos',
      description: 'Tipo e informacoes principais',
      component: dadosBasicosStep,
      validate: () => {
        const newErrors: Record<string, string> = {}

        if (!formData.nome_completo.trim()) {
          newErrors.nome_completo = 'Nome/Razao Social e obrigatorio'
        }

        // Validar CPF/CNPJ se preenchido
        if (formData.cpf_cnpj) {
          const numbers = formData.cpf_cnpj.replace(/\D/g, '')
          if (formData.tipo_pessoa === 'pf' && numbers.length === 11 && !validarCPF(formData.cpf_cnpj)) {
            newErrors.cpf_cnpj = 'CPF invalido'
          } else if (formData.tipo_pessoa === 'pj' && numbers.length === 14 && !validarCNPJ(formData.cpf_cnpj)) {
            newErrors.cpf_cnpj = 'CNPJ invalido'
          }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
      },
    },
    {
      id: 'contato',
      title: 'Contato',
      description: 'Telefone e email',
      component: contatoStep,
      optional: true,
    },
    {
      id: 'endereco',
      title: 'Endereco',
      description: 'Endereco completo',
      component: enderecoStep,
      optional: true,
    },
    {
      id: 'crm',
      title: 'CRM',
      description: 'Origem e observacoes',
      component: crmStep,
      optional: true,
    },
  ]

  const handleCancel = () => {
    setCurrentStep(0)
    setFormData({
      tipo_pessoa: 'pf',
      tipo_cadastro: 'cliente',
      status: 'ativo',
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
      origem: '',
      observacoes: '',
    })
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <WizardWrapper
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onComplete={handleComplete}
      onCancel={handleCancel}
      title="Nova Pessoa"
      description="Preencha as informacoes"
    />
  )
}
