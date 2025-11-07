'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink, FileText, Copy } from 'lucide-react'

interface ProcessoJurisprudenciasProps {
  processoId: string
}

export default function ProcessoJurisprudencias({ processoId }: ProcessoJurisprudenciasProps) {
  const jurisprudencias = [
    {
      id: '1',
      tribunal: 'TST',
      numero_acordao: 'RR-123456-78.2023.5.02.0001',
      relator: 'Min. João Silva',
      data_julgamento: '28/05/2023',
      ementa: 'RESCISÃO INDIRETA. ASSÉDIO MORAL. CONFIGURAÇÃO. Comprovado o assédio moral através de testemunhas e laudos médicos, é devida a rescisão indireta do contrato de trabalho com pagamento de todas as verbas rescisórias.',
      palavras_chave: ['rescisão indireta', 'assédio moral', 'verbas rescisórias'],
      relevancia: 'alta',
      favoravel: true,
      citada_em_peca: true,
      link: 'https://...'
    },
    {
      id: '2',
      tribunal: 'TRT 2ª Região',
      numero_acordao: 'RO-98765-43.2022.5.02.0100',
      relator: 'Des. Maria Santos',
      data_julgamento: '15/03/2023',
      ementa: 'DANOS MORAIS. ASSÉDIO MORAL. QUANTUM INDENIZATÓRIO. O valor da indenização por danos morais deve considerar a gravidade da conduta, capacidade econômica do ofensor e extensão do dano.',
      palavras_chave: ['danos morais', 'quantum', 'assédio moral'],
      relevancia: 'alta',
      favoravel: true,
      citada_em_peca: false,
      link: 'https://...'
    }
  ]

  const getBadgeRelevancia = (relevancia: string) => {
    const styles = {
      alta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      media: 'bg-amber-100 text-amber-700 border-amber-200',
      baixa: 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return styles[relevancia as keyof typeof styles] || styles.alta
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Jurisprudência
            </Button>
            <input
              type="text"
              placeholder="Buscar por palavra-chave..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#89bcbe]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {jurisprudencias.map(jurisp => (
          <Card key={jurisp.id} className="border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-[10px] border ${getBadgeRelevancia(jurisp.relevancia)}`}>
                      Relevância {jurisp.relevancia}
                    </Badge>
                    {jurisp.favoravel ? (
                      <Badge className="text-[10px] bg-emerald-600 text-white">
                        ✓ Favorável
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-red-600 text-white">
                        ✗ Contrária
                      </Badge>
                    )}
                    {jurisp.citada_em_peca && (
                      <Badge className="text-[10px] bg-blue-600 text-white">
                        Citada em peça
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[#34495e] mb-1">
                    {jurisp.tribunal} - {jurisp.numero_acordao}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Rel. {jurisp.relator} | {jurisp.data_julgamento}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#46627f] mb-1">EMENTA:</p>
                <p className="text-sm text-slate-700 leading-relaxed">{jurisp.ementa}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#46627f] mb-2">Palavras-chave:</p>
                <div className="flex flex-wrap gap-1.5">
                  {jurisp.palavras_chave.map((palavra, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {palavra}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver Fonte
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar ABNT
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Citar em Peça
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
