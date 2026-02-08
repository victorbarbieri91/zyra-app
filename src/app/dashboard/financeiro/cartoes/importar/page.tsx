'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Pencil,
  Check,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  FaturaCartao,
  CATEGORIAS_DESPESA_CARTAO,
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
  tipo: 'unica' | 'parcelada' | 'recorrente'
  possivelDuplicata?: boolean
}

// Usar CATEGORIAS_DESPESA_CARTAO e TIPOS_LANCAMENTO do hook

type Etapa = 1 | 2 | 3

export default function ImportarFaturaPage() {
  const router = useRouter()
  const { escritorioAtivo, loading: loadingEscritorio } = useEscritorioAtivo()
  const supabase = createClient()

  // Etapa atual
  const [etapa, setEtapa] = useState<Etapa>(1)

  // States Etapa 1
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [selectedCartao, setSelectedCartao] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // States Etapa 2
  const [transacoes, setTransacoes] = useState<TransacaoExtraida[]>([])
  const [dadosFatura, setDadosFatura] = useState<{
    valor_total: number
    data_vencimento: string | null
    data_fechamento: string | null
  } | null>(null)
  const [importacaoId, setImportacaoId] = useState<string | null>(null)
  const [mesReferenciaFatura, setMesReferenciaFatura] = useState<string>('') // formato: YYYY-MM

  // States Etapa 3
  const [importando, setImportando] = useState(false)
  const [, setImportacaoConcluida] = useState(false)
  const [totalImportado, setTotalImportado] = useState(0)
  const [valorTotalImportado, setValorTotalImportado] = useState(0)

  // Edição inline
  const [editingDescricaoId, setEditingDescricaoId] = useState<string | null>(null)
  const [editingDescricaoValue, setEditingDescricaoValue] = useState('')
  const [editingDataId, setEditingDataId] = useState<string | null>(null)
  const [editingDataValue, setEditingDataValue] = useState('')

  // Modal de edição completa
  const [editingTransacao, setEditingTransacao] = useState<TransacaoExtraida | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const escritorioIds = escritoriosGrupo.map(e => e.id)

  const {
    loadCartoes,
    createLancamento,
    verificarDuplicata,
    verificarFaturaExistente,
    vincularLancamentosAFatura,
  } = useCartoesCredito(escritorioIds.length > 0 ? escritorioIds : escritorioAtivo)

  // Estado para fatura existente
  const [faturaExistente, setFaturaExistente] = useState<FaturaCartao | null>(null)
  const [verificandoDuplicatas, setVerificandoDuplicatas] = useState(false)

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

  // Carregar cartões
  useEffect(() => {
    const loadData = async () => {
      if (escritorioIds.length === 0 && !escritorioAtivo) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const cartoesData = await loadCartoes(true)
        setCartoes(cartoesData)
      } catch (error) {
        console.error('Erro ao carregar cartões:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [escritorioIds.length, escritorioAtivo, loadCartoes])

  // Verificar fatura existente quando mês é selecionado
  useEffect(() => {
    const checkFatura = async () => {
      if (!selectedCartao || !mesReferenciaFatura) {
        setFaturaExistente(null)
        return
      }

      const fatura = await verificarFaturaExistente(selectedCartao, `${mesReferenciaFatura}-01`)
      setFaturaExistente(fatura)
    }
    checkFatura()
  }, [selectedCartao, mesReferenciaFatura, verificarFaturaExistente])

  // Verificar duplicatas quando transações são carregadas
  useEffect(() => {
    const checkDuplicatas = async () => {
      if (!selectedCartao || transacoes.length === 0) return

      setVerificandoDuplicatas(true)
      try {
        const updatedTransacoes = await Promise.all(
          transacoes.map(async (t) => {
            const isDuplicate = await verificarDuplicata(selectedCartao, t.data, t.descricao, t.valor)
            return { ...t, possivelDuplicata: isDuplicate }
          })
        )
        setTransacoes(updatedTransacoes)
      } catch (error) {
        console.error('Erro ao verificar duplicatas:', error)
      } finally {
        setVerificandoDuplicatas(false)
      }
    }

    // Só executa uma vez quando transações são carregadas
    if (transacoes.length > 0 && !transacoes.some(t => t.possivelDuplicata !== undefined)) {
      checkDuplicatas()
    }
  }, [selectedCartao, transacoes.length, verificarDuplicata])

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos')
        return
      }
      setUploadedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  // Etapa 1 -> 2: Upload e processar
  const handleProcessar = async () => {
    if (!uploadedFile || !selectedCartao) {
      toast.error('Selecione um cartão e um arquivo PDF')
      return
    }

    const cartaoSelecionado = cartoes.find(c => c.id === selectedCartao)
    if (!cartaoSelecionado) {
      toast.error('Cartão não encontrado')
      return
    }

    setUploading(true)
    try {
      // 1. Upload do arquivo
      const fileExt = uploadedFile.name.split('.').pop()
      const fileName = `${cartaoSelecionado.escritorio_id}/${selectedCartao}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('faturas-cartao')
        .upload(fileName, uploadedFile)

      if (uploadError) {
        if (uploadError.message.includes('not found')) {
          toast.error('Bucket de armazenamento não configurado')
          return
        }
        throw uploadError
      }

      // 2. URL assinada
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('faturas-cartao')
        .createSignedUrl(fileName, 3600)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Erro ao gerar URL de acesso')
      }

      // 3. Criar registro de importação
      const { data: importacao, error: importacaoError } = await supabase
        .from('cartoes_credito_importacoes')
        .insert({
          escritorio_id: cartaoSelecionado.escritorio_id,
          cartao_id: selectedCartao,
          arquivo_nome: uploadedFile.name,
          arquivo_url: signedUrlData.signedUrl,
          status: 'pendente',
        })
        .select()
        .single()

      if (importacaoError || !importacao) {
        throw new Error('Erro ao criar registro de importação')
      }

      setImportacaoId(importacao.id)
      toast.info('Processando fatura...')

      // 4. Chamar Edge Function
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'processar-fatura-cartao',
        {
          body: {
            importacao_id: importacao.id,
            arquivo_url: signedUrlData.signedUrl,
            cartao_id: selectedCartao,
          },
        }
      )

      if (processError) {
        throw new Error(processError.message)
      }

      if (!processData?.success) {
        throw new Error(processData?.error || 'Erro desconhecido')
      }

      // 5. Buscar dados processados
      const { data: importacaoAtualizada } = await supabase
        .from('cartoes_credito_importacoes')
        .select('*')
        .eq('id', importacao.id)
        .single()

      if (importacaoAtualizada?.dados_extraidos) {
        const dados = importacaoAtualizada.dados_extraidos as any

        // Inferir o mês de referência da fatura a partir da data de vencimento
        let mesRef = ''
        let anoVencimento = new Date().getFullYear()
        let mesVencimento = new Date().getMonth()

        if (dados.data_vencimento) {
          const venc = new Date(dados.data_vencimento + 'T12:00:00')
          anoVencimento = venc.getFullYear()
          mesVencimento = venc.getMonth()
          // A fatura é do mês anterior ao vencimento (ex: vence em jan/2024 = fatura de dez/2023)
          const mesFatura = mesVencimento === 0 ? 11 : mesVencimento - 1
          const anoFatura = mesVencimento === 0 ? anoVencimento - 1 : anoVencimento
          mesRef = `${anoFatura}-${String(mesFatura + 1).padStart(2, '0')}`
        } else {
          // Sem vencimento, usar mês anterior ao atual
          const hoje = new Date()
          const mesFatura = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
          const anoFatura = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()
          mesRef = `${anoFatura}-${String(mesFatura + 1).padStart(2, '0')}`
        }
        setMesReferenciaFatura(mesRef)

        // Processar transações com ano inferido
        const transacoesProcessadas = (dados.transacoes || []).map((t: any, idx: number) => {
          let dataCorrigida = t.data

          // Se a data não tem ano correto (ex: 2023 quando deveria ser 2024)
          // ou se foi inferido incorretamente, corrigir baseado no vencimento
          if (t.data && dados.data_vencimento) {
            const [, mesT, diaT] = t.data.split('-').map(Number)
            const mesTransacao = mesT - 1 // 0-indexed

            // Se a transação é de meses que fazem sentido para a fatura
            // Ex: fatura vence em jan/2024, transações de nov/dez devem ser 2023
            let anoCorreto = anoVencimento

            // Se mês da transação > mês de vencimento, é do ano anterior
            // Ex: transação em nov, fatura vence em jan -> nov do ano anterior
            if (mesTransacao >= mesVencimento && mesVencimento < 3) {
              anoCorreto = anoVencimento - 1
            }
            // Se mês da transação é muito anterior e fatura é do início do ano
            // provavelmente é do mesmo ano da fatura
            else if (mesTransacao <= mesVencimento) {
              anoCorreto = anoVencimento
            }

            dataCorrigida = `${anoCorreto}-${String(mesT).padStart(2, '0')}-${String(diaT).padStart(2, '0')}`
          }

          return {
            ...t,
            id: `t-${idx}`,
            data: dataCorrigida,
            selecionada: true,
            tipo: t.parcela ? 'parcelada' : 'unica' as 'unica' | 'parcelada' | 'recorrente',
          }
        })

        setTransacoes(transacoesProcessadas)
        setDadosFatura({
          valor_total: dados.valor_total,
          data_vencimento: dados.data_vencimento,
          data_fechamento: dados.data_fechamento,
        })
      }

      toast.success(`${processData.transacoes_encontradas} lançamentos encontrados`)
      setEtapa(2)
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao processar fatura')
    } finally {
      setUploading(false)
    }
  }

  // Toggle seleção
  const toggleTransacao = (id: string) => {
    setTransacoes(prev => prev.map(t => (t.id === id ? { ...t, selecionada: !t.selecionada } : t)))
  }

  const toggleTodas = (selecionar: boolean) => {
    setTransacoes(prev => prev.map(t => ({ ...t, selecionada: selecionar })))
  }

  // Edição inline da descrição
  const startEditingDescricao = (transacao: TransacaoExtraida) => {
    setEditingDescricaoId(transacao.id)
    setEditingDescricaoValue(transacao.descricao)
  }

  const saveDescricao = () => {
    if (!editingDescricaoId) return
    setTransacoes(prev =>
      prev.map(t =>
        t.id === editingDescricaoId
          ? { ...t, descricao: editingDescricaoValue.trim() || t.descricao }
          : t
      )
    )
    setEditingDescricaoId(null)
    setEditingDescricaoValue('')
  }

  const cancelEditingDescricao = () => {
    setEditingDescricaoId(null)
    setEditingDescricaoValue('')
  }

  // Edição inline da data
  const startEditingData = (transacao: TransacaoExtraida) => {
    setEditingDataId(transacao.id)
    setEditingDataValue(transacao.data)
  }

  const saveData = () => {
    if (!editingDataId) return
    setTransacoes(prev =>
      prev.map(t =>
        t.id === editingDataId
          ? { ...t, data: editingDataValue || t.data }
          : t
      )
    )
    setEditingDataId(null)
    setEditingDataValue('')
  }

  const cancelEditingData = () => {
    setEditingDataId(null)
    setEditingDataValue('')
  }

  // Edição inline da categoria
  const updateCategoria = (id: string, categoria: string) => {
    setTransacoes(prev =>
      prev.map(t => (t.id === id ? { ...t, categoria_sugerida: categoria } : t))
    )
  }

  // Editar transação (modal completo)
  const handleEditTransacao = (transacao: TransacaoExtraida) => {
    setEditingTransacao({ ...transacao })
    setEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingTransacao) return
    setTransacoes(prev => prev.map(t => (t.id === editingTransacao.id ? editingTransacao : t)))
    setEditModalOpen(false)
    setEditingTransacao(null)
    toast.success('Lançamento atualizado')
  }

  const handleRemoveTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id))
  }

  // Etapa 2 -> 3: Importar
  const handleImportar = async () => {
    const selecionadas = transacoes.filter(t => t.selecionada)
    if (selecionadas.length === 0) {
      toast.error('Selecione ao menos um lançamento')
      return
    }

    const cartao = cartoes.find(c => c.id === selectedCartao)
    if (!cartao) {
      toast.error('Cartão não encontrado')
      return
    }

    setImportando(true)
    try {
      let importados = 0
      const lancamentosImportados: string[] = []

      // Importar cada transação usando createLancamento
      for (const t of selecionadas) {
        // Nota: Importamos cada linha do PDF como lançamento único
        // porque o PDF já mostra cada parcela individualmente
        const compraId = await createLancamento({
          cartao_id: cartao.id,
          descricao: t.descricao,
          categoria: t.categoria_sugerida,
          fornecedor: undefined,
          valor: t.valor,
          tipo: t.tipo === 'parcelada' ? 'unica' : t.tipo, // Importa parcelas como únicas (cada linha do PDF é uma parcela)
          parcelas: 1,
          data_compra: t.data,
          mes_referencia: mesReferenciaFatura ? `${mesReferenciaFatura}-01` : undefined,
          importado_de_fatura: true,
        })

        if (compraId) {
          importados++
          lancamentosImportados.push(compraId)
        }
      }

      // Se existe fatura para este mês, vincular os lançamentos a ela
      if (faturaExistente && lancamentosImportados.length > 0) {
        // Buscar os IDs dos lançamentos criados (compra_id é retornado, precisamos do lancamento.id)
        const { data: lancamentos } = await supabase
          .from('cartoes_credito_lancamentos')
          .select('id')
          .in('compra_id', lancamentosImportados)

        if (lancamentos && lancamentos.length > 0) {
          const lancamentoIds = lancamentos.map((l: { id: string }) => l.id)
          await vincularLancamentosAFatura(faturaExistente.id, lancamentoIds)
        }
      }

      // Atualizar importação
      if (importacaoId) {
        await supabase
          .from('cartoes_credito_importacoes')
          .update({
            transacoes_importadas: importados,
            status: 'concluido',
            processado_em: new Date().toISOString(),
          })
          .eq('id', importacaoId)
      }

      setTotalImportado(importados)
      setValorTotalImportado(selecionadas.reduce((acc, t) => acc + t.valor, 0))
      setImportacaoConcluida(true)
      setEtapa(3)

      if (faturaExistente) {
        toast.success(`Lançamentos importados e vinculados à fatura de ${mesReferenciaFatura}!`)
      } else {
        toast.success('Lançamentos importados com sucesso!')
      }
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao importar')
    } finally {
      setImportando(false)
    }
  }

  // Helpers
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Gerar opções de meses para o seletor (últimos 12 meses + próximos 2)
  const opcoesMemeses = (() => {
    const meses = []
    const hoje = new Date()
    for (let i = -12; i <= 2; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      meses.push({ value: valor, label })
    }
    return meses.reverse()
  })()

  // Loading
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
  const cartaoSelecionado = cartoes.find(c => c.id === selectedCartao)

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.push('/dashboard/financeiro/cartoes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-base font-medium text-slate-600">Importar Fatura</h1>
          <p className="text-xs text-slate-400">
            {etapa === 1 && 'Envie o PDF da fatura do cartão'}
            {etapa === 2 && 'Revise os lançamentos antes de importar'}
            {etapa === 3 && 'Importação concluída'}
          </p>
        </div>
      </div>

      {/* Indicador de Etapas */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                etapa >= step
                  ? 'bg-[#34495e] text-white'
                  : 'bg-slate-200 text-slate-500'
              )}
            >
              {etapa > step ? <Check className="w-4 h-4" /> : step}
            </div>
            {step < 3 && (
              <div
                className={cn(
                  'w-16 h-1 mx-1 rounded',
                  etapa > step ? 'bg-[#34495e]' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ETAPA 1: Upload */}
      {etapa === 1 && (
        <Card className="border-slate-200">
          <CardContent className="pt-6 space-y-6">
            {/* Seleção de Cartão */}
            <div>
              <Label className="text-sm font-medium text-slate-700">Cartão</Label>
              {loading ? (
                <div className="h-10 bg-slate-100 animate-pulse rounded-md mt-1.5" />
              ) : cartoes.length === 0 ? (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 mt-1.5">
                  <p className="text-sm text-slate-500">Nenhum cartão cadastrado</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-[#1E3A8A]"
                    onClick={() => router.push('/dashboard/financeiro/cartoes')}
                  >
                    Cadastrar cartão
                  </Button>
                </div>
              ) : (
                <Select value={selectedCartao} onValueChange={setSelectedCartao}>
                  <SelectTrigger className="mt-1.5">
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

            {/* Dropzone */}
            <div>
              <Label className="text-sm font-medium text-slate-700">Arquivo PDF</Label>
              <div
                {...getRootProps()}
                className={cn(
                  'mt-1.5 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-[#34495e] bg-slate-50'
                    : uploadedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(uploadedFile.size)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                      }}
                      className="text-slate-500"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste o PDF ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-slate-400">PDF até 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Botão Processar */}
            <Button
              onClick={handleProcessar}
              disabled={!uploadedFile || !selectedCartao || uploading || cartoes.length === 0}
              className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f] text-white h-11"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Processar Fatura
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 2: Preview */}
      {etapa === 2 && (
        <div className="space-y-4">
          {/* Info do cartão e fatura */}
          <Card className="border-slate-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cartaoSelecionado?.cor || '#64748B' }}
                  >
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {cartaoSelecionado?.nome} •••• {cartaoSelecionado?.ultimos_digitos}
                    </p>
                    <p className="text-xs text-slate-500">{uploadedFile?.name}</p>
                  </div>
                </div>

                {/* Mês de referência e info da fatura */}
                <div className="flex items-center gap-4">
                  {dadosFatura?.data_vencimento && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Vencimento</p>
                      <p className="text-xs font-medium text-slate-600">{formatDate(dadosFatura.data_vencimento)}</p>
                    </div>
                  )}
                  {dadosFatura?.valor_total && dadosFatura.valor_total > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Total PDF</p>
                      <p className="text-xs font-medium text-slate-600">{formatCurrency(dadosFatura.valor_total)}</p>
                    </div>
                  )}
                  <div className="pl-3 border-l border-slate-200">
                    <p className="text-[10px] text-slate-400 mb-1">Mês da fatura</p>
                    <Select value={mesReferenciaFatura} onValueChange={setMesReferenciaFatura}>
                      <SelectTrigger className="h-7 w-[150px] text-xs border-slate-200">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesMemeses.map((mes) => (
                          <SelectItem key={mes.value} value={mes.value} className="text-xs">
                            {mes.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de fatura existente e duplicatas */}
          {(faturaExistente || transacoes.some(t => t.possivelDuplicata)) && (
            <div className="space-y-2">
              {faturaExistente && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Já existe uma fatura {faturaExistente.status === 'fechada' ? 'fechada' : faturaExistente.status === 'paga' ? 'paga' : 'aberta'} para este mês
                    </p>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      Os lançamentos serão adicionados à fatura existente ({formatCurrency(faturaExistente.valor_total || 0)})
                    </p>
                  </div>
                </div>
              )}
              {transacoes.some(t => t.possivelDuplicata) && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {transacoes.filter(t => t.possivelDuplicata).length} possíveis duplicatas encontradas
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lançamentos marcados já podem existir no sistema
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de transações */}
          <Card className="border-slate-200">
            <CardContent className="py-4">
              {transacoes.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
                  <p className="text-sm text-slate-500 mt-2">Nenhum lançamento encontrado</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={transacoes.length > 0 && transacoes.every(t => t.selecionada)}
                        onCheckedChange={(checked) => toggleTodas(!!checked)}
                      />
                      <span className="text-sm text-slate-600">
                        {transacoesSelecionadas.length} de {transacoes.length} selecionados
                      </span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      Total: {formatCurrency(totalSelecionado)}
                    </Badge>
                  </div>

                  {/* Tabela de preview */}
                  <div className="border rounded-lg overflow-hidden">
                    {/* Cabeçalho da tabela */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b text-xs font-medium text-slate-500">
                      <div className="col-span-1"></div>
                      <div className="col-span-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Data
                      </div>
                      <div className="col-span-3">Descrição</div>
                      <div className="col-span-2 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Valor
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Categoria
                      </div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Linhas */}
                    <div className="max-h-[480px] overflow-y-auto">
                      {transacoes.map((t) => (
                        <div
                          key={t.id}
                          className={cn(
                            'grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-sm border-b last:border-b-0 transition-colors',
                            t.selecionada ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                          )}
                        >
                          <div className="col-span-1 flex items-center gap-1">
                            <Checkbox
                              checked={t.selecionada}
                              onCheckedChange={() => toggleTransacao(t.id)}
                            />
                            {t.possivelDuplicata && (
                              <span title="Possível duplicata">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              </span>
                            )}
                          </div>
                          {/* Data editável inline */}
                          <div className="col-span-2">
                            {editingDataId === t.id ? (
                              <Input
                                type="date"
                                value={editingDataValue}
                                onChange={(e) => setEditingDataValue(e.target.value)}
                                onBlur={saveData}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveData()
                                  if (e.key === 'Escape') cancelEditingData()
                                }}
                                className="h-7 text-sm"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => startEditingData(t)}
                                className="cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 -mx-1 transition-colors text-slate-600"
                                title="Clique para editar a data"
                              >
                                {formatDate(t.data)}
                              </div>
                            )}
                          </div>

                          {/* Descrição editável inline */}
                          <div className="col-span-3">
                            {editingDescricaoId === t.id ? (
                              <Input
                                value={editingDescricaoValue}
                                onChange={(e) => setEditingDescricaoValue(e.target.value)}
                                onBlur={saveDescricao}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveDescricao()
                                  if (e.key === 'Escape') cancelEditingDescricao()
                                }}
                                className="h-7 text-sm"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => startEditingDescricao(t)}
                                className="cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 -mx-1 transition-colors"
                                title="Clique para editar"
                              >
                                <p className="text-slate-700 truncate">{t.descricao}</p>
                                {t.parcela && (
                                  <span className="text-[10px] text-slate-400">Parcela {t.parcela}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="col-span-2 font-medium text-slate-700">
                            {formatCurrency(t.valor)}
                          </div>

                          {/* Categoria com select inline */}
                          <div className="col-span-2">
                            <Select
                              value={t.categoria_sugerida}
                              onValueChange={(v) => updateCategoria(t.id, v)}
                            >
                              <SelectTrigger className="h-7 text-[11px] border-transparent bg-slate-100 hover:bg-slate-200 focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-1 flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditTransacao(t)}
                              title="Editar todos os campos"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              onClick={() => handleRemoveTransacao(t.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setEtapa(1)
                setTransacoes([])
                setDadosFatura(null)
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={handleImportar}
              disabled={transacoesSelecionadas.length === 0 || importando}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
            >
              {importando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  Importar {transacoesSelecionadas.length} Lançamentos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Resumo */}
      {etapa === 3 && (
        <Card className="border-slate-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Importação concluída</p>
                <p className="text-xs text-slate-500">
                  {totalImportado} lançamentos · {formatCurrency(valorTotalImportado)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-50 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: cartaoSelecionado?.cor || '#64748B' }}
                >
                  <CreditCard className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-slate-600">
                  {cartaoSelecionado?.nome} •••• {cartaoSelecionado?.ultimos_digitos}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/financeiro/cartoes')}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/financeiro/cartoes/${selectedCartao}`)}
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
              >
                Ver Lançamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e]">Editar Lançamento</DialogTitle>
            <DialogDescription>
              Ajuste os dados antes de importar
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
                      {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
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
