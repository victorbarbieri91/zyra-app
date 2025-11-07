'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Bell,
  Sparkles,
  Loader2,
  CalendarCheck,
  ClipboardList,
  X,
  ExternalLink
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
import Link from 'next/link'

export default function ProcessarPublicacaoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Mock data da publicação
  const publicacao = {
    id: params.id,
    tipo_publicacao: 'intimacao',
    numero_processo: '1234567-89.2024.8.26.0100',
    processo_id: 'abc123',
    texto_completo: 'Intimação para apresentação de contrarrazões...'
  }

  // Mock análise IA
  const analise = {
    tem_prazo: true,
    tipo_prazo: 'Contrarrazões de Apelação',
    prazo_dias: 15,
    prazo_tipo_dias: 'uteis',
    data_intimacao: '2024-11-05',
    data_limite: '2024-11-26',
    fundamentacao_legal: 'Art. 1.003 do CPC',
    observacoes: 'Prazo para recurso ordinário conforme art. 1.003 do CPC. Contagem inicia-se da data de intimação.',
    requer_manifestacao: true
  }

  // Form state
  const [formData, setFormData] = useState({
    tipo: analise.tem_prazo ? 'prazo' : 'andamento',
    titulo: analise.tipo_prazo || '',
    descricao: '',
    processo_id: publicacao.processo_id,
    data_inicio: analise.data_intimacao,
    prazo_dias: analise.prazo_dias,
    prazo_tipo: analise.prazo_tipo_dias,
    data_limite: analise.data_limite,
    responsavel_id: '',
    lembretes: {
      dias_7: true,
      dias_3: true,
      dias_1: true
    },
    observacoes: analise.observacoes || '',
    notificar_cliente: true,
    criar_tarefa: false
  })

  // Simular análise IA
  useEffect(() => {
    if (etapaAtual === 1) {
      setIsAnalysing(true)
      setProgress(0)

      const messages = [
        { progress: 25, message: 'Analisando conteúdo da publicação...' },
        { progress: 50, message: 'Identificando prazos e datas...' },
        { progress: 75, message: 'Buscando processo vinculado...' },
        { progress: 100, message: 'Gerando sugestões de ação...' }
      ]

      messages.forEach((msg, index) => {
        setTimeout(() => {
          setProgress(msg.progress)
        }, (index + 1) * 1000)
      })

      setTimeout(() => {
        setIsAnalysing(false)
        setEtapaAtual(2)
      }, 5000)
    }
  }, [etapaAtual])

  const handleSubmit = () => {
    // Aqui faria a chamada para criar o prazo/andamento
    console.log('Submetendo:', formData)
    setEtapaAtual(3)
  }

  const etapas = [
    { numero: 1, titulo: 'Análise Automática', icon: Brain },
    { numero: 2, titulo: 'Revisão e Confirmação', icon: ClipboardList },
    { numero: 3, titulo: 'Confirmação', icon: CheckCircle2 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/publicacoes/${params.id}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-base font-semibold text-slate-700">Processar Publicação</h1>
                <p className="text-xs text-slate-500">Processo {publicacao.numero_processo}</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {etapas.map((etapa, index) => {
              const Icon = etapa.icon
              const isActive = etapa.numero === etapaAtual
              const isCompleted = etapa.numero < etapaAtual

              return (
                <div key={etapa.numero} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                      isCompleted && 'bg-emerald-500 text-white',
                      isActive && 'bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white shadow-lg',
                      !isActive && !isCompleted && 'bg-slate-100 text-slate-400'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={cn(
                      'text-xs font-medium',
                      isActive && 'text-slate-700',
                      !isActive && 'text-slate-400'
                    )}>
                      {etapa.titulo}
                    </div>
                  </div>
                  {index < etapas.length - 1 && (
                    <div className={cn(
                      'w-24 h-px mx-3 mb-6',
                      etapa.numero < etapaAtual ? 'bg-emerald-500' : 'bg-slate-200'
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo das Etapas */}
      <div className="max-w-4xl mx-auto p-6">
        {/* ETAPA 1: Análise Automática */}
        {etapaAtual === 1 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-white animate-pulse" />
              </div>

              <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Analisando Publicação com IA
              </h2>
              <p className="text-sm text-slate-500 text-center mb-8 max-w-md">
                Aguarde enquanto processamos o conteúdo e extraímos informações relevantes
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md mb-4">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {progress === 25 && 'Analisando conteúdo da publicação...'}
                  {progress === 50 && 'Identificando prazos e datas...'}
                  {progress === 75 && 'Buscando processo vinculado...'}
                  {progress === 100 && 'Gerando sugestões de ação...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: Revisão e Confirmação */}
        {etapaAtual === 2 && (
          <div className="space-y-4">
            {/* Tipo de Ação */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Ação Detectada</h3>
                  <p className="text-xs text-slate-500">Baseado na análise do conteúdo</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setFormData({ ...formData, tipo: 'prazo' })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all',
                    formData.tipo === 'prazo'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      formData.tipo === 'prazo' ? 'bg-blue-500' : 'bg-slate-100'
                    )}>
                      <CalendarCheck className={cn(
                        'w-5 h-5',
                        formData.tipo === 'prazo' ? 'text-white' : 'text-slate-400'
                      )} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-700">Criar Prazo</div>
                      <div className="text-xs text-slate-500">Adicionar à agenda</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setFormData({ ...formData, tipo: 'andamento' })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all',
                    formData.tipo === 'andamento'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      formData.tipo === 'andamento' ? 'bg-emerald-500' : 'bg-slate-100'
                    )}>
                      <FileText className={cn(
                        'w-5 h-5',
                        formData.tipo === 'andamento' ? 'text-white' : 'text-slate-400'
                      )} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-700">Registrar Andamento</div>
                      <div className="text-xs text-slate-500">Apenas registro</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Formulário de Prazo */}
            {formData.tipo === 'prazo' && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Criar Prazo/Evento</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">Tipo de Prazo</Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="text-sm resize-none"
                      rows={2}
                      placeholder="Descrição opcional do prazo..."
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Processo</Label>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-slate-700">{publicacao.numero_processo}</span>
                      <Link href={`/dashboard/processos/${publicacao.processo_id}`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Data Intimação</Label>
                    <Input
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Prazo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.prazo_dias}
                        onChange={(e) => setFormData({ ...formData, prazo_dias: parseInt(e.target.value) })}
                        className="text-sm"
                      />
                      <Select value={formData.prazo_tipo} onValueChange={(value) => setFormData({ ...formData, prazo_tipo: value })}>
                        <SelectTrigger className="w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uteis">Dias úteis</SelectItem>
                          <SelectItem value="corridos">Dias corridos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Data Limite</Label>
                    <Input
                      type="date"
                      value={formData.data_limite}
                      onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Responsável</Label>
                    <Select value={formData.responsavel_id} onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user1">Dr. João Silva</SelectItem>
                        <SelectItem value="user2">Dra. Maria Santos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs mb-2 block">Lembretes</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="lembrete-7"
                          checked={formData.lembretes.dias_7}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              lembretes: { ...formData.lembretes, dias_7: checked as boolean }
                            })
                          }
                        />
                        <label htmlFor="lembrete-7" className="text-sm text-slate-700">
                          7 dias antes
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="lembrete-3"
                          checked={formData.lembretes.dias_3}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              lembretes: { ...formData.lembretes, dias_3: checked as boolean }
                            })
                          }
                        />
                        <label htmlFor="lembrete-3" className="text-sm text-slate-700">
                          3 dias antes
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="lembrete-1"
                          checked={formData.lembretes.dias_1}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              lembretes: { ...formData.lembretes, dias_1: checked as boolean }
                            })
                          }
                        />
                        <label htmlFor="lembrete-1" className="text-sm text-slate-700">
                          1 dia antes
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Observações (da IA)</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="text-sm resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Andamento */}
            {formData.tipo === 'andamento' && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar como Andamento</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="add-andamento"
                      checked={true}
                      disabled
                    />
                    <label htmlFor="add-andamento" className="text-sm text-slate-700">
                      Adicionar aos andamentos do processo
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notificar-cliente"
                      checked={formData.notificar_cliente}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, notificar_cliente: checked as boolean })
                      }
                    />
                    <label htmlFor="notificar-cliente" className="text-sm text-slate-700">
                      Notificar cliente
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="criar-tarefa"
                      checked={formData.criar_tarefa}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, criar_tarefa: checked as boolean })
                      }
                    />
                    <label htmlFor="criar-tarefa" className="text-sm text-slate-700">
                      Criar tarefa de acompanhamento
                    </label>
                  </div>

                  <div>
                    <Label className="text-xs">Resumo para andamento</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="text-sm resize-none"
                      rows={4}
                      placeholder="Descreva o andamento..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setEtapaAtual(1)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/publicacoes/${params.id}`)}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Processar Depois
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                >
                  {formData.tipo === 'prazo' ? 'Confirmar e Criar Prazo' : 'Registrar Andamento'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: Confirmação */}
        {etapaAtual === 3 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Publicação Processada com Sucesso!
              </h2>
              <p className="text-sm text-slate-500 text-center mb-8 max-w-md">
                {formData.tipo === 'prazo'
                  ? 'O prazo foi criado e adicionado à agenda'
                  : 'O andamento foi registrado no processo'
                }
              </p>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-8 w-full max-w-md">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">
                      {formData.tipo === 'prazo'
                        ? `Prazo criado: ${formData.titulo}`
                        : 'Andamento registrado no processo'
                      }
                    </span>
                  </div>
                  {formData.tipo === 'prazo' && (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700">
                        Lembretes configurados para {[
                          formData.lembretes.dias_7 && '7',
                          formData.lembretes.dias_3 && '3',
                          formData.lembretes.dias_1 && '1'
                        ].filter(Boolean).join(', ')} dias antes
                      </span>
                    </div>
                  )}
                  {formData.notificar_cliente && (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700">Cliente será notificado</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Link href="/dashboard/agenda" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Calendar className="w-4 h-4" />
                    Ver na Agenda
                  </Button>
                </Link>
                <Link href={`/dashboard/processos/${publicacao.processo_id}`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <FileText className="w-4 h-4" />
                    Ver Processo
                  </Button>
                </Link>
              </div>

              <div className="flex gap-3 mt-4 w-full max-w-md">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/dashboard/publicacoes')}
                >
                  Voltar para Lista
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                  onClick={() => {
                    // Buscar próxima publicação pendente
                    router.push('/dashboard/publicacoes')
                  }}
                >
                  Processar Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
