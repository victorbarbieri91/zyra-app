'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, TrendingUp, Loader2, Target, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InteracaoTimeline } from '@/components/crm/InteracaoTimeline'
import { InteracaoModal } from '@/components/crm/InteracaoModal'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { OportunidadeModal } from '@/components/crm/OportunidadeModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { InteracaoJSONB } from '@/types/crm'

// Etapas do funil baseadas no enum do banco
const ETAPAS_FUNIL = [
  { id: 'lead', nome: 'Lead', cor: '#34495e' },
  { id: 'contato_feito', nome: 'Contato Feito', cor: '#46627f' },
  { id: 'proposta_enviada', nome: 'Proposta Enviada', cor: '#89bcbe' },
  { id: 'negociacao', nome: 'Negociação', cor: '#aacfd0' },
  { id: 'ganho', nome: 'Ganho', cor: '#10b981' },
  { id: 'perdido', nome: 'Perdido', cor: '#ef4444' },
]

interface Oportunidade {
  id: string
  pessoa_id: string
  pessoa_nome: string
  titulo: string
  valor_estimado: number | null
  etapa: string
  etapa_id: string // para compatibilidade com KanbanBoard
  area_juridica: string | null
  responsavel_id: string
  responsavel_nome: string
  tempo_na_etapa_dias: number
  ultima_interacao: {
    data: string
    descricao: string
  } | null
  proxima_acao: string | null
  interacoes: InteracaoJSONB[]
}

