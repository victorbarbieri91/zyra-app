'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Building2,
  Users,
  Scale,
  Briefcase,
  Check,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  ListChecks,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioProdutos } from '@/hooks/usePortfolioProdutos'
import type { AreaJuridica, Complexidade, ProdutoFormData } from '@/types/portfolio'
import {
  AREA_JURIDICA_LABELS,
  COMPLEXIDADE_LABELS,
} from '@/types/portfolio'
import { toast } from 'sonner'

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

// Cores harmônicas com design system
const AREA_STYLES: Record<AreaJuridica, { bg: string; text: string; border: string; gradient: string }> = {
  tributario: {
    bg: 'bg-[#34495e]/10',
    text: 'text-[#34495e]',
    border: 'border-[#34495e]/30',
    gradient: 'from-[#34495e] to-[#46627f]',
  },
  societario: {
    bg: 'bg-[#1E3A8A]/10',
    text: 'text-[#1E3A8A]',
    border: 'border-[#1E3A8A]/30',
    gradient: 'from-[#1E3A8A] to-[#3659a8]',
  },
  trabalhista: {
    bg: 'bg-[#2d5a5a]/10',
    text: 'text-[#2d5a5a]',
    border: 'border-[#2d5a5a]/30',
    gradient: 'from-[#2d5a5a] to-[#4a7c7c]',
  },
  civel: {
    bg: 'bg-[#4a4168]/10',
    text: 'text-[#4a4168]',
    border: 'border-[#4a4168]/30',
    gradient: 'from-[#4a4168] to-[#6a6188]',
  },
  outro: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    gradient: 'from-slate-500 to-slate-600',
  },
}

const COMPLEXIDADE_COLORS: Record<Complexidade, string> = {
  simples: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  baixa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  alta: 'bg-rose-50 text-rose-700 border-rose-200',
  complexa: 'bg-rose-50 text-rose-700 border-rose-200',
}

type WizardStep = 'info' | 'fases' | 'revisao'

interface FaseForm {
  id: string
  nome: string
  descricao: string
  duracao_estimada_dias: number
  checklist: string[]
}

