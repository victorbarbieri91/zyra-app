'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { CurrencyInput } from '@/components/ui/currency-input'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface OportunidadeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface PessoaOption {
  id: string
  nome_completo: string
  tipo_pessoa: string
}

export function OportunidadeModal({ open, onOpenChange, onSuccess }: OportunidadeModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPessoas, setLoadingPessoas] = useState(false)
  const [pessoas, setPessoas] = useState<PessoaOption[]>([])
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])

  const [valorEstimado, setValorEstimado] = useState(0)

  const [formData, setFormData] = useState({
    pessoa_id: '',
    titulo: '',
    descricao: '',
    etapa: 'lead',
    area_juridica: '',
    responsavel_id: '',
    origem: '',
  })

  const supabase = createClient()

  // Carregar pessoas e responsaveis ao abrir
  useEffect(() => {
    if (open) {
      loadPessoas()
      loadResponsaveis()
    }
  }, [open])

  const loadPessoas = async () => {
    setLoadingPessoas(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data, error } = await supabase
        .from('crm_pessoas')
        .select('id, nome_completo, tipo_pessoa')
        .eq('escritorio_id', profile.escritorio_id)
        .in('tipo_cadastro', ['cliente', 'prospecto'])
        .eq('status', 'ativo')
        .order('nome_completo')

      if (error) throw error
      setPessoas(data || [])
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error)
    } finally {
      setLoadingPessoas(false)
    }
  }

  const loadResponsaveis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) return

      const { data, error } = await supabase
        .from('escritorios_usuarios')
        .select(`
          user_id,
          profile:profiles!usuarios_escritorios_user_id_fkey(nome_completo)
        `)
        .eq('escritorio_id', profile.escritorio_id)
        .eq('ativo', true)

      if (error) throw error

      const resp = (data || []).map((m: any) => ({
        id: m.user_id,
        nome: m.profile?.nome_completo || 'Usuário'
      }))

      setResponsaveis(resp)

      // Pre-selecionar usuario logado como responsavel
      if (resp.some((r: { id: string; nome: string }) => r.id === user.id)) {
        setFormData(prev => ({ ...prev, responsavel_id: user.id }))
      }
    } catch (error) {
      console.error('Erro ao carregar responsaveis:', error)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validacoes
    if (!formData.pessoa_id) {
      toast.error('Selecione um cliente/prospecto')
      return
    }
    if (!formData.titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    if (!formData.responsavel_id) {
      toast.error('Selecione um responsável')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) throw new Error('Escritório não encontrado')

      const insertData = {
        escritorio_id: profile.escritorio_id,
        pessoa_id: formData.pessoa_id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        valor_estimado: valorEstimado > 0 ? valorEstimado : null,
        etapa: formData.etapa,
        area_juridica: formData.area_juridica || null,
        responsavel_id: formData.responsavel_id,
        origem: formData.origem || null,
        data_abertura: new Date().toISOString().split('T')[0],
      }

      const { error } = await supabase
        .from('crm_oportunidades')
        .insert(insertData)

      if (error) throw error

      toast.success('Oportunidade criada com sucesso!')

      // Resetar form
      setValorEstimado(0)
      setFormData({
        pessoa_id: '',
        titulo: '',
        descricao: '',
        etapa: 'lead',
        area_juridica: '',
        responsavel_id: '',
        origem: '',
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Erro ao criar oportunidade:', JSON.stringify(error, null, 2))
      const msg = error?.message || error?.details || error?.hint || error?.code || 'Erro ao criar oportunidade'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#34495e]">
            Nova Oportunidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Cliente/Prospecto */}
          <div>
            <Label htmlFor="pessoa_id">Cliente/Prospecto *</Label>
            <Select
              value={formData.pessoa_id}
              onValueChange={(v) => updateField('pessoa_id', v)}
              disabled={loadingPessoas}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPessoas ? 'Carregando...' : 'Selecione...'} />
              </SelectTrigger>
              <SelectContent>
                {pessoas.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pessoas.length === 0 && !loadingPessoas && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum cliente/prospecto cadastrado. Cadastre primeiro em CRM &gt; Pessoas.
              </p>
            )}
          </div>

          {/* Titulo */}
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Contratação trabalhista, Processo de divórcio..."
              value={formData.titulo}
              onChange={(e) => updateField('titulo', e.target.value)}
            />
          </div>

          {/* Valor Estimado e Etapa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_estimado">Valor Estimado</Label>
              <CurrencyInput
                id="valor_estimado"
                value={valorEstimado}
                onChange={setValorEstimado}
              />
            </div>
            <div>
              <Label htmlFor="etapa">Etapa do Funil</Label>
              <Select
                value={formData.etapa}
                onValueChange={(v) => updateField('etapa', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="contato_feito">Contato Feito</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Area Juridica e Responsavel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="area_juridica">Área Jurídica</Label>
              <Select
                value={formData.area_juridica}
                onValueChange={(v) => updateField('area_juridica', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civel">Cível</SelectItem>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="tributario">Tributário</SelectItem>
                  <SelectItem value="familia">Família</SelectItem>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="consumidor">Consumidor</SelectItem>
                  <SelectItem value="empresarial">Empresarial</SelectItem>
                  <SelectItem value="previdenciario">Previdenciário</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="responsavel_id">Responsável *</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(v) => updateField('responsavel_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origem */}
          <div>
            <Label htmlFor="origem">Origem</Label>
            <Select
              value={formData.origem}
              onValueChange={(v) => updateField('origem', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Como chegou até você?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="parceria">Parceria</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descricao */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Detalhes sobre a oportunidade..."
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Acoes */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Oportunidade'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