export default function FunilPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('funil')
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [todasInteracoes, setTodasInteracoes] = useState<InteracaoJSONB[]>([])
  const [loading, setLoading] = useState(true)
  const [interacaoModalOpen, setInteracaoModalOpen] = useState(false)
  const [oportunidadeModalOpen, setOportunidadeModalOpen] = useState(false)
  const [interacaoContext, setInteracaoContext] = useState<{
    oportunidadeId?: string
    pessoaId?: string
    pessoaNome?: string
  }>({})

  // Carregar oportunidades
  useEffect(() => {
    loadOportunidades()
  }, [])

  const loadOportunidades = async () => {
    try {
      setLoading(true)

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.escritorio_id) return

      // Buscar oportunidades com dados relacionados
      const { data, error } = await supabase
        .from('crm_oportunidades')
        .select(`
          id,
          pessoa_id,
          titulo,
          valor_estimado,
          etapa,
          area_juridica,
          responsavel_id,
          interacoes,
          created_at,
          updated_at,
          crm_pessoas!pessoa_id (nome_completo),
          profiles!responsavel_id (nome_completo)
        `)
        .eq('escritorio_id', profile.escritorio_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Formatar dados para o componente
      const oportunidadesFormatadas: Oportunidade[] = (data || []).map((op: any) => {
        const interacoes = op.interacoes || []
        const ultimaInteracao = interacoes.length > 0
          ? interacoes[interacoes.length - 1]
          : null

        // Calcular dias na etapa (simplificado)
        const diasNaEtapa = Math.floor(
          (new Date().getTime() - new Date(op.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          id: op.id,
          pessoa_id: op.pessoa_id,
          pessoa_nome: op.crm_pessoas?.nome_completo || 'N/A',
          titulo: op.titulo,
          valor_estimado: op.valor_estimado,
          etapa: op.etapa,
          etapa_id: op.etapa, // KanbanBoard usa etapa_id
          area_juridica: op.area_juridica,
          responsavel_id: op.responsavel_id,
          responsavel_nome: op.profiles?.nome_completo || 'N/A',
          tempo_na_etapa_dias: diasNaEtapa,
          ultima_interacao: ultimaInteracao ? {
            data: ultimaInteracao.data,
            descricao: ultimaInteracao.descricao
          } : null,
          proxima_acao: null,
          interacoes
        }
      })

      setOportunidades(oportunidadesFormatadas)

      // Extrair todas as interações para a aba de timeline
      const todas: InteracaoJSONB[] = []
      oportunidadesFormatadas.forEach(op => {
        if (op.interacoes) {
          op.interacoes.forEach(int => {
            todas.push({
              ...int,
              oportunidade_titulo: op.titulo,
              pessoa_nome: op.pessoa_nome
            })
          })
        }
      })
      // Ordenar por data decrescente
      todas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      setTodasInteracoes(todas)

    } catch (error) {
      console.error('Erro ao carregar oportunidades:', error)
      toast.error('Erro ao carregar oportunidades')
    } finally {
      setLoading(false)
    }
  }

  const handleOportunidadeMove = async (oportunidadeId: string, novaEtapaId: string) => {
    // Atualizar localmente primeiro (otimistic update)
    setOportunidades((items) =>
      items.map((item) =>
        item.id === oportunidadeId ? { ...item, etapa: novaEtapaId, etapa_id: novaEtapaId } : item
      )
    )

    // Atualizar no banco
    try {
      const { error } = await supabase
        .from('crm_oportunidades')
        .update({ etapa: novaEtapaId, updated_at: new Date().toISOString() })
        .eq('id', oportunidadeId)

      if (error) throw error
      toast.success('Etapa atualizada')
    } catch (error) {
      console.error('Erro ao mover oportunidade:', error)
      toast.error('Erro ao atualizar etapa')
      // Reverter se falhou
      loadOportunidades()
    }
  }

  const handleRegistrarInteracao = (oportunidadeId: string, pessoaId: string, pessoaNome: string) => {
    setInteracaoContext({ oportunidadeId, pessoaId, pessoaNome })
    setInteracaoModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="funil" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Funil de Vendas
                </TabsTrigger>
                <TabsTrigger value="interacoes" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Todas as Interações
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {activeTab === 'funil' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => setOportunidadeModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Oportunidade
                  </Button>
                )}

                {activeTab === 'interacoes' && oportunidades.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => setInteracaoModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Interação
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tab: Funil de Vendas */}
          <TabsContent value="funil" className="p-6 mt-0">
            {oportunidades.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-slate-600 mb-2">
                  Nenhuma oportunidade cadastrada
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                  Comece adicionando oportunidades de negócio para acompanhar o progresso das negociações no funil de vendas
                </p>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                  onClick={() => setOportunidadeModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Oportunidade
                </Button>
              </div>
            ) : (
              <KanbanBoard
                etapas={ETAPAS_FUNIL}
                oportunidades={oportunidades}
                onOportunidadeMove={handleOportunidadeMove}
                onRegistrarInteracao={handleRegistrarInteracao}
              />
            )}
          </TabsContent>

          {/* Tab: Todas as Interações */}
          <TabsContent value="interacoes" className="p-6 mt-0">
            <div className="space-y-6">
              {todasInteracoes.length > 0 && (
                <>
                  {/* Filtros Rápidos */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white">
                      Todas
                    </Button>
                    <Button variant="ghost" size="sm">
                      Com Follow-up
                    </Button>
                    <Button variant="ghost" size="sm">
                      Esta Semana
                    </Button>
                    <Button variant="ghost" size="sm">
                      Este Mês
                    </Button>
                  </div>

                  {/* Timeline de Interações */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <InteracaoTimeline interacoes={todasInteracoes} />
                  </div>
                </>
              )}

              {todasInteracoes.length === 0 && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Nenhuma interação registrada
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                    {oportunidades.length === 0
                      ? 'Crie uma oportunidade primeiro para começar a registrar interações'
                      : 'Comece registrando suas interações com clientes e prospectos'
                    }
                  </p>
                  {oportunidades.length > 0 && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                      onClick={() => setInteracaoModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Primeira Interação
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal de Interação */}
      <InteracaoModal
        open={interacaoModalOpen}
        onOpenChange={setInteracaoModalOpen}
        pessoaId={interacaoContext.pessoaId}
        pessoaNome={interacaoContext.pessoaNome}
        oportunidadeId={interacaoContext.oportunidadeId}
        onSuccess={loadOportunidades}
      />

      {/* Modal de Nova Oportunidade */}
      <OportunidadeModal
        open={oportunidadeModalOpen}
        onOpenChange={setOportunidadeModalOpen}
        onSuccess={loadOportunidades}
      />
    </div>
  )
}
