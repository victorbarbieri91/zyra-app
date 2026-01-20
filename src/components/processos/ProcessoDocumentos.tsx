'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download, Trash2, Eye, Loader2, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate } from '@/lib/timezone'
import { toast } from 'sonner'

interface Documento {
  id: string
  nome: string
  tipo: string
  tamanho: number
  created_at: string
  created_by_nome?: string
  url?: string
}

interface ProcessoDocumentosProps {
  processoId: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function ProcessoDocumentos({ processoId }: ProcessoDocumentosProps) {
  const supabase = createClient()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar documentos do processo
  const loadDocumentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          id,
          nome,
          tipo,
          tamanho,
          created_at,
          profiles:created_by (nome)
        `)
        .eq('processo_id', processoId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const docs = (data || []).map((doc: any) => ({
        id: doc.id,
        nome: doc.nome,
        tipo: doc.tipo || 'Documento',
        tamanho: doc.tamanho || 0,
        created_at: doc.created_at,
        created_by_nome: doc.profiles?.nome || 'Usuário',
      }))

      setDocumentos(docs)
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (processoId) {
      loadDocumentos()
    }
  }, [processoId])

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">Arraste arquivos ou clique para fazer upload</p>
          <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white">
            <Upload className="w-4 h-4 mr-2" />
            Selecionar Arquivos
          </Button>
        </CardContent>
      </Card>

      {/* Empty State */}
      {documentos.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Nenhum documento cadastrado</p>
            <p className="text-xs text-slate-500">
              Faça upload de documentos relacionados a este processo
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Document Grid */
        <div className="grid grid-cols-3 gap-4">
          {documentos.map(doc => (
            <Card key={doc.id} className="border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#34495e] truncate">{doc.nome}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(doc.tamanho)}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mb-3">
                  <p><strong>Tipo:</strong> {doc.tipo}</p>
                  <p><strong>Data:</strong> {formatBrazilDate(doc.created_at)}</p>
                  <p><strong>Por:</strong> {doc.created_by_nome}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
