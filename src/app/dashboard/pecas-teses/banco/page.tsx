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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Scale,
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Tese {
  id: string
  titulo: string
  resumo: string | null
  area: string
  subtema: string | null
  texto_completo: string | null
  fundamentacao: string | null
  tags: string[]
  uso_count: number
  ativa: boolean
}

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
  texto_completo: string | null
  temas: string[]
  tags: string[]
  link_inteiro_teor: string | null
}

export default function BancoPage() {
  const [teses, setTeses] = useState<Tese[]>([])
  const [jurisprudencias, setJurisprudencias] = useState<Jurisprudencia[]>([])
  const [filteredTeses, setFilteredTeses] = useState<Tese[]>([])
  const [filteredJuris, setFilteredJuris] = useState<Jurisprudencia[]>([])

  const [searchTese, setSearchTese] = useState('')
  const [searchJuris, setSearchJuris] = useState('')
  const [filterAreaTese, setFilterAreaTese] = useState<string>('all')
  const [filterTribunalJuris, setFilterTribunalJuris] = useState<string>('all')

  const [expandedTeses, setExpandedTeses] = useState<Set<string>>(new Set())
  const [expandedJuris, setExpandedJuris] = useState<Set<string>>(new Set())

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'tese' | 'juris'; id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterTeses()
  }, [teses, searchTese, filterAreaTese])

  useEffect(() => {
    filterJuris()
  }, [jurisprudencias, searchJuris, filterTribunalJuris])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      // Load teses
      const { data: tesesData } = await supabase
        .from('pecas_teses')
        .select('*')
        .eq('escritorio_id', profile.escritorio_id)
        .order('uso_count', { ascending: false })

      setTeses(tesesData || [])

      // Load jurisprudências
      const { data: jurisData } = await supabase
        .from('pecas_jurisprudencias')
        .select('*')
        .eq('escritorio_id', profile.escritorio_id)
        .order('data_julgamento', { ascending: false, nullsFirst: false })

      setJurisprudencias(jurisData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const filterTeses = () => {
    let filtered = teses

    if (searchTese) {
      const query = searchTese.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.titulo.toLowerCase().includes(query) ||
          t.resumo?.toLowerCase().includes(query) ||
          t.texto_completo?.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    if (filterAreaTese !== 'all') {
      filtered = filtered.filter((t) => t.area === filterAreaTese)
    }

    setFilteredTeses(filtered)
  }

  const filterJuris = () => {
    let filtered = jurisprudencias

    if (searchJuris) {
      const query = searchJuris.toLowerCase()
      filtered = filtered.filter(
        (j) =>
          j.ementa?.toLowerCase().includes(query) ||
          j.numero_acordao?.toLowerCase().includes(query) ||
          j.numero_processo?.toLowerCase().includes(query) ||
          j.temas.some((tema) => tema.toLowerCase().includes(query))
      )
    }

    if (filterTribunalJuris !== 'all') {
      filtered = filtered.filter((j) => j.tribunal === filterTribunalJuris)
    }

    setFilteredJuris(filtered)
  }

  const toggleExpand = (type: 'tese' | 'juris', id: string) => {
    if (type === 'tese') {
      const newSet = new Set(expandedTeses)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      setExpandedTeses(newSet)
    } else {
      const newSet = new Set(expandedJuris)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      setExpandedJuris(newSet)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const table =
        deleteTarget.type === 'tese'
          ? 'pecas_teses'
          : 'pecas_jurisprudencias'

      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id)

      if (error) throw error

      toast.success(
        deleteTarget.type === 'tese' ? 'Tese excluída' : 'Jurisprudência excluída'
      )
      loadData()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir')
    } finally {
      setDeleteTarget(null)
    }
  }

  const getAreaLabel = (area: string) => {
    const labels: Record<string, string> = {
      civel: 'Cível',
      trabalhista: 'Trabalhista',
      tributaria: 'Tributária',
      familia: 'Família',
      criminal: 'Criminal',
      consumidor: 'Consumidor',
      empresarial: 'Empresarial',
      previdenciaria: 'Previdenciária',
      administrativa: 'Administrativa',
      outra: 'Outra',
    }
    return labels[area] || area
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
      <div>
        <h1 className="text-2xl font-bold text-[#34495e]">
          Banco de Conhecimento
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerencie teses jurídicas e jurisprudências reutilizáveis
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teses" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="teses" className="gap-2">
            <Scale className="w-4 h-4" />
            Teses ({filteredTeses.length})
          </TabsTrigger>
          <TabsTrigger value="jurisprudencias" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Jurisprudências ({filteredJuris.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB: TESES */}
        <TabsContent value="teses" className="space-y-4">
          {/* Filters */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por título, resumo, texto ou tags..."
                    value={searchTese}
                    onChange={(e) => setSearchTese(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
                <Select value={filterAreaTese} onValueChange={setFilterAreaTese}>
                  <SelectTrigger className="w-48 border-slate-200">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as áreas</SelectItem>
                    <SelectItem value="civel">Cível</SelectItem>
                    <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    <SelectItem value="tributaria">Tributária</SelectItem>
                    <SelectItem value="familia">Família</SelectItem>
                    <SelectItem value="criminal">Criminal</SelectItem>
                  </SelectContent>
                </Select>
                <Link href="/dashboard/pecas-teses/teses/nova">
                  <Button className="bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Tese
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Teses List */}
          {filteredTeses.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma tese encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTeses.map((tese) => {
                const isExpanded = expandedTeses.has(tese.id)
                return (
                  <Card
                    key={tese.id}
                    className={`border-slate-200 ${!tese.ativa ? 'opacity-60' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-semibold text-[#34495e]">
                                {tese.titulo}
                              </h3>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 bg-[#89bcbe]/10 text-[#34495e] border-[#89bcbe]/30"
                              >
                                {getAreaLabel(tese.area)}
                              </Badge>
                              {tese.subtema && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  {tese.subtema}
                                </Badge>
                              )}
                              {!tese.ativa && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-slate-100">
                                  Inativa
                                </Badge>
                              )}
                            </div>
                            {tese.resumo && !isExpanded && (
                              <p className="text-sm text-slate-600 line-clamp-2">
                                {tese.resumo}
                              </p>
                            )}
                            {tese.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {tese.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-500">
                              {tese.uso_count} {tese.uso_count === 1 ? 'uso' : 'usos'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand('tese', tese.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            <Link href={`/dashboard/pecas-teses/teses/${tese.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ type: 'tese', id: tese.id })}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-slate-200">
                            {tese.resumo && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">Resumo:</p>
                                <p className="text-sm text-slate-600">{tese.resumo}</p>
                              </div>
                            )}
                            {tese.texto_completo && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">Texto Completo:</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                  {tese.texto_completo}
                                </p>
                              </div>
                            )}
                            {tese.fundamentacao && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">Fundamentação:</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                  {tese.fundamentacao}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB: JURISPRUDÊNCIAS */}
        <TabsContent value="jurisprudencias" className="space-y-4">
          {/* Filters */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por ementa, número, temas..."
                    value={searchJuris}
                    onChange={(e) => setSearchJuris(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
                <Select
                  value={filterTribunalJuris}
                  onValueChange={setFilterTribunalJuris}
                >
                  <SelectTrigger className="w-48 border-slate-200">
                    <SelectValue placeholder="Tribunal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tribunais</SelectItem>
                    <SelectItem value="STF">STF</SelectItem>
                    <SelectItem value="STJ">STJ</SelectItem>
                    <SelectItem value="TST">TST</SelectItem>
                    <SelectItem value="TJSP">TJSP</SelectItem>
                    <SelectItem value="TRT">TRT</SelectItem>
                  </SelectContent>
                </Select>
                <Link href="/dashboard/pecas-teses/jurisprudencias/nova">
                  <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Jurisprudência
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Jurisprudências List */}
          {filteredJuris.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma jurisprudência encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredJuris.map((juris) => {
                const isExpanded = expandedJuris.has(juris.id)
                return (
                  <Card key={juris.id} className="border-slate-200">
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 bg-[#34495e]/10 text-[#34495e] font-medium"
                              >
                                {juris.tribunal}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                {getTipoLabel(juris.tipo)}
                              </Badge>
                              {juris.numero_acordao && (
                                <span className="text-xs text-slate-500">
                                  {juris.numero_acordao}
                                </span>
                              )}
                              {juris.data_julgamento && (
                                <span className="text-xs text-slate-400">
                                  •{' '}
                                  {new Date(juris.data_julgamento).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            {juris.ementa && (
                              <p className={`text-sm text-slate-700 ${!isExpanded && 'line-clamp-3'}`}>
                                {juris.ementa}
                              </p>
                            )}
                            {juris.temas.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {juris.temas.map((tema) => (
                                  <Badge
                                    key={tema}
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    {tema}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {juris.link_inteiro_teor && (
                              <a
                                href={juris.link_inteiro_teor}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="w-4 h-4 text-[#89bcbe]" />
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand('juris', juris.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            <Link href={`/dashboard/pecas-teses/jurisprudencias/${juris.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({ type: 'juris', id: juris.id })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-slate-200">
                            {juris.orgao_julgador && (
                              <p className="text-xs text-slate-600">
                                <strong>Órgão:</strong> {juris.orgao_julgador}
                              </p>
                            )}
                            {juris.relator && (
                              <p className="text-xs text-slate-600">
                                <strong>Relator:</strong> {juris.relator}
                              </p>
                            )}
                            {juris.texto_completo && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">
                                  Texto Completo:
                                </p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                  {juris.texto_completo}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta{' '}
              {deleteTarget?.type === 'tese' ? 'tese' : 'jurisprudência'}? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
