'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Scale, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Tese {
  id: string
  titulo: string
  resumo: string | null
  area: string
  subtema: string | null
  tags: string[]
  uso_count: number
  ativa: boolean
  created_at: string
}

export default function TesesPage() {
  const [teses, setTeses] = useState<Tese[]>([])
  const [filteredTeses, setFilteredTeses] = useState<Tese[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadTeses()
  }, [])

  useEffect(() => {
    filterTeses()
  }, [teses, searchQuery, selectedArea])

  const loadTeses = async () => {
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
        .from('pecas_teses_teses')
        .select('*')
        .eq('escritorio_id', profile.escritorio_id)
        .order('uso_count', { ascending: false })

      if (error) throw error

      setTeses(data || [])
    } catch (error) {
      console.error('Erro ao carregar teses:', error)
      toast.error('Erro ao carregar teses')
    } finally {
      setLoading(false)
    }
  }

  const filterTeses = () => {
    let filtered = teses

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.resumo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    }

    if (selectedArea !== 'all') {
      filtered = filtered.filter((t) => t.area === selectedArea)
    }

    setFilteredTeses(filtered)
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
          <h1 className="text-2xl font-bold text-[#34495e]">Banco de Teses</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie teses jurídicas reutilizáveis
          </p>
        </div>
        <Link href="/dashboard/pecas-teses/teses/nova">
          <Button className="bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tese
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título, resumo ou tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                <SelectItem value="civel">Cível</SelectItem>
                <SelectItem value="trabalhista">Trabalhista</SelectItem>
                <SelectItem value="tributaria">Tributária</SelectItem>
                <SelectItem value="familia">Família</SelectItem>
                <SelectItem value="criminal">Criminal</SelectItem>
                <SelectItem value="consumidor">Consumidor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teses Grid */}
      {filteredTeses.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {teses.length === 0
                  ? 'Nenhuma tese cadastrada ainda'
                  : 'Nenhuma tese encontrada com os filtros aplicados'}
              </p>
              {teses.length === 0 && (
                <Link href="/dashboard/pecas-teses/teses/nova">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Tese
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTeses.map((tese) => (
            <Link key={tese.id} href={`/dashboard/pecas-teses/teses/${tese.id}`}>
              <Card className={`border-slate-200 hover:shadow-md transition-shadow ${
                !tese.ativa ? 'opacity-60' : ''
              }`}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold text-[#34495e] mb-2">
                        {tese.titulo}
                      </CardTitle>
                      {tese.resumo && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                          {tese.resumo}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 bg-[#89bcbe]/10 text-[#34495e] border-[#89bcbe]/30"
                        >
                          {getAreaLabel(tese.area)}
                        </Badge>
                        {tese.subtema && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5"
                          >
                            {tese.subtema}
                          </Badge>
                        )}
                        {tese.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] px-2 py-0.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tese.tags.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5"
                          >
                            +{tese.tags.length - 3}
                          </Badge>
                        )}
                        {!tese.ativa && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 bg-slate-100"
                          >
                            Inativa
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-slate-500">
                        {tese.uso_count} {tese.uso_count === 1 ? 'uso' : 'usos'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(tese.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
