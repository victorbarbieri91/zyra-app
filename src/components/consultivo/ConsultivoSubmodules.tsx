'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Copy,
  Download,
  Send,
  FileSignature,
  ClipboardList,
  ScrollText,
  Wand2,
  ChevronRight,
  AlertTriangle,
  Building,
  User,
  Hash,
  Flag,
  Archive,
  Tag,
  Briefcase,
  Scale,
  BookOpen,
  PenTool,
  Save,
  Eye,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ConsultivoSubmodulesProps {
  escritorioId: string
}

// Types
interface Contrato {
  id: string
  numero: string
  titulo: string
  cliente_id: string
  cliente_nome: string
  tipo: 'prestacao_servicos' | 'compra_venda' | 'locacao' | 'societario' | 'trabalho' | 'outros'
  status: 'rascunho' | 'revisao' | 'aprovado' | 'assinado' | 'vigente' | 'encerrado'
  data_criacao: Date
  data_vigencia_inicio?: Date
  data_vigencia_fim?: Date
  valor?: number
  partes: Array<{
    tipo: 'contratante' | 'contratado' | 'testemunha' | 'fiador'
    nome: string
    documento: string
  }>
  clausulas: string[]
  observacoes?: string
}

interface Obrigacao {
  id: string
  contrato_id?: string
  titulo: string
  descricao: string
  tipo: 'fazer' | 'nao_fazer' | 'dar' | 'receber'
  responsavel: string
  prazo: Date
  status: 'pendente' | 'em_andamento' | 'cumprida' | 'descumprida'
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  valor?: number
  multa_descumprimento?: number
  alertas: number
}

interface Clausula {
  id: string
  codigo: string
  titulo: string
  categoria: 'pagamento' | 'prazo' | 'responsabilidade' | 'rescisao' | 'confidencialidade' | 'penalidade' | 'geral'
  texto: string
  obrigatoria: boolean
  tags: string[]
  uso_count: number
}

interface TemplateDocumento {
  id: string
  nome: string
  tipo: 'contrato' | 'procuracao' | 'notificacao' | 'parecer' | 'peticao'
  categoria: string
  variaveis: Array<{
    nome: string
    tipo: 'texto' | 'numero' | 'data' | 'moeda'
    obrigatoria: boolean
  }>
  conteudo: string
  uso_count: number
}

// Mock data generators
const generateMockContratos = (): Contrato[] => [
  {
    id: '1',
    numero: 'CTR-2024-001',
    titulo: 'Contrato de Prestação de Serviços Advocatícios',
    cliente_id: 'cli-1',
    cliente_nome: 'Tech Solutions Ltda',
    tipo: 'prestacao_servicos',
    status: 'vigente',
    data_criacao: new Date(2024, 0, 15),
    data_vigencia_inicio: new Date(2024, 1, 1),
    data_vigencia_fim: new Date(2025, 0, 31),
    valor: 50000,
    partes: [
      { tipo: 'contratante', nome: 'Tech Solutions Ltda', documento: '12.345.678/0001-90' },
      { tipo: 'contratado', nome: 'Escritório Advocacia', documento: '98.765.432/0001-10' },
    ],
    clausulas: ['CL001', 'CL002', 'CL003', 'CL010', 'CL015'],
    observacoes: 'Contrato com renovação automática',
  },
  {
    id: '2',
    numero: 'CTR-2024-002',
    titulo: 'Contrato de Locação Comercial',
    cliente_id: 'cli-2',
    cliente_nome: 'Imobiliária Central',
    tipo: 'locacao',
    status: 'revisao',
    data_criacao: new Date(2024, 2, 10),
    valor: 5000,
    partes: [
      { tipo: 'contratante', nome: 'Imobiliária Central', documento: '11.222.333/0001-44' },
      { tipo: 'contratado', nome: 'João Silva', documento: '123.456.789-00' },
    ],
    clausulas: ['CL004', 'CL005', 'CL006'],
  },
]

const generateMockObrigacoes = (): Obrigacao[] => [
  {
    id: '1',
    contrato_id: '1',
    titulo: 'Entrega de Relatório Mensal',
    descricao: 'Entregar relatório detalhado de atividades jurídicas',
    tipo: 'fazer',
    responsavel: 'Dr. João Silva',
    prazo: addDays(new Date(), 5),
    status: 'pendente',
    prioridade: 'alta',
    alertas: 2,
  },
  {
    id: '2',
    titulo: 'Pagamento de Honorários',
    descricao: 'Receber pagamento referente ao mês de novembro',
    tipo: 'receber',
    responsavel: 'Financeiro',
    prazo: addDays(new Date(), -2),
    status: 'pendente',
    prioridade: 'critica',
    valor: 15000,
    alertas: 5,
  },
  {
    id: '3',
    contrato_id: '2',
    titulo: 'Vistoria do Imóvel',
    descricao: 'Realizar vistoria semestral do imóvel locado',
    tipo: 'fazer',
    responsavel: 'Perito Técnico',
    prazo: addDays(new Date(), 15),
    status: 'em_andamento',
    prioridade: 'media',
    alertas: 0,
  },
]

