'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  FolderPlus,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import PublicacaoAIPanel, { type AnaliseIA } from './PublicacaoAIPanel'

// ============================================
// TIPOS
// ============================================

interface PublicacaoBasica {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: string
  numero_processo?: string
  processo_id?: string
  status: string
  is_snippet?: boolean
  escritorio_id?: string
}

interface PublicacaoExpandedRowProps {
  publicacao: PublicacaoBasica
  isExpanded: boolean
  onCriarTarefa: () => void
  onCriarEvento: () => void
  onCriarAudiencia: () => void
  onCriarProcesso: (cnj: string) => void
  /** Cache externo para evitar re-fetch ao re-expandir */
  cachedData?: { texto: string | null; analise: AnaliseIA | null }
  onDataLoaded?: (id: string, data: { texto: string | null; analise: AnaliseIA | null }) => void
}

// ============================================
// COMPONENTE
// ============================================

export default function PublicacaoExpandedRow({
  publicacao,
  isExpanded,
  onCriarTarefa,
  onCriarEvento,
  onCriarAudiencia,
  onCriarProcesso,
  cachedData,
  onDataLoaded,
}: PublicacaoExpandedRowProps) {
  const [texto, setTexto] = useState<string | null>(cachedData?.texto ?? null)
  const [analise, setAnalise] = useState<AnaliseIA | null>(cachedData?.analise ?? null)
  const [carregandoTexto, setCarregandoTexto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const supabaseRef = useRef(createClient())
  const fetchedRef = useRef(false)

  // Lazy-load texto + analise ao expandir
  useEffect(() => {
    if (!isExpanded || fetchedRef.current) return
    if (cachedData) {
      fetchedRef.current = true
      return
    }

    const fetchData = async () => {
      setCarregandoTexto(true)
      const supabase = supabaseRef.current

      try {
        // Buscar texto completo + analise em paralelo
        const [textoRes, analiseRes] = await Promise.all([
          supabase
            .from('publicacoes_publicacoes')
            .select('texto_completo')
            .eq('id', publicacao.id)
            .single(),
          supabase
            .from('publicacoes_analises')
            .select('resultado')
            .eq('publicacao_id', publicacao.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        const textoCompleto = textoRes.data?.texto_completo || null
        const analiseData = analiseRes.data?.resultado as AnaliseIA | null

        setTexto(textoCompleto)
        setAnalise(analiseData)
        fetchedRef.current = true

        // Notificar cache externo
        onDataLoaded?.(publicacao.id, { texto: textoCompleto, analise: analiseData })
      } catch (err) {
        console.error('Erro ao carregar dados expandidos:', err)
      } finally {
        setCarregandoTexto(false)
      }
    }

    fetchData()
  }, [isExpanded, publicacao.id, cachedData, onDataLoaded])

  // Reset quando collapse + re-expand de diferente publicação
  useEffect(() => {
    if (!isExpanded) {
      fetchedRef.current = false
    }
  }, [isExpanded, publicacao.id])

  // Sync cache externo quando prop muda
  useEffect(() => {
    if (cachedData) {
      setTexto(cachedData.texto)
      setAnalise(cachedData.analise)
      fetchedRef.current = true
    }
  }, [cachedData])

  const handleAnaliseLoaded = useCallback((novaAnalise: AnaliseIA) => {
    setAnalise(novaAnalise)
    onDataLoaded?.(publicacao.id, { texto, analise: novaAnalise })
  }, [publicacao.id, texto, onDataLoaded])

  const copiarTexto = () => {
    if (texto) {
      navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast.success('Texto copiado!')
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (!isExpanded) return null

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="border-l-[3px] border-[#1E3A8A] bg-blue-50/30">
          <div className="p-4">
            {/* Layout 2 colunas desktop / 1 coluna mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Coluna Texto (60%) */}
              <div className="lg:col-span-3 space-y-3">
                {/* Card processo - se vinculado */}
                {publicacao.numero_processo && (
                  <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 leading-none mb-0.5">Processo</p>
                        <p className="text-xs font-mono font-medium text-slate-700">
                          {publicacao.numero_processo}
                        </p>
                      </div>
                    </div>
                    {publicacao.processo_id ? (
                      <Link href={`/dashboard/processos/${publicacao.processo_id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); onCriarProcesso(publicacao.numero_processo!) }}
                      >
                        <FolderPlus className="w-3 h-3" />
                        Criar Pasta
                      </Button>
                    )}
                  </div>
                )}

                {/* Aviso snippet */}
                {publicacao.is_snippet && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Texto possivelmente incompleto. A fonte retornou apenas um trecho.
                    </p>
                  </div>
                )}

                {/* Texto */}
                {carregandoTexto ? (
                  <div className="space-y-2 bg-white rounded-lg border border-slate-200 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-9/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-7/12" />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Texto da Publicação</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); copiarTexto() }}
                        className="h-6 px-2 text-[10px] gap-1 text-slate-400 hover:text-slate-600"
                        disabled={!texto}
                      >
                        {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                    <div className="relative">
                      <ScrollArea className="max-h-[500px]">
                        <div className="p-3 pb-6">
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {texto || 'Sem texto disponível'}
                          </p>
                        </div>
                      </ScrollArea>
                      {/* Gradiente fade indicando mais conteúdo */}
                      {texto && texto.length > 800 && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-lg" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna IA (40%) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 lg:sticky lg:top-4">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Análise IA</span>
                  </div>
                  <div className="p-3">
                    <PublicacaoAIPanel
                      publicacaoId={publicacao.id}
                      analise={analise}
                      onAnaliseLoaded={handleAnaliseLoaded}
                      onCriarTarefa={onCriarTarefa}
                      onCriarEvento={onCriarEvento}
                      onCriarAudiencia={onCriarAudiencia}
                      compact
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
