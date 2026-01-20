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
  Copy,
  Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Abas
import ProcessoResumo from '@/components/processos/ProcessoResumo'
import ProcessoDocumentos from '@/components/processos/ProcessoDocumentos'
import ProcessoEstrategia from '@/components/processos/ProcessoEstrategia'
import ProcessoJurisprudencias from '@/components/processos/ProcessoJurisprudencias'
import ProcessoDepositos from '@/components/processos/ProcessoDepositos'
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
  link_tribunal?: string
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
  const [activeTab, setActiveTab] = useState('ficha')
  const [copiedCNJ, setCopiedCNJ] = useState(false)
  const supabase = createClient()

  // Contadores para badges das abas
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

      // Buscar processo do Supabase
      const { data, error } = await supabase
        .from('processos_processos')
        .select(`
          *,
          cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
          responsavel:profiles!processos_processos_responsavel_id_fkey(nome_completo)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erro ao carregar processo:', error)
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        return
      }

      // Transformar dados do banco para o formato da interface
      const processoFormatado: Processo = {
        id: data.id,
        numero_pasta: data.numero_pasta,
        numero_cnj: data.numero_cnj,
        tipo: data.tipo,
        area: formatArea(data.area),
        fase: formatFase(data.fase),
        instancia: formatInstancia(data.instancia),
        rito: data.rito || undefined,
        tribunal: data.tribunal,
        link_tribunal: data.link_tribunal || undefined,
        comarca: data.comarca || undefined,
        vara: data.vara || undefined,
        juiz: data.juiz || undefined,
        data_distribuicao: data.data_distribuicao,
        cliente_id: data.cliente_id,
        cliente_nome: data.cliente?.nome_completo || 'N/A',
        polo_cliente: data.polo_cliente,
        parte_contraria: data.parte_contraria || undefined,
        responsavel_id: data.responsavel_id,
        responsavel_nome: data.responsavel?.nome_completo || 'N/A',
        colaboradores_ids: data.colaboradores_ids || [],
        colaboradores_nomes: [], // TODO: buscar nomes dos colaboradores
        status: data.status,
        valor_causa: data.valor_causa || undefined,
        valor_acordo: data.valor_acordo || undefined,
        valor_condenacao: data.valor_condenacao || undefined,
        provisao_sugerida: data.provisao_sugerida || undefined,
        objeto_acao: data.objeto_acao || undefined,
        observacoes: data.observacoes || undefined,
        tags: data.tags || [],
        data_transito_julgado: data.data_transito_julgado || undefined,
        data_arquivamento: data.data_arquivamento || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      setProcesso(processoFormatado)
      setTotalDocumentos(0) // TODO: buscar da tabela de documentos
      setVersoesEstrategia(0) // TODO: buscar da tabela de estratégias
      setTotalJurisprudencias(0) // TODO: buscar da tabela de jurisprudências
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar processo:', error)
      setLoading(false)
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível',
      'trabalhista': 'Trabalhista',
      'tributaria': 'Tributária',
      'familia': 'Família',
      'criminal': 'Criminal',
      'previdenciaria': 'Previdenciária',
      'consumidor': 'Consumidor',
      'empresarial': 'Empresarial',
      'ambiental': 'Ambiental',
      'outra': 'Outra'
    }
    return map[area] || area
  }

  const formatFase = (fase: string) => {
    const map: Record<string, string> = {
      'conhecimento': 'Conhecimento',
      'recurso': 'Recurso',
      'execucao': 'Execução',
      'cumprimento_sentenca': 'Cumprimento de Sentença'
    }
    return map[fase] || fase
  }

  const formatInstancia = (instancia: string) => {
    const map: Record<string, string> = {
      '1a': '1ª',
      '2a': '2ª',
      '3a': '3ª',
      'stj': 'STJ',
      'stf': 'STF',
      'tst': 'TST',
      'administrativa': 'Administrativa'
    }
    return map[instancia] || instancia
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

  const copyCNJ = () => {
    if (processo?.numero_cnj) {
      navigator.clipboard.writeText(processo.numero_cnj)
      setCopiedCNJ(true)
      setTimeout(() => setCopiedCNJ(false), 2000)
    }
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
          <Button onClick={() => router.push('/dashboard/processos')}>
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
        <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] border border-slate-300 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/processos')}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Pasta</span>
                <h1 className="text-2xl font-bold text-white">
                  {processo.numero_pasta}
                </h1>
              </div>
              <div className="w-px h-10 bg-white/20 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white truncate" title={`${processo.cliente_nome} vs ${processo.parte_contraria}`}>
                  <span className="truncate">{processo.cliente_nome}</span> <span className="text-white/50 font-normal">vs</span> <span className="truncate">{processo.parte_contraria}</span>
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/60">CNJ:</span>
                  <span className="text-xs text-white/90 font-mono">{processo.numero_cnj}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyCNJ}
                    className="h-5 w-5 p-0 hover:bg-white/10"
                  >
                    {copiedCNJ ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/60" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {processo.tags.map((tag, index) => (
                <Badge key={index} className="bg-[#89bcbe] text-white border-0 text-xs">
                  {tag}
                </Badge>
              ))}
              <div className="w-px h-8 bg-white/20 mx-1" />
              <Badge className={`text-xs border-0 ${getStatusBadge(processo.status)}`}>
                {processo.status}
              </Badge>
              <span className="text-sm text-white/80">{processo.area}</span>
              <div className="w-px h-8 bg-white/20" />
              <span className="text-sm text-white/80">{processo.responsavel_nome}</span>
            </div>
          </div>
        </div>

        {/* Sistema de Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-6 bg-slate-100">
                <TabsTrigger value="ficha" className="text-xs">
                  Ficha Processual
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
                <TabsTrigger value="depositos" className="text-xs">
                  Depósitos
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  Histórico
                </TabsTrigger>
              </TabsList>
            </CardHeader>
          </Card>

          {/* Conteúdo das Abas */}
          <TabsContent value="ficha" className="space-y-6">
            <ProcessoResumo processo={processo} />
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

          <TabsContent value="depositos" className="space-y-6">
            <ProcessoDepositos processoId={processo.id} />
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <ProcessoHistorico processoId={processo.id} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
