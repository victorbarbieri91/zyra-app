'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Building2,
  Scale,
  User,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Edit,
  Archive,
  Trash2,
  Download
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'

export default function PublicacaoDetalhesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  // Mock data - será substituído por dados reais
  const publicacao = {
    id: params.id,
    status: 'pendente' as StatusPublicacao,
    urgente: true,
    data_publicacao: '2024-11-05',
    data_captura: '2024-11-05T14:30:00',
    tribunal: 'TJSP',
    vara: '1ª Vara Cível',
    tipo_publicacao: 'intimacao',
    numero_processo: '1234567-89.2024.8.26.0100',
    processo_id: 'abc123',
    cliente_nome: 'João Silva',
    partes: ['João Silva', 'Maria Santos'],
    texto_completo: `INTIMAÇÃO - Processo nº 1234567-89.2024.8.26.0100

Ficam as partes intimadas da decisão proferida nos autos, que determina a apresentação de contrarrazões ao recurso de apelação no prazo de 15 (quinze) dias úteis, conforme art. 1.003 do CPC.

A intimação deve ser considerada a partir da publicação no Diário Oficial.

São Paulo, 05 de novembro de 2024.`,
    pdf_url: null,

    // Análise IA
    analise: {
      resumo_executivo: 'Intimação para apresentação de contrarrazões ao recurso de apelação interposto pela parte contrária. Prazo processual de 15 dias úteis.',
      tipo_decisao: 'Despacho Ordinatório',
      sentimento: 'neutro',
      pontos_principais: [
        'Recurso de apelação interposto pela parte adversa',
        'Necessário apresentar contrarrazões',
        'Prazo de 15 dias úteis a partir da intimação',
        'Fundamentação no art. 1.003 do CPC'
      ],
      tem_prazo: true,
      tipo_prazo: 'Contrarrazões de Apelação',
      prazo_dias: 15,
      prazo_tipo_dias: 'uteis',
      data_intimacao: '2024-11-05',
      data_limite: '2024-11-26',
      fundamentacao_legal: 'Art. 1.003 do CPC - Prazo para contrarrazões ao recurso de apelação',
      tem_determinacao: true,
      determinacoes: ['Apresentar contrarrazões ao recurso'],
      requer_manifestacao: true,
      acoes_sugeridas: [
        'Criar prazo no sistema com alerta de 7, 3 e 1 dia antes',
        'Atribuir tarefa ao advogado responsável',
        'Analisar razões de apelação apresentadas',
        'Elaborar contrarrazões fundamentadas'
      ],
      template_sugerido: 'Contrarrazões de Apelação',
      confianca_analise: 0.95
    },

    // Histórico
    historico: [
      {
        id: '1',
        acao: 'recebida',
        user_nome: 'Sistema',
        created_at: '2024-11-05T14:30:00',
        detalhes: { source: 'api' }
      },
      {
        id: '2',
        acao: 'analisada_ia',
        user_nome: 'Sistema',
        created_at: '2024-11-05T14:31:00',
        detalhes: { confianca: 0.95 }
      },
      {
        id: '3',
        acao: 'visualizada',
        user_nome: 'Maria Santos',
        created_at: '2024-11-05T15:00:00',
        detalhes: {}
      }
    ]
  }

  const getStatusConfig = (status: StatusPublicacao) => {
    const configs = {
      pendente: {
        badge: 'bg-red-100 text-red-700 border-red-200',
        label: 'Pendente de Análise',
        icon: Clock
      },
      em_analise: {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        label: 'Em Análise',
        icon: Brain
      },
      processada: {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        label: 'Processada',
        icon: CheckCircle2
      },
      arquivada: {
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Arquivada',
        icon: Archive
      }
    }
    return configs[status]
  }

  const getSentimentoConfig = (sentimento: string) => {
    const configs = {
      favoravel: {
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        label: 'Favorável'
      },
      desfavoravel: {
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'Desfavorável'
      },
      neutro: {
        icon: Minus,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        label: 'Neutro'
      }
    }
    return configs[sentimento as keyof typeof configs]
  }

  const statusConfig = getStatusConfig(publicacao.status)
  const StatusIcon = statusConfig.icon
  const sentimentoConfig = getSentimentoConfig(publicacao.analise.sentimento)
  const SentimentoIcon = sentimentoConfig.icon

  const diasRestantes = Math.ceil(
    (new Date(publicacao.analise.data_limite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header Compacto */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/publicacoes')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs border', statusConfig.badge)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {publicacao.urgente && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Urgente
                  </Badge>
                )}
                {publicacao.analise.tem_prazo && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      diasRestantes <= 3
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : diasRestantes <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {diasRestantes} dias restantes
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {publicacao.status !== 'processada' && (
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A] hover:to-[#2563EB]"
                  onClick={() => router.push(`/dashboard/publicacoes/processar/${publicacao.id}`)}
                >
                  <Play className="w-4 h-4" />
                  Processar com IA
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4" />
                Editar Análise
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Archive className="w-4 h-4" />
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo - Layout 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
        {/* COLUNA ESQUERDA (2/3) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Card: Informações da Publicação */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Informações da Publicação</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Data da Publicação</div>
                    <div className="text-sm font-medium text-slate-700">
                      {new Date(publicacao.data_publicacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Tribunal / Vara</div>
                    <div className="text-sm font-medium text-slate-700">{publicacao.tribunal}</div>
                    {publicacao.vara && (
                      <div className="text-xs text-slate-500">{publicacao.vara}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Tipo de Publicação</div>
                    <div className="text-sm font-medium text-slate-700 capitalize">
                      {publicacao.tipo_publicacao}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Scale className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Número do Processo</div>
                    {publicacao.numero_processo ? (
                      <Link
                        href={`/dashboard/processos/${publicacao.processo_id}`}
                        className="text-sm font-medium text-[#1E3A8A] hover:underline flex items-center gap-1"
                      >
                        {publicacao.numero_processo}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <div className="text-sm text-slate-400">Não vinculado</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Cliente</div>
                    <div className="text-sm font-medium text-slate-700">
                      {publicacao.cliente_nome || '-'}
                    </div>
                  </div>
                </div>

                {publicacao.partes && publicacao.partes.length > 0 && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Partes</div>
                      <div className="text-sm text-slate-700">
                        {publicacao.partes.join(' x ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Texto Completo */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Texto da Publicação</h2>
              {publicacao.pdf_url && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-3.5 h-3.5" />
                  PDF Original
                </Button>
              )}
            </div>
            <div className="p-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {publicacao.texto_completo}
                </pre>
              </div>
            </div>
          </div>

          {/* Card: Histórico de Ações */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Histórico de Ações</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {publicacao.historico.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.acao === 'recebida' ? 'bg-blue-500' :
                        item.acao === 'analisada_ia' ? 'bg-purple-500' :
                        item.acao === 'visualizada' ? 'bg-slate-400' :
                        'bg-emerald-500'
                      )} />
                      {index < publicacao.historico.length - 1 && (
                        <div className="w-px h-full bg-slate-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-700 capitalize">
                          {item.acao.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {item.user_nome}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (1/3) */}
        <div className="space-y-4">
          {/* Card: Análise IA */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 shadow-sm">
            <div className="px-4 py-3 border-b border-purple-200 bg-white/50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  Análise por IA
                </h2>
                <Badge variant="outline" className="text-xs bg-white border-purple-300 text-purple-700">
                  {Math.round(publicacao.analise.confianca_analise * 100)}% confiança
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Resumo Executivo */}
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1.5">Resumo Executivo</div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {publicacao.analise.resumo_executivo}
                </p>
              </div>

              {/* Tipo e Sentimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Tipo de Decisão</div>
                  <div className="text-xs font-medium text-slate-700">
                    {publicacao.analise.tipo_decisao}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Sentimento</div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs border', sentimentoConfig.bg, sentimentoConfig.color, sentimentoConfig.border)}
                  >
                    <SentimentoIcon className="w-3 h-3 mr-1" />
                    {sentimentoConfig.label}
                  </Badge>
                </div>
              </div>

              {/* Pontos Principais */}
              <div>
                <div className="text-xs font-medium text-slate-600 mb-2">Pontos Principais</div>
                <ul className="space-y-1.5">
                  {publicacao.analise.pontos_principais.map((ponto, index) => (
                    <li key={index} className="flex gap-2 text-xs text-slate-700">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span className="flex-1">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card: Prazo Detectado */}
          {publicacao.analise.tem_prazo && (
            <div className={cn(
              'rounded-lg border shadow-sm',
              diasRestantes <= 3
                ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                : diasRestantes <= 7
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
            )}>
              <div className={cn(
                'px-4 py-3 border-b bg-white/50',
                diasRestantes <= 3 ? 'border-red-200' :
                diasRestantes <= 7 ? 'border-amber-200' : 'border-blue-200'
              )}>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className={cn(
                    'w-4 h-4',
                    diasRestantes <= 3 ? 'text-red-600' :
                    diasRestantes <= 7 ? 'text-amber-600' : 'text-blue-600'
                  )} />
                  Prazo Detectado
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Tipo de Prazo</div>
                  <div className="text-sm font-semibold text-slate-700">
                    {publicacao.analise.tipo_prazo}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Prazo</div>
                    <div className="text-sm font-medium text-slate-700">
                      {publicacao.analise.prazo_dias} dias {publicacao.analise.prazo_tipo_dias}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Restam</div>
                    <div className={cn(
                      'text-sm font-bold',
                      diasRestantes <= 3 ? 'text-red-600' :
                      diasRestantes <= 7 ? 'text-amber-600' : 'text-blue-600'
                    )}>
                      {diasRestantes} dias
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Intimação → Limite</div>
                  <div className="text-xs font-medium text-slate-700">
                    {new Date(publicacao.analise.data_intimacao).toLocaleDateString('pt-BR')}
                    {' → '}
                    {new Date(publicacao.analise.data_limite).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Fundamentação Legal</div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {publicacao.analise.fundamentacao_legal}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Card: Ações Sugeridas */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Ações Sugeridas
              </h2>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {publicacao.analise.acoes_sugeridas.map((acao, index) => (
                  <li key={index} className="flex gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{acao}</span>
                  </li>
                ))}
              </ul>

              {publicacao.analise.template_sugerido && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-2">Template Sugerido</div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <FileText className="w-3 h-3 mr-1" />
                    {publicacao.analise.template_sugerido}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
