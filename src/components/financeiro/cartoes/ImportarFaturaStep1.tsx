'use client'

import {
  Upload,
  FileText,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { CartaoCredito } from '@/hooks/useCartoesCredito'
import type { EscritorioComRole } from '@/lib/supabase/escritorio-helpers'

interface ImportarFaturaStep1Props {
  cartoes: CartaoCredito[]
  selectedCartao: string
  setSelectedCartao: (id: string) => void
  loading: boolean
  uploadedFile: File | null
  setUploadedFile: (file: File | null) => void
  getRootProps: () => any
  getInputProps: () => any
  isDragActive: boolean
  formatFileSize: (bytes: number) => string
  escritoriosGrupo: EscritorioComRole[]
}

export default function ImportarFaturaStep1({
  cartoes,
  selectedCartao,
  setSelectedCartao,
  loading,
  uploadedFile,
  setUploadedFile,
  getRootProps,
  getInputProps,
  isDragActive,
  formatFileSize,
  escritoriosGrupo,
}: ImportarFaturaStep1Props) {
  return (
    <div className="px-8 py-10 sm:py-12 space-y-8 max-w-xl mx-auto">
      {/* Seleção de Cartão */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cartão</Label>
        {loading ? (
          <div className="h-10 bg-slate-100 dark:bg-surface-2 animate-pulse rounded-md" />
        ) : cartoes.length === 0 ? (
          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum cartão cadastrado</p>
          </div>
        ) : (
          <Select value={selectedCartao} onValueChange={setSelectedCartao}>
            <SelectTrigger className="h-11">
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
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Arquivo PDF</Label>
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-10 sm:p-12 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-[#34495e] bg-slate-50 dark:bg-surface-0'
              : uploadedFile
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-surface-2'
          )}
        >
          <input {...getInputProps()} />
          {uploadedFile ? (
            <div className="space-y-3">
              <FileText className="w-14 h-14 mx-auto text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{uploadedFile.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatFileSize(uploadedFile.size)}</p>
              </div>
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
            <div className="space-y-3">
              <Upload className="w-14 h-14 mx-auto text-slate-400" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste o PDF ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF até 20MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
