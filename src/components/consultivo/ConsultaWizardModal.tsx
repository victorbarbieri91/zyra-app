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
import {
  Scale,
  FileText,
  Clock,
  DollarSign,
  User,
  Calendar,
} from 'lucide-react'
import { colors } from '@/lib/design-system'

interface ConsultaWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (data: any) => Promise<void>
}

export function ConsultaWizardModal({ open, onOpenChange, onSave }: ConsultaWizardModalProps) {
  const [formData, setFormData] = useState({
    // Tipo e Área
    tipo: 'simples',
    area: '',
    // Cliente e Assunto
    cliente_id: '',
    assunto: '',
    descricao: '',
    // Urgência e Prazos
    urgencia: 'media',
    prazo_cliente: '',
    sla_horas: 48,
    // Cobrança
    forma_cobranca: 'hora',
    valor_servico: '',
    horas_estimadas: '',
    // Responsável
    responsavel_id: '',
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

  // Step 1: Tipo e Área
  const tipoAreaStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Tipo de Consulta
        </h3>
        <Select
          value={formData.tipo}
          onValueChange={(value) => handleChange('tipo', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simples">Consulta Simples</SelectItem>
            <SelectItem value="parecer">Parecer Jurídico</SelectItem>
            <SelectItem value="contrato">Análise de Contrato</SelectItem>
            <SelectItem value="due_diligence">Due Diligence</SelectItem>
            <SelectItem value="opiniao">Opinião Legal</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-2">
          {formData.tipo === 'simples' && 'Resposta rápida a uma questão específica'}
          {formData.tipo === 'parecer' && 'Análise jurídica fundamentada e detalhada'}
          {formData.tipo === 'contrato' && 'Revisão e análise de documentos contratuais'}
          {formData.tipo === 'due_diligence' && 'Investigação jurídica completa'}
          {formData.tipo === 'opiniao' && 'Opinião técnica sobre questão jurídica'}
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Área Jurídica
        </h3>
        <Select
          value={formData.area}
          onValueChange={(value) => handleChange('area', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="civel">Cível</SelectItem>
            <SelectItem value="trabalhista">Trabalhista</SelectItem>
            <SelectItem value="tributaria">Tributária</SelectItem>
            <SelectItem value="empresarial">Empresarial</SelectItem>
            <SelectItem value="consumidor">Consumidor</SelectItem>
            <SelectItem value="familia">Família</SelectItem>
            <SelectItem value="criminal">Criminal</SelectItem>
            <SelectItem value="previdenciaria">Previdenciária</SelectItem>
            <SelectItem value="ambiental">Ambiental</SelectItem>
            <SelectItem value="outra">Outra</SelectItem>
          </SelectContent>
        </Select>
      </Card>
    </div>
  )

  // Step 2: Cliente e Assunto
  const clienteAssuntoStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Cliente
        </h3>
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Cliente *</Label>
          <Select
            value={formData.cliente_id}
            onValueChange={(value) => handleChange('cliente_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Cliente Exemplo 1</SelectItem>
              <SelectItem value="2">Cliente Exemplo 2</SelectItem>
              {/* TODO: Buscar clientes do Supabase */}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Detalhes da Consulta
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={formData.assunto}
              onChange={(e) => handleChange('assunto', e.target.value)}
              placeholder="Resumo da consulta em uma linha"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição Detalhada *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descreva a questão jurídica de forma detalhada..."
              rows={6}
              required
            />
            <p className="text-xs text-slate-500">
              Inclua todos os fatos relevantes, documentos disponíveis e questões específicas
            </p>
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 3: Urgência e Prazos
  const urgenciaPrazosStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Urgência
        </h3>
        <Select
          value={formData.urgencia}
          onValueChange={(value) => handleChange('urgencia', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">Baixa - Sem pressa</SelectItem>
            <SelectItem value="media">Média - Normal</SelectItem>
            <SelectItem value="alta">Alta - Urgente</SelectItem>
            <SelectItem value="critica">Crítica - Imediata</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Prazos
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prazo_cliente">Prazo do Cliente</Label>
            <Input
              id="prazo_cliente"
              type="date"
              value={formData.prazo_cliente}
              onChange={(e) => handleChange('prazo_cliente', e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Data limite solicitada pelo cliente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sla_horas">SLA Interno (horas)</Label>
            <Input
              id="sla_horas"
              type="number"
              value={formData.sla_horas}
              onChange={(e) => handleChange('sla_horas', parseInt(e.target.value))}
              min="1"
            />
            <p className="text-xs text-slate-500">
              Tempo máximo para conclusão interna (em horas úteis)
            </p>
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 4: Cobrança e Responsável
  const cobrancaResponsavelStep = (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cobrança
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forma_cobranca">Forma de Cobrança</Label>
            <Select
              value={formData.forma_cobranca}
              onValueChange={(value) => handleChange('forma_cobranca', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hora">Por Hora</SelectItem>
                <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                <SelectItem value="avulso">Avulso</SelectItem>
                <SelectItem value="sem_custo">Sem Custo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.forma_cobranca === 'hora' && (
            <div className="space-y-2">
              <Label htmlFor="horas_estimadas">Horas Estimadas</Label>
              <Input
                id="horas_estimadas"
                type="number"
                step="0.5"
                value={formData.horas_estimadas}
                onChange={(e) => handleChange('horas_estimadas', e.target.value)}
                placeholder="Ex: 4.5"
              />
            </div>
          )}

          {formData.forma_cobranca === 'valor_fixo' && (
            <div className="space-y-2">
              <Label htmlFor="valor_servico">Valor do Serviço</Label>
              <Input
                id="valor_servico"
                type="number"
                step="0.01"
                value={formData.valor_servico}
                onChange={(e) => handleChange('valor_servico', e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Responsável
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsavel_id">Advogado Responsável *</Label>
            <Select
              value={formData.responsavel_id}
              onValueChange={(value) => handleChange('responsavel_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Dr. João Silva</SelectItem>
                <SelectItem value="2">Dra. Maria Santos</SelectItem>
                {/* TODO: Buscar advogados do Supabase */}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Internas</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Notas internas sobre a consulta..."
              rows={3}
            />
          </div>
        </div>
      </Card>
    </div>
  )

  const steps: WizardStep[] = [
    {
      id: 'tipo_area',
      title: 'Tipo e Área',
      description: 'Classifique a consulta',
      component: tipoAreaStep,
      validate: () => {
        if (!formData.area) {
          alert('Selecione a área jurídica')
          return false
        }
        return true
      },
    },
    {
      id: 'cliente_assunto',
      title: 'Cliente e Assunto',
      description: 'Detalhes da consulta',
      component: clienteAssuntoStep,
      validate: () => {
        if (!formData.cliente_id || !formData.assunto || !formData.descricao) {
          alert('Preencha cliente, assunto e descrição')
          return false
        }
        return true
      },
    },
    {
      id: 'urgencia_prazos',
      title: 'Urgência e Prazos',
      description: 'Defina prioridades',
      component: urgenciaPrazosStep,
      optional: true,
    },
    {
      id: 'cobranca_responsavel',
      title: 'Cobrança e Responsável',
      description: 'Configurações finais',
      component: cobrancaResponsavelStep,
      validate: () => {
        if (!formData.responsavel_id) {
          alert('Selecione o advogado responsável')
          return false
        }
        return true
      },
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Scale className="w-5 h-5" />
            Nova Consulta Jurídica
          </DialogTitle>
          <DialogDescription>
            Cadastre uma nova consulta jurídica no sistema
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
