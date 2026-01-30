'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Edit2,
  Check,
  X,
  Loader2,
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { ProcessoParaRelatorio } from '@/types/relatorios'
import { cn } from '@/lib/utils'

interface ProcessoResumoCardProps {
  processo: ProcessoParaRelatorio
  resumo: string
  onResumoChange: (processoId: string, resumo: string) => void
  onRegenerarResumo: (processoId: string) => void
  onAtualizarEscavador?: (numeroCnj: string) => void
  carregando?: boolean
}

export function ProcessoResumoCard({
  processo,
  resumo,
  onResumoChange,
  onRegenerarResumo,
  onAtualizarEscavador,
  carregando = false
}: ProcessoResumoCardProps) {
  const [editando, setEditando] = useState(false)
  const [textoEditado, setTextoEditado] = useState(resumo)
  const [atualizandoEscavador, setAtualizandoEscavador] = useState(false)

  const handleSalvarEdicao = () => {
    onResumoChange(processo.id, textoEditado)
    setEditando(false)
  }

  const handleCancelarEdicao = () => {
    setTextoEditado(resumo)
    setEditando(false)
  }

  const handleAtualizarEscavador = async () => {
    if (!onAtualizarEscavador || !processo.numero_cnj) return
    setAtualizandoEscavador(true)
    try {
      await onAtualizarEscavador(processo.numero_cnj)
    } finally {
      setAtualizandoEscavador(false)
    }
  }

  // Manter textoEditado sincronizado quando resumo muda de fora
  if (resumo !== textoEditado && !editando) {
    setTextoEditado(resumo)
  }

  const areaBadgeColor = {
    'civel': 'bg-blue-100 text-blue-700',
    'trabalhista': 'bg-amber-100 text-amber-700',
    'tributaria': 'bg-green-100 text-green-700',
    'criminal': 'bg-red-100 text-red-700',
    'familia': 'bg-pink-100 text-pink-700',
    'previdenciaria': 'bg-purple-100 text-purple-700',
    'consumidor': 'bg-orange-100 text-orange-700',
    'empresarial': 'bg-indigo-100 text-indigo-700',
  }[processo.area?.toLowerCase()] || 'bg-slate-100 text-slate-700'

  return (
    <Card className={cn(
      "border-slate-200 shadow-sm transition-all",
      carregando && "opacity-60"
    )}>
      <CardContent className="p-4">
        {/* Header do processo */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#89bcbe]/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[#34495e]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#34495e]">
                {processo.numero_pasta}
              </span>
              {processo.numero_cnj && (
                <span className="text-xs text-slate-500">
                  {processo.numero_cnj}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn("text-[10px]", areaBadgeColor)}>
                {processo.area}
              </Badge>
              <span className="text-xs text-slate-500">
                {processo.cliente_nome}
              </span>
              <span className="text-xs text-slate-400">
                ({processo.polo_cliente === 'ativo' ? 'Autor' : 'Reu'})
              </span>
            </div>
          </div>

          {/* Botao atualizar Escavador */}
          {processo.numero_cnj && onAtualizarEscavador && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleAtualizarEscavador}
              disabled={atualizandoEscavador || carregando}
            >
              {atualizandoEscavador ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
              )}
              Atualizar
            </Button>
          )}
        </div>

        {/* Area do resumo */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#89bcbe]" />
            <span className="text-xs font-medium text-slate-600">
              Andamento gerado pela IA
            </span>
          </div>

          {carregando ? (
            <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
              <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
              <span className="text-sm text-slate-500">Gerando resumo...</span>
            </div>
          ) : editando ? (
            <div className="space-y-2">
              <Textarea
                value={textoEditado}
                onChange={(e) => setTextoEditado(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                placeholder="Digite o andamento do processo..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelarEdicao}
                  className="h-8"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSalvarEdicao}
                  className="h-8 bg-[#34495e] hover:bg-[#46627f] text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          ) : resumo ? (
            <div className="space-y-2">
              <div className="p-3 bg-[#f0f9f9] border border-[#aacfd0] rounded-lg">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {resumo}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditando(true)}
                  className="h-7 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRegenerarResumo(processo.id)}
                  className="h-7 text-xs"
                  disabled={carregando}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-500 text-center">
                Resumo nao gerado. Clique para gerar.
              </p>
              <Button
                size="sm"
                onClick={() => onRegenerarResumo(processo.id)}
                className="h-8 bg-[#34495e] hover:bg-[#46627f] text-white"
                disabled={carregando}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Gerar com IA
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
