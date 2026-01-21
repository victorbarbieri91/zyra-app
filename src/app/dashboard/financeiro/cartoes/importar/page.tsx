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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import {
  useCartoesCredito,
  CartaoCredito,
  ImportacaoFatura,
} from '@/hooks/useCartoesCredito'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

export default function ImportarFaturaPage() {
  const router = useRouter()
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  // States
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [importacoes, setImportacoes] = useState<ImportacaoFatura[]>([])
  const [selectedCartao, setSelectedCartao] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const { loadCartoes, loadImportacoes, createImportacao, updateImportacao } =
    useCartoesCredito(escritorioAtivo)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!escritorioAtivo) return

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
  }, [escritorioAtivo, loadCartoes, loadImportacoes])

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
    if (!uploadedFile || !selectedCartao || !escritorioAtivo) {
      toast.error('Selecione um cartão e um arquivo PDF')
      return
    }

    setUploading(true)
    try {
      // 1. Upload do arquivo para o Storage
      const fileExt = uploadedFile.name.split('.').pop()
      const fileName = `${escritorioAtivo}/${selectedCartao}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('faturas-cartao')
        .upload(fileName, uploadedFile)

      if (uploadError) {
        // Se o bucket não existir, criar
        if (uploadError.message.includes('not found')) {
          toast.error('Bucket de armazenamento não configurado. Contate o administrador.')
          return
        }
        throw uploadError
      }

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('faturas-cartao')
        .getPublicUrl(fileName)

      // 3. Criar registro de importação
      const importacaoId = await createImportacao(
        selectedCartao,
        uploadedFile.name,
        urlData.publicUrl
      )

      if (!importacaoId) {
        throw new Error('Erro ao criar registro de importação')
      }

      // 4. Chamar Edge Function para processar (se disponível)
      try {
        const { data: processData, error: processError } = await supabase.functions.invoke(
          'processar-fatura-cartao',
          {
            body: {
              importacao_id: importacaoId,
              arquivo_url: urlData.publicUrl,
              cartao_id: selectedCartao,
              provider: selectedProvider,
            },
          }
        )

        if (processError) {
          console.warn('Edge Function não disponível:', processError)
          toast.info(
            'Arquivo enviado! O processamento automático será implementado em breve.'
          )
        } else {
          toast.success('Fatura enviada para processamento!')
        }
      } catch (funcError) {
        console.warn('Edge Function não disponível:', funcError)
        toast.info(
          'Arquivo enviado! O processamento automático será implementado em breve.'
        )
      }

      // Limpar e recarregar
      setUploadedFile(null)
      loadData()
    } catch (error: any) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar arquivo: ' + error.message)
    } finally {
      setUploading(false)
    }
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
        {/* Upload */}
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
              <Select value={selectedCartao} onValueChange={setSelectedCartao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão..." />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((cartao) => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cartao.cor }}
                        />
                        {cartao.nome} - •••• {cartao.ultimos_digitos}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de IA */}
            <div>
              <Label>Modelo de IA *</Label>
              <Select value={selectedProvider} onValueChange={(v: 'openai' | 'anthropic') => setSelectedProvider(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a IA..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      OpenAI GPT-4o
                    </div>
                  </SelectItem>
                  <SelectItem value="anthropic">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      Claude Sonnet
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
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
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600">
                    {isDragActive
                      ? 'Solte o arquivo aqui...'
                      : 'Arraste o PDF da fatura ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-slate-500">PDF até 10MB</p>
                </div>
              )}
            </div>

            {/* Botão de Upload */}
            <Button
              onClick={handleUpload}
              disabled={!uploadedFile || !selectedCartao || uploading}
              className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar e Processar
                </>
              )}
            </Button>

            {/* Info */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Como funciona?</p>
                <ol className="mt-1 space-y-1 list-decimal list-inside">
                  <li>Selecione o cartão correspondente à fatura</li>
                  <li>Envie o PDF da fatura do seu banco</li>
                  <li>Nossa IA extrairá as transações automaticamente</li>
                  <li>Revise e confirme antes de importar</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Importações */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Histórico de Importações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-slate-400 animate-spin" />
              </div>
            ) : importacoes.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm text-slate-500 mt-2">Nenhuma importação realizada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importacoes.slice(0, 10).map((imp) => {
                  const cartao = cartoes.find((c) => c.id === imp.cartao_id)
                  return (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: cartao?.cor || '#64748B' }}
                        >
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {imp.arquivo_nome}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {cartao?.nome || 'Cartão'}
                            </span>
                            {imp.transacoes_importadas > 0 && (
                              <span className="text-xs text-emerald-600">
                                • {imp.transacoes_importadas} transações
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(imp.status)}
                        {imp.status === 'concluido' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
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
    </div>
  )
}
