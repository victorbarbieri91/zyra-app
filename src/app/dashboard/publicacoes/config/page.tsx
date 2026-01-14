'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  Filter,
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
  UserPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
    getHistorico
  } = useAaspSync(escritorioId ?? undefined)

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

  // Carregar histórico ao montar
  useEffect(() => {
    if (escritorioId) {
      getHistorico(10)
    }
  }, [escritorioId, getHistorico])

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
                  <h1 className="text-base font-semibold text-slate-700">Configurações AASP</h1>
                  <p className="text-xs text-slate-500">Integração e sincronização de publicações</p>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'text-xs border',
                temAssociadosAtivos
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {temAssociadosAtivos ? `${associados.filter(a => a.ativo).length} Associado(s) Ativo(s)` : 'Nenhum Associado Ativo'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="associados" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-2" />
              Associados
            </TabsTrigger>
            <TabsTrigger value="sincronizacao" className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sincronização
            </TabsTrigger>
            <TabsTrigger value="regras" className="text-xs">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Regras
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

          {/* TAB 2: Sincronização */}
          <TabsContent value="sincronizacao" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Sincronização Manual</h3>
                <p className="text-xs text-slate-500">
                  Buscar novas publicações de todos os associados ativos
                </p>
              </div>

              <Button
                onClick={handleSincronizar}
                disabled={sincronizando || !temAssociadosAtivos}
                className="w-full gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                size="lg"
              >
                {sincronizando ? (
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

              {!temAssociadosAtivos && (
                <p className="text-xs text-amber-600 text-center">
                  Cadastre pelo menos um associado ativo para sincronizar
                </p>
              )}
            </div>

            {/* Histórico de Sincronizações */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Histórico de Sincronizações</h3>
              </div>

              {carregandoHistorico ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : historicoSync.length === 0 ? (
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
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Tipo</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Status</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Novas</th>
                        <th className="text-left text-xs font-medium text-slate-600 p-3">Atualizadas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historicoSync.map((sync) => (
                        <tr key={sync.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="text-sm text-slate-700">
                              {formatBrazilDateTime(sync.data_inicio)}
                            </div>
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
                          <td className="p-3">
                            <span className="text-sm text-slate-600">
                              {sync.publicacoes_atualizadas || 0}
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

          {/* TAB 3: Regras */}
          <TabsContent value="regras" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Regras de Processamento</h3>
                <p className="text-xs text-slate-500">Configure como as publicações serão processadas automaticamente</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs mb-3 block">Vinculação Automática</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="vincular-numero" defaultChecked />
                      <label htmlFor="vincular-numero" className="text-sm text-slate-700">
                        Auto-vincular por número CNJ do processo
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="vincular-cliente" defaultChecked />
                      <label htmlFor="vincular-cliente" className="text-sm text-slate-700">
                        Auto-vincular por nome do cliente
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Tipos que Geram Alerta Imediato</Label>
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {['intimacao', 'sentenca', 'despacho', 'decisao', 'acordao'].map((tipo) => (
                      <div key={tipo} className="flex items-center gap-2">
                        <Checkbox id={tipo} defaultChecked />
                        <label htmlFor={tipo} className="text-sm text-slate-700 capitalize">
                          {tipo === 'acordao' ? 'Acórdão' : tipo}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Detecção de Urgência</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Considerar urgente se prazo menor que
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue={5}
                      className="text-sm w-24"
                    />
                    <span className="text-sm text-slate-600">dias úteis</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
                  Salvar Regras
                </Button>
              </div>
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

      {/* Alert Dialog de Exclusão */}
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
    </div>
  )
}
