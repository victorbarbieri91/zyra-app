'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, CheckCircle, XCircle, AlertTriangle, Loader2, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate } from '@/lib/timezone'

interface Estrategia {
  id: string
  versao: number
  is_versao_atual: boolean
  resumo_caso: string | null
  objetivo_principal: string | null
  teses_principais: string[] | null
  teses_subsidiarias: string[] | null
  pontos_fortes: Array<{ descricao: string }> | null
  pontos_fracos: Array<{ descricao: string }> | null
  riscos_identificados: Array<{ descricao: string }> | null
  proximos_passos: Array<{ acao: string }> | null
  estrategia_texto: string | null
  created_at: string
}

interface ProcessoEstrategiaProps {
  processoId: string
}

export default function ProcessoEstrategia({ processoId }: ProcessoEstrategiaProps) {
  const supabase = createClient()
  const [estrategias, setEstrategias] = useState<Estrategia[]>([])
  const [versaoSelecionada, setVersaoSelecionada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar estratégias do processo
  const loadEstrategias = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('processos_estrategia')
        .select('*')
        .eq('processo_id', processoId)
        .order('versao', { ascending: false })

      if (error) throw error

      setEstrategias(data || [])

      // Selecionar a versão atual por padrão
      const atual = data?.find((e: Estrategia) => e.is_versao_atual)
      if (atual) {
        setVersaoSelecionada(atual.id)
      } else if (data && data.length > 0) {
        setVersaoSelecionada(data[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar estratégias:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (processoId) {
      loadEstrategias()
    }
  }, [processoId])

  const estrategiaAtual = estrategias.find(e => e.id === versaoSelecionada)

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty State
  if (estrategias.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Nenhuma estratégia cadastrada</p>
          <p className="text-xs text-slate-500 mb-4">
            Defina a estratégia processual, teses principais e próximos passos
          </p>
          <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Criar Estratégia
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar Versões */}
      <div className="col-span-3 space-y-3">
        <Button className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f]">
          <Plus className="w-4 h-4 mr-2" />
          Nova Versão
        </Button>
        {estrategias.map(e => (
          <Card
            key={e.id}
            className={`cursor-pointer transition-all ${
              e.id === versaoSelecionada
                ? 'border-[#89bcbe] shadow-lg'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setVersaoSelecionada(e.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[#34495e]">Versão {e.versao}</span>
                {e.is_versao_atual && <Badge className="text-[10px] bg-emerald-600">Atual</Badge>}
              </div>
              <p className="text-xs text-slate-600">{formatBrazilDate(e.created_at)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conteúdo da Estratégia */}
      <div className="col-span-9 space-y-6">
        {estrategiaAtual ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-[#34495e]">
                  Estratégia - Versão {estrategiaAtual.versao}
                </CardTitle>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo do Caso */}
              {estrategiaAtual.resumo_caso && (
                <div>
                  <h4 className="text-sm font-semibold text-[#34495e] mb-2">Resumo do Caso</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{estrategiaAtual.resumo_caso}</p>
                </div>
              )}

              {/* Objetivo/Tese Principal */}
              {(estrategiaAtual.objetivo_principal || estrategiaAtual.estrategia_texto) && (
                <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] rounded-lg">
                  <h4 className="text-sm font-semibold text-[#34495e] mb-2">
                    {estrategiaAtual.objetivo_principal ? 'Objetivo Principal' : 'Estratégia'}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {estrategiaAtual.objetivo_principal || estrategiaAtual.estrategia_texto}
                  </p>
                </div>
              )}

              {/* Teses Principais */}
              {estrategiaAtual.teses_principais && estrategiaAtual.teses_principais.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#34495e] mb-2">Teses Principais</h4>
                  <ul className="space-y-1">
                    {estrategiaAtual.teses_principais.map((tese, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-[#89bcbe] mt-1">•</span>
                        {tese}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Teses Subsidiárias */}
              {estrategiaAtual.teses_subsidiarias && estrategiaAtual.teses_subsidiarias.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#34495e] mb-2">Teses Subsidiárias</h4>
                  <ul className="space-y-1">
                    {estrategiaAtual.teses_subsidiarias.map((tese, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-slate-400 mt-1">•</span>
                        {tese}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cards de Pontos Fortes/Fracos/Riscos */}
              {(estrategiaAtual.pontos_fortes?.length || estrategiaAtual.pontos_fracos?.length || estrategiaAtual.riscos_identificados?.length) && (
                <div className="grid grid-cols-3 gap-4">
                  {estrategiaAtual.pontos_fortes && estrategiaAtual.pontos_fortes.length > 0 && (
                    <Card className="border-emerald-200 bg-emerald-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Pontos Fortes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {estrategiaAtual.pontos_fortes.map((ponto, i) => (
                            <li key={i} className="text-xs text-emerald-700">• {ponto.descricao}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {estrategiaAtual.pontos_fracos && estrategiaAtual.pontos_fracos.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Pontos Fracos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {estrategiaAtual.pontos_fracos.map((ponto, i) => (
                            <li key={i} className="text-xs text-amber-700">• {ponto.descricao}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {estrategiaAtual.riscos_identificados && estrategiaAtual.riscos_identificados.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Riscos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {estrategiaAtual.riscos_identificados.map((risco, i) => (
                            <li key={i} className="text-xs text-red-700">• {risco.descricao}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Próximos Passos */}
              {estrategiaAtual.proximos_passos && estrategiaAtual.proximos_passos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#34495e] mb-3">Próximos Passos</h4>
                  <div className="space-y-2">
                    {estrategiaAtual.proximos_passos.map((passo, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                        <div className="w-5 h-5 rounded bg-[#89bcbe] text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700 flex-1">{passo.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-slate-500">Selecione uma versão para visualizar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
