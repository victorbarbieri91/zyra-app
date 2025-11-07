'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Edit,
  Plus,
  FileText,
  Clock,
  Sparkles,
  Calendar,
  Folder,
  Scale,
  Library,
  DollarSign,
  History
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Abas
import ProcessoResumo from '@/components/processos/ProcessoResumo'
import ProcessoMovimentacoes from '@/components/processos/ProcessoMovimentacoes'
import ProcessoDocumentos from '@/components/processos/ProcessoDocumentos'
import ProcessoEstrategia from '@/components/processos/ProcessoEstrategia'
import ProcessoJurisprudencias from '@/components/processos/ProcessoJurisprudencias'
import ProcessoFinanceiro from '@/components/processos/ProcessoFinanceiro'
import ProcessoHistorico from '@/components/processos/ProcessoHistorico'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito?: string
  tribunal: string
  comarca?: string
  vara?: string
  juiz?: string
  data_distribuicao: string
  cliente_id: string
  cliente_nome: string
  polo_cliente: string
  parte_contraria?: string
  responsavel_id: string
  responsavel_nome: string
  colaboradores_ids: string[]
  colaboradores_nomes: string[]
  status: string
  valor_causa?: number
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  objeto_acao?: string
  observacoes?: string
  tags: string[]
  data_transito_julgado?: string
  data_arquivamento?: string
  created_at: string
  updated_at: string
}

export default function ProcessoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const [processo, setProcesso] = useState<Processo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resumo')
  const supabase = createClient()

  // Contadores para badges das abas
  const [movimentacoesNaoLidas, setMovimentacoesNaoLidas] = useState(0)
  const [totalDocumentos, setTotalDocumentos] = useState(0)
  const [versõesEstrategia, setVersoesEstrategia] = useState(0)
  const [totalJurisprudencias, setTotalJurisprudencias] = useState(0)

  useEffect(() => {
    if (params.id) {
      loadProcesso(params.id as string)
    }
  }, [params.id])

  const loadProcesso = async (id: string) => {
    try {
      setLoading(true)

      // SIMULAÇÃO - Depois virá do Supabase
      const mockProcesso: Processo = {
        id,
        numero_pasta: '1000',
        numero_cnj: '1234567-12.2024.8.26.0100',
        tipo: 'judicial',
        area: 'Trabalhista',
        fase: 'Conhecimento',
        instancia: '1ª',
        rito: 'ordinário',
        tribunal: 'TRT 2ª Região',
        comarca: 'São Paulo',
        vara: '1ª Vara do Trabalho',
        juiz: 'Dr. João Silva',
        data_distribuicao: '2024-01-15',
        cliente_id: '1',
        cliente_nome: 'João Silva',
        polo_cliente: 'ativo',
        parte_contraria: 'Empresa XYZ Ltda',
        responsavel_id: '1',
        responsavel_nome: 'Dr. Carlos Souza',
        colaboradores_ids: ['2', '3'],
        colaboradores_nomes: ['Dra. Ana Santos', 'Dr. Pedro Oliveira'],
        status: 'ativo',
        valor_causa: 50000,
        valor_acordo: undefined,
        valor_condenacao: undefined,
        provisao_sugerida: 25000,
        objeto_acao: 'Rescisão contratual por justa causa com pedido de verbas rescisórias',
        observacoes: 'Cliente já tentou acordo extrajudicial sem sucesso',
        tags: ['urgente', 'rescisão', 'verbas'],
        created_at: '2024-01-15T10:00:00',
        updated_at: '2025-01-06T14:30:00'
      }

      setProcesso(mockProcesso)
      setMovimentacoesNaoLidas(2)
      setTotalDocumentos(8)
      setVersoesEstrategia(2)
      setTotalJurisprudencias(5)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processo:', error)
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      suspenso: 'bg-amber-100 text-amber-700 border-amber-200',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200',
      baixado: 'bg-blue-100 text-blue-700 border-blue-200',
      transito_julgado: 'bg-purple-100 text-purple-700 border-purple-200',
      acordo: 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return styles[status as keyof typeof styles] || styles.ativo
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!processo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#34495e] mb-2">Processo não encontrado</h2>
          <Button onClick={() => router.push('/processos')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">

        {/* Header da Ficha */}
        <div className="bg-gradient-to-br from-[#f0f9f9] to-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/processos')}
                className="text-[#46627f] hover:text-[#34495e]"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </div>
            <Button
              variant="outline"
              className="border-[#89bcbe] text-[#46627f] hover:bg-[#f0f9f9]"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-[#34495e] mb-2">
              Processo #{processo.numero_pasta} - {processo.cliente_nome} vs {processo.parte_contraria}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#46627f]">Nº CNJ:</span>
                <span>{processo.numero_cnj}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#46627f]">Status:</span>
                <Badge className={`text-[10px] border ${getStatusBadge(processo.status)}`}>
                  {processo.status}
                </Badge>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#46627f]">Área:</span>
                <span>{processo.area}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#46627f]">Responsável:</span>
                <span>{processo.responsavel_nome}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas - Sticky */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-8 gap-2.5">
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Movimentação
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Prazo
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Gerar Peça IA
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Anexar Documento
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Agendar Audiência
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              Estratégia
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Library className="w-3.5 h-3.5 mr-1.5" />
              Jurisprudência
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Sistema de Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-7 bg-slate-100">
                <TabsTrigger value="resumo" className="text-xs">
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="movimentacoes" className="text-xs">
                  Movimentações
                  {movimentacoesNaoLidas > 0 && (
                    <Badge className="ml-2 text-[10px] h-4 bg-blue-600 text-white">
                      {movimentacoesNaoLidas}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs">
                  Documentos
                  {totalDocumentos > 0 && (
                    <Badge className="ml-2 text-[10px] h-4" variant="secondary">
                      {totalDocumentos}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="estrategia" className="text-xs">
                  Estratégia
                  {versõesEstrategia > 0 && (
                    <Badge className="ml-2 text-[10px] h-4" variant="secondary">
                      {versõesEstrategia}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="jurisprudencias" className="text-xs">
                  Jurisprudências
                  {totalJurisprudencias > 0 && (
                    <Badge className="ml-2 text-[10px] h-4" variant="secondary">
                      {totalJurisprudencias}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="financeiro" className="text-xs">
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  Histórico
                </TabsTrigger>
              </TabsList>
            </CardHeader>
          </Card>

          {/* Conteúdo das Abas */}
          <TabsContent value="resumo" className="space-y-6">
            <ProcessoResumo processo={processo} />
          </TabsContent>

          <TabsContent value="movimentacoes" className="space-y-6">
            <ProcessoMovimentacoes processoId={processo.id} />
          </TabsContent>

          <TabsContent value="documentos" className="space-y-6">
            <ProcessoDocumentos processoId={processo.id} />
          </TabsContent>

          <TabsContent value="estrategia" className="space-y-6">
            <ProcessoEstrategia processoId={processo.id} />
          </TabsContent>

          <TabsContent value="jurisprudencias" className="space-y-6">
            <ProcessoJurisprudencias processoId={processo.id} />
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <ProcessoFinanceiro processo={processo} />
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <ProcessoHistorico processoId={processo.id} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
