'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Edit,
  UserCheck,
  Archive,
  DollarSign,
  Paperclip,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProcessoHistoricoProps {
  processoId: string
}

export default function ProcessoHistorico({ processoId }: ProcessoHistoricoProps) {
  const historico = [
    {
      id: '1',
      acao: 'edicao',
      usuario: 'Dr. Carlos Souza',
      data: '2025-01-07T14:32:00',
      campo_alterado: 'Status',
      valor_anterior: 'ativo',
      valor_novo: 'suspenso',
      descricao: 'Status alterado para suspenso devido a acordo parcial'
    },
    {
      id: '2',
      acao: 'movimentacao',
      usuario: 'Sistema',
      data: '2025-01-07T10:30:00',
      descricao: 'Nova movimentação adicionada: Sentença'
    },
    {
      id: '3',
      acao: 'edicao',
      usuario: 'Dra. Ana Santos',
      data: '2025-01-05T16:20:00',
      campo_alterado: 'Valor Condenação',
      valor_anterior: null,
      valor_novo: 'R$ 50.000,00',
      descricao: 'Valor da condenação atualizado após sentença'
    },
    {
      id: '4',
      acao: 'edicao',
      usuario: 'Dr. Carlos Souza',
      data: '2024-12-20T11:15:00',
      campo_alterado: 'Responsável',
      valor_anterior: 'Dra. Ana Santos',
      valor_novo: 'Dr. Carlos Souza',
      descricao: 'Responsabilidade do processo transferida'
    },
    {
      id: '5',
      acao: 'criacao',
      usuario: 'Dr. Carlos Souza',
      data: '2024-01-15T10:00:00',
      descricao: 'Processo criado no sistema'
    }
  ]

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
          <div className="relative space-y-6">
            {/* Linha vertical conectora */}
            <div className="absolute left-[14px] top-0 bottom-0 w-0.5 bg-slate-200" />

            {historico.map((entry, index) => {
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
                          <Badge variant="secondary" className="text-[10px]">
                            {entry.acao}
                          </Badge>
                          <span className="text-sm font-semibold text-[#34495e]">
                            {entry.usuario}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {format(new Date(entry.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {/* Detalhes da alteração */}
                    {entry.campo_alterado && (
                      <div className="mb-2 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-semibold text-[#46627f] mb-1">
                          Campo: {entry.campo_alterado}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
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
        </CardContent>
      </Card>
    </div>
  )
}
