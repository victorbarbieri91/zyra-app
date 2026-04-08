'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import PublicacaoComentarios from './PublicacaoComentarios'

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
  processo_autor?: string
  processo_reu?: string
  status: string
  is_snippet?: boolean
  escritorio_id?: string
}

interface PublicacaoExpandedRowProps {
  publicacao: PublicacaoBasica
  isExpanded: boolean
  escritorioId: string
  onCriarTarefa: () => void
  onCriarEvento: () => void
  onCriarAudiencia: () => void
  onCriarProcesso: (cnj: string) => void
  /** Cache externo para evitar re-fetch ao re-expandir */
  cachedData?: { texto: string | null }
  onDataLoaded?: (id: string, data: { texto: string | null }) => void
}

// ============================================
// COMPONENTE
// ============================================

export default function PublicacaoExpandedRow({
  publicacao,
  isExpanded,
  escritorioId,
  onCriarTarefa,
  onCriarEvento,
  onCriarAudiencia,
  onCriarProcesso,
  cachedData,
  onDataLoaded,
}: PublicacaoExpandedRowProps) {
  const [texto, setTexto] = useState<string | null>(cachedData?.texto ?? null)
  const [carregandoTexto, setCarregandoTexto] = useState(false)
  const [comentariosAbertos, setComentariosAbertos] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const supabaseRef = useRef(createClient())
  const fetchedRef = useRef(false)

  // Lazy-load texto ao expandir
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
        const { data } = await supabase
          .from('publicacoes_publicacoes')
          .select('texto_completo')
          .eq('id', publicacao.id)
          .single()

        const textoCompleto = data?.texto_completo || null
        setTexto(textoCompleto)
        fetchedRef.current = true

        onDataLoaded?.(publicacao.id, { texto: textoCompleto })
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
      fetchedRef.current = true
    }
  }, [cachedData])

  const copiarTexto = () => {
    if (texto) {
      navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast.success('Texto copiado!')
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (!isExpanded) return null

  const temPartes = publicacao.processo_autor || publicacao.processo_reu

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="border-l-[3px] border-[#1E3A8A] bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-400/40">
          <div className="p-4">
            {/* Card processo - se vinculado */}
            {publicacao.numero_processo && (
              <div className="flex items-center justify-between bg-white dark:bg-[hsl(var(--surface-2))] rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-[hsl(var(--surface-3))] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 leading-none mb-0.5">Processo</p>
                    {temPartes && (
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[280px]">
                        {[publicacao.processo_autor, publicacao.processo_reu].filter(Boolean).join(' x ')}
                      </p>
                    )}
                    <p className={cn(
                      'font-mono text-slate-500 dark:text-slate-400',
                      temPartes ? 'text-[10px]' : 'text-xs font-medium text-slate-700 dark:text-slate-200'
                    )}>
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
              <div className="p-2 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 rounded-md flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Texto possivelmente incompleto. A fonte retornou apenas um trecho.
                </p>
              </div>
            )}

            {/* Layout flex: texto expande quando comentários colapsados */}
            <div className="flex gap-4 flex-col lg:flex-row">
              {/* Coluna Texto - expande para full quando comentários fechados */}
              <div className={cn(
                'flex flex-col min-w-0 transition-all duration-300',
                comentariosAbertos ? 'lg:flex-1' : 'lg:flex-[1_1_100%]'
              )}>
                {carregandoTexto ? (
                  <div className="space-y-2 bg-white dark:bg-[hsl(var(--surface-2))] rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-9/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-7/12" />
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[hsl(var(--surface-2))] rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-[380px]">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Texto da Publicação</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); copiarTexto() }}
                        className="h-6 px-2 text-[10px] gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        disabled={!texto}
                      >
                        {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                    <div className="relative flex-1 min-h-0">
                      <div className="absolute inset-0 overflow-y-auto">
                        <div className="p-3">
                          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {texto || 'Sem texto disponível'}
                          </p>
                        </div>
                      </div>
                      {/* Gradiente fade indicando mais conteúdo */}
                      {texto && texto.length > 800 && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[hsl(var(--surface-2))] to-transparent pointer-events-none rounded-b-lg" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Comentários - retrai para só header quando colapsado */}
              <div className={cn(
                'flex flex-col transition-all duration-300',
                comentariosAbertos ? 'lg:flex-1 h-[380px]' : 'lg:w-auto h-auto'
              )}>
                <PublicacaoComentarios
                  publicacaoId={publicacao.id}
                  escritorioId={escritorioId}
                  className={comentariosAbertos ? 'h-full' : ''}
                  aberto={comentariosAbertos}
                  onToggle={() => setComentariosAbertos(prev => !prev)}
                />
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
