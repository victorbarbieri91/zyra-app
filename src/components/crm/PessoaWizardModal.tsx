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
} from 'lucide-react'

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
                className="pl-8 h-8 text-xs"
                required
              />
            </div>
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
              onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
              placeholder={formData.tipo_pessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
              className="h-8 text-xs"
            />
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
              onChange={(e) => handleChange('telefone', e.target.value)}
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
          <Input
            id="cep"
            value={formData.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
            placeholder="00000-000"
            className="h-8 text-xs w-32"
          />
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
        if (!formData.nome_completo) {
          alert('Nome/Razao Social e obrigatorio')
          return false
        }
        return true
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