export default function NovoProdutoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<WizardStep>('info')
  const [saving, setSaving] = useState(false)

  // Form state - Info básica
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [descricaoComercial, setDescricaoComercial] = useState('')
  const [areaJuridica, setAreaJuridica] = useState<AreaJuridica>('tributario')
  const [categoria, setCategoria] = useState('')
  const [duracaoEstimada, setDuracaoEstimada] = useState(30)
  const [complexidade, setComplexidade] = useState<Complexidade>('media')

  // Form state - Fases
  const [fases, setFases] = useState<FaseForm[]>([
    { id: '1', nome: '', descricao: '', duracao_estimada_dias: 7, checklist: [] },
  ])

  const { criarProduto, adicionarFase, adicionarChecklistItem } = usePortfolioProdutos(escritorioId || '')

  // Carregar escritório do usuário logado
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
    loadEscritorioId()
  }, [])

  const steps: { key: WizardStep; label: string; description: string; icon: typeof FileText }[] = [
    { key: 'info', label: 'Informações', description: 'Dados básicos do produto', icon: FileText },
    { key: 'fases', label: 'Fases', description: 'Etapas de execução', icon: Layers },
    { key: 'revisao', label: 'Revisão', description: 'Confirmar e criar', icon: CheckCircle2 },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  // Handlers de Fases
  const addFase = () => {
    setFases([
      ...fases,
      {
        id: Date.now().toString(),
        nome: '',
        descricao: '',
        duracao_estimada_dias: 7,
        checklist: [],
      },
    ])
  }

  const removeFase = (id: string) => {
    if (fases.length > 1) {
      setFases(fases.filter((f) => f.id !== id))
    }
  }

  const updateFase = (id: string, field: keyof FaseForm, value: any) => {
    setFases(fases.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  const addChecklistItem = (faseId: string) => {
    setFases(
      fases.map((f) =>
        f.id === faseId ? { ...f, checklist: [...f.checklist, ''] } : f
      )
    )
  }

  const updateChecklistItem = (faseId: string, index: number, value: string) => {
    setFases(
      fases.map((f) =>
        f.id === faseId
          ? {
              ...f,
              checklist: f.checklist.map((item, i) => (i === index ? value : item)),
            }
          : f
      )
    )
  }

  const removeChecklistItem = (faseId: string, index: number) => {
    setFases(
      fases.map((f) =>
        f.id === faseId
          ? { ...f, checklist: f.checklist.filter((_, i) => i !== index) }
          : f
      )
    )
  }

  // Navegação
  const canGoNext = () => {
    if (currentStep === 'info') {
      return nome.trim() !== '' && areaJuridica
    }
    if (currentStep === 'fases') {
      return fases.every((f) => f.nome.trim() !== '')
    }
    return true
  }

  const goNext = () => {
    if (currentStep === 'info') setCurrentStep('fases')
    else if (currentStep === 'fases') setCurrentStep('revisao')
  }

  const goBack = () => {
    if (currentStep === 'fases') setCurrentStep('info')
    else if (currentStep === 'revisao') setCurrentStep('fases')
  }

  // Salvar
  const handleSave = async () => {
    if (!escritorioId) {
      toast.error('Erro: Escritório não encontrado. Faça login novamente.')
      return
    }

    setSaving(true)
    try {
      // Criar produto
      const novoProduto: ProdutoFormData = {
        nome,
        descricao: descricao || undefined,
        descricao_comercial: descricaoComercial || undefined,
        area_juridica: areaJuridica,
        categoria: categoria || undefined,
        duracao_estimada_dias: duracaoEstimada,
        complexidade,
        visivel_catalogo: false,
      }

      const produto = await criarProduto(novoProduto)

      if (produto) {
        // Criar fases
        for (let i = 0; i < fases.length; i++) {
          const faseForm = fases[i]
          const faseData = {
            nome: faseForm.nome,
            descricao: faseForm.descricao || undefined,
            duracao_estimada_dias: faseForm.duracao_estimada_dias,
          }

          const faseCriada = await adicionarFase(produto.id, faseData)

          // Criar checklist items
          if (faseCriada && faseForm.checklist.length > 0) {
            for (let j = 0; j < faseForm.checklist.length; j++) {
              const item = faseForm.checklist[j]
              if (item.trim()) {
                await adicionarChecklistItem(faseCriada.id, item.trim(), false)
              }
            }
          }
        }

        toast.success('Produto criado com sucesso!')
        router.push(`/dashboard/portfolio/produtos/${produto.id}`)
      }
    } catch (error: any) {
      console.error('Erro ao criar produto:', error)
      const errorMessage = error?.message || error?.details || 'Erro desconhecido'
      toast.error(`Erro ao criar produto: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const AreaIcon = AREA_ICONS[areaJuridica]
  const areaStyle = AREA_STYLES[areaJuridica]
  const totalDuracaoFases = fases.reduce((acc, f) => acc + f.duracao_estimada_dias, 0)
  const totalChecklistItems = fases.reduce((acc, f) => acc + f.checklist.filter(c => c.trim()).length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/portfolio">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-[#34495e]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Catálogo
            </Button>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="relative">
          {/* Progress Line Background */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200 mx-auto" style={{ width: 'calc(100% - 200px)', left: '100px' }} />

          {/* Progress Line Active */}
          <div
            className="absolute top-6 h-0.5 bg-gradient-to-r from-[#34495e] to-[#46627f] transition-all duration-500"
            style={{
              width: `calc((100% - 200px) * ${currentStepIndex / (steps.length - 1)})`,
              left: '100px'
            }}
          />

          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center"
                  style={{ width: '200px' }}
                >
                  {/* Step Circle */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200'
                        : isActive
                        ? 'bg-gradient-to-br from-[#34495e] to-[#46627f] text-white shadow-lg shadow-slate-300'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <p className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-[#34495e]' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-xs mt-0.5 transition-colors ${
                      isActive ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Step Header Gradient */}
          <div className={`h-1.5 bg-gradient-to-r ${areaStyle.gradient}`} />

          <CardContent className="p-8">
            {/* Step 1: Informações */}
            {currentStep === 'info' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#34495e]">Informações Básicas</h2>
                    <p className="text-sm text-slate-500">Defina os dados principais do produto</p>
                  </div>
                </div>

                {/* Nome do Produto - Destaque */}
                <div className="relative">
                  <Label htmlFor="nome" className="text-sm font-medium text-slate-700">
                    Nome do Produto <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Planejamento Tributário Completo"
                    className="mt-2 h-12 text-lg border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20 transition-all"
                  />
                </div>

                {/* Área Jurídica - Cards Selecionáveis */}
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Área Jurídica <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                    {(Object.keys(AREA_JURIDICA_LABELS) as AreaJuridica[]).map((area) => {
                      const Icon = AREA_ICONS[area]
                      const style = AREA_STYLES[area]
                      const isSelected = areaJuridica === area

                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setAreaJuridica(area)}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? `${style.bg} ${style.border} ${style.text} shadow-md`
                              : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <Icon className={`w-6 h-6 ${isSelected ? style.text : ''}`} />
                          <span className="text-xs font-medium text-center leading-tight">
                            {AREA_JURIDICA_LABELS[area]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Configurações em Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Complexidade */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Complexidade</Label>
                    <div className="flex gap-2 mt-2">
                      {(Object.keys(COMPLEXIDADE_LABELS) as Complexidade[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setComplexidade(c)}
                          className={`flex-1 py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                            complexidade === c
                              ? COMPLEXIDADE_COLORS[c]
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {COMPLEXIDADE_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoria */}
                  <div>
                    <Label htmlFor="categoria" className="text-sm font-medium text-slate-700">Categoria</Label>
                    <Input
                      id="categoria"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      placeholder="Ex: Compliance"
                      className="mt-2 border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20"
                    />
                  </div>

                  {/* Duração */}
                  <div>
                    <Label htmlFor="duracao" className="text-sm font-medium text-slate-700">Duração (dias)</Label>
                    <div className="relative mt-2">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="duracao"
                        type="number"
                        value={duracaoEstimada}
                        onChange={(e) => setDuracaoEstimada(parseInt(e.target.value) || 0)}
                        className="pl-10 border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Descrições */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="descricao" className="text-sm font-medium text-slate-700">
                      Descrição Interna
                    </Label>
                    <p className="text-xs text-slate-400 mt-0.5 mb-2">Visível apenas para a equipe</p>
                    <Textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descrição técnica do produto..."
                      rows={4}
                      className="border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20 resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricaoComercial" className="text-sm font-medium text-slate-700">
                      Descrição Comercial
                    </Label>
                    <p className="text-xs text-slate-400 mt-0.5 mb-2">Usada no PDF de vendas</p>
                    <Textarea
                      id="descricaoComercial"
                      value={descricaoComercial}
                      onChange={(e) => setDescricaoComercial(e.target.value)}
                      placeholder="Descrição para apresentação ao cliente..."
                      rows={4}
                      className="border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Fases */}
            {currentStep === 'fases' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#34495e]">Fases de Execução</h2>
                      <p className="text-sm text-slate-500">Defina as etapas para execução do serviço</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={addFase}
                    className="border-[#34495e]/20 text-[#34495e] hover:bg-[#34495e]/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Fase
                  </Button>
                </div>

                {/* Summary Bar */}
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#34495e]/10 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-[#34495e]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total de Fases</p>
                      <p className="text-sm font-semibold text-[#34495e]">{fases.length}</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#89bcbe]/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#34495e]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Duração Total</p>
                      <p className="text-sm font-semibold text-[#34495e]">{totalDuracaoFases} dias</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <ListChecks className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Itens Checklist</p>
                      <p className="text-sm font-semibold text-[#34495e]">{totalChecklistItems}</p>
                    </div>
                  </div>
                </div>

                {/* Fases List */}
                <div className="space-y-4">
                  {fases.map((fase, index) => (
                    <div
                      key={fase.id}
                      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Fase Number Badge */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#34495e] to-[#46627f]" />

                      <div className="p-5 pl-6">
                        <div className="flex items-start gap-4">
                          {/* Drag Handle & Number */}
                          <div className="flex items-center gap-2 pt-1">
                            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                              {index + 1}
                            </div>
                          </div>

                          {/* Fase Content */}
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-3">
                                <Label className="text-xs text-slate-500">Nome da Fase *</Label>
                                <Input
                                  value={fase.nome}
                                  onChange={(e) => updateFase(fase.id, 'nome', e.target.value)}
                                  placeholder="Ex: Levantamento de Dados"
                                  className="mt-1 border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500">Duração</Label>
                                <div className="relative mt-1">
                                  <Input
                                    type="number"
                                    value={fase.duracao_estimada_dias}
                                    onChange={(e) =>
                                      updateFase(
                                        fase.id,
                                        'duracao_estimada_dias',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="pr-12 border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">dias</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-slate-500">Descrição</Label>
                              <Textarea
                                value={fase.descricao}
                                onChange={(e) => updateFase(fase.id, 'descricao', e.target.value)}
                                placeholder="Descreva o que será feito nesta fase..."
                                rows={2}
                                className="mt-1 border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20 resize-none"
                              />
                            </div>

                            {/* Checklist Section */}
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <ListChecks className="w-4 h-4 text-slate-400" />
                                  <Label className="text-xs text-slate-500">Checklist da Fase</Label>
                                  {fase.checklist.length > 0 && (
                                    <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
                                      {fase.checklist.length} {fase.checklist.length === 1 ? 'item' : 'itens'}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addChecklistItem(fase.id)}
                                  className="h-7 text-xs text-[#34495e] hover:bg-[#34495e]/5"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Adicionar Item
                                </Button>
                              </div>

                              {fase.checklist.length > 0 && (
                                <div className="space-y-2">
                                  {fase.checklist.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center gap-2 group/item">
                                      <div className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] text-slate-400">{itemIndex + 1}</span>
                                      </div>
                                      <Input
                                        value={item}
                                        onChange={(e) =>
                                          updateChecklistItem(fase.id, itemIndex, e.target.value)
                                        }
                                        placeholder="Item do checklist..."
                                        className="flex-1 h-9 text-sm border-slate-200 focus:border-[#34495e] focus:ring-[#34495e]/20"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeChecklistItem(fase.id, itemIndex)}
                                        className="h-9 w-9 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delete Fase Button */}
                          {fases.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFase(fase.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Revisão */}
            {currentStep === 'revisao' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#34495e]">Revisão Final</h2>
                    <p className="text-sm text-slate-500">Confira os dados antes de criar o produto</p>
                  </div>
                </div>

                {/* Product Preview Card */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header com faixa colorida */}
                  <div className={`h-2 bg-gradient-to-r ${areaStyle.gradient}`} />

                  <div className="p-6">
                    {/* Product Info */}
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl ${areaStyle.bg} flex items-center justify-center flex-shrink-0`}>
                        <AreaIcon className={`w-7 h-7 ${areaStyle.text}`} />
                      </div>

                      {/* Title & Area */}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#34495e]">{nome || 'Sem nome'}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${areaStyle.bg} ${areaStyle.text}`}>
                            {AREA_JURIDICA_LABELS[areaJuridica]}
                          </span>
                          {categoria && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                              {categoria}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3 mt-6">
                      <div className="p-4 bg-slate-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-[#34495e]">{fases.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Fases</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-[#34495e]">{totalDuracaoFases}</p>
                        <p className="text-xs text-slate-500 mt-1">Dias</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-[#34495e]">{totalChecklistItems}</p>
                        <p className="text-xs text-slate-500 mt-1">Checklist</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center">
                        <p className={`text-sm font-semibold ${COMPLEXIDADE_COLORS[complexidade].split(' ')[1]}`}>
                          {COMPLEXIDADE_LABELS[complexidade]}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Complexidade</p>
                      </div>
                    </div>

                    {/* Description */}
                    {descricao && (
                      <div className="mt-5 p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500 mb-1">Descrição Interna</p>
                        <p className="text-sm text-slate-600">{descricao}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phases Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h4 className="text-sm font-semibold text-[#34495e] mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Fases de Execução
                  </h4>
                  <div className="space-y-3">
                    {fases.map((fase, index) => (
                      <div
                        key={fase.id}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#34495e] truncate">
                            {fase.nome || 'Sem nome'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {fase.duracao_estimada_dias} dias
                            {fase.checklist.filter(c => c.trim()).length > 0 &&
                              ` • ${fase.checklist.filter(c => c.trim()).length} itens no checklist`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Notice */}
                <div className="flex items-start gap-3 p-4 bg-[#34495e]/5 border border-[#34495e]/10 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#34495e]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#34495e]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#34495e]">Próximos Passos</p>
                    <p className="text-sm text-slate-600 mt-1">
                      O produto será criado como <strong>Rascunho</strong>. Após a criação, você poderá
                      adicionar preços, configurar a equipe padrão, anexar recursos e então ativá-lo
                      para aparecer no catálogo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 'info'}
            className={`${currentStep === 'info' ? 'invisible' : ''} text-slate-600 hover:text-[#34495e]`}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-3">
            {currentStep !== 'revisao' ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#3d566d] hover:to-[#526b8a] shadow-md shadow-slate-300/50 px-6"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-300/50 px-8"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Produto
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
