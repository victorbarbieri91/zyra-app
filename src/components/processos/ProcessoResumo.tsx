'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Copy,
  Check,
  Users,
  MapPin,
  Clock,
  FileText,
  Calendar,
  CheckCircle,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito?: string
  tribunal: string
  link_tribunal?: string
  comarca?: string
  vara?: string
  juiz?: string
  data_distribuicao: string
  cliente_id: string
  cliente_nome: string
  polo_cliente: string
  parte_contraria?: string
  responsavel_id: string
  responsavel_nome: string
  colaboradores_ids: string[]
  colaboradores_nomes: string[]
  status: string
  valor_causa?: number
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  objeto_acao?: string
  observacoes?: string
  tags: string[]
  data_transito_julgado?: string
  data_arquivamento?: string
  created_at: string
  updated_at: string
}

interface ProcessoResumoProps {
  processo: Processo
}

interface Movimentacao {
  id: string
  data_movimento: string
  tipo_descricao?: string
  descricao: string
}

export default function ProcessoResumo({ processo }: ProcessoResumoProps) {
  const [copiedCNJ, setCopiedCNJ] = useState(false)
  const [openNovoAndamento, setOpenNovoAndamento] = useState(false)
  const [novoAndamento, setNovoAndamento] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: '',
    descricao: ''
  })

  // Mock data
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([
    {
      id: '1',
      data_movimento: '2025-01-07T10:30:00',
      tipo_descricao: 'Sentença',
      descricao: 'Publicada sentença julgando procedente o pedido inicial, condenando a ré ao pagamento de R$ 50.000,00 a título de verbas rescisórias e indenização por danos morais.'
    },
    {
      id: '2',
      data_movimento: '2025-01-05T14:20:00',
      tipo_descricao: 'Juntada de Petição',
      descricao: 'Juntada de petição intermediária protocolada pela parte autora.'
    },
    {
      id: '3',
      data_movimento: '2024-12-15T09:15:00',
      tipo_descricao: 'Audiência de Instrução',
      descricao: 'Realizada audiência de instrução e julgamento. Colhidos depoimentos de testemunhas. Processo concluso para sentença.'
    }
  ])

  const proximosPrazos = [
    { tipo: 'Resposta à Impugnação', data: '2025-01-09', diasRestantes: 3, urgente: true },
    { tipo: 'Contestar Recurso', data: '2025-01-12', diasRestantes: 6, urgente: false },
    { tipo: 'Juntada de Documentos', data: '2025-01-15', diasRestantes: 9, urgente: false }
  ]

  const copyCNJ = () => {
    navigator.clipboard.writeText(processo.numero_cnj)
    setCopiedCNJ(true)
    setTimeout(() => setCopiedCNJ(false), 2000)
  }

  const handleAddAndamento = () => {
    if (!novoAndamento.tipo || !novoAndamento.descricao) return

    const newMov: Movimentacao = {
      id: String(Date.now()),
      data_movimento: new Date(novoAndamento.data).toISOString(),
      tipo_descricao: novoAndamento.tipo,
      descricao: novoAndamento.descricao
    }

    setMovimentacoes([newMov, ...movimentacoes])
    setNovoAndamento({
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: '',
      descricao: ''
    })
    setOpenNovoAndamento(false)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

      {/* Coluna Principal - Ficha (8/12) */}
      <div className="xl:col-span-8 space-y-6">

        {/* Card Principal - Informações Gerais */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-[#34495e] mb-1">
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-6">

              {/* Coluna Esquerda - Informações Principais */}
              <div className="col-span-7 space-y-3.5">

                {/* Partes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Cliente ({processo.polo_cliente === 'ativo' ? 'Autor' : 'Réu'})</p>
                    <Button variant="link" className="text-sm font-semibold text-[#34495e] hover:text-[#89bcbe] p-0 h-auto">
                      {processo.cliente_nome}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Parte Contrária</p>
                    <p className="text-sm font-semibold text-slate-700">{processo.parte_contraria || 'Não informado'}</p>
                  </div>
                </div>

                {/* CNJ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Número CNJ</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{processo.numero_cnj}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyCNJ}
                        className="h-6 w-6 p-0 hover:bg-slate-100"
                        title="Copiar CNJ"
                      >
                        {copiedCNJ ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Data de Distribuição</p>
                    <p className="text-sm text-slate-700">
                      {format(new Date(processo.data_distribuicao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Informações Processuais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Fase / Instância</p>
                    <p className="text-sm text-slate-700">
                      {processo.fase} / {processo.instancia}
                    </p>
                  </div>

                  {processo.rito && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Rito</p>
                      <p className="text-sm text-slate-700 capitalize">{processo.rito}</p>
                    </div>
                  )}
                </div>

                {/* Objeto da Ação */}
                {processo.objeto_acao && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Objeto da Ação</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{processo.objeto_acao}</p>
                  </div>
                )}

                {/* Valores */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2.5">Valores</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600">Valor da Causa:</span>
                      <span className="text-sm font-semibold text-[#34495e]">
                        {processo.valor_causa ? formatCurrency(processo.valor_causa) : 'Não definido'}
                      </span>
                    </div>

                    {processo.valor_acordo && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600">Acordo:</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(processo.valor_acordo)}
                        </span>
                      </div>
                    )}

                    {processo.valor_condenacao && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600">Condenação:</span>
                        <span className="text-sm font-semibold text-red-700">
                          {formatCurrency(processo.valor_condenacao)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Coluna Direita - Localização */}
              <div className="col-span-5 pl-6 border-l border-slate-100">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 mb-2.5">Localização</p>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-xs text-slate-500">Tribunal</p>
                        {processo.link_tribunal ? (
                          <Button
                            variant="link"
                            className="text-sm text-[#34495e] hover:text-[#89bcbe] font-medium p-0 h-auto"
                            onClick={() => window.open(processo.link_tribunal, '_blank')}
                          >
                            {processo.tribunal} →
                          </Button>
                        ) : (
                          <p className="text-sm text-slate-700 font-medium">{processo.tribunal}</p>
                        )}
                      </div>
                      {processo.comarca && (
                        <div>
                          <p className="text-xs text-slate-500">Comarca</p>
                          <p className="text-sm text-slate-700">{processo.comarca}</p>
                        </div>
                      )}
                      {processo.vara && (
                        <div>
                          <p className="text-xs text-slate-500">Vara</p>
                          <p className="text-sm text-slate-700">{processo.vara}</p>
                        </div>
                      )}
                      {processo.juiz && (
                        <div>
                          <p className="text-xs text-slate-500">Juiz</p>
                          <p className="text-sm text-slate-700">{processo.juiz}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Andamentos Processuais */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-sm font-medium text-[#34495e]">
                Últimos Andamentos
              </CardTitle>

              <Dialog open={openNovoAndamento} onOpenChange={setOpenNovoAndamento}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Adicionar Andamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-[#34495e]">
                      Novo Andamento Manual
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          Data
                        </label>
                        <Input
                          type="date"
                          value={novoAndamento.data}
                          onChange={(e) => setNovoAndamento({ ...novoAndamento, data: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          Tipo de Andamento
                        </label>
                        <Input
                          placeholder="Ex: Atualização, Reunião com cliente, Análise..."
                          value={novoAndamento.tipo}
                          onChange={(e) => setNovoAndamento({ ...novoAndamento, tipo: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        Descrição
                      </label>
                      <Textarea
                        placeholder="Descreva o andamento..."
                        value={novoAndamento.descricao}
                        onChange={(e) => setNovoAndamento({ ...novoAndamento, descricao: e.target.value })}
                        className="text-sm min-h-[120px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setOpenNovoAndamento(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddAndamento}
                        disabled={!novoAndamento.tipo || !novoAndamento.descricao}
                        className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                      >
                        Adicionar Andamento
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {movimentacoes.map((mov, index) => (
              <div key={mov.id} className={`${index !== movimentacoes.length - 1 ? 'pb-3 border-b border-slate-100' : ''}`}>
                <div className="flex gap-3">
                  {/* Data */}
                  <div className="flex-shrink-0 w-20">
                    <p className="text-xs font-medium text-slate-700">
                      {format(new Date(mov.data_movimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#34495e] mb-0.5">
                      {mov.tipo_descricao}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {mov.descricao}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {movimentacoes.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Nenhum andamento registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Coluna Lateral (4/12) */}
      <div className="xl:col-span-4 space-y-6">

        {/* Card Equipe */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#89bcbe]" />
                Equipe
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Responsável</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {processo.responsavel_nome.split(' ')[1]?.charAt(0) || processo.responsavel_nome.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#34495e]">{processo.responsavel_nome}</p>
                  <p className="text-[10px] text-slate-500">Advogado responsável</p>
                </div>
              </div>
            </div>

            {processo.colaboradores_nomes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Colaboradores</p>
                <div className="space-y-2">
                  {processo.colaboradores_nomes.map((nome, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#89bcbe]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#34495e]">
                          {nome.split(' ')[1]?.charAt(0) || nome.charAt(0)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{nome}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Próximos Prazos */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#89bcbe]" />
              Próximos Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximosPrazos.map((prazo, index) => (
              <div key={index} className="flex items-center justify-between gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#34495e] leading-tight truncate">
                    {prazo.tipo}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {format(new Date(prazo.data), "dd/MM/yy", { locale: ptBR })}
                  </p>
                </div>
                <Badge className={`text-[10px] h-4 px-1.5 flex-shrink-0 ${
                  prazo.urgente
                    ? 'bg-red-600 text-white'
                    : prazo.diasRestantes <= 7
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}>
                  {prazo.diasRestantes}d
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline Resumida */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[#89bcbe]" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3 h-3 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#34495e]">Distribuição</p>
                  <p className="text-[10px] text-slate-500">
                    {format(new Date(processo.data_distribuicao), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#34495e]">Citação</p>
                  <p className="text-[10px] text-slate-500">10/02/2024</p>
                </div>
              </div>
            </div>

            <Button variant="link" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] p-0 h-auto mt-3 w-full">
              Ver timeline completa →
            </Button>
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
