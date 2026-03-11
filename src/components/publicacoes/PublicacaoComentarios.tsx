'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, Loader2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { formatBrazilDateTime } from '@/lib/timezone'
import { toast } from 'sonner'

// ============================================
// TIPOS
// ============================================

interface Comentario {
  id: string
  texto: string
  created_at: string
  user_id: string
  nome_completo: string
}

interface PublicacaoComentariosProps {
  publicacaoId: string
  escritorioId: string
  className?: string
  aberto?: boolean
  onToggle?: () => void
}

// ============================================
// HELPERS
// ============================================

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// ============================================
// COMPONENTE
// ============================================

export default function PublicacaoComentarios({
  publicacaoId,
  escritorioId,
  className,
  aberto: abertoExterno,
  onToggle,
}: PublicacaoComentariosProps) {
  const { user } = useAuth()
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const [abertoInterno, setAbertoInterno] = useState(true)
  const aberto = abertoExterno !== undefined ? abertoExterno : abertoInterno
  const listRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  const fetchComentarios = useCallback(async () => {
    const supabase = supabaseRef.current
    const { data, error } = await supabase
      .from('publicacoes_comentarios')
      .select('id, texto, created_at, user_id')
      .eq('publicacao_id', publicacaoId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao carregar comentários:', error)
      return
    }

    if (!data || data.length === 0) {
      setComentarios([])
      return
    }

    // Buscar nomes dos autores
    const userIds = [...new Set(data.map((c: { user_id: string }) => c.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .in('id', userIds)

    const nomeMap = new Map(
      (profiles || []).map((p: { id: string; nome_completo: string }) => [p.id, p.nome_completo])
    )

    setComentarios(data.map((c: { id: string; texto: string; created_at: string; user_id: string }) => ({
      ...c,
      nome_completo: nomeMap.get(c.user_id) || 'Usuário',
    })))
  }, [publicacaoId])

  useEffect(() => {
    setLoading(true)
    fetchComentarios().finally(() => setLoading(false))
  }, [fetchComentarios])

  // Auto-scroll para o final ao adicionar comentário
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comentarios.length])

  const enviarComentario = async () => {
    const textoTrimmed = texto.trim()
    if (!textoTrimmed || !user) return

    setEnviando(true)
    try {
      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('publicacoes_comentarios')
        .insert({
          publicacao_id: publicacaoId,
          user_id: user.id,
          escritorio_id: escritorioId,
          texto: textoTrimmed,
        })

      if (error) throw error

      setTexto('')
      await fetchComentarios()
    } catch (err: any) {
      console.error('Erro ao enviar comentário:', err)
      toast.error('Erro ao enviar comentário')
    } finally {
      setEnviando(false)
    }
  }

  const excluirComentario = async (id: string) => {
    try {
      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('publicacoes_comentarios')
        .delete()
        .eq('id', id)

      if (error) throw error
      setComentarios(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      console.error('Erro ao excluir comentário:', err)
      toast.error('Erro ao excluir comentário')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarComentario()
    }
  }

  return (
    <div className={cn(
      'bg-white dark:bg-[hsl(var(--surface-2))] rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col',
      className
    )}>
      {/* Header - clicável para expandir/colapsar */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle ? onToggle() : setAbertoInterno(prev => !prev) }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-slate-50 dark:hover:bg-[hsl(var(--surface-3))] transition-colors shrink-0',
          aberto && 'border-b border-slate-100 dark:border-slate-700/50'
        )}
      >
        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#34495e] to-[#46627f] dark:from-[#89bcbe] dark:to-[#6ba9ab] flex items-center justify-center">
          <MessageSquare className="w-3 h-3 text-white" />
        </div>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Comentários
        </span>
        {comentarios.length > 0 && (
          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full px-1.5 py-0.5 leading-none">
            {comentarios.length}
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {aberto
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </span>
      </button>

      {/* Conteúdo colapsável */}
      {!aberto ? null : <>
      {/* Lista de comentários */}
      <div
        ref={listRef}
        className="flex-1 flex flex-col overflow-y-auto min-h-0"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : comentarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 px-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[hsl(var(--surface-3))] flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 text-center">Nenhum comentário</p>
            <p className="text-[10px] text-slate-300 dark:text-slate-500 text-center mt-0.5">
              Adicione observações sobre esta publicação
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {comentarios.map((c) => {
              const nome = c.nome_completo
              const isOwn = c.user_id === user?.id

              return (
                <div key={c.id} className="group">
                  <div className={cn(
                    'rounded-lg p-2.5',
                    isOwn
                      ? 'bg-blue-50/60 dark:bg-blue-950/20'
                      : 'bg-slate-50 dark:bg-[hsl(var(--surface-3))]'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px] font-semibold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200">
                          {getInitials(nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-none">
                        {nome}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-none ml-auto">
                        {formatBrazilDateTime(c.created_at)}
                      </span>
                      {isOwn && (
                        <button
                          onClick={(e) => { e.stopPropagation(); excluirComentario(c.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed pl-7">
                      {c.texto}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 dark:border-slate-700/50 p-2.5">
        <div className="flex gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário..."
            className="min-h-[36px] max-h-[80px] resize-none text-xs border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-[#1E3A8A]/30"
            rows={1}
            disabled={enviando}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
            onClick={(e) => { e.stopPropagation(); enviarComentario() }}
            disabled={!texto.trim() || enviando}
          >
            {enviando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1 pl-1">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
      </>}
    </div>
  )
}
