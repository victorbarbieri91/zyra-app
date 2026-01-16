'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Edit,
  UserCheck,
  Archive,
  DollarSign,
  Paperclip,
  Activity,
  Loader2,
  History
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDateTime } from '@/lib/timezone'

interface ProcessoHistoricoProps {
  processoId: string
}

interface HistoricoEntry {
  id: string
  acao: string
  descricao: string
  campo_alterado: string | null
  valor_anterior: string | null
  valor_novo: string | null
  user_nome: string | null
  created_at: string
}

export default function ProcessoHistorico({ processoId }: ProcessoHistoricoProps) {
  const [historico, setHistorico] = useState<HistoricoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadHistorico = async () => {
      if (!processoId) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('processos_historico')
          .select('id, acao, descricao, campo_alterado, valor_anterior, valor_novo, user_nome, created_at')
          .eq('processo_id', processoId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setHistorico(data || [])
      } catch (error) {
        console.error('Erro ao carregar histórico:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistorico()
  }, [processoId, supabase])

  const getIconeAcao = (acao: string) => {
    const icons = {
      criacao: FileText,
      edicao: Edit,
      movimentacao: Activity,
      status: UserCheck,
      arquivamento: Archive,
      valores: DollarSign,
      documento: Paperclip
    }
    return icons[acao as keyof typeof icons] || Activity
  }

  const getColorClass = (acao: string) => {
    const colors = {
      criacao: 'bg-blue-100 text-blue-600',
      edicao: 'bg-amber-100 text-amber-600',
      movimentacao: 'bg-purple-100 text-purple-600',
      status: 'bg-teal-100 text-teal-600',
      arquivamento: 'bg-slate-100 text-slate-600',
      valores: 'bg-emerald-100 text-emerald-600',
      documento: 'bg-pink-100 text-pink-600'
    }
    return colors[acao as keyof typeof colors] || colors.edicao
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-[#34495e]">
            Histórico de Auditoria
          </CardTitle>
          <p className="text-xs text-slate-600 mt-1">
            Registro completo de todas as alterações realizadas no processo
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando histórico...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum registro no histórico</p>
              <p className="text-xs mt-1">Alterações no processo serão registradas aqui automaticamente</p>
            </div>
          ) : (
            <div className="relative space-y-6">
              {/* Linha vertical conectora */}
              <div className="absolute left-[14px] top-0 bottom-0 w-0.5 bg-slate-200" />

              {historico.map((entry) => {
                const Icon = getIconeAcao(entry.acao)
                return (
                  <div key={entry.id} className="relative flex gap-4 pl-10">
                    {/* Ícone da ação */}
                    <div className={`absolute left-0 w-7 h-7 rounded-lg flex items-center justify-center ${getColorClass(entry.acao)}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Conteúdo do evento */}
                    <div className="flex-1 pb-6 border-b border-slate-100 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {entry.acao}
                            </Badge>
                            <span className="text-sm font-semibold text-[#34495e]">
                              {entry.user_nome || 'Sistema'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatBrazilDateTime(new Date(entry.created_at))}
                          </p>
                        </div>
                      </div>

                      {/* Detalhes da alteração */}
                      {entry.campo_alterado && (
                        <div className="mb-2 p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs font-semibold text-[#46627f] mb-1">
                            Campo: {entry.campo_alterado}
                          </p>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            {entry.valor_anterior && (
                              <>
                                <span className="text-slate-600">De:</span>
                                <code className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                                  {entry.valor_anterior}
                                </code>
                              </>
                            )}
                            <span className="text-slate-600">→ Para:</span>
                            <code className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                              {entry.valor_novo}
                            </code>
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {entry.descricao}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
