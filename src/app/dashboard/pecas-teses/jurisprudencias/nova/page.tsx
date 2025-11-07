'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function NovaJurisprudenciaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    tribunal: '',
    tipo: '',
    numero_acordao: '',
    numero_processo: '',
    data_julgamento: '',
    data_publicacao: '',
    orgao_julgador: '',
    relator: '',
    ementa: '',
    texto_completo: '',
    link_inteiro_teor: '',
    link_consulta: '',
    temas: [] as string[],
    tags: [] as string[],
  })
  const [temaInput, setTemaInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddTema = () => {
    if (temaInput.trim() && !formData.temas.includes(temaInput.trim())) {
      setFormData({
        ...formData,
        temas: [...formData.temas, temaInput.trim()],
      })
      setTemaInput('')
    }
  }

  const handleRemoveTema = (tema: string) => {
    setFormData({
      ...formData,
      temas: formData.temas.filter((t) => t !== tema),
    })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Usuário não autenticado')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        toast.error('Perfil não encontrado')
        return
      }

      const { error } = await supabase.from('pecas_jurisprudencias').insert({
        escritorio_id: profile.escritorio_id,
        tribunal: formData.tribunal,
        tipo: formData.tipo,
        numero_acordao: formData.numero_acordao || null,
        numero_processo: formData.numero_processo || null,
        data_julgamento: formData.data_julgamento || null,
        data_publicacao: formData.data_publicacao || null,
        orgao_julgador: formData.orgao_julgador || null,
        relator: formData.relator || null,
        ementa: formData.ementa || null,
        texto_completo: formData.texto_completo || null,
        link_inteiro_teor: formData.link_inteiro_teor || null,
        link_consulta: formData.link_consulta || null,
        temas: formData.temas,
        tags: formData.tags,
        adicionado_por: user.id,
      })

      if (error) throw error

      toast.success('Jurisprudência adicionada com sucesso')
      router.push('/dashboard/pecas-teses/jurisprudencias')
    } catch (error) {
      console.error('Erro ao adicionar jurisprudência:', error)
      toast.error('Erro ao adicionar jurisprudência')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pecas-teses/jurisprudencias">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">
            Nova Jurisprudência
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Adicione um acórdão ou jurisprudência ao banco
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Informações da Jurisprudência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tribunal">Tribunal *</Label>
                <Input
                  id="tribunal"
                  placeholder="Ex: STF, STJ, TJSP, TST"
                  value={formData.tribunal}
                  onChange={(e) =>
                    setFormData({ ...formData, tribunal: e.target.value })
                  }
                  required
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value })
                  }
                  required
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acordao">Acórdão</SelectItem>
                    <SelectItem value="decisao_monocratica">
                      Decisão Monocrática
                    </SelectItem>
                    <SelectItem value="sumula">Súmula</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_acordao">Número do Acórdão</Label>
                <Input
                  id="numero_acordao"
                  placeholder="Ex: 123456"
                  value={formData.numero_acordao}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_acordao: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_processo">Número do Processo</Label>
                <Input
                  id="numero_processo"
                  placeholder="Ex: 0000000-00.2023.0.00.0000"
                  value={formData.numero_processo}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_processo: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_julgamento">Data do Julgamento</Label>
                <Input
                  id="data_julgamento"
                  type="date"
                  value={formData.data_julgamento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_julgamento: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_publicacao">Data da Publicação</Label>
                <Input
                  id="data_publicacao"
                  type="date"
                  value={formData.data_publicacao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_publicacao: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgao_julgador">Órgão Julgador</Label>
                <Input
                  id="orgao_julgador"
                  placeholder="Ex: 1ª Turma, 2ª Câmara de Direito Privado"
                  value={formData.orgao_julgador}
                  onChange={(e) =>
                    setFormData({ ...formData, orgao_julgador: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relator">Relator</Label>
                <Input
                  id="relator"
                  placeholder="Ex: Min. Fulano de Tal"
                  value={formData.relator}
                  onChange={(e) =>
                    setFormData({ ...formData, relator: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ementa">Ementa</Label>
              <Textarea
                id="ementa"
                placeholder="Cole a ementa da jurisprudência aqui..."
                value={formData.ementa}
                onChange={(e) =>
                  setFormData({ ...formData, ementa: e.target.value })
                }
                className="min-h-[150px] border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="texto_completo">Texto Completo (Opcional)</Label>
              <Textarea
                id="texto_completo"
                placeholder="Texto completo do acórdão ou decisão..."
                value={formData.texto_completo}
                onChange={(e) =>
                  setFormData({ ...formData, texto_completo: e.target.value })
                }
                className="min-h-[200px] border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link_inteiro_teor">Link Inteiro Teor</Label>
                <Input
                  id="link_inteiro_teor"
                  type="url"
                  placeholder="https://..."
                  value={formData.link_inteiro_teor}
                  onChange={(e) =>
                    setFormData({ ...formData, link_inteiro_teor: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link_consulta">Link Consulta</Label>
                <Input
                  id="link_consulta"
                  type="url"
                  placeholder="https://..."
                  value={formData.link_consulta}
                  onChange={(e) =>
                    setFormData({ ...formData, link_consulta: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temas">Temas</Label>
              <div className="flex gap-2">
                <Input
                  id="temas"
                  placeholder="Ex: Prescrição, Responsabilidade Civil"
                  value={temaInput}
                  onChange={(e) => setTemaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTema()
                    }
                  }}
                  className="border-slate-200"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTema}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.temas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.temas.map((tema) => (
                    <Badge
                      key={tema}
                      variant="outline"
                      className="text-xs px-2 py-1 gap-1"
                    >
                      {tema}
                      <button
                        type="button"
                        onClick={() => handleRemoveTema(tema)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Digite uma tag e pressione Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="border-slate-200"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs px-2 py-1 gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/pecas-teses/jurisprudencias">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white hover:opacity-90"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Jurisprudência'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
