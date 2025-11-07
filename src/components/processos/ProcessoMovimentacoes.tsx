'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Filter,
  Star,
  MessageSquare,
  Eye,
  Check,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Movimentacao {
  id: string
  data_movimento: string
  tipo_codigo?: string
  tipo_descricao?: string
  descricao: string
  conteudo_completo?: string
  origem: 'tribunal' | 'manual'
  importante: boolean
  lida: boolean
  comentarios?: { user: string; texto: string; data: string }[]
}

interface ProcessoMovimentacoesProps {
  processoId: string
}

export default function ProcessoMovimentacoes({ processoId }: ProcessoMovimentacoesProps) {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([
    {
      id: '1',
      data_movimento: '2025-01-07T10:30:00',
      tipo_codigo: '123',
      tipo_descricao: 'Sentença',
      descricao: 'Publicada sentença julgando procedente o pedido inicial, condenando a ré ao pagamento de R$ 50.000,00 a título de verbas rescisórias e indenização por danos morais.',
      conteudo_completo: '<html>...</html>',
      origem: 'tribunal',
      importante: true,
      lida: false,
      comentarios: [
        {
          user: 'Dr. Carlos',
          texto: 'Vamos analisar recurso. Prazo de 15 dias.',
          data: '2025-01-07T11:00:00'
        }
      ]
    },
    {
      id: '2',
      data_movimento: '2025-01-05T14:20:00',
      tipo_descricao: 'Juntada de Petição',
      descricao: 'Juntada de petição intermediária protocolada pela parte autora.',
      origem: 'tribunal',
      importante: false,
      lida: true
    },
    {
      id: '3',
      data_movimento: '2024-12-15T09:15:00',
      tipo_descricao: 'Audiência de Instrução',
      descricao: 'Realizada audiência de instrução e julgamento. Colhidos depoimentos de testemunhas. Processo concluso para sentença.',
      origem: 'tribunal',
      importante: true,
      lida: true
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterImportante, setFilterImportante] = useState(false)
  const [filterNaoLida, setFilterNaoLida] = useState(false)
  const [expandedMovimentacao, setExpandedMovimentacao] = useState<string | null>(null)

  const toggleLida = (id: string) => {
    setMovimentacoes(movs =>
      movs.map(m => m.id === id ? { ...m, lida: !m.lida } : m)
    )
  }

  const toggleImportante = (id: string) => {
    setMovimentacoes(movs =>
      movs.map(m => m.id === id ? { ...m, importante: !m.importante } : m)
    )
  }

  const getTimestamp = (data: string) => {
    const date = new Date(data)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `há ${diffInHours}h`
    } else if (diffInHours < 48) {
      return 'ontem'
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    }
  }

  const filteredMovimentacoes = movimentacoes.filter(m => {
    if (filterImportante && !m.importante) return false
    if (filterNaoLida && m.lida) return false
    if (searchQuery && !m.descricao.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">

      {/* Header com Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg font-medium text-[#34495e]">
              Movimentações
            </CardTitle>
            <Button
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Movimentação Manual
            </Button>
          </div>

          {/* Filtros */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por texto da movimentação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterNaoLida ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterNaoLida(!filterNaoLida)}
                className={filterNaoLida ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Apenas não lidas
              </Button>
              <Button
                variant={filterImportante ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterImportante(!filterImportante)}
                className={filterImportante ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <Star className="w-3.5 h-3.5 mr-1.5" />
                Apenas importantes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Movimentações */}
      <div className="space-y-3">
        {filteredMovimentacoes.map((mov) => (
          <Card
            key={mov.id}
            className={`shadow-sm transition-all ${
              !mov.lida
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            } ${
              mov.importante ? 'border-l-4 border-l-amber-500' : ''
            }`}
          >
            <CardContent className="p-4">
              {/* Header da Movimentação */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {!mov.lida && (
                    <Badge className="bg-blue-600 text-white text-[10px] h-4">
                      Não Lida
                    </Badge>
                  )}
                  {mov.importante && (
                    <Badge className="bg-amber-500 text-white text-[10px] h-4 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Importante
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {mov.origem === 'tribunal' ? 'Tribunal' : 'Manual'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-[#34495e]">
                    {format(new Date(mov.data_movimento), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-xs text-slate-500">
                    {getTimestamp(mov.data_movimento)}
                  </span>
                </div>
              </div>

              {/* Tipo da Movimentação */}
              {mov.tipo_descricao && (
                <div className="mb-2">
                  <p className="text-sm font-semibold text-[#34495e]">
                    {mov.tipo_descricao}
                    {mov.tipo_codigo && (
                      <span className="text-xs text-slate-500 ml-2">
                        (Código: {mov.tipo_codigo})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Descrição */}
              <div className="mb-3">
                <p className={`text-sm leading-relaxed ${
                  !mov.lida ? 'text-blue-900' : 'text-slate-700'
                }`}>
                  {expandedMovimentacao === mov.id
                    ? mov.descricao
                    : mov.descricao.length > 200
                    ? `${mov.descricao.substring(0, 200)}...`
                    : mov.descricao
                  }
                </p>
                {mov.descricao.length > 200 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] p-0 h-auto mt-1"
                    onClick={() => setExpandedMovimentacao(
                      expandedMovimentacao === mov.id ? null : mov.id
                    )}
                  >
                    {expandedMovimentacao === mov.id ? 'Ver menos' : 'Ver mais'}
                  </Button>
                )}
              </div>

              {/* Comentários existentes */}
              {mov.comentarios && mov.comentarios.length > 0 && (
                <div className="mb-3 space-y-2">
                  {mov.comentarios.map((comentario, index) => (
                    <div key={index} className="bg-slate-100 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-[#34495e] flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-white">
                            {comentario.user.charAt(0)}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#34495e]">
                          {comentario.user}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {getTimestamp(comentario.data)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 pl-7">
                        "{comentario.texto}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLida(mov.id)}
                  className="text-xs"
                >
                  {mov.lida ? (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como não lida
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como lida
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleImportante(mov.id)}
                  className="text-xs"
                >
                  <Star className={`w-3.5 h-3.5 mr-1.5 ${mov.importante ? 'fill-amber-500 text-amber-500' : ''}`} />
                  {mov.importante ? 'Remover destaque' : 'Marcar importante'}
                </Button>

                <Button variant="ghost" size="sm" className="text-xs">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Comentar
                </Button>

                {mov.conteudo_completo && (
                  <Button variant="ghost" size="sm" className="text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Ver HTML Completo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredMovimentacoes.length === 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Nenhuma movimentação encontrada</p>
              <p className="text-xs text-slate-500 mt-1">
                Ajuste os filtros ou adicione uma movimentação manual
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Paginação */}
      {filteredMovimentacoes.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <Button variant="outline">
              Carregar mais (20 movimentações)
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
