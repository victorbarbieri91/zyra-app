// ============================================
// STEP 1: UPLOAD DE ARQUIVO
// ============================================

'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react'
import { parseArquivo, validarArquivo } from '@/lib/migracao/parser'
import { MigracaoState, StepMigracao } from '@/types/migracao'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export function StepUpload({
  state,
  updateState,
  goToStep,
  setError,
  setIsLoading,
  isLoading
}: Props) {

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validar arquivo
    const validacao = validarArquivo(file)
    if (!validacao.valido) {
      setError(validacao.erro || 'Arquivo inválido')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await parseArquivo(file)

      if (result.headers.length === 0) {
        throw new Error('Arquivo não possui colunas/headers')
      }

      if (result.totalLinhas === 0) {
        throw new Error('Arquivo não possui dados')
      }

      updateState({
        arquivo: file,
        headers: result.headers,
        amostra: result.amostra,
        totalLinhas: result.totalLinhas
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    } finally {
      setIsLoading(false)
    }
  }, [updateState, setError, setIsLoading])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: isLoading
  })

  const limparArquivo = () => {
    updateState({
      arquivo: null,
      headers: [],
      amostra: [],
      totalLinhas: 0,
      mapeamento: {},
      confianca: {}
    })
    setError(null)
  }

  const continuar = () => {
    goToStep('mapeamento')
  }

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Área de upload */}
      {!state.arquivo ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
            ${isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />

          <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />

          {isLoading ? (
            <div>
              <p className="text-slate-600 font-medium">Processando arquivo...</p>
              <p className="text-sm text-slate-400 mt-1">Aguarde enquanto analisamos os dados</p>
            </div>
          ) : isDragActive ? (
            <p className="text-blue-600 font-medium">Solte o arquivo aqui</p>
          ) : (
            <>
              <p className="text-slate-600 font-medium mb-2">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-sm text-slate-400">
                Formatos aceitos: .csv, .xlsx, .xls (máximo 10MB)
              </p>
            </>
          )}
        </div>
      ) : (
        /* Arquivo selecionado */
        <Card className="p-4 border-green-200 bg-green-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">{state.arquivo.name}</p>
                <p className="text-sm text-slate-500">
                  {formatFileSize(state.arquivo.size)} • {state.totalLinhas} linhas detectadas
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={limparArquivo}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Preview dos dados */}
      {state.arquivo && state.amostra.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Preview das primeiras linhas:
          </h3>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500 w-10">#</th>
                  {state.headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.amostra.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                    {state.headers.map((header, j) => (
                      <td
                        key={j}
                        className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[200px] truncate"
                        title={String(row[header] || '')}
                      >
                        {String(row[header] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.totalLinhas > 5 && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              Mostrando 5 de {state.totalLinhas} linhas
            </p>
          )}
        </div>
      )}

      {/* Info sobre colunas */}
      {state.headers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">
                {state.headers.length} colunas detectadas
              </p>
              <p className="mt-1">
                No próximo passo, a IA irá sugerir o mapeamento dessas colunas
                para os campos do sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botão continuar */}
      <div className="flex justify-end">
        <Button
          onClick={continuar}
          disabled={!state.arquivo || state.headers.length === 0}
          size="lg"
        >
          Continuar para Mapeamento
        </Button>
      </div>
    </div>
  )
}
