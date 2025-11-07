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
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function NovoTemplatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    area: '',
    tipo_processo: '',
    conteudo_template: '',
  })
  const [loading, setLoading] = useState(false)

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

      const { error } = await supabase.from('pecas_templates').insert({
        escritorio_id: profile.escritorio_id,
        nome: formData.nome,
        categoria: formData.categoria,
        area: formData.area,
        tipo_processo: formData.tipo_processo || null,
        conteudo_template: formData.conteudo_template,
        criado_por: user.id,
      })

      if (error) throw error

      toast.success('Template criado com sucesso')
      router.push('/dashboard/pecas-teses/templates')
    } catch (error) {
      console.error('Erro ao criar template:', error)
      toast.error('Erro ao criar template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pecas-teses/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#34495e]">Novo Template</h1>
          <p className="text-sm text-slate-600 mt-1">
            Crie um novo modelo de peça processual
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Informações do Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Template *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Petição Inicial - Ação de Cobrança"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoria: value })
                  }
                  required
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peticao_inicial">Petição Inicial</SelectItem>
                    <SelectItem value="contestacao">Contestação</SelectItem>
                    <SelectItem value="recurso">Recurso</SelectItem>
                    <SelectItem value="apelacao">Apelação</SelectItem>
                    <SelectItem value="agravo">Agravo</SelectItem>
                    <SelectItem value="embargos">Embargos</SelectItem>
                    <SelectItem value="replica">Réplica</SelectItem>
                    <SelectItem value="impugnacao">Impugnação</SelectItem>
                    <SelectItem value="alegacoes_finais">Alegações Finais</SelectItem>
                    <SelectItem value="memoriais">Memoriais</SelectItem>
                    <SelectItem value="contrarrazoes">Contrarrazões</SelectItem>
                    <SelectItem value="habeas_corpus">Habeas Corpus</SelectItem>
                    <SelectItem value="mandado_seguranca">Mandado de Segurança</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="tipo_processo">Tipo de Processo</Label>
                <Select
                  value={formData.tipo_processo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_processo: value })
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conhecimento">Conhecimento</SelectItem>
                    <SelectItem value="execucao">Execução</SelectItem>
                    <SelectItem value="cautelar">Cautelar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo do Template</Label>
              <Textarea
                id="conteudo"
                placeholder="Digite o conteúdo do template aqui. Use {{variavel}} para criar campos dinâmicos.

Exemplo:
Excelentíssimo Senhor Doutor Juiz de Direito da {{vara}} da Comarca de {{comarca}}

{{nome_autor}}, {{qualificacao_autor}}, por intermédio de seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor a presente

AÇÃO DE {{tipo_acao}}

em face de {{nome_reu}}, {{qualificacao_reu}}, pelos fatos e fundamentos jurídicos a seguir expostos..."
                value={formData.conteudo_template}
                onChange={(e) =>
                  setFormData({ ...formData, conteudo_template: e.target.value })
                }
                className="min-h-[400px] font-mono text-sm border-slate-200"
              />
              <p className="text-xs text-slate-500">
                Use {'{{'} e {'}}'}  para criar variáveis dinâmicas. Ex: {'{'}
                {'{'}nome_cliente{'}'}
                {'}'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/pecas-teses/templates">
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
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
