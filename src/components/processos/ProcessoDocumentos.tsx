'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Loader2,
  FolderOpen,
  MoreVertical,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import {
  useProcessoDocumentos,
  type ProcessoDocumento,
} from '@/hooks/useProcessoDocumentos'

interface ProcessoDocumentosProps {
  processoId: string
  /**
   * variant "inline" — card compacto para usar na Ficha (mostra os 5 mais recentes + drop zone)
   * variant "full" — lista completa em grid (usado dentro do modal Ver todos ou aba dedicada)
   */
  variant?: 'inline' | 'full'
  /** Limite de documentos exibidos no variant inline */
  inlineLimit?: number
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string | null, className: string) {
  if (!mimeType) return <FileText className={className} />
  if (mimeType.includes('pdf')) return <FileText className={className} />
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheet className={className} />
  if (mimeType.startsWith('image/')) return <FileImage className={className} />
  if (mimeType.includes('zip')) return <Archive className={className} />
  return <FileIcon className={className} />
}

function getFileIconColor(mimeType: string | null): string {
  if (!mimeType) return 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
  if (mimeType.includes('pdf'))
    return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
  if (mimeType.startsWith('image/'))
    return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
  if (mimeType.includes('zip'))
    return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
  if (mimeType.includes('word'))
    return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
}

export default function ProcessoDocumentos({
  processoId,
  variant = 'full',
  inlineLimit = 5,
}: ProcessoDocumentosProps) {
  const {
    documentos,
    total,
    loading,
    uploading,
    uploadProgress,
    uploadDocumentos,
    getSignedUrl,
    deleteDocumento,
  } = useProcessoDocumentos(processoId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [verTodosAberto, setVerTodosAberto] = useState(false)
  const [documentoParaExcluir, setDocumentoParaExcluir] =
    useState<ProcessoDocumento | null>(null)

  const isInline = variant === 'inline'
  const documentosVisiveis = isInline ? documentos.slice(0, inlineLimit) : documentos

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadDocumentos(Array.from(files))
      e.target.value = '' // reset input
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      uploadDocumentos(Array.from(files))
    }
  }

  const handleVer = async (doc: ProcessoDocumento) => {
    const url = await getSignedUrl(doc)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async (doc: ProcessoDocumento) => {
    const url = await getSignedUrl(doc)
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = doc.nome
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!documentoParaExcluir) return
    await deleteDocumento(documentoParaExcluir)
    setDocumentoParaExcluir(null)
  }

  // ========================================
  // LISTA DE DOCUMENTOS (usado em ambas variants)
  // ========================================
  const renderListaDocumentos = (docs: ProcessoDocumento[]) => (
    <div className="space-y-1.5">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="group flex items-center gap-3 rounded-lg border border-transparent p-2 hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-surface-2 dark:hover:border-slate-700 transition-colors"
        >
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
              getFileIconColor(doc.mime_type)
            )}
          >
            {getFileIcon(doc.mime_type, 'w-4 h-4')}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-[#34495e] dark:text-slate-200 truncate"
              title={doc.nome}
            >
              {doc.nome}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{formatFileSize(doc.tamanho)}</span>
              <span>•</span>
              <span>{formatBrazilDate(doc.created_at)}</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline truncate">{doc.created_by_nome}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-500 hover:text-[#34495e]"
              onClick={() => handleVer(doc)}
              title="Visualizar"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-500 hover:text-[#34495e]"
              onClick={() => handleDownload(doc)}
              title="Baixar"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-500 hover:text-[#34495e]"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleVer(doc)}>
                  <Eye className="w-3.5 h-3.5 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Baixar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDocumentoParaExcluir(doc)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )

  // ========================================
  // DROP ZONE (sempre visível)
  // ========================================
  const renderDropZone = () => (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={cn(
        'relative cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition-all',
        'hover:border-[#89bcbe] hover:bg-[#f0f9f9] dark:hover:bg-teal-500/5',
        isDragging
          ? 'border-[#89bcbe] bg-[#f0f9f9] dark:bg-teal-500/10'
          : 'border-slate-200 dark:border-slate-700',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-[#89bcbe] animate-spin" />
          <p className="text-xs font-medium text-[#34495e] dark:text-slate-300">
            Enviando... {uploadProgress}%
          </p>
          <div className="w-full max-w-xs h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#89bcbe] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-[#34495e] dark:text-slate-200">
              Arraste arquivos aqui
            </span>{' '}
            ou clique para selecionar
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            PDF, Word, Excel, imagens — até 50MB cada
          </p>
        </div>
      )}
    </div>
  )

  // ========================================
  // LOADING STATE
  // ========================================
  if (loading) {
    return (
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ========================================
  // VARIANT INLINE (para usar na Ficha)
  // ========================================
  if (isInline) {
    return (
      <>
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] dark:from-teal-500/5 dark:to-teal-500/10 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-surface-0 border border-[#89bcbe]/30 flex items-center justify-center shadow-sm">
                  <FolderOpen className="w-3.5 h-3.5 text-[#89bcbe]" />
                </div>
                Documentos
                {total > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 font-medium"
                  >
                    {total}
                  </Badge>
                )}
              </CardTitle>
              {total > inlineLimit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#89bcbe] hover:text-[#6ba9ab]"
                  onClick={() => setVerTodosAberto(true)}
                >
                  Ver todos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {renderDropZone()}

            {total === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nenhum documento cadastrado ainda
                </p>
              </div>
            ) : (
              renderListaDocumentos(documentosVisiveis)
            )}
          </CardContent>
        </Card>

        {/* Dialog: Ver todos os documentos */}
        <Dialog open={verTodosAberto} onOpenChange={setVerTodosAberto}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#89bcbe]" />
                Todos os Documentos
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {total}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Arquivos vinculados a este processo
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1">
              {renderListaDocumentos(documentos)}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVerTodosAberto(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmação de exclusão */}
        <AlertDialog
          open={!!documentoParaExcluir}
          onOpenChange={(open) => !open && setDocumentoParaExcluir(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
              <AlertDialogDescription>
                O arquivo <strong>{documentoParaExcluir?.nome}</strong> será
                excluído permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmarExclusao}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ========================================
  // VARIANT FULL (modo antigo, para compatibilidade)
  // ========================================
  return (
    <>
      <div className="space-y-6">
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#89bcbe]" />
              Documentos
              {total > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDropZone()}

            {total === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-surface-2 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nenhum documento cadastrado
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Faça upload de documentos relacionados a este processo
                </p>
              </div>
            ) : (
              renderListaDocumentos(documentos)
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!documentoParaExcluir}
        onOpenChange={(open) => !open && setDocumentoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{documentoParaExcluir?.nome}</strong> será
              excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
