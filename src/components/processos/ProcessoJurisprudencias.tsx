'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink, FileText, Copy, Loader2, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate } from '@/lib/timezone'

interface Jurisprudencia {
  id: string
  tribunal: string
  tipo: string | null
  numero_acordao: string | null
  numero_processo: string | null
  data_julgamento: string | null
  relator: string | null
  ementa: string
  resultado: 'favoravel' | 'desfavoravel' | 'parcial' | 'neutro' | null
  relevancia: 'alta' | 'media' | 'baixa'
  teses_aplicadas: string[] | null
  aplicada_em_peca: boolean
  link_inteiro_teor: string | null
  created_at: string
}

interface ProcessoJurisprudenciasProps {
  processoId: string
}

export default function ProcessoJurisprudencias({ processoId }: ProcessoJurisprudenciasProps) {
  const supabase = createClient()
  const [jurisprudencias, setJurisprudencias] = useState<Jurisprudencia[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar jurisprudências do processo
  const loadJurisprudencias = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('processos_jurisprudencias')
        .select('*')
        .eq('processo_id', processoId)
        .order('relevancia', { ascending: true })
        .order('data_julgamento', { ascending: false })

      if (error) throw error
      setJurisprudencias(data || [])
    } catch (error) {
      console.error('Erro ao carregar jurisprudências:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (processoId) {
      loadJurisprudencias()
    }
  }, [processoId])

  const getBadgeRelevancia = (relevancia: string) => {
    const styles = {
      alta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      media: 'bg-amber-100 text-amber-700 border-amber-200',
      baixa: 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return styles[relevancia as keyof typeof styles] || styles.media
  }

  const getResultadoBadge = (resultado: string | null) => {
    switch (resultado) {
      case 'favoravel':
        return <Badge className="text-[10px] bg-emerald-600 text-white">✓ Favorável</Badge>
      case 'desfavoravel':
        return <Badge className="text-[10px] bg-red-600 text-white">✗ Contrária</Badge>
      case 'parcial':
        return <Badge className="text-[10px] bg-amber-600 text-white">± Parcial</Badge>
      default:
        return null
    }
  }

  // Filtrar por busca
  const jurisprudenciasFiltradas = jurisprudencias.filter(j =>
    !searchTerm ||
    j.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.tribunal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.teses_aplicadas?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  return (
    <div className="space-y-6">
      {/* Barra de Ações */}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#89bcbe]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {jurisprudencias.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Nenhuma jurisprudência cadastrada</p>
            <p className="text-xs text-slate-500 mb-4">
              Adicione jurisprudências relevantes para embasar o caso
            </p>
            <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Jurisprudência
            </Button>
          </CardContent>
        </Card>
      ) : jurisprudenciasFiltradas.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">Nenhuma jurisprudência encontrada para "{searchTerm}"</p>
          </CardContent>
        </Card>
      ) : (
        /* Lista de Jurisprudências */
        <div className="space-y-4">
          {jurisprudenciasFiltradas.map(jurisp => (
            <Card key={jurisp.id} className="border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-[10px] border ${getBadgeRelevancia(jurisp.relevancia)}`}>
                        Relevância {jurisp.relevancia}
                      </Badge>
                      {getResultadoBadge(jurisp.resultado)}
                      {jurisp.aplicada_em_peca && (
                        <Badge className="text-[10px] bg-blue-600 text-white">
                          Citada em peça
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[#34495e] mb-1">
                      {jurisp.tribunal}
                      {jurisp.numero_acordao && ` - ${jurisp.numero_acordao}`}
                      {!jurisp.numero_acordao && jurisp.numero_processo && ` - ${jurisp.numero_processo}`}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {jurisp.relator && `Rel. ${jurisp.relator}`}
                      {jurisp.relator && jurisp.data_julgamento && ' | '}
                      {jurisp.data_julgamento && formatBrazilDate(jurisp.data_julgamento)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[#46627f] mb-1">EMENTA:</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{jurisp.ementa}</p>
                </div>

                {jurisp.teses_aplicadas && jurisp.teses_aplicadas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#46627f] mb-2">Teses Aplicadas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {jurisp.teses_aplicadas.map((tese, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {tese}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {jurisp.link_inteiro_teor && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => window.open(jurisp.link_inteiro_teor!, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Ver Fonte
                    </Button>
                  )}
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
      )}
    </div>
  )
}
