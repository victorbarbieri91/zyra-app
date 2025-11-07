'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ProcessoEstrategiaProps {
  processoId: string
}

export default function ProcessoEstrategia({ processoId }: ProcessoEstrategiaProps) {
  const [versaoAtual, setVersaoAtual] = useState('2')

  const versoes = [
    { id: '2', data: '03/01/2025', atual: true },
    { id: '1', data: '15/12/2024', atual: false }
  ]

  const estrategiaAtual = {
    resumo_caso: 'Ação trabalhista de rescisão indireta com pedido de verbas rescisórias e indenização por danos morais. Alega assédio moral e condições degradantes de trabalho.',
    tese_principal: 'Rescisão indireta do contrato de trabalho por falta grave do empregador (art. 483, CLT), com base em condutas de assédio moral comprovadas por testemunhas e laudos médicos.',
    teses_alternativas: [
      'Subsidiariamente, reconhecimento de dispensa sem justa causa',
      'Pedido alternativo de indenização por danos morais independente da rescisão'
    ],
    pontos_fortes: [
      'Testemunhas presenciais do assédio',
      'Laudos médicos atestando nexo causal',
      'Jurisprudência consolidada favorável'
    ],
    pontos_fracos: [
      'Ausência de registro escrito de reclamações internas',
      'Testemunhas são ex-colegas (possível parcialidade)'
    ],
    riscos: [
      'Sentença parcialmente procedente (valores reduzidos)',
      'Necessidade de recurso prolongando o processo'
    ],
    proximos_passos: [
      'Aguardar prazo para recurso',
      'Analisar viabilidade de acordo',
      'Preparar contrarrazões se necessário'
    ]
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar Versões */}
      <div className="col-span-3 space-y-3">
        <Button className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f]">
          <Plus className="w-4 h-4 mr-2" />
          Nova Versão
        </Button>
        {versoes.map(v => (
          <Card
            key={v.id}
            className={`cursor-pointer transition-all ${
              v.id === versaoAtual
                ? 'border-[#89bcbe] shadow-lg'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setVersaoAtual(v.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[#34495e]">Versão {v.id}</span>
                {v.atual && <Badge className="text-[10px] bg-emerald-600">Atual</Badge>}
              </div>
              <p className="text-xs text-slate-600">{v.data}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conteúdo da Estratégia */}
      <div className="col-span-9 space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-[#34495e]">
                Estratégia - Versão {versaoAtual}
              </CardTitle>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-[#34495e] mb-2">Resumo do Caso</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{estrategiaAtual.resumo_caso}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] rounded-lg">
              <h4 className="text-sm font-semibold text-[#34495e] mb-2">Tese Principal</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{estrategiaAtual.tese_principal}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[#34495e] mb-2">Teses Alternativas</h4>
              <ul className="space-y-1">
                {estrategiaAtual.teses_alternativas.map((tese, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-[#89bcbe] mt-1">•</span>
                    {tese}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                      <li key={i} className="text-xs text-emerald-700">• {ponto}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

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
                      <li key={i} className="text-xs text-amber-700">• {ponto}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Riscos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {estrategiaAtual.riscos.map((risco, i) => (
                      <li key={i} className="text-xs text-red-700">• {risco}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[#34495e] mb-3">Próximos Passos</h4>
              <div className="space-y-2">
                {estrategiaAtual.proximos_passos.map((passo, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                    <div className="w-5 h-5 rounded bg-[#89bcbe] text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-700 flex-1">{passo}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