const generateMockClausulas = (): Clausula[] => [
  {
    id: '1',
    codigo: 'CL001',
    titulo: 'Cláusula de Pagamento',
    categoria: 'pagamento',
    texto: 'O CONTRATANTE pagará ao CONTRATADO o valor de R$ {{valor}} mensalmente, até o dia {{dia_vencimento}} de cada mês.',
    obrigatoria: true,
    tags: ['pagamento', 'mensal', 'vencimento'],
    uso_count: 145,
  },
  {
    id: '2',
    codigo: 'CL002',
    titulo: 'Cláusula de Confidencialidade',
    categoria: 'confidencialidade',
    texto: 'As partes comprometem-se a manter sigilo absoluto sobre todas as informações confidenciais...',
    obrigatoria: true,
    tags: ['sigilo', 'confidencial', 'informação'],
    uso_count: 203,
  },
  {
    id: '3',
    codigo: 'CL003',
    titulo: 'Cláusula de Rescisão',
    categoria: 'rescisao',
    texto: 'O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de {{dias_aviso}} dias...',
    obrigatoria: false,
    tags: ['rescisao', 'aviso', 'termino'],
    uso_count: 189,
  },
]

const generateMockTemplates = (): TemplateDocumento[] => [
  {
    id: '1',
    nome: 'Contrato de Prestação de Serviços Advocatícios',
    tipo: 'contrato',
    categoria: 'Advocacia',
    variaveis: [
      { nome: 'cliente_nome', tipo: 'texto', obrigatoria: true },
      { nome: 'valor_honorarios', tipo: 'moeda', obrigatoria: true },
      { nome: 'data_inicio', tipo: 'data', obrigatoria: true },
    ],
    conteudo: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS...',
    uso_count: 89,
  },
  {
    id: '2',
    nome: 'Notificação Extrajudicial',
    tipo: 'notificacao',
    categoria: 'Cobrança',
    variaveis: [
      { nome: 'devedor_nome', tipo: 'texto', obrigatoria: true },
      { nome: 'valor_divida', tipo: 'moeda', obrigatoria: true },
      { nome: 'prazo_pagamento', tipo: 'numero', obrigatoria: true },
    ],
    conteudo: 'NOTIFICAÇÃO EXTRAJUDICIAL...',
    uso_count: 156,
  },
]

