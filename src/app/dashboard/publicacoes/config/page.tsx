'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
  Search,
  FileText,
  Link2,
  Bug,
  Copy,
  Check
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAaspAssociados, AaspAssociado, NovoAssociado } from '@/hooks/useAaspAssociados'
import { useAaspSync } from '@/hooks/useAaspSync'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { useEscavadorTermos, TermoEscavador, CriarTermoData } from '@/hooks/useEscavadorTermos'
import { formatBrazilDateTime } from '@/lib/timezone'
import { toast } from 'sonner'

const UFS_BRASIL = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

export default function ConfiguracoesPublicacoesPage() {
  const { escritorioAtivo, loading: loadingEscritorio } = useEscritorioAtivo()
  // escritorioAtivo pode ser string (ID) ou null
  const escritorioId = escritorioAtivo as string | null

  const {
    associados,
    carregando: carregandoAssociados,
    adicionarAssociado,
    atualizarAssociado,
    removerAssociado,
    toggleAtivo,
    testarConexao,
    recarregar: recarregarAssociados
  } = useAaspAssociados(escritorioId ?? undefined)

  const {
    sincronizando,
    historicoSync,
    carregandoHistorico,
    sincronizarTodos,
    diagnosticarAPI,
    getHistorico
  } = useAaspSync(escritorioId ?? undefined)

  // Hook para gerenciar termos do Escavador
  const {
    termos: termosEscavador,
    loading: carregandoTermos,
    sincronizando: sincronizandoEscavador,
    historicoSync: historicoEscavador,
    adicionarTermo,
    editarTermo,
    removerTermo,
    ativarTermo,
    sincronizar: sincronizarEscavador,
    diagnosticarAPI: diagnosticarEscavador,
    carregarTermos,
    temErros: temErrosEscavador,
    temPendentes: temTermosPendentes
  } = useEscavadorTermos(escritorioId ?? undefined)

  const [ativandoTermo, setAtivandoTermo] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState('associados')

  // Modal de adicionar/editar associado
  const [modalAberto, setModalAberto] = useState(false)
  const [associadoEditando, setAssociadoEditando] = useState<AaspAssociado | null>(null)
  const [formAssociado, setFormAssociado] = useState<NovoAssociado>({
    nome: '',
    oab_numero: '',
    oab_uf: 'SP',
    aasp_chave: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [mostrarChave, setMostrarChave] = useState(false)
  const [testandoChave, setTestandoChave] = useState(false)

  // Modal de confirmação de exclusão
  const [associadoExcluir, setAssociadoExcluir] = useState<AaspAssociado | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Modal de adicionar/editar termo Escavador
  const [modalTermoAberto, setModalTermoAberto] = useState(false)
  const [termoEditando, setTermoEditando] = useState<TermoEscavador | null>(null)
  const [formTermo, setFormTermo] = useState<CriarTermoData>({
    termo: '',
    descricao: '',
    variacoes: []
  })
  const [salvandoTermo, setSalvandoTermo] = useState(false)
  const [variacaoInput, setVariacaoInput] = useState('')
  const [termoExcluir, setTermoExcluir] = useState<TermoEscavador | null>(null)
  const [excluindoTermo, setExcluindoTermo] = useState(false)

  // Modal diagnóstico API
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false)
  const [diagnosticando, setDiagnosticando] = useState(false)
  const [diagnosticoResultado, setDiagnosticoResultado] = useState<any>(null)
  const [copiado, setCopiado] = useState(false)

  const handleDiagnosticar = async (associado: AaspAssociado) => {
    setDiagnosticando(true)
    setDiagnosticoAberto(true)
    setDiagnosticoResultado(null)
    setCopiado(false)

    try {
      const resultado = await diagnosticarAPI(associado.id)
      setDiagnosticoResultado(resultado)

      if (!resultado.sucesso) {
        toast.error(resultado.mensagem)
      }
    } catch (error: any) {
      setDiagnosticoResultado({ sucesso: false, mensagem: error.message })
      toast.error(`Erro: ${error.message}`)
    } finally {
      setDiagnosticando(false)
    }
  }

  const handleCopiarDiagnostico = async () => {
    if (!diagnosticoResultado) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticoResultado, null, 2))
      setCopiado(true)
      toast.success('JSON copiado!')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const handleDiagnosticarEscavador = async (termo: TermoEscavador) => {
    setDiagnosticando(true)
    setDiagnosticoAberto(true)
    setDiagnosticoResultado(null)
    setCopiado(false)

    try {
      const resultado = await diagnosticarEscavador(termo.id)
      setDiagnosticoResultado(resultado)

      if (!resultado.sucesso) {
        toast.error(resultado.mensagem)
      }
    } catch (error: any) {
      setDiagnosticoResultado({ sucesso: false, mensagem: error.message })
      toast.error(`Erro: ${error.message}`)
    } finally {
      setDiagnosticando(false)
    }
  }

  // Histórico agora é carregado automaticamente pelo hook useAaspSync

  const handleAbrirModal = (associado?: AaspAssociado) => {
    if (associado) {
      setAssociadoEditando(associado)
      setFormAssociado({
        nome: associado.nome,
        oab_numero: associado.oab_numero,
        oab_uf: associado.oab_uf,
        aasp_chave: associado.aasp_chave
      })
    } else {
      setAssociadoEditando(null)
      setFormAssociado({
        nome: '',
        oab_numero: '',
        oab_uf: 'SP',
        aasp_chave: ''
      })
    }
    setMostrarChave(false)
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setAssociadoEditando(null)
    setFormAssociado({
      nome: '',
      oab_numero: '',
      oab_uf: 'SP',
      aasp_chave: ''
    })
  }

  const handleSalvarAssociado = async () => {
    if (!formAssociado.nome || !formAssociado.oab_numero || !formAssociado.aasp_chave) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSalvando(true)

    try {
      if (associadoEditando) {
        const sucesso = await atualizarAssociado(associadoEditando.id, formAssociado)
        if (sucesso) {
          toast.success('Associado atualizado com sucesso')
          handleFecharModal()
        }
      } else {
        const novoAssociado = await adicionarAssociado(formAssociado)
        if (novoAssociado) {
          toast.success('Associado adicionado com sucesso')
          handleFecharModal()
        }
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleTestarChave = async () => {
    if (!formAssociado.aasp_chave) {
      toast.error('Digite a chave API para testar')
      return
    }

    setTestandoChave(true)

    try {
      const resultado = await testarConexao(formAssociado.aasp_chave)

      if (resultado.sucesso) {
        toast.success(resultado.mensagem)
      } else {
        toast.error(resultado.mensagem)
      }
    } finally {
      setTestandoChave(false)
    }
  }

  const handleExcluirAssociado = async () => {
    if (!associadoExcluir) return

    setExcluindo(true)

    try {
      const sucesso = await removerAssociado(associadoExcluir.id)
      if (sucesso) {
        toast.success('Associado removido com sucesso')
      }
    } finally {
      setExcluindo(false)
      setAssociadoExcluir(null)
    }
  }

  const handleToggleAtivo = async (associado: AaspAssociado) => {
    const novoStatus = !associado.ativo
    const sucesso = await toggleAtivo(associado.id, novoStatus)

    if (sucesso) {
      toast.success(novoStatus ? 'Associado ativado' : 'Associado desativado')
    }
  }

  // ===== HANDLERS ESCAVADOR =====
  const handleAbrirModalTermo = (termo?: TermoEscavador) => {
    if (termo) {
      // Modo edição
      setTermoEditando(termo)
      setFormTermo({
        termo: termo.termo,
        descricao: termo.descricao || '',
        variacoes: termo.variacoes || []
      })
    } else {
      // Modo criação
      setTermoEditando(null)
      setFormTermo({ termo: '', descricao: '', variacoes: [] })
    }
    setVariacaoInput('')
    setModalTermoAberto(true)
  }

  const handleFecharModalTermo = () => {
    setModalTermoAberto(false)
    setTermoEditando(null)
    setFormTermo({ termo: '', descricao: '', variacoes: [] })
    setVariacaoInput('')
  }

  const handleAdicionarVariacao = () => {
    const variacao = variacaoInput.trim()
    if (variacao && !formTermo.variacoes?.includes(variacao)) {
      setFormTermo({
        ...formTermo,
        variacoes: [...(formTermo.variacoes || []), variacao]
      })
      setVariacaoInput('')
    }
  }

  const handleRemoverVariacao = (variacao: string) => {
    setFormTermo({
      ...formTermo,
      variacoes: formTermo.variacoes?.filter(v => v !== variacao) || []
    })
  }

  const handleSalvarTermo = async () => {
    if (!termoEditando && (!formTermo.termo || formTermo.termo.trim().length < 3)) {
      toast.error('O termo deve ter pelo menos 3 caracteres')
      return
    }

    setSalvandoTermo(true)

    try {
      if (termoEditando) {
        // Modo edição - apenas atualiza variações e descrição
        const resultado = await editarTermo(termoEditando.id, {
          variacoes: formTermo.variacoes,
          descricao: formTermo.descricao
        })

        if (resultado.sucesso) {
          toast.success('Termo atualizado com sucesso')
          handleFecharModalTermo()
        } else {
          toast.error(resultado.erro || 'Erro ao atualizar termo')
        }
      } else {
        // Modo criação
        const resultado = await adicionarTermo(formTermo)

        if (resultado.sucesso) {
          toast.success('Termo adicionado com sucesso')
          handleFecharModalTermo()
        } else {
          toast.error(resultado.erro || 'Erro ao adicionar termo')
        }
      }
    } finally {
      setSalvandoTermo(false)
    }
  }

  const handleExcluirTermo = async () => {
    if (!termoExcluir) return

    setExcluindoTermo(true)

    try {
      const resultado = await removerTermo(termoExcluir.id)
      if (resultado.sucesso) {
        toast.success('Termo removido com sucesso')
      } else {
        toast.error(resultado.erro || 'Erro ao remover termo')
      }
    } finally {
      setExcluindoTermo(false)
      setTermoExcluir(null)
    }
  }

  const handleSincronizarEscavador = async (termoId?: string) => {
    toast.info('Iniciando sincronização Escavador...')

    try {
      const resultado = await sincronizarEscavador(termoId)

      if (resultado.sucesso) {
        toast.success(resultado.mensagem)
        if (resultado.publicacoes_novas > 0) {
          toast.info(`${resultado.publicacoes_novas} novas publicações encontradas`)
        }
        if (resultado.publicacoes_vinculadas > 0) {
          toast.info(`${resultado.publicacoes_vinculadas} publicações vinculadas a processos`)
        }
      } else {
        toast.error(resultado.mensagem)
      }
    } catch (error: any) {
      console.error('Erro na sincronização Escavador:', error)
      toast.error(`Erro: ${error.message}`)
    }
  }

  const handleAtivarTermo = async (termoId: string) => {
    setAtivandoTermo(termoId)
    toast.info('Registrando termo no Escavador...')

    try {
      const resultado = await ativarTermo(termoId)

      if (resultado.sucesso) {
        toast.success('Termo registrado com sucesso no Escavador!')
      } else {
        toast.error(resultado.erro || 'Erro ao ativar termo')
      }
    } catch (error: any) {
      console.error('Erro ao ativar termo:', error)
      toast.error(`Erro: ${error.message}`)
    } finally {
      setAtivandoTermo(null)
    }
  }

  const getStatusBadge = (status: TermoEscavador['escavador_status'], temMonitoramentoId: boolean) => {
    // Se não tem monitoramento_id, mostrar como "Não Registrado"
    if (!temMonitoramentoId) {
      return { label: 'Não Registrado', class: 'bg-orange-50 text-orange-700 border-orange-200' }
    }

    const configs = {
      ativo: { label: 'Ativo', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      pendente: { label: 'Pendente', class: 'bg-amber-50 text-amber-700 border-amber-200' },
      pausado: { label: 'Pausado', class: 'bg-slate-100 text-slate-600 border-slate-200' },
      erro: { label: 'Erro', class: 'bg-red-50 text-red-700 border-red-200' },
      removido: { label: 'Removido', class: 'bg-slate-100 text-slate-500 border-slate-200' }
    }
    return configs[status] || configs.pendente
  }

  const handleSincronizar = async () => {
    console.log('=== INICIANDO SINCRONIZAÇÃO ===')
    console.log('Escritório ID:', escritorioId)
    console.log('Associados ativos:', associados.filter(a => a.ativo).length)

    toast.info('Iniciando sincronização...')

    try {
      const resultado = await sincronizarTodos()
      console.log('Resultado da sincronização:', resultado)

      if (resultado.sucesso) {
        toast.success(resultado.mensagem)
        if (resultado.publicacoes_novas && resultado.publicacoes_novas > 0) {
          toast.info(`${resultado.publicacoes_novas} novas publicações encontradas`)
        }
      } else {
        toast.error(resultado.mensagem)
      }
    } catch (error: any) {
      console.error('Erro na sincronização:', error)
      toast.error(`Erro: ${error.message}`)
    }

    // Recarregar associados para atualizar ultima_sync
    recarregarAssociados()
  }

  const temAssociadosAtivos = associados.some(a => a.ativo)

  // Loading inicial do escritório
  if (loadingEscritorio || !escritorioId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/publicacoes">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-700">Configurações de Publicações</h1>
                  <p className="text-xs text-slate-500">AASP e Diário Oficial</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs border',
                  temAssociadosAtivos
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {temAssociadosAtivos ? `${associados.filter(a => a.ativo).length} AASP` : 'AASP Inativo'}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs border',
                  termosEscavador.length > 0
                    ? temErrosEscavador
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {termosEscavador.length > 0 ? `${termosEscavador.length} Termo(s)` : 'Diário Inativo'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="associados" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-2" />
              AASP
            </TabsTrigger>
            <TabsTrigger value="escavador" className="text-xs">
              <Search className="w-3.5 h-3.5 mr-2" />
              Busca Diário Oficial
            </TabsTrigger>
            <TabsTrigger value="sincronizacao" className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sincronização
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Associados */}
          <TabsContent value="associados" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Advogados Associados</h3>
                  <p className="text-xs text-slate-500">Cadastre os advogados que terão publicações monitoradas</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAbrirModal()}
                  className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar Associado
                </Button>
              </div>

              {carregandoAssociados ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : associados.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 font-medium">Nenhum associado cadastrado</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Adicione os advogados do escritório para começar a receber publicações
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAbrirModal()}
                    className="mt-4 gap-2"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Primeiro Associado
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {associados.map((associado) => (
                    <div
                      key={associado.id}
                      className={cn(
                        'px-5 py-4 flex items-center justify-between',
                        !associado.ativo && 'bg-slate-50 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm',
                          associado.ativo
                            ? 'bg-gradient-to-br from-[#34495e] to-[#46627f]'
                            : 'bg-slate-400'
                        )}>
                          {associado.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {associado.nome}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                associado.ativo
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              )}
                            >
                              {associado.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">
                              OAB {associado.oab_numero}/{associado.oab_uf}
                            </span>
                            {associado.ultima_sync && (
                              <span className="text-xs text-slate-400">
                                Última sync: {formatBrazilDateTime(associado.ultima_sync)}
                              </span>
                            )}
                            {associado.publicacoes_sync_count > 0 && (
                              <span className="text-xs text-slate-400">
                                {associado.publicacoes_sync_count} publicações
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDiagnosticar(associado)}
                          className="text-slate-500 hover:text-amber-600"
                          title="Diagnosticar API AASP"
                        >
                          <Bug className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAtivo(associado)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          {associado.ativo ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirModal(associado)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssociadoExcluir(associado)}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info sobre API */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Como obter a chave API?</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Acesse o portal da AASP em{' '}
                    <a
                      href="https://intimacaoapi-cadastro.aasp.org.br/cadastroassoc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      intimacaoapi-cadastro.aasp.org.br
                    </a>{' '}
                    e cadastre cada advogado para obter sua chave individual.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Escavador Termos */}
          <TabsContent value="escavador" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Termos Monitorados</h3>
                  <p className="text-xs text-slate-500">Monitore publicações por termos nos Diários Oficiais</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSincronizarEscavador()}
                    disabled={sincronizandoEscavador || termosEscavador.length === 0}
                    className="gap-2"
                  >
                    {sincronizandoEscavador ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sincronizar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAbrirModalTermo()}
                    className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Termo
                  </Button>
                </div>
              </div>

              {carregandoTermos ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : termosEscavador.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 font-medium">Nenhum termo cadastrado</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Adicione termos para monitorar publicações em Diários Oficiais
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAbrirModalTermo()}
                    className="mt-4 gap-2"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Primeiro Termo
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {termosEscavador.map((termo) => {
                    const temMonitoramentoId = !!termo.escavador_monitoramento_id
                    const statusConfig = getStatusBadge(termo.escavador_status, temMonitoramentoId)
                    return (
                      <div
                        key={termo.id}
                        className={cn(
                          'px-5 py-4 flex items-center justify-between',
                          !termo.ativo && 'bg-slate-50 opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-white',
                            !temMonitoramentoId
                              ? 'bg-orange-500'
                              : termo.escavador_status === 'erro'
                              ? 'bg-red-500'
                              : termo.ativo
                                ? 'bg-gradient-to-br from-[#34495e] to-[#46627f]'
                                : 'bg-slate-400'
                          )}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">
                                {termo.termo}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px]', statusConfig.class)}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {termo.descricao && (
                                <span className="text-xs text-slate-500">
                                  {termo.descricao}
                                </span>
                              )}
                              {termo.variacoes && termo.variacoes.length > 0 && (
                                <span className="text-xs text-slate-400">
                                  +{termo.variacoes.length} variações
                                </span>
                              )}
                              {termo.total_aparicoes > 0 && (
                                <span className="text-xs text-slate-400">
                                  {termo.total_aparicoes} aparições
                                </span>
                              )}
                              {termo.ultima_sync && (
                                <span className="text-xs text-slate-400">
                                  Sync: {formatBrazilDateTime(termo.ultima_sync)}
                                </span>
                              )}
                            </div>
                            {termo.escavador_erro && (
                              <p className="text-xs text-red-600 mt-1">
                                Erro: {termo.escavador_erro}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiagnosticarEscavador(termo)}
                            className="text-slate-500 hover:text-amber-600"
                            title="Diagnosticar API Escavador"
                          >
                            <Bug className="w-4 h-4" />
                          </Button>
                          {!temMonitoramentoId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAtivarTermo(termo.id)}
                              disabled={ativandoTermo === termo.id}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              title="Registrar termo no Escavador"
                            >
                              {ativandoTermo === termo.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                              )}
                              Ativar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSincronizarEscavador(termo.id)}
                              disabled={sincronizandoEscavador}
                              className="text-slate-500 hover:text-slate-700"
                              title="Sincronizar este termo"
                            >
                              <RefreshCw className={cn(
                                'w-4 h-4',
                                sincronizandoEscavador && 'animate-spin'
                              )} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirModalTermo(termo)}
                            className="text-slate-500 hover:text-blue-600"
                            title="Editar variações"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTermoExcluir(termo)}
                            className="text-slate-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Alerta de termos não registrados */}
            {temTermosPendentes && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">Termos aguardando ativação</h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Alguns termos não foram registrados no Escavador. Clique em &quot;Ativar&quot; em cada termo
                      para registrá-los e começar a receber publicações.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info sobre Diário Oficial */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Vinculação Automática com Processos</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    As publicações do Diário Oficial são automaticamente vinculadas aos processos cadastrados
                    quando o número CNJ é identificado no texto da publicação.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Sincronização */}
          <TabsContent value="sincronizacao" className="space-y-4">
            {/* Card de Sincronização Unificada */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Sincronização Manual</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Busca publicações de todas as fontes configuradas (AASP e Diário Oficial)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Automático: 07h e 15h</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    temAssociadosAtivos ? 'bg-emerald-500' : 'bg-slate-300'
                  )} />
                  <span className="text-xs text-slate-600">
                    AASP: {temAssociadosAtivos ? `${associados.filter(a => a.ativo).length} associado(s)` : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    termosEscavador.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  )} />
                  <span className="text-xs text-slate-600">
                    Diário Oficial: {termosEscavador.length > 0 ? `${termosEscavador.length} termo(s)` : 'Inativo'}
                  </span>
                </div>
              </div>

              <Button
                onClick={async () => {
                  toast.info('Iniciando sincronização...')
                  let totalNovas = 0
                  let erros: string[] = []

                  // AASP
                  if (temAssociadosAtivos) {
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
                  }

                  // Escavador
                  if (termosEscavador.length > 0) {
                    try {
                      const resultadoEsc = await sincronizarEscavador()
                      if (resultadoEsc.sucesso) {
                        totalNovas += resultadoEsc.publicacoes_novas || 0
                      } else {
                        erros.push(`Diário: ${resultadoEsc.mensagem}`)
                      }
                    } catch (e: any) {
                      erros.push(`Diário: ${e.message}`)
                    }
                  }

                  if (erros.length === 0) {
                    toast.success('Sincronização concluída!')
                    if (totalNovas > 0) {
                      toast.info(`${totalNovas} novas publicações encontradas`)
                    }
                  } else {
                    toast.warning(`Erros: ${erros.join(', ')}`)
                  }

                  // Recarrega histórico
                  getHistorico(20)
                }}
                disabled={sincronizando || sincronizandoEscavador || (!temAssociadosAtivos && termosEscavador.length === 0)}
                className="w-full gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                size="lg"
              >
                {(sincronizando || sincronizandoEscavador) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Sincronizar Agora
                  </>
                )}
              </Button>

              {(!temAssociadosAtivos && termosEscavador.length === 0) && (
                <p className="text-xs text-amber-600 text-center mt-3">
                  Configure pelo menos uma fonte de publicações (AASP ou Diário Oficial)
                </p>
              )}
            </div>

            {/* Histórico Unificado */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Histórico de Sincronizações</h3>
                <p className="text-xs text-slate-500 mt-0.5">Últimas sincronizações realizadas (manual e automático)</p>
              </div>

              {carregandoHistorico ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (historicoSync.length === 0 && historicoEscavador.length === 0) ? (
                <div className="p-8 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma sincronização realizada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Data/Hora</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Fonte</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Novas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* Combina e ordena histórico de ambas as fontes */}
                      {[
                        ...historicoSync.map(s => ({ ...s, fonte: 'AASP' as const })),
                        ...historicoEscavador.map(s => ({ ...s, fonte: 'Diário' as const }))
                      ]
                        .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())
                        .slice(0, 15)
                        .map((sync) => (
                          <tr key={`${sync.fonte}-${sync.id}`} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="text-sm text-slate-700">
                                {formatBrazilDateTime(sync.data_inicio)}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  sync.fonte === 'AASP'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {sync.fonte}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {sync.tipo}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {sync.sucesso ? (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Sucesso
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Erro
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-sm font-medium text-slate-700">
                                {sync.publicacoes_novas || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Adicionar/Editar Associado */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {associadoEditando ? 'Editar Associado' : 'Adicionar Associado'}
            </DialogTitle>
            <DialogDescription>
              {associadoEditando
                ? 'Atualize os dados do advogado'
                : 'Cadastre um advogado para monitorar suas publicações'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs">Nome Completo *</Label>
              <Input
                value={formAssociado.nome}
                onChange={(e) => setFormAssociado({ ...formAssociado, nome: e.target.value })}
                placeholder="Dr. João da Silva"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Número OAB *</Label>
                <Input
                  value={formAssociado.oab_numero}
                  onChange={(e) => setFormAssociado({ ...formAssociado, oab_numero: e.target.value })}
                  placeholder="123456"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">UF *</Label>
                <Select
                  value={formAssociado.oab_uf}
                  onValueChange={(value) => setFormAssociado({ ...formAssociado, oab_uf: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS_BRASIL.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Chave API AASP *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostrarChave ? 'text' : 'password'}
                    value={formAssociado.aasp_chave}
                    onChange={(e) => setFormAssociado({ ...formAssociado, aasp_chave: e.target.value })}
                    placeholder="Chave fornecida pela AASP"
                    className="text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarChave(!mostrarChave)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {mostrarChave ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestarChave}
                  disabled={testandoChave || !formAssociado.aasp_chave}
                  className="gap-2"
                >
                  {testandoChave ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Testar
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Obtenha a chave no portal da AASP
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFecharModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarAssociado}
              disabled={salvando}
              className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {associadoEditando ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Exclusão Associado */}
      <AlertDialog open={!!associadoExcluir} onOpenChange={() => setAssociadoExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Associado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{associadoExcluir?.nome}</strong>?
              As publicações já sincronizadas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirAssociado}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindo && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Adicionar/Editar Termo Escavador */}
      <Dialog open={modalTermoAberto} onOpenChange={setModalTermoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {termoEditando ? 'Editar Termo de Monitoramento' : 'Adicionar Termo de Monitoramento'}
            </DialogTitle>
            <DialogDescription>
              {termoEditando
                ? 'Edite as variações e descrição do termo'
                : 'O termo será monitorado em todos os Diários Oficiais disponíveis'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs">Termo Principal {!termoEditando && '*'}</Label>
              <Input
                value={formTermo.termo}
                onChange={(e) => setFormTermo({ ...formTermo, termo: e.target.value })}
                placeholder="Ex: João da Silva, Empresa XYZ LTDA"
                className="text-sm"
                disabled={!!termoEditando}
              />
              {termoEditando ? (
                <p className="text-xs text-amber-600 mt-1">
                  O termo principal não pode ser alterado após o cadastro
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Nome ou termo exato a ser monitorado (mínimo 3 caracteres)
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                value={formTermo.descricao || ''}
                onChange={(e) => setFormTermo({ ...formTermo, descricao: e.target.value })}
                placeholder="Ex: Cliente principal, Processo importante"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Variações (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={variacaoInput}
                  onChange={(e) => setVariacaoInput(e.target.value)}
                  placeholder="Ex: J. Silva, João S."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdicionarVariacao()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdicionarVariacao}
                  disabled={!variacaoInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Formas alternativas do termo (abreviações, variações de nome)
              </p>
              {formTermo.variacoes && formTermo.variacoes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formTermo.variacoes.map((variacao, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                    >
                      {variacao}
                      <button
                        onClick={() => handleRemoverVariacao(variacao)}
                        className="ml-1 hover:text-red-600"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFecharModalTermo}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarTermo}
              disabled={salvandoTermo || (!termoEditando && (!formTermo.termo || formTermo.termo.trim().length < 3))}
              className="gap-2 bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {salvandoTermo && <Loader2 className="w-4 h-4 animate-spin" />}
              {termoEditando ? 'Salvar Alterações' : 'Adicionar Termo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Exclusão Termo */}
      <AlertDialog open={!!termoExcluir} onOpenChange={() => setTermoExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Termo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o termo <strong>&quot;{termoExcluir?.termo}&quot;</strong>?
              O monitoramento será cancelado no Escavador e as publicações já sincronizadas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirTermo}
              disabled={excluindoTermo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindoTermo && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Diagnóstico API (AASP ou Escavador) */}
      <Dialog open={diagnosticoAberto} onOpenChange={setDiagnosticoAberto}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-amber-600" />
              Diagnóstico API
            </DialogTitle>
            <DialogDescription>
              Resposta RAW da API sem nenhum processamento
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {diagnosticando ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-sm text-slate-500">Consultando API...</p>
              </div>
            ) : diagnosticoResultado ? (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-auto max-h-[55vh] whitespace-pre-wrap break-words">
                {JSON.stringify(diagnosticoResultado, null, 2)}
              </pre>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiarDiagnostico}
              disabled={!diagnosticoResultado || diagnosticando}
              className="gap-2"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado!' : 'Copiar JSON'}
            </Button>
            <Button variant="outline" onClick={() => setDiagnosticoAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
