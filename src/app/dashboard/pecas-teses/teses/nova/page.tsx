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

export default function NovaTestePage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    area: '',
    subtema: '',
    texto_completo: '',
    fundamentacao: '',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

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

      const { error } = await supabase.from('pecas_teses').insert({
        escritorio_id: profile.escritorio_id,
        titulo: formData.titulo,
        resumo: formData.resumo || null,
        area: formData.area,
        subtema: formData.subtema || null,
        texto_completo: formData.texto_completo || null,
        fundamentacao: formData.fundamentacao || null,
        tags: formData.tags,
        criado_por: user.id,
      })

      if (error) throw error

      toast.success('Tese criada com sucesso')
      router.push('/dashboard/pecas-teses/teses')
    } catch (error) {
      console.error('Erro ao criar tese:', error)
      toast.error('Erro ao criar tese')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pecas-teses/teses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">Nova Tese</h1>
          <p className="text-sm text-slate-600 mt-1">
            Adicione uma nova tese jurídica ao banco
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Informações da Tese
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Tese *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Prescrição Intercorrente - Aplicação ao Direito Tributário"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                required
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumo">Resumo</Label>
              <Textarea
                id="resumo"
                placeholder="Breve resumo da tese em 2-3 linhas"
                value={formData.resumo}
                onChange={(e) =>
                  setFormData({ ...formData, resumo: e.target.value })
                }
                className="border-slate-200 h-20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) =>
                    setFormData({ ...formData, area: value })
                  }
                  required
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civel">Cível</SelectItem>
                    <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    <SelectItem value="tributaria">Tributária</SelectItem>
                    <SelectItem value="familia">Família</SelectItem>
                    <SelectItem value="criminal">Criminal</SelectItem>
                    <SelectItem value="consumidor">Consumidor</SelectItem>
                    <SelectItem value="empresarial">Empresarial</SelectItem>
                    <SelectItem value="previdenciaria">Previdenciária</SelectItem>
                    <SelectItem value="administrativa">Administrativa</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtema">Subtema</Label>
                <Input
                  id="subtema"
                  placeholder="Ex: Prescrição, Responsabilidade Civil"
                  value={formData.subtema}
                  onChange={(e) =>
                    setFormData({ ...formData, subtema: e.target.value })
                  }
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="texto_completo">Texto Completo da Tese</Label>
              <Textarea
                id="texto_completo"
                placeholder="Desenvolvimento completo da tese jurídica..."
                value={formData.texto_completo}
                onChange={(e) =>
                  setFormData({ ...formData, texto_completo: e.target.value })
                }
                className="min-h-[200px] border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundamentacao">Fundamentação</Label>
              <Textarea
                id="fundamentacao"
                placeholder="Base legal, doutrinária e jurisprudencial..."
                value={formData.fundamentacao}
                onChange={(e) =>
                  setFormData({ ...formData, fundamentacao: e.target.value })
                }
                className="min-h-[150px] border-slate-200"
              />
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
          <Link href="/dashboard/pecas-teses/teses">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white hover:opacity-90"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Tese'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