export default function ConsultivoSubmodules({ escritorioId }: ConsultivoSubmodulesProps) {
  const [activeTab, setActiveTab] = useState('contratos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showNovoContrato, setShowNovoContrato] = useState(false)
  const [showNovaObrigacao, setShowNovaObrigacao] = useState(false)
  const [showNovaClausula, setShowNovaClausula] = useState(false)
  const [showGerador, setShowGerador] = useState(false)

  // Mock data
  const [contratos] = useState(generateMockContratos())
  const [obrigacoes] = useState(generateMockObrigacoes())
  const [clausulas] = useState(generateMockClausulas())
  const [templates] = useState(generateMockTemplates())

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: React.ReactNode }> = {
      rascunho: { class: 'bg-slate-100 text-slate-700', icon: <Edit className="w-3 h-3" /> },
      revisao: { class: 'bg-amber-100 text-amber-700', icon: <Eye className="w-3 h-3" /> },
      aprovado: { class: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3 h-3" /> },
      assinado: { class: 'bg-purple-100 text-purple-700', icon: <FileSignature className="w-3 h-3" /> },
      vigente: { class: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
      encerrado: { class: 'bg-gray-100 text-gray-700', icon: <Archive className="w-3 h-3" /> },
    }
    return badges[status] || badges.rascunho
  }

  const getPrioridadeBadge = (prioridade: string) => {
    const badges: Record<string, string> = {
      baixa: 'bg-slate-100 text-slate-700',
      media: 'bg-blue-100 text-blue-700',
      alta: 'bg-amber-100 text-amber-700',
      critica: 'bg-red-100 text-red-700',
    }
    return badges[prioridade] || badges.media
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#34495e]">Módulos Consultivo</h2>
          <p className="text-sm text-slate-600 mt-1">
            Gestão completa de contratos, obrigações e documentos jurídicos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="contratos" className="gap-2">
            <FileText className="w-4 h-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="obrigacoes" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Obrigações
          </TabsTrigger>
          <TabsTrigger value="clausulas" className="gap-2">
            <ScrollText className="w-4 h-4" />
            Cláusulas
          </TabsTrigger>
          <TabsTrigger value="gerador" className="gap-2">
            <Wand2 className="w-4 h-4" />
            Gerador
          </TabsTrigger>
        </TabsList>

        {/* Tab: Contratos */}
        <TabsContent value="contratos" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Gestão de Contratos</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNovoContrato(true)}
                  className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Contrato
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar contratos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Contracts List */}
              <div className="space-y-3">
                {contratos.map((contrato) => {
                  const statusBadge = getStatusBadge(contrato.status)

                  return (
                    <div
                      key={contrato.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-semibold text-[#89bcbe]">
                              {contrato.numero}
                            </span>
                            <Badge className={cn("text-[10px]", statusBadge.class)}>
                              {statusBadge.icon}
                              <span className="ml-1">{contrato.status}</span>
                            </Badge>
                          </div>
                          <h4 className="text-sm font-semibold text-[#34495e] mb-1">
                            {contrato.titulo}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {contrato.cliente_nome}
                            </div>
                            {contrato.valor && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(contrato.valor)}
                              </div>
                            )}
                            {contrato.data_vigencia_fim && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Vigente até {format(contrato.data_vigencia_fim, 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Obrigações */}
        <TabsContent value="obrigacoes" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Controle de Obrigações</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNovaObrigacao(true)}
                  className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Obrigação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {obrigacoes.map((obrigacao) => {
                  const isAtrasada = isPast(obrigacao.prazo) && obrigacao.status !== 'cumprida'

                  return (
                    <div
                      key={obrigacao.id}
                      className={cn(
                        "bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer",
                        isAtrasada ? "border-red-200 bg-red-50/30" : "border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getPrioridadeBadge(obrigacao.prioridade)}>
                              {obrigacao.prioridade}
                            </Badge>
                            {obrigacao.alertas > 0 && (
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle className="w-3 h-3" />
                                {obrigacao.alertas} alertas
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-[#34495e] mb-1">
                            {obrigacao.titulo}
                          </h4>
                          <p className="text-xs text-slate-600 mb-2">{obrigacao.descricao}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {obrigacao.responsavel}
                            </div>
                            <div className={cn(
                              "flex items-center gap-1",
                              isAtrasada && "text-red-600 font-semibold"
                            )}>
                              <Clock className="w-3 h-3" />
                              {format(obrigacao.prazo, 'dd/MM/yyyy')}
                              {isAtrasada && ' (Atrasado)'}
                            </div>
                            {obrigacao.valor && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(obrigacao.valor)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 text-xs",
                              obrigacao.status === 'cumprida' && "bg-green-50 border-green-200 text-green-700"
                            )}
                          >
                            {obrigacao.status === 'cumprida' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Cumprida
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Marcar Cumprida
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cláusulas */}
        <TabsContent value="clausulas" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Biblioteca de Cláusulas</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNovaClausula(true)}
                  className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Cláusula
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {clausulas.map((clausula) => (
                  <Card key={clausula.id} className="border-slate-200 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-semibold text-[#89bcbe]">{clausula.codigo}</span>
                          <h4 className="text-sm font-semibold text-[#34495e] mt-1">{clausula.titulo}</h4>
                        </div>
                        <Badge variant={clausula.obrigatoria ? "default" : "secondary"} className="text-[10px]">
                          {clausula.obrigatoria ? 'Obrigatória' : 'Opcional'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-3">{clausula.texto}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {clausula.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">
                            {clausula.uso_count} usos
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gerador */}
        <TabsContent value="gerador" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Gerador de Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setShowGerador(true)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          template.tipo === 'contrato' ? "bg-blue-100 text-blue-600" :
                          template.tipo === 'notificacao' ? "bg-amber-100 text-amber-600" :
                          template.tipo === 'parecer' ? "bg-purple-100 text-purple-600" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {template.tipo === 'contrato' ? <FileText className="w-5 h-5" /> :
                           template.tipo === 'notificacao' ? <AlertTriangle className="w-5 h-5" /> :
                           template.tipo === 'parecer' ? <BookOpen className="w-5 h-5" /> :
                           <PenTool className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-[#34495e] mb-1">
                            {template.nome}
                          </h4>
                          <p className="text-xs text-slate-600 mb-2">{template.categoria}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">
                              {template.variaveis.length} variáveis
                            </span>
                            <span className="text-[10px] text-[#89bcbe] font-medium">
                              {template.uso_count} usos
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
                        >
                          <Wand2 className="w-3.5 h-3.5 mr-1" />
                          Gerar Documento
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#f0f9f9] to-[#e8f5f5] rounded-lg border border-[#89bcbe]/20">
                <h4 className="text-sm font-semibold text-[#34495e] mb-3 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#89bcbe]" />
                  Geração Rápida com IA
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" className="text-xs justify-start">
                    <FileSignature className="w-3.5 h-3.5 mr-1.5" />
                    Contrato Simples
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    Notificação
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start">
                    <Scale className="w-3.5 h-3.5 mr-1.5" />
                    Procuração
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Parecer Jurídico
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Gerador de Documentos */}
      <Dialog open={showGerador} onOpenChange={setShowGerador}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Documento</DialogTitle>
            <DialogDescription>
              Preencha as variáveis para gerar o documento personalizado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="cliente">Nome do Cliente</Label>
                <Input id="cliente" placeholder="Digite o nome completo" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="valor">Valor dos Honorários</Label>
                <Input id="valor" type="number" placeholder="0,00" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="data">Data de Início</Label>
                <Input id="data" type="date" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações Adicionais</Label>
                <Textarea id="observacoes" placeholder="Informações complementares..." className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerador(false)}>
              Cancelar
            </Button>
            <Button className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white">
              <Wand2 className="w-4 h-4 mr-2" />
              Gerar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}