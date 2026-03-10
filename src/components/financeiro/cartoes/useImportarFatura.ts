'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoCredito,
  FaturaCartao,
} from '@/hooks/useCartoesCredito'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

// Interface para transação extraída
export interface TransacaoExtraida {
  id: string
  data: string
  descricao: string
  valor: number
  parcela: string | null
  categoria_sugerida: string
  confianca: number
  selecionada: boolean
  tipo: 'unica' | 'parcelada' | 'recorrente'
  tipo_transacao: 'debito' | 'credito'
  possivelDuplicata?: boolean
}

export type Etapa = 1 | 2 | 3

interface UseImportarFaturaOptions {
  open: boolean
  onSuccess?: () => void
  onClose?: () => void
}

export function useImportarFatura({ open, onSuccess, onClose }: UseImportarFaturaOptions) {
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
  const [mesReferenciaFatura, setMesReferenciaFatura] = useState<string>('')

  // States Etapa 3
  const [importando, setImportando] = useState(false)
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
    verificarDuplicatasEmLote,
    verificarFaturaExistente,
    vincularLancamentosAFatura,
    criarFaturaCartao,
    importarLancamentosEmLote,
  } = useCartoesCredito(escritorioIds.length > 0 ? escritorioIds : escritorioAtivo)

  // Estado para fatura existente
  const [faturaExistente, setFaturaExistente] = useState<FaturaCartao | null>(null)
  const [verificandoDuplicatas, setVerificandoDuplicatas] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEtapa(1)
      setSelectedCartao('')
      setUploadedFile(null)
      setUploading(false)
      setTransacoes([])
      setDadosFatura(null)
      setImportacaoId(null)
      setMesReferenciaFatura('')
      setImportando(false)
      setTotalImportado(0)
      setValorTotalImportado(0)
      setEditingDescricaoId(null)
      setEditingDescricaoValue('')
      setEditingDataId(null)
      setEditingDataValue('')
      setEditingTransacao(null)
      setEditModalOpen(false)
      setFaturaExistente(null)
    }
  }, [open])

  // Carregar escritórios do grupo
  useEffect(() => {
    if (!open) return
    const loadEscritorios = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
      } catch (error) {
        console.error('Erro ao carregar escritórios:', error)
      }
    }
    loadEscritorios()
  }, [open])

  // Carregar cartões
  useEffect(() => {
    if (!open) return
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
  }, [open, escritorioIds.length, escritorioAtivo, loadCartoes])

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
        const duplicatasMap = await verificarDuplicatasEmLote(
          selectedCartao,
          transacoes.map(t => ({ data: t.data, descricao: t.descricao, valor: t.valor }))
        )
        const updatedTransacoes = transacoes.map(t => {
          const key = `${t.data}|${t.descricao}|${t.valor}`
          return { ...t, possivelDuplicata: duplicatasMap.get(key) || false }
        })
        setTransacoes(updatedTransacoes)
      } catch (error) {
        console.error('Erro ao verificar duplicatas:', error)
      } finally {
        setVerificandoDuplicatas(false)
      }
    }
    if (transacoes.length > 0 && !transacoes.some(t => t.possivelDuplicata !== undefined)) {
      checkDuplicatas()
    }
  }, [selectedCartao, transacoes.length, verificarDuplicatasEmLote])

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
    maxSize: 20 * 1024 * 1024,
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

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('faturas-cartao')
        .createSignedUrl(fileName, 3600)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Erro ao gerar URL de acesso')
      }

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

      if (processError) throw new Error(processError.message)
      if (!processData?.success) throw new Error(processData?.error || 'Erro desconhecido')

      const { data: importacaoAtualizada } = await supabase
        .from('cartoes_credito_importacoes')
        .select('*')
        .eq('id', importacao.id)
        .single()

      if (importacaoAtualizada?.dados_extraidos) {
        const dados = importacaoAtualizada.dados_extraidos as any

        let mesRef = ''
        let anoVencimento = new Date().getFullYear()
        let mesVencimento = new Date().getMonth()

        if (dados.data_vencimento) {
          const venc = new Date(dados.data_vencimento + 'T12:00:00')
          anoVencimento = venc.getFullYear()
          mesVencimento = venc.getMonth()
          const mesFatura = mesVencimento === 0 ? 11 : mesVencimento - 1
          const anoFatura = mesVencimento === 0 ? anoVencimento - 1 : anoVencimento
          mesRef = `${anoFatura}-${String(mesFatura + 1).padStart(2, '0')}`
        } else {
          const hoje = new Date()
          const mesFatura = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
          const anoFatura = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()
          mesRef = `${anoFatura}-${String(mesFatura + 1).padStart(2, '0')}`
        }
        setMesReferenciaFatura(mesRef)

        const transacoesProcessadas = (dados.transacoes || []).map((t: any, idx: number) => {
          let dataCorrigida = t.data
          if (t.data && dados.data_vencimento) {
            const [, mesT, diaT] = t.data.split('-').map(Number)
            const mesTransacao = mesT - 1
            let anoCorreto = anoVencimento
            if (mesTransacao >= mesVencimento && mesVencimento < 3) {
              anoCorreto = anoVencimento - 1
            } else if (mesTransacao <= mesVencimento) {
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
            tipo_transacao: (t.tipo_transacao === 'credito' ? 'credito' : 'debito') as 'debito' | 'credito',
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

  const updateTipoTransacao = (id: string, tipo: 'debito' | 'credito') => {
    setTransacoes(prev =>
      prev.map(t => (t.id === id ? { ...t, tipo_transacao: tipo } : t))
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
      const mesRef = mesReferenciaFatura ? `${mesReferenciaFatura}-01` : new Date().toISOString().split('T')[0].substring(0, 8) + '01'

      const transacoesParaImportar = selecionadas.map(t => ({
        descricao: t.descricao,
        categoria: t.categoria_sugerida,
        valor: t.valor,
        data_compra: t.data,
      }))

      const { total_importados, lancamento_ids } = await importarLancamentosEmLote(
        cartao.id,
        mesRef,
        transacoesParaImportar
      )

      if (lancamento_ids.length > 0 && mesReferenciaFatura) {
        let faturaParaVincular = faturaExistente
        if (!faturaParaVincular) {
          const novaFatura = await criarFaturaCartao(
            selectedCartao,
            mesRef,
            dadosFatura?.data_fechamento || null,
            dadosFatura?.data_vencimento || null,
            dadosFatura?.valor_total || null
          )
          if (novaFatura) {
            faturaParaVincular = novaFatura
            setFaturaExistente(novaFatura)
          }
        }
        if (faturaParaVincular) {
          await vincularLancamentosAFatura(faturaParaVincular.id, lancamento_ids)
        }
      }

      if (importacaoId) {
        await supabase
          .from('cartoes_credito_importacoes')
          .update({
            transacoes_importadas: total_importados,
            status: 'concluido',
            processado_em: new Date().toISOString(),
          })
          .eq('id', importacaoId)
      }

      setTotalImportado(total_importados)
      setValorTotalImportado(selecionadas.reduce((acc, t) => acc + t.valor, 0))
      setEtapa(3)

      toast.success(`${total_importados} lançamentos importados e vinculados à fatura de ${mesReferenciaFatura}!`)
      onSuccess?.()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao importar')
    } finally {
      setImportando(false)
    }
  }

  // Voltar para step 1
  const handleVoltarStep1 = () => {
    setEtapa(1)
    setTransacoes([])
    setDadosFatura(null)
  }

  // Nova importação (reset)
  const handleNovaImportacao = () => {
    setEtapa(1)
    setSelectedCartao('')
    setUploadedFile(null)
    setTransacoes([])
    setDadosFatura(null)
    setImportacaoId(null)
    setMesReferenciaFatura('')
    setTotalImportado(0)
    setValorTotalImportado(0)
    setFaturaExistente(null)
  }

  // Helpers
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)

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

  // Gerar opções de meses
  const opcoesMeses = (() => {
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

  // Computed values
  const transacoesSelecionadas = transacoes.filter(t => t.selecionada)
  const totalSelecionado = transacoesSelecionadas.reduce((acc, t) => acc + (t.tipo_transacao === 'credito' ? -t.valor : t.valor), 0)
  const cartaoSelecionado = cartoes.find(c => c.id === selectedCartao)

  return {
    // State
    etapa,
    cartoes,
    selectedCartao,
    setSelectedCartao,
    loading,
    loadingEscritorio,
    uploading,
    uploadedFile,
    setUploadedFile,
    transacoes,
    dadosFatura,
    mesReferenciaFatura,
    setMesReferenciaFatura,
    importando,
    totalImportado,
    valorTotalImportado,
    faturaExistente,
    verificandoDuplicatas,
    escritoriosGrupo,
    escritorioAtivo,

    // Inline edit
    editingDescricaoId,
    editingDescricaoValue,
    setEditingDescricaoValue,
    editingDataId,
    editingDataValue,
    setEditingDataValue,

    // Edit modal
    editingTransacao,
    setEditingTransacao,
    editModalOpen,
    setEditModalOpen,

    // Dropzone
    getRootProps,
    getInputProps,
    isDragActive,

    // Handlers
    handleProcessar,
    handleImportar,
    handleVoltarStep1,
    handleNovaImportacao,
    toggleTransacao,
    toggleTodas,
    startEditingDescricao,
    saveDescricao,
    cancelEditingDescricao,
    startEditingData,
    saveData,
    cancelEditingData,
    updateCategoria,
    updateTipoTransacao,
    handleEditTransacao,
    handleSaveEdit,
    handleRemoveTransacao,

    // Helpers
    formatCurrency,
    formatDate,
    formatFileSize,
    opcoesMeses,

    // Computed
    transacoesSelecionadas,
    totalSelecionado,
    cartaoSelecionado,
  }
}
