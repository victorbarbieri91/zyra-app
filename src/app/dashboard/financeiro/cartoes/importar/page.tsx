'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  ArrowLeft,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Eye,
  Pencil,
  Check,
  Trash2,
  RefreshCw,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoCredito,
  ImportacaoFatura,
} from '@/hooks/useCartoesCredito'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

// Interface para transação extraída
interface TransacaoExtraida {
  id: string
  data: string
  descricao: string
  valor: number
  parcela: string | null
  categoria_sugerida: string
  confianca: number
  selecionada: boolean
}

// Interface para dados extraídos
interface DadosExtraidos {
  transacoes: TransacaoExtraida[]
  valor_total: number
  data_vencimento: string | null
  data_fechamento: string | null
}

// Categorias disponíveis
const CATEGORIAS = [
  { value: 'custas', label: 'Custas' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'folha', label: 'Folha de Pagamento' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'capacitacao', label: 'Capacitação' },
  { value: 'material', label: 'Material' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'outras', label: 'Outras' },
]

export default function ImportarFaturaPage() {
  const router = useRouter()
  const { escritorioAtivo, loading: loadingEscritorio } = useEscritorioAtivo()
  const supabase = createClient()

  // States
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [importacoes, setImportacoes] = useState<ImportacaoFatura[]>([])
  const [selectedCartao, setSelectedCartao] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<'deepseek' | 'anthropic'>('deepseek')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Estado de revisão
  const [importacaoAtiva, setImportacaoAtiva] = useState<ImportacaoFatura | null>(null)
  const [transacoes, setTransacoes] = useState<TransacaoExtraida[]>([])
  const [dadosFatura, setDadosFatura] = useState<{ valor_total: number; data_vencimento: string | null; data_fechamento: string | null } | null>(null)
  const [importando, setImportando] = useState(false)

  // Modal de edição
  const [editingTransacao, setEditingTransacao] = useState<TransacaoExtraida | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const escritorioIds = escritoriosGrupo.map(e => e.id)

  const { loadCartoes, loadImportacoes, createImportacao } =
    useCartoesCredito(escritorioIds.length > 0 ? escritorioIds : escritorioAtivo)

  // Função de carregamento de dados (reusável)
  const loadData = useCallback(async () => {
    if (escritorioIds.length === 0 && !escritorioAtivo) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [cartoesData, importacoesData] = await Promise.all([
        loadCartoes(true),
        loadImportacoes(),
      ])
      setCartoes(cartoesData)
      setImportacoes(importacoesData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [escritorioIds.length, escritorioAtivo, loadCartoes, loadImportacoes])

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritorios = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
      } catch (error) {
        console.error('Erro ao carregar escritórios:', error)
      }
    }
    loadEscritorios()
  }, [])

  // Carregar dados quando escritórios estiverem disponíveis
  useEffect(() => {
    loadData()
  }, [loadData])

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos')
        return
      }
      setUploadedFile(file)
      // Limpar revisão anterior
      setImportacaoAtiva(null)
      setTransacoes([])
      setDadosFatura(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  // Upload e processar
  const handleUpload = async () => {
    if (!uploadedFile || !selectedCartao) {
      toast.error('Selecione um cartão e um arquivo PDF')
      return
    }

    // Pegar o escritório do cartão selecionado
    const cartaoSelecionado = cartoes.find(c => c.id === selectedCartao)
    if (!cartaoSelecionado) {
      toast.error('Cartão não encontrado')
      return
    }
    const escritorioDoCartao = cartaoSelecionado.escritorio_id

    setUploading(true)
    try {
      // 1. Upload do arquivo para o Storage
      const fileExt = uploadedFile.name.split('.').pop()
      const fileName = `${escritorioDoCartao}/${selectedCartao}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('faturas-cartao')
        .upload(fileName, uploadedFile)

      if (uploadError) {
        if (uploadError.message.includes('not found')) {
          toast.error('Bucket de armazenamento não configurado. Contate o administrador.')
          return
        }
        throw uploadError
      }

      // 2. Obter URL assinada (válida por 1 hora para processamento)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('faturas-cartao')
        .createSignedUrl(fileName, 3600)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Erro ao gerar URL de acesso ao arquivo')
      }

      // 3. Criar registro de importação
      const importacaoId = await createImportacao(
        selectedCartao,
        uploadedFile.name,
        signedUrlData.signedUrl,
        escritorioDoCartao
      )

      if (!importacaoId) {
        throw new Error('Erro ao criar registro de importação')
      }

      toast.info('Processando fatura com IA...')

      // 4. Chamar Edge Function para processar
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'processar-fatura-cartao',
        {
          body: {
            importacao_id: importacaoId,
            arquivo_url: signedUrlData.signedUrl,
            cartao_id: selectedCartao,
            provider: selectedProvider,
          },
        }
      )

      if (processError) {
        console.error('Erro na Edge Function:', processError)
        toast.error('Erro ao processar fatura: ' + processError.message)
        await loadData()
        return
      }

      if (!processData?.success) {
        toast.error('Erro ao processar fatura: ' + (processData?.error || 'Erro desconhecido'))
        await loadData()
        return
      }

      toast.success(`${processData.transacoes_encontradas} transações encontradas!`)

      // 5. Carregar a importação atualizada e mostrar para revisão
      await loadData()

      // Buscar a importação com os dados extraídos
      const { data: importacaoAtualizada } = await supabase
        .from('cartoes_credito_importacoes')
        .select('*')
        .eq('id', importacaoId)
        .single()

      if (importacaoAtualizada?.dados_extraidos) {
        const dados = importacaoAtualizada.dados_extraidos as DadosExtraidos
        setImportacaoAtiva(importacaoAtualizada as unknown as ImportacaoFatura)
        setTransacoes(
          (dados.transacoes || []).map((t, idx) => ({
            ...t,
            id: `t-${idx}`,
            selecionada: true,
          }))
        )
        setDadosFatura({
          valor_total: dados.valor_total,
          data_vencimento: dados.data_vencimento,
          data_fechamento: dados.data_fechamento,
        })
      }

      setUploadedFile(null)
    } catch (error: any) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar arquivo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // Carregar revisão de uma importação existente
  const handleRevisarImportacao = async (imp: ImportacaoFatura) => {
    if (imp.status !== 'concluido' || !imp.dados_extraidos) {
      toast.error('Esta importação não possui dados para revisar')
      return
    }

    const dados = imp.dados_extraidos as unknown as DadosExtraidos
    setImportacaoAtiva(imp)
    setTransacoes(
      (dados.transacoes || []).map((t, idx) => ({
        ...t,
        id: `t-${idx}`,
        selecionada: true,
      }))
    )
    setDadosFatura({
      valor_total: dados.valor_total,
      data_vencimento: dados.data_vencimento,
      data_fechamento: dados.data_fechamento,
    })
  }

  // Toggle seleção de transação
  const toggleTransacao = (id: string) => {
    setTransacoes(prev =>
      prev.map(t => (t.id === id ? { ...t, selecionada: !t.selecionada } : t))
    )
  }

  // Selecionar/desmarcar todas
  const toggleTodas = (selecionar: boolean) => {
    setTransacoes(prev => prev.map(t => ({ ...t, selecionada: selecionar })))
  }

  // Editar transação
  const handleEditTransacao = (transacao: TransacaoExtraida) => {
    setEditingTransacao({ ...transacao })
    setEditModalOpen(true)
  }

  // Salvar edição
  const handleSaveEdit = () => {
    if (!editingTransacao) return

    setTransacoes(prev =>
      prev.map(t => (t.id === editingTransacao.id ? editingTransacao : t))
    )
    setEditModalOpen(false)
    setEditingTransacao(null)
    toast.success('Transação atualizada')
  }

  // Remover transação da lista
  const handleRemoveTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id))
  }

  // Importar transações selecionadas
  const handleImportarSelecionadas = async () => {
    if (!importacaoAtiva) return

    const selecionadas = transacoes.filter(t => t.selecionada)
    if (selecionadas.length === 0) {
      toast.error('Selecione ao menos uma transação para importar')
      return
    }

    setImportando(true)
    try {
      // Buscar a fatura atual do cartão ou criar uma nova
      const cartao = cartoes.find(c => c.id === importacaoAtiva.cartao_id)
      if (!cartao) {
        throw new Error('Cartão não encontrado')
      }

      // Inserir as despesas
      const despesas = selecionadas.map(t => ({
        escritorio_id: cartao.escritorio_id,
        cartao_id: cartao.id,
        fatura_id: null, // Será vinculado depois ou criada fatura
        descricao: t.descricao,
        valor: t.valor,
        data_transacao: t.data,
        parcela_atual: t.parcela ? parseInt(t.parcela.split('/')[0]) : null,
        parcela_total: t.parcela ? parseInt(t.parcela.split('/')[1]) : null,
        categoria: t.categoria_sugerida,
        importado_de: importacaoAtiva.id,
      }))

      const { error: insertError } = await supabase
        .from('cartoes_despesas')
        .insert(despesas)

      if (insertError) {
        throw insertError
      }

      // Atualizar a importação
      await supabase
        .from('cartoes_credito_importacoes')
        .update({
          transacoes_importadas: selecionadas.length,
        })
        .eq('id', importacaoAtiva.id)

      toast.success(`${selecionadas.length} transações importadas com sucesso!`)

      // Limpar e recarregar
      setImportacaoAtiva(null)
      setTransacoes([])
      setDadosFatura(null)
      await loadData()
    } catch (error: any) {
      console.error('Erro ao importar:', error)
      toast.error('Erro ao importar transações: ' + error.message)
    } finally {
      setImportando(false)
    }
  }

  // Cancelar revisão
  const handleCancelarRevisao = () => {
    setImportacaoAtiva(null)
    setTransacoes([])
    setDadosFatura(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-slate-100 text-slate-700">Pendente</Badge>
      case 'processando':
        return <Badge className="bg-blue-100 text-blue-700">Processando</Badge>
      case 'concluido':
        return <Badge className="bg-emerald-100 text-emerald-700">Concluído</Badge>
      case 'erro':
        return <Badge className="bg-red-100 text-red-700">Erro</Badge>
      default:
        return null
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  // Loading inicial enquanto carrega escritório
  if (loadingEscritorio || (escritoriosGrupo.length === 0 && !escritorioAtivo)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe] mx-auto mb-2" />
          <p className="text-sm text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  const transacoesSelecionadas = transacoes.filter(t => t.selecionada)
  const totalSelecionado = transacoesSelecionadas.reduce((acc, t) => acc + t.valor, 0)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/financeiro/cartoes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">Importar Fatura</h1>
            <p className="text-sm text-slate-600 mt-1">
              Envie o PDF da fatura para extrair as transações automaticamente
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Upload */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Enviar Fatura PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4 space-y-4">
              {/* Seleção de Cartão */}
              <div>
                <Label>Cartão *</Label>
                {cartoes.length === 0 ? (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-500">Nenhum cartão cadastrado</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[#1E3A8A]"
                      onClick={() => router.push('/dashboard/financeiro/cartoes')}
                    >
                      Cadastrar primeiro cartão
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedCartao} onValueChange={setSelectedCartao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoes.map((cartao) => {
                        const escritorio = escritoriosGrupo.find(e => e.id === cartao.escritorio_id)
                        return (
                          <SelectItem key={cartao.id} value={cartao.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cartao.cor }}
                              />
                              <span>{cartao.nome} - •••• {cartao.ultimos_digitos}</span>
                              {escritoriosGrupo.length > 1 && escritorio && (
                                <span className="text-xs text-slate-400">({escritorio.nome})</span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Modelo de IA */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-blue-700">DeepSeek Reasoner</span>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(uploadedFile.size)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {isDragActive
                        ? 'Solte o arquivo aqui...'
                        : 'Arraste o PDF ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-slate-500">PDF até 10MB</p>
                  </div>
                )}
              </div>

              {/* Botão de Upload */}
              <Button
                onClick={handleUpload}
                disabled={!uploadedFile || !selectedCartao || uploading || cartoes.length === 0}
                className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar e Processar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Histórico de Importações */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
                <span>Histórico de Importações</span>
                <Button variant="ghost" size="sm" onClick={loadData} className="h-7 w-7 p-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {loading ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-6 h-6 mx-auto text-slate-400 animate-spin" />
                </div>
              ) : importacoes.length === 0 ? (
                <div className="py-6 text-center">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500 mt-2">Nenhuma importação</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importacoes.slice(0, 5).map((imp) => {
                    const cartao = cartoes.find((c) => c.id === imp.cartao_id)
                    return (
                      <div
                        key={imp.id}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-lg border transition-colors',
                          importacaoAtiva?.id === imp.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cartao?.cor || '#64748B' }}
                          >
                            <CreditCard className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">
                              {imp.arquivo_nome}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500">
                                {cartao?.nome || 'Cartão'}
                              </span>
                              {imp.transacoes_encontradas > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  • {imp.transacoes_encontradas} itens
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(imp.status)}
                          {imp.status === 'concluido' && imp.transacoes_importadas === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleRevisarImportacao(imp)}
                            >
                              Revisar
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Revisão de Transações */}
        <Card className="border-slate-200 h-fit">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>
                {importacaoAtiva ? 'Revisar Transações' : 'Transações Extraídas'}
              </span>
              {importacaoAtiva && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelarRevisao}
                  className="h-7 px-2 text-xs text-slate-500"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancelar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {!importacaoAtiva ? (
              <div className="py-12 text-center">
                <Download className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm text-slate-500 mt-3">
                  Envie uma fatura para ver as transações extraídas aqui
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Você poderá revisar e editar antes de importar
                </p>
              </div>
            ) : transacoes.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
                <p className="text-sm text-slate-500 mt-3">
                  Nenhuma transação encontrada na fatura
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info da fatura */}
                {dadosFatura && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-4 text-xs">
                      {dadosFatura.data_vencimento && (
                        <div>
                          <span className="text-slate-500">Vencimento:</span>{' '}
                          <span className="font-medium text-slate-700">
                            {formatDate(dadosFatura.data_vencimento)}
                          </span>
                        </div>
                      )}
                      {dadosFatura.valor_total > 0 && (
                        <div>
                          <span className="text-slate-500">Total Fatura:</span>{' '}
                          <span className="font-medium text-slate-700">
                            {formatCurrency(dadosFatura.valor_total)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ações em lote */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={transacoes.every(t => t.selecionada)}
                      onCheckedChange={(checked) => toggleTodas(!!checked)}
                    />
                    <span className="text-xs text-slate-600">
                      {transacoesSelecionadas.length} de {transacoes.length} selecionadas
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    Total: {formatCurrency(totalSelecionado)}
                  </span>
                </div>

                {/* Lista de transações */}
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-2">
                    {transacoes.map((transacao) => (
                      <div
                        key={transacao.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                          transacao.selecionada
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : 'border-slate-200 bg-slate-50/50'
                        )}
                      >
                        <Checkbox
                          checked={transacao.selecionada}
                          onCheckedChange={() => toggleTransacao(transacao.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {transacao.descricao}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-slate-500">
                                  {formatDate(transacao.data)}
                                </span>
                                {transacao.parcela && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                    {transacao.parcela}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                  {CATEGORIAS.find(c => c.value === transacao.categoria_sugerida)?.label || transacao.categoria_sugerida}
                                </Badge>
                                {transacao.confianca < 0.7 && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300">
                                    Verificar
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-slate-700">
                                {formatCurrency(transacao.valor)}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEditTransacao(transacao)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => handleRemoveTransacao(transacao.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Botão de importar */}
                <Button
                  onClick={handleImportarSelecionadas}
                  disabled={transacoesSelecionadas.length === 0 || importando}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
                >
                  {importando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Importar {transacoesSelecionadas.length} Transações
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Editar Transação</DialogTitle>
            <DialogDescription>
              Ajuste os dados da transação antes de importar
            </DialogDescription>
          </DialogHeader>
          {editingTransacao && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={editingTransacao.descricao}
                  onChange={(e) =>
                    setEditingTransacao({ ...editingTransacao, descricao: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editingTransacao.data}
                    onChange={(e) =>
                      setEditingTransacao({ ...editingTransacao, data: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTransacao.valor}
                    onChange={(e) =>
                      setEditingTransacao({
                        ...editingTransacao,
                        valor: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parcela</Label>
                  <Input
                    placeholder="Ex: 1/3"
                    value={editingTransacao.parcela || ''}
                    onChange={(e) =>
                      setEditingTransacao({
                        ...editingTransacao,
                        parcela: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editingTransacao.categoria_sugerida}
                    onValueChange={(v) =>
                      setEditingTransacao({ ...editingTransacao, categoria_sugerida: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
