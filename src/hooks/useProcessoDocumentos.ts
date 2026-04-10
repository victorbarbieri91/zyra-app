'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'

export interface ProcessoDocumento {
  id: string
  nome: string
  tipo: string | null
  tamanho: number
  mime_type: string | null
  storage_path: string | null
  descricao: string | null
  categoria: string | null
  created_at: string
  created_by: string | null
  created_by_nome: string
}

interface UseProcessoDocumentosReturn {
  documentos: ProcessoDocumento[]
  total: number
  loading: boolean
  uploading: boolean
  uploadProgress: number
  uploadDocumentos: (files: File[]) => Promise<void>
  getSignedUrl: (documento: ProcessoDocumento) => Promise<string | null>
  deleteDocumento: (documento: ProcessoDocumento) => Promise<boolean>
  reload: () => Promise<void>
}

const MAX_FILE_SIZE = 52428800 // 50MB
const BUCKET = 'documentos'

export function useProcessoDocumentos(processoId: string): UseProcessoDocumentosReturn {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const [documentos, setDocumentos] = useState<ProcessoDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const load = useCallback(async () => {
    if (!processoId || !escritorioAtivo) {
      setDocumentos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          id,
          nome,
          tipo,
          tamanho,
          mime_type,
          storage_path,
          descricao,
          categoria,
          created_at,
          created_by,
          profiles:created_by (nome_completo)
        `)
        .eq('processo_id', processoId)
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: false })

      if (error) throw error

      const docs: ProcessoDocumento[] = (data || []).map((doc: Record<string, unknown>) => {
        const profile = doc.profiles as { nome_completo?: string } | null
        return {
          id: doc.id as string,
          nome: doc.nome as string,
          tipo: (doc.tipo as string) || null,
          tamanho: (doc.tamanho as number) || 0,
          mime_type: (doc.mime_type as string) || null,
          storage_path: (doc.storage_path as string) || null,
          descricao: (doc.descricao as string) || null,
          categoria: (doc.categoria as string) || null,
          created_at: doc.created_at as string,
          created_by: (doc.created_by as string) || null,
          created_by_nome: profile?.nome_completo || 'Usuário',
        }
      })

      setDocumentos(docs)
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase])

  useEffect(() => {
    load()
  }, [load])

  const sanitizeFilename = (name: string) => {
    // Remove acentos e caracteres especiais, preserva extensão
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]/g, '_')
    return normalized.substring(0, 100)
  }

  const inferTipoFromMime = (mimeType: string | undefined, nome: string): string => {
    if (!mimeType) {
      const ext = nome.split('.').pop()?.toLowerCase() || ''
      return ext.toUpperCase() || 'Documento'
    }
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('word')) return 'Word'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Excel'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PowerPoint'
    if (mimeType.startsWith('image/')) return 'Imagem'
    if (mimeType.includes('zip')) return 'ZIP'
    if (mimeType.includes('text/')) return 'Texto'
    return 'Documento'
  }

  const uploadDocumentos = useCallback(async (files: File[]) => {
    if (!processoId || !escritorioAtivo || files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Usuário não autenticado')
      setUploading(false)
      return
    }

    let sucessos = 0
    let falhas = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede o limite de 50MB`)
        falhas++
        continue
      }

      try {
        const uniqueId = crypto.randomUUID()
        const safeName = sanitizeFilename(file.name)
        const storagePath = `${escritorioAtivo}/${processoId}/${uniqueId}-${safeName}`

        // Upload para Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadError) throw uploadError

        // Registrar na tabela documentos
        const { error: insertError } = await supabase
          .from('documentos')
          .insert({
            escritorio_id: escritorioAtivo,
            processo_id: processoId,
            nome: file.name,
            tipo: inferTipoFromMime(file.type, file.name),
            tamanho: file.size,
            mime_type: file.type || null,
            storage_path: storagePath,
            created_by: user.id,
          })

        if (insertError) {
          // Rollback do storage
          await supabase.storage.from(BUCKET).remove([storagePath])
          throw insertError
        }

        sucessos++
      } catch (error) {
        console.error('Erro ao fazer upload do arquivo:', file.name, error)
        falhas++
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)

    if (sucessos > 0) {
      toast.success(
        sucessos === 1
          ? 'Documento enviado com sucesso'
          : `${sucessos} documentos enviados com sucesso`
      )
      await load()
    }
    if (falhas > 0) {
      toast.error(
        falhas === 1
          ? 'Falha ao enviar 1 documento'
          : `Falha ao enviar ${falhas} documentos`
      )
    }
  }, [processoId, escritorioAtivo, supabase, load])

  const getSignedUrl = useCallback(async (documento: ProcessoDocumento): Promise<string | null> => {
    if (!documento.storage_path) {
      toast.error('Documento sem arquivo associado')
      return null
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(documento.storage_path, 300) // 5 minutos

    if (error || !data?.signedUrl) {
      console.error('Erro ao gerar URL assinada:', error)
      toast.error('Erro ao gerar link de acesso')
      return null
    }

    return data.signedUrl
  }, [supabase])

  const deleteDocumento = useCallback(async (documento: ProcessoDocumento): Promise<boolean> => {
    try {
      // Remover do storage (se tiver path)
      if (documento.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([documento.storage_path])

        if (storageError) {
          console.warn('Erro ao remover do storage (pode já ter sido removido):', storageError)
        }
      }

      // Remover da tabela
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documento.id)
        .eq('escritorio_id', escritorioAtivo)

      if (dbError) throw dbError

      toast.success('Documento excluído')
      await load()
      return true
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
      toast.error('Erro ao excluir documento')
      return false
    }
  }, [supabase, escritorioAtivo, load])

  return {
    documentos,
    total: documentos.length,
    loading,
    uploading,
    uploadProgress,
    uploadDocumentos,
    getSignedUrl,
    deleteDocumento,
    reload: load,
  }
}
