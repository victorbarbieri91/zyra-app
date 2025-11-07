'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Plus, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Jurisprudencia {
  id: string
  tribunal: string
  tipo: string
  numero_acordao: string | null
  numero_processo: string | null
  data_julgamento: string | null
  orgao_julgador: string | null
  relator: string | null
  ementa: string | null
  temas: string[]
  tags: string[]
  link_inteiro_teor: string | null
  created_at: string
}

export default function JurisprudenciasPage() {
  const [jurisprudencias, setJurisprudencias] = useState<Jurisprudencia[]>([])
  const [filteredJuris, setFilteredJuris] = useState<Jurisprudencia[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTribunal, setSelectedTribunal] = useState<string>('all')
  const [selectedTipo, setSelectedTipo] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadJurisprudencias()
  }, [])

  useEffect(() => {
    filterJurisprudencias()
  }, [jurisprudencias, searchQuery, selectedTribunal, selectedTipo])

  const loadJurisprudencias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data, error } = await supabase
        .from('pecas_teses_jurisprudencias')
        .select('*')
        .eq('escritorio_id', profile.escritorio_id)
        .order('data_julgamento', { ascending: false, nullsFirst: false })

      if (error) throw error

      setJurisprudencias(data || [])
    } catch (error) {
      console.error('Erro ao carregar jurisprudências:', error)
      toast.error('Erro ao carregar jurisprudências')
    } finally {
      setLoading(false)
    }
  }

  const filterJurisprudencias = () => {
    let filtered = jurisprudencias

    if (searchQuery) {
      filtered = filtered.filter(
        (j) =>
          j.ementa?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.numero_acordao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.numero_processo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.temas.some((tema) =>
            tema.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    }

    if (selectedTribunal !== 'all') {
      filtered = filtered.filter((j) => j.tribunal === selectedTribunal)
    }

    if (selectedTipo !== 'all') {
      filtered = filtered.filter((j) => j.tipo === selectedTipo)
    }

    setFilteredJuris(filtered)
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      acordao: 'Acórdão',
      decisao_monocratica: 'Decisão Monocrática',
      sumula: 'Súmula',
      outro: 'Outro',
    }
    return labels[tipo] || tipo
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">
            Banco de Jurisprudências
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie jurisprudências e acórdãos relevantes
          </p>
        </div>
        <Link href="/dashboard/pecas-teses/jurisprudencias/nova">
          <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Jurisprudência
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por ementa, número, tema..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>
            <Select value={selectedTribunal} onValueChange={setSelectedTribunal}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Tribunal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tribunais</SelectItem>
                <SelectItem value="STF">STF</SelectItem>
                <SelectItem value="STJ">STJ</SelectItem>
                <SelectItem value="TST">TST</SelectItem>
                <SelectItem value="TJSP">TJSP</SelectItem>
                <SelectItem value="TRT">TRT</SelectItem>
                <SelectItem value="TRF">TRF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="acordao">Acórdão</SelectItem>
                <SelectItem value="decisao_monocratica">
                  Decisão Monocrática
                </SelectItem>
                <SelectItem value="sumula">Súmula</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jurisprudências List */}
      {filteredJuris.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {jurisprudencias.length === 0
                  ? 'Nenhuma jurisprudência cadastrada ainda'
                  : 'Nenhuma jurisprudência encontrada com os filtros aplicados'}
              </p>
              {jurisprudencias.length === 0 && (
                <Link href="/dashboard/pecas-teses/jurisprudencias/nova">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Jurisprudência
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJuris.map((juris) => (
            <Link
              key={juris.id}
              href={`/dashboard/pecas-teses/jurisprudencias/${juris.id}`}
            >
              <Card className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 bg-[#34495e]/10 text-[#34495e] font-medium"
                        >
                          {juris.tribunal}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {getTipoLabel(juris.tipo)}
                        </Badge>
                        {juris.numero_acordao && (
                          <span className="text-xs text-slate-500">
                            {juris.numero_acordao}
                          </span>
                        )}
                        {juris.data_julgamento && (
                          <span className="text-xs text-slate-400">
                            • {formatDate(juris.data_julgamento)}
                          </span>
                        )}
                      </div>

                      {juris.ementa && (
                        <p className="text-sm text-slate-700 line-clamp-3 mb-2">
                          {juris.ementa}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        {juris.orgao_julgador && (
                          <span className="text-xs text-slate-500">
                            {juris.orgao_julgador}
                          </span>
                        )}
                        {juris.relator && (
                          <span className="text-xs text-slate-500">
                            • Rel. {juris.relator}
                          </span>
                        )}
                      </div>

                      {juris.temas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {juris.temas.slice(0, 5).map((tema) => (
                            <Badge
                              key={tema}
                              variant="outline"
                              className="text-[10px] px-2 py-0.5"
                            >
                              {tema}
                            </Badge>
                          ))}
                          {juris.temas.length > 5 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5"
                            >
                              +{juris.temas.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {juris.link_inteiro_teor && (
                      <div className="shrink-0">
                        <a
                          href={juris.link_inteiro_teor}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#89bcbe] hover:text-[#6ba9ab]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
