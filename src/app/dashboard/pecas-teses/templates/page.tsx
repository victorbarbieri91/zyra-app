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
import { FileText, Plus, Search, Copy, Edit, MoreVertical, Scale, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Template {
  id: string
  nome: string
  categoria: string
  area: string
  tipo_processo: string | null
  uso_count: number
  ativo: boolean
  total_teses_vinculadas?: number
  total_juris_vinculadas?: number
  created_at: string
  estrutura?: any
  variaveis?: any
  conteudo_template?: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, selectedCategoria, selectedArea])

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data, error} = await supabase
        .from('v_pecas_templates_completos')
        .select('*')
        .eq('escritorio_id', profile.escritorio_id)
        .order('uso_count', { ascending: false })

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.nome.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategoria !== 'all') {
      filtered = filtered.filter((t) => t.categoria === selectedCategoria)
    }

    if (selectedArea !== 'all') {
      filtered = filtered.filter((t) => t.area === selectedArea)
    }

    setFilteredTemplates(filtered)
  }

  const handleDuplicate = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId)
      if (!template) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { error } = await supabase.from('pecas_templates').insert({
        escritorio_id: profile.escritorio_id,
        nome: `${template.nome} (Cópia)`,
        categoria: template.categoria,
        area: template.area,
        tipo_processo: template.tipo_processo,
        estrutura: template.estrutura,
        variaveis: template.variaveis,
        conteudo_template: template.conteudo_template,
        criado_por: user.id,
      })

      if (error) throw error

      toast.success('Template duplicado com sucesso')
      loadTemplates()
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
      toast.error('Erro ao duplicar template')
    }
  }

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pecas_templates')
        .update({ ativo: !currentStatus })
        .eq('id', templateId)

      if (error) throw error

      toast.success(
        currentStatus ? 'Template desativado' : 'Template ativado'
      )
      loadTemplates()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do template')
    }
  }

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      peticao_inicial: 'Petição Inicial',
      contestacao: 'Contestação',
      recurso: 'Recurso',
      apelacao: 'Apelação',
      agravo: 'Agravo',
      embargos: 'Embargos',
      replica: 'Réplica',
      impugnacao: 'Impugnação',
      alegacoes_finais: 'Alegações Finais',
      memoriais: 'Memoriais',
      contrarrazoes: 'Contrarrazões',
      habeas_corpus: 'Habeas Corpus',
      mandado_seguranca: 'Mandado de Segurança',
      outro: 'Outro',
    }
    return labels[categoria] || categoria
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
          <h1 className="text-2xl font-bold text-[#34495e]">Templates de Peças</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie seus modelos de peças processuais
          </p>
        </div>
        <Link href="/dashboard/pecas-teses/templates/novo">
          <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
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
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="peticao_inicial">Petição Inicial</SelectItem>
                <SelectItem value="contestacao">Contestação</SelectItem>
                <SelectItem value="recurso">Recurso</SelectItem>
                <SelectItem value="apelacao">Apelação</SelectItem>
                <SelectItem value="agravo">Agravo</SelectItem>
                <SelectItem value="embargos">Embargos</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {templates.length === 0
                  ? 'Nenhum template cadastrado ainda'
                  : 'Nenhum template encontrado com os filtros aplicados'}
              </p>
              {templates.length === 0 && (
                <Link href="/dashboard/pecas-teses/templates/novo">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Template
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`border-slate-200 ${
                !template.ativo ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold text-[#34495e] mb-2">
                      {template.nome}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        {getCategoriaLabel(template.categoria)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        {getAreaLabel(template.area)}
                      </Badge>
                      {!template.ativo && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 bg-slate-100"
                        >
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/dashboard/pecas-teses/templates/${template.id}`}>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(template.id, template.ativo)}
                      >
                        {template.ativo ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Scale className="w-3 h-3" />
                    <span>
                      {template.total_teses_vinculadas || 0}{' '}
                      {(template.total_teses_vinculadas || 0) === 1 ? 'tese' : 'teses'}
                    </span>
                    <span>•</span>
                    <BookOpen className="w-3 h-3" />
                    <span>
                      {template.total_juris_vinculadas || 0} juris
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {template.uso_count} {template.uso_count === 1 ? 'uso' : 'usos'}
                    </span>
                    <span>
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
