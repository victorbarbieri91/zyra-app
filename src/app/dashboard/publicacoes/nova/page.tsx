'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  Save,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function NovaPublicacaoPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    data_publicacao: new Date().toISOString().split('T')[0],
    tribunal: '',
    vara: '',
    tipo_publicacao: 'intimacao',
    numero_processo: '',
    cliente_id: '',
    texto_completo: '',
    urgente: false,
    analisar_ia: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simular envio
    setTimeout(() => {
      console.log('Submetendo:', formData)
      if (formData.analisar_ia) {
        router.push('/dashboard/publicacoes/processar/new-id')
      } else {
        router.push('/dashboard/publicacoes')
      }
    }, 1500)
  }

  const formatCNJ = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')

    // Aplica máscara CNJ: 0000000-00.0000.0.00.0000
    if (numbers.length <= 7) return numbers
    if (numbers.length <= 9) return `${numbers.slice(0, 7)}-${numbers.slice(7)}`
    if (numbers.length <= 13) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9)}`
    if (numbers.length <= 14) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13)}`
    if (numbers.length <= 16) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14)}`
    return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14, 16)}.${numbers.slice(16, 20)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/publicacoes')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-700">Nova Publicação</h1>
                  <p className="text-xs text-slate-500">Adicionar publicação manualmente</p>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Adição Manual
            </Badge>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card: Informações Básicas */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-700">Informações da Publicação</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Data da Publicação *</Label>
                <Input
                  type="date"
                  required
                  value={formData.data_publicacao}
                  onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Tipo de Publicação *</Label>
                <Select
                  value={formData.tipo_publicacao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_publicacao: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intimacao">Intimação</SelectItem>
                    <SelectItem value="sentenca">Sentença</SelectItem>
                    <SelectItem value="despacho">Despacho</SelectItem>
                    <SelectItem value="decisao">Decisão</SelectItem>
                    <SelectItem value="acordao">Acórdão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card: Dados Judiciais */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-700">Dados Judiciais</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Tribunal *</Label>
                <Input
                  required
                  value={formData.tribunal}
                  onChange={(e) => setFormData({ ...formData, tribunal: e.target.value })}
                  className="text-sm"
                  placeholder="Ex: TJSP, TRF3, STJ"
                />
              </div>

              <div>
                <Label className="text-xs">Vara (opcional)</Label>
                <Input
                  value={formData.vara}
                  onChange={(e) => setFormData({ ...formData, vara: e.target.value })}
                  className="text-sm"
                  placeholder="Ex: 1ª Vara Cível"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Número do Processo (CNJ)</Label>
                <Input
                  value={formData.numero_processo}
                  onChange={(e) => {
                    const formatted = formatCNJ(e.target.value)
                    setFormData({ ...formData, numero_processo: formatted })
                  }}
                  className="text-sm font-mono"
                  placeholder="0000000-00.0000.0.00.0000"
                  maxLength={25}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Formato CNJ. Se informado, tentaremos vincular automaticamente ao processo.
                </p>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Cliente</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente1">João Silva</SelectItem>
                    <SelectItem value="cliente2">Maria Santos</SelectItem>
                    <SelectItem value="cliente3">Empresa XYZ Ltda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card: Conteúdo */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-700">Texto da Publicação</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs">Texto Completo *</Label>
                <Textarea
                  required
                  value={formData.texto_completo}
                  onChange={(e) => setFormData({ ...formData, texto_completo: e.target.value })}
                  className="text-sm font-mono resize-none"
                  rows={12}
                  placeholder="Cole aqui o texto completo da publicação..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Cole o texto completo da intimação ou publicação. A IA irá analisá-lo automaticamente.
                </p>
              </div>

              <div>
                <Label className="text-xs">PDF Original (opcional)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Clique para fazer upload</p>
                      <p className="text-xs text-slate-500">ou arraste e solte o arquivo PDF</p>
                    </div>
                    <p className="text-xs text-slate-400">Tamanho máximo: 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Opções */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-700">Opções Adicionais</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="urgente"
                  checked={formData.urgente}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, urgente: checked as boolean })
                  }
                />
                <label htmlFor="urgente" className="text-sm text-slate-700">
                  Marcar como urgente
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <Checkbox
                  id="analisar-ia"
                  checked={formData.analisar_ia}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, analisar_ia: checked as boolean })
                  }
                />
                <label htmlFor="analisar-ia" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Analisar com IA após salvar
                </label>
              </div>
              <p className="text-xs text-slate-500 pl-6">
                A IA irá extrair informações, identificar prazos e sugerir ações automaticamente
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-between bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/publicacoes')}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {formData.analisar_ia ? 'Salvar e Analisar' : 'Salvar Publicação'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Dica */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Dica de Uso</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Use esta funcionalidade para adicionar publicações recebidas por outros meios
                (e-mail, aplicativo do tribunal, etc.) ou para testes. A análise por IA irá
                processar o texto e identificar automaticamente prazos, determinações e ações necessárias.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
