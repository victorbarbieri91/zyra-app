'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Filter,
  Search,
  RefreshCw,
  Plus,
  Settings,
  Eye,
  Play,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileX,
  Calendar,
  Loader2,
  CalendarPlus,
  CheckSquare,
  Gavel,
  Copy,
  Check,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useAaspSync } from '@/hooks/useAaspSync'
import { useEscavadorTermos } from '@/hooks/useEscavadorTermos'
import { toast } from 'sonner'

// Tipos
type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
type TipoPublicacao = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'

interface Publicacao {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: TipoPublicacao
  numero_processo?: string
  processo_id?: string
  cliente_nome?: string
  status: StatusPublicacao
  urgente: boolean
  tem_prazo?: boolean
  prazo_dias?: number
  processo_numero_cnj?: string
  texto_completo?: string
  agendamento_id?: string
  agendamento_tipo?: 'tarefa' | 'compromisso' | 'audiencia'
  hash_conteudo?: string
  duplicata_revisada?: boolean
}

interface DuplicataGrupo {
  hash: string
  publicacoes: Publicacao[]
}

interface Stats {
  pendentes: number
  processadasHoje: number
  urgentes: number
  prazosCriados: number
}

export default function PublicacoesPage() {
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos',
    tipo: 'todos',
    apenasUrgentes: false
  })
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [stats, setStats] = useState<Stats>({
    pendentes: 0,
    processadasHoje: 0,
    urgentes: 0,
    prazosCriados: 0
  })
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'todas' | 'duplicatas'>('todas')
  const [duplicataGrupos, setDuplicataGrupos] = useState<DuplicataGrupo[]>([])

  const router = useRouter()
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const { sincronizarTodos, sincronizando: sincronizandoAasp } = useAaspSync(escritorioAtivo || undefined)
  const { sincronizar: sincronizarEscavador, sincronizando: sincronizandoEscavador, termos: termosEscavador } = useEscavadorTermos(escritorioAtivo || undefined)

  const sincronizando = sincronizandoAasp || sincronizandoEscavador

  // Carregar publicações do banco
  const carregarPublicacoes = useCallback(async () => {
    if (!escritorioAtivo) return

    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('publicacoes_publicacoes')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .order('data_publicacao', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar publicações:', error)
        toast.error('Erro ao carregar publicações')
        return
      }

      setPublicacoes(data || [])

      // Calcular estatísticas
      const hoje = new Date().toISOString().split('T')[0]
      const pendentes = data?.filter(p => p.status === 'pendente').length || 0
      const processadasHoje = data?.filter(p => p.status === 'processada' && p.updated_at?.startsWith(hoje)).length || 0
      const urgentes = data?.filter(p => p.urgente).length || 0

      setStats({
        pendentes,
        processadasHoje,
        urgentes,
        prazosCriados: 0 // TODO: calcular prazos criados
      })

      // Detectar possíveis duplicatas (por hash_conteudo ou numero_processo + data)
      const gruposDuplicatas: DuplicataGrupo[] = []
      const pubsNaoRevisadas = (data || []).filter(p => !p.duplicata_revisada && p.status !== 'arquivada')

      // Agrupar por hash_conteudo
      const porHash = new Map<string, Publicacao[]>()
      pubsNaoRevisadas.forEach(pub => {
        if (pub.hash_conteudo) {
          const grupo = porHash.get(pub.hash_conteudo) || []
          grupo.push(pub)
          porHash.set(pub.hash_conteudo, grupo)
        }
      })

      // Adicionar grupos com mais de uma publicação
      porHash.forEach((pubs, hash) => {
        if (pubs.length > 1) {
          gruposDuplicatas.push({ hash, publicacoes: pubs })
        }
      })

      // Também verificar por numero_processo + data_publicacao (se hash diferente)
      const porProcessoData = new Map<string, Publicacao[]>()
      pubsNaoRevisadas.forEach(pub => {
        if (pub.numero_processo && pub.data_publicacao) {
          const chave = `${pub.numero_processo}-${pub.data_publicacao}`
          const grupo = porProcessoData.get(chave) || []
          grupo.push(pub)
          porProcessoData.set(chave, grupo)
        }
      })

      porProcessoData.forEach((pubs, chave) => {
        // Só adiciona se não já estiver no grupo por hash
        if (pubs.length > 1) {
          const hashesNoGrupo = new Set(pubs.map(p => p.hash_conteudo).filter(Boolean))
          const jaNoGrupoHash = gruposDuplicatas.some(g =>
            pubs.every(p => p.hash_conteudo === g.hash)
          )
          if (!jaNoGrupoHash) {
            gruposDuplicatas.push({ hash: chave, publicacoes: pubs })
          }
        }
      })

      setDuplicataGrupos(gruposDuplicatas)
    } finally {
      setCarregando(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    carregarPublicacoes()
  }, [carregarPublicacoes])

  // Sincronizar todas as fontes (AASP + Escavador)
  const handleSincronizar = async () => {
    toast.info('Iniciando sincronização...')

    let totalNovas = 0
    let erros: string[] = []

    // Sincronizar AASP
    try {
      const resultadoAasp = await sincronizarTodos()
      if (resultadoAasp.sucesso) {
        totalNovas += resultadoAasp.publicacoes_novas || 0
      } else {
        erros.push(`AASP: ${resultadoAasp.mensagem}`)
      }
    } catch (e: any) {
      erros.push(`AASP: ${e.message}`)
    }

    // Sincronizar Escavador (se tiver termos cadastrados)
    if (termosEscavador.length > 0) {
      try {
        const resultadoEscavador = await sincronizarEscavador()
        if (resultadoEscavador.sucesso) {
          totalNovas += resultadoEscavador.publicacoes_novas || 0
        } else {
          erros.push(`Diário Oficial: ${resultadoEscavador.mensagem}`)
        }
      } catch (e: any) {
        erros.push(`Diário Oficial: ${e.message}`)
      }
    }

    // Recarregar publicações após sync
    await carregarPublicacoes()

    // Mostrar resultado
    if (erros.length === 0) {
      toast.success('Sincronização concluída!')
      if (totalNovas > 0) {
        toast.info(`${totalNovas} novas publicações encontradas!`)
      }
    } else {
      toast.warning(`Sincronização parcial: ${erros.join(', ')}`)
    }
  }

  // Marcar publicação como não duplicata (revisada)
  const marcarComoRevisada = async (pubId: string) => {
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ duplicata_revisada: true })
        .eq('id', pubId)

      if (error) throw error

      toast.success('Publicação marcada como revisada')
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao marcar como revisada:', err)
      toast.error('Erro ao atualizar publicação')
    }
  }

  // Arquivar duplicata
  const arquivarDuplicata = async (pubId: string) => {
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada', duplicata_revisada: true })
        .eq('id', pubId)

      if (error) throw error

      toast.success('Duplicata arquivada')
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar publicação')
    }
  }

  // Manter apenas uma publicação (arquiva as outras)
  const manterApenas = async (pubIdManter: string, grupoHash: string) => {
    const grupo = duplicataGrupos.find(g => g.hash === grupoHash)
    if (!grupo) return

    try {
      const idsArquivar = grupo.publicacoes.filter(p => p.id !== pubIdManter).map(p => p.id)

      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada', duplicata_revisada: true })
        .in('id', idsArquivar)

      if (error) throw error

      // Marcar a mantida como revisada também
      await supabase
        .from('publicacoes_publicacoes')
        .update({ duplicata_revisada: true })
        .eq('id', pubIdManter)

      toast.success('Duplicatas arquivadas com sucesso')
      await carregarPublicacoes()
    } catch (err) {
      console.error('Erro ao arquivar duplicatas:', err)
      toast.error('Erro ao processar duplicatas')
    }
  }

  // Filtrar publicações
  const publicacoesFiltradas = publicacoes.filter(pub => {
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase()
      const matchBusca =
        pub.numero_processo?.toLowerCase().includes(busca) ||
        pub.tribunal?.toLowerCase().includes(busca) ||
        pub.texto_completo?.toLowerCase().includes(busca)
      if (!matchBusca) return false
    }
    if (filtros.status !== 'todos' && pub.status !== filtros.status) return false
    if (filtros.tipo !== 'todos' && pub.tipo_publicacao !== filtros.tipo) return false
    if (filtros.apenasUrgentes && !pub.urgente) return false
    return true
  })

  const getStatusBadge = (status: StatusPublicacao) => {
    const variants = {
      pendente: 'bg-red-100 text-red-700 border-red-200',
      em_analise: 'bg-amber-100 text-amber-700 border-amber-200',
      processada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivada: 'bg-slate-100 text-slate-600 border-slate-200'
    }

    const labels = {
      pendente: 'Pendente',
      em_analise: 'Em Análise',
      processada: 'Processada',
      arquivada: 'Arquivada'
    }

    return (
      <Badge variant="outline" className={cn('text-[10px] font-medium border', variants[status])}>
        {labels[status]}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: TipoPublicacao) => {
    const labels: Record<TipoPublicacao, string> = {
      intimacao: 'Intimação',
      sentenca: 'Sentença',
      despacho: 'Despacho',
      decisao: 'Decisão',
      acordao: 'Acórdão',
      citacao: 'Citação',
      outro: 'Outro'
    }
    return labels[tipo] || tipo
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-[#34495e]">Publicações & Intimações</h1>
            <p className="text-sm text-slate-600">Gestão de publicações e intimações</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSincronizar}
              disabled={sincronizando}
            >
              {sincronizando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Link href="/dashboard/publicacoes/config">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pendentes"
          value={stats.pendentes}
          subtitle="Aguardando análise"
          icon={Clock}
          gradient="kpi1"
        />

        <MetricCard
          title="Processadas Hoje"
          value={stats.processadasHoje}
          subtitle="Nas últimas 24h"
          icon={CheckCircle2}
          gradient="kpi2"
        />

        <MetricCard
          title="Urgentes"
          value={stats.urgentes}
          subtitle="Requerem atenção"
          icon={AlertTriangle}
          gradient="kpi3"
        />

        <MetricCard
          title="Prazos Criados"
          value={stats.prazosCriados}
          subtitle="A partir de publicações"
          icon={Calendar}
          gradient="kpi4"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por processo, cliente..."
              className="pl-9"
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>

          <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="processada">Processada</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.tipo} onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="intimacao">Intimação</SelectItem>
              <SelectItem value="sentenca">Sentença</SelectItem>
              <SelectItem value="despacho">Despacho</SelectItem>
              <SelectItem value="decisao">Decisão</SelectItem>
              <SelectItem value="acordao">Acórdão</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filtros.apenasUrgentes ? 'default' : 'outline'}
            className={cn(
              'gap-2',
              filtros.apenasUrgentes && 'bg-red-600 hover:bg-red-700'
            )}
            onClick={() => setFiltros({ ...filtros, apenasUrgentes: !filtros.apenasUrgentes })}
          >
            <AlertTriangle className="w-4 h-4" />
            {filtros.apenasUrgentes ? 'Mostrando Urgentes' : 'Apenas Urgentes'}
          </Button>
        </div>
      </div>

      {/* Tabs: Todas / Duplicatas */}
      <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as 'todas' | 'duplicatas')} className="mb-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="todas" className="gap-2">
            Todas
            <Badge variant="outline" className="text-[10px] ml-1">{publicacoes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="duplicatas" className="gap-2">
            <Copy className="w-3.5 h-3.5" />
            Possíveis Duplicatas
            {duplicataGrupos.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1 bg-amber-100 text-amber-700 border-amber-200">
                {duplicataGrupos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Conteúdo baseado na aba ativa */}
      {abaAtiva === 'todas' ? (
        /* Tabela de Publicações */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Publicações Recebidas</h2>
          </div>

        {carregando ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Carregando publicações...</p>
          </div>
        ) : publicacoesFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileX className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Nenhuma publicação encontrada</h3>
            <p className="text-xs text-slate-500 mb-4">
              {publicacoes.length === 0
                ? 'Não há publicações recebidas ainda. Configure as fontes de publicações.'
                : 'Nenhuma publicação corresponde aos filtros selecionados.'}
            </p>
            <div className="flex items-center gap-2 justify-center">
              {publicacoes.length === 0 ? (
                <Link href="/dashboard/publicacoes/config">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]">
                    <Settings className="w-4 h-4" />
                    Configurar Fontes
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltros({ busca: '', status: 'todos', tipo: 'todos', apenasUrgentes: false })}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Data</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tribunal</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Processo</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-slate-600 p-3">Prazo</th>
                  <th className="text-right text-xs font-medium text-slate-600 p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {publicacoesFiltradas.map((pub) => (
                  <tr
                    key={pub.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/publicacoes/${pub.id}`)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(pub.status)}
                        {pub.urgente && (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                            Urgente
                          </Badge>
                        )}
                        {pub.agendamento_tipo && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {pub.agendamento_tipo === 'tarefa' && <CheckSquare className="w-3 h-3 mr-1" />}
                            {pub.agendamento_tipo === 'compromisso' && <Calendar className="w-3 h-3 mr-1" />}
                            {pub.agendamento_tipo === 'audiencia' && <Gavel className="w-3 h-3 mr-1" />}
                            Agendado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">
                        {new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="text-sm font-medium text-slate-700 truncate max-w-[200px]" title={pub.tribunal}>{pub.tribunal}</div>
                        {pub.vara && <div className="text-xs text-slate-500">{pub.vara}</div>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">{getTipoLabel(pub.tipo_publicacao)}</span>
                    </td>
                    <td className="p-3">
                      {pub.numero_processo ? (
                        pub.processo_id ? (
                          <span
                            className="text-sm text-[#1E3A8A] font-mono hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/processos/${pub.processo_id}`)
                            }}
                          >
                            {pub.numero_processo}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-slate-700">{pub.numero_processo}</span>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Sem pasta
                            </Badge>
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-700">{pub.cliente_nome || '-'}</span>
                    </td>
                    <td className="p-3">
                      {pub.tem_prazo ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          {pub.prazo_dias} dias
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => router.push(`/dashboard/publicacoes/${pub.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => router.push(`/dashboard/publicacoes/processar/${pub.id}`)}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      ) : (
        /* Aba de Duplicatas */
        <div className="space-y-4">
          {duplicataGrupos.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Nenhuma duplicata encontrada</h3>
              <p className="text-xs text-slate-500">
                Todas as publicações foram revisadas ou não há duplicatas detectadas.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800">
                      {duplicataGrupos.length} grupo{duplicataGrupos.length > 1 ? 's' : ''} de possíveis duplicatas
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">
                      Revise cada grupo e decida qual publicação manter. As duplicatas serão arquivadas.
                    </p>
                  </div>
                </div>
              </div>

              {duplicataGrupos.map((grupo, index) => (
                <div key={grupo.hash} className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Grupo {index + 1}: {grupo.publicacoes.length} publicações similares
                      </h3>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        <Copy className="w-3 h-3 mr-1" />
                        Possível duplicata
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {grupo.publicacoes.map((pub) => (
                        <div
                          key={pub.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(pub.status)}
                                {pub.urgente && (
                                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                    Urgente
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div>
                              <div className="text-xs text-slate-500">Tribunal</div>
                              <div className="text-sm font-medium text-slate-700">{pub.tribunal}</div>
                            </div>
                            {pub.numero_processo && (
                              <div>
                                <div className="text-xs text-slate-500">Processo</div>
                                <div className="text-sm font-mono text-slate-700">{pub.numero_processo}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-slate-500">Tipo</div>
                              <div className="text-sm text-slate-700">{getTipoLabel(pub.tipo_publicacao)}</div>
                            </div>
                            {pub.texto_completo && (
                              <div>
                                <div className="text-xs text-slate-500">Trecho</div>
                                <div className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded">
                                  {pub.texto_completo.substring(0, 200)}...
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <Button
                              size="sm"
                              className="flex-1 gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                              onClick={() => manterApenas(pub.id, grupo.hash)}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Manter Esta
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => router.push(`/dashboard/publicacoes/${pub.id}`)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => arquivarDuplicata(pub.id)}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          // Marcar todas como revisadas (manter todas)
                          grupo.publicacoes.forEach(pub => marcarComoRevisada(pub.id))
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Não são duplicatas - Manter todas
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
