'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { colors } from '@/lib/design-system'
import type { TipoPessoa, TipoContato } from '@/types/crm'

interface PessoaWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (data: any) => Promise<void>
}

export function PessoaWizardModal({ open, onOpenChange, onSave }: PessoaWizardModalProps) {
  const [formData, setFormData] = useState({
    // Tipo
    tipo_pessoa: 'pf' as TipoPessoa,
    tipo_contato: 'cliente' as TipoContato,
    // Dados Básicos
    nome_completo: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    rg_ie: '',
    profissao: '',
    // Contato
    telefone_principal: '',
    celular: '',
    email_principal: '',
    whatsapp: '',
    // Endereço
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    // CRM
    status: 'ativo',
    origem: '',
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

  // Step 1: Tipo e Dados Básicos
  const dadosBasicosStep = (
    <div className="space-y-5">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Tipo de Pessoa
        </h3>
        <RadioGroup
          value={formData.tipo_pessoa}
          onValueChange={(value) => handleChange('tipo_pessoa', value as TipoPessoa)}
          className="grid grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pf" id="pf" />
            <Label htmlFor="pf" className="cursor-pointer">
              Pessoa Física
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pj" id="pj" />
            <Label htmlFor="pj" className="cursor-pointer">
              Pessoa Jurídica
            </Label>
          </div>
        </RadioGroup>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Categoria
        </h3>
        <Select
          value={formData.tipo_contato}
          onValueChange={(value) => handleChange('tipo_contato', value as TipoContato)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="prospecto">Prospecto</SelectItem>
            <SelectItem value="parceiro">Parceiro</SelectItem>
            <SelectItem value="parte_contraria">Parte Contrária</SelectItem>
            <SelectItem value="correspondente">Correspondente</SelectItem>
            <SelectItem value="testemunha">Testemunha</SelectItem>
            <SelectItem value="perito">Perito</SelectItem>
            <SelectItem value="juiz">Juiz</SelectItem>
            <SelectItem value="promotor">Promotor</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Dados Principais
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">
              {formData.tipo_pessoa === 'pf' ? 'Nome Completo' : 'Razão Social'} *
            </Label>
            <div className="relative">
              {formData.tipo_pessoa === 'pf' ? (
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              ) : (
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {formData.tipo_pessoa === 'pj' && (
            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => handleChange('nome_fantasia', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj">
              {formData.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
            </Label>
            <Input
              id="cpf_cnpj"
              value={formData.cpf_cnpj}
              onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
              placeholder={formData.tipo_pessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
            />
          </div>

          {formData.tipo_pessoa === 'pf' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rg_ie">RG</Label>
                <Input
                  id="rg_ie"
                  value={formData.rg_ie}
                  onChange={(e) => handleChange('rg_ie', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profissao">Profissão</Label>
                <Input
                  id="profissao"
                  value={formData.profissao}
                  onChange={(e) => handleChange('profissao', e.target.value)}
                />
              </div>
            </>
          )}

          {formData.tipo_pessoa === 'pj' && (
            <div className="space-y-2">
              <Label htmlFor="rg_ie">Inscrição Estadual</Label>
              <Input
                id="rg_ie"
                value={formData.rg_ie}
                onChange={(e) => handleChange('rg_ie', e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  )

  // Step 2: Contato
  const contatoStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Telefones
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefone_principal">Telefone Principal</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="telefone_principal"
                value={formData.telefone_principal}
                onChange={(e) => handleChange('telefone_principal', e.target.value)}
                placeholder="(11) 3333-3333"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              value={formData.celular}
              onChange={(e) => handleChange('celular', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email
        </h3>
        <div className="space-y-2">
          <Label htmlFor="email_principal">Email Principal</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="email_principal"
              type="email"
              value={formData.email_principal}
              onChange={(e) => handleChange('email_principal', e.target.value)}
              placeholder="email@exemplo.com"
              className="pl-10"
            />
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 3: Endereço
  const enderecoStep = (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Endereço
      </h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            value={formData.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
            placeholder="00000-000"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input
              id="logradouro"
              value={formData.logradouro}
              onChange={(e) => handleChange('logradouro', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={formData.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={formData.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={formData.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => handleChange('cidade', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={formData.uf}
              onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="SP"
            />
          </div>
        </div>
      </div>
    </Card>
  )

  // Step 4: Informações CRM
  const crmStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Origem e Observações
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="origem">Como conheceu o escritório?</Label>
            <Input
              id="origem"
              value={formData.origem}
              onChange={(e) => handleChange('origem', e.target.value)}
              placeholder="Ex: Indicação, Google, Redes Sociais..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Anotações sobre o cliente..."
              rows={4}
            />
          </div>
        </div>
      </Card>
    </div>
  )

  const steps: WizardStep[] = [
    {
      id: 'dados_basicos',
      title: 'Dados Básicos',
      description: 'Tipo e informações principais',
      component: dadosBasicosStep,
      validate: () => {
        if (!formData.nome_completo) {
          alert('Nome/Razão Social é obrigatório')
          return false
        }
        return true
      },
    },
    {
      id: 'contato',
      title: 'Contato',
      description: 'Telefones e emails',
      component: contatoStep,
      optional: true,
    },
    {
      id: 'endereco',
      title: 'Endereço',
      description: 'Endereço completo',
      component: enderecoStep,
      optional: true,
    },
    {
      id: 'crm',
      title: 'Informações CRM',
      description: 'Origem e observações',
      component: crmStep,
      optional: true,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <User className="w-5 h-5" />
            Adicionar Nova Pessoa
          </DialogTitle>
          <DialogDescription>
            Preencha as informações da nova pessoa/empresa no CRM
          </DialogDescription>
        </DialogHeader>

        <WizardWrapper
          steps={steps}
          onComplete={handleComplete}
        />
      </DialogContent>
    </Dialog>
  )
}
