'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { formatBrazilDateTime } from '@/lib/timezone'
import { toast } from 'sonner'
import { avatarColor, getInitials } from './publicacoes-ui'

interface Comentario {
  id: string
  texto: string
  created_at: string
  user_id: string
  nome_completo: string
  role: string | null
}

interface PublicacaoConversaProps {
  publicacaoId: string
  escritorioId: string
  aberta: boolean
  onToggle: () => void
}

export default function PublicacaoConversa({
  publicacaoId,
  escritorioId,
  aberta,
  onToggle,
}: PublicacaoConversaProps) {
  const { user } = useAuth()
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
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

    const userIds = [...new Set(data.map((c: { user_id: string }) => c.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome_completo, role')
      .in('id', userIds)

    const profMap = new Map<string, { nome_completo: string; role: string | null }>()
    ;(profiles || []).forEach((p: { id: string; nome_completo: string; role: string | null }) => {
      profMap.set(p.id, { nome_completo: p.nome_completo, role: p.role ?? null })
    })

    setComentarios(
      data.map((c: { id: string; texto: string; created_at: string; user_id: string }) => ({
        ...c,
        nome_completo: profMap.get(c.user_id)?.nome_completo || 'Usuário',
        role: profMap.get(c.user_id)?.role ?? null,
      }))
    )
  }, [publicacaoId])

  useEffect(() => {
    setLoading(true)
    fetchComentarios().finally(() => setLoading(false))
  }, [fetchComentarios])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [comentarios.length])

  const enviar = async () => {
    const t = texto.trim()
    if (!t || !user) return
    setEnviando(true)
    try {
      const supabase = supabaseRef.current
      const { error } = await supabase
        .from('publicacoes_comentarios')
        .insert({ publicacao_id: publicacaoId, user_id: user.id, escritorio_id: escritorioId, texto: t })
      if (error) throw error
      setTexto('')
      await fetchComentarios()
    } catch (err) {
      console.error('Erro ao enviar comentário:', err)
      toast.error('Erro ao enviar comentário')
    } finally {
      setEnviando(false)
    }
  }

  const excluir = async (id: string) => {
    try {
      const supabase = supabaseRef.current
      const { error } = await supabase.from('publicacoes_comentarios').delete().eq('id', id)
      if (error) throw error
      setComentarios(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Erro ao excluir comentário:', err)
      toast.error('Erro ao excluir comentário')
    }
  }

  // ---- rail recolhido ----
  if (!aberta) {
    return (
      <div className="w-[50px] flex-shrink-0 border-l border-[#e6e3da] dark:border-[#253345] bg-[#fbfaf6] dark:bg-[#0e141d] flex flex-col items-center pt-3.5">
        <button
          onClick={onToggle}
          title="Abrir conversa da equipe"
          className="relative w-9 h-9 rounded-[10px] border border-[#e6e3da] dark:border-[#253345] bg-[#ffffff] dark:bg-[#141b25] text-[#89bcbe] flex items-center justify-center"
        >
          <MessageSquare className="w-4 h-4" />
          {comentarios.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-lg bg-[#89bcbe] text-white text-[9.5px] font-bold font-mono flex items-center justify-center">
              {comentarios.length}
            </span>
          )}
        </button>
        <div className="mt-3 text-[11px] font-semibold text-[#9aa1a8] dark:text-[#5a6675] [writing-mode:vertical-rl] tracking-[0.04em]">
          Conversa da equipe
        </div>
      </div>
    )
  }

  // ---- painel aberto ----
  return (
    <div className="w-[356px] flex-shrink-0 border-l border-[#e6e3da] dark:border-[#253345] bg-[#fbfaf6] dark:bg-[#0e141d] flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-[#f0ede3] dark:border-[#1d2a3c] flex items-center gap-2 flex-shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-[#89bcbe]" />
        <span className="text-[12.5px] font-semibold text-[#2c3e50] dark:text-[#edf1f7]">Conversa da equipe</span>
        <span className="text-[11px] font-semibold text-[#9aa1a8] dark:text-[#5a6675] ml-auto">{comentarios.length}</span>
        <button
          onClick={onToggle}
          title="Fechar conversa"
          className="w-6 h-6 rounded-md text-[#9aa1a8] dark:text-[#5a6675] hover:text-[#5a6775] dark:hover:text-[#8a97a8] flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto min-h-0 px-4 py-4 flex flex-col gap-3.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-[#9aa1a8]" />
          </div>
        ) : comentarios.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-2 py-5">
            <MessageSquare className="w-[22px] h-[22px] text-[#9aa1a8] dark:text-[#5a6675]" />
            <div className="text-[12.5px] font-medium text-[#5a6775] dark:text-[#8a97a8]">Nenhum comentário ainda</div>
            <div className="text-[11.5px] leading-relaxed text-[#9aa1a8] dark:text-[#5a6675]">
              Comece a conversa com a equipe sobre esta publicação.
            </div>
          </div>
        ) : (
          comentarios.map(c => {
            const isOwn = c.user_id === user?.id
            return (
              <div key={c.id} className="group flex gap-2.5 items-start">
                <div
                  className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px"
                  style={{ background: avatarColor(getInitials(c.nome_completo)) }}
                >
                  {getInitials(c.nome_completo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-[12px] font-semibold text-[#2c3e50] dark:text-[#edf1f7] truncate">{c.nome_completo}</span>
                    {c.role && (
                      <span className="text-[9.5px] font-semibold text-[#9aa1a8] dark:text-[#5a6675] uppercase tracking-[0.04em] flex-shrink-0">{c.role}</span>
                    )}
                    <span className="text-[10px] text-[#9aa1a8] dark:text-[#5a6675] ml-auto flex-shrink-0">{formatBrazilDateTime(c.created_at)}</span>
                    {isOwn && (
                      <button
                        onClick={() => excluir(c.id)}
                        title="Excluir"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c9cdd2] hover:text-[#a85a3e] flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div
                    className={cn(
                      'text-[12.5px] leading-[1.55] rounded-[10px] px-[11px] py-2 border whitespace-pre-wrap',
                      isOwn
                        ? 'bg-[#eef2f7] dark:bg-[rgba(70,98,127,0.18)] border-[#dde4ee] dark:border-[#2a3a4d] text-[#3a4654] dark:text-[#c4cedb]'
                        : 'bg-[#ffffff] dark:bg-[#141b25] border-[#e6e3da] dark:border-[#253345] text-[#3a4654] dark:text-[#c4cedb]'
                    )}
                  >
                    {c.texto}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-3.5 border-t border-[#f0ede3] dark:border-[#1d2a3c] flex-shrink-0">
        <div className="bg-[#ffffff] dark:bg-[#10161f] border border-[#e6e3da] dark:border-[#253345] rounded-xl p-2 flex flex-col gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escreva um comentário…"
            rows={2}
            disabled={enviando}
            className="w-full resize-none border-none outline-none bg-transparent text-[12.5px] leading-[1.5] text-[#2c3e50] dark:text-[#edf1f7] placeholder:text-[#9aa1a8] dark:placeholder:text-[#5a6675]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9aa1a8] dark:text-[#5a6675]">Enter envia · Shift+Enter quebra linha</span>
            <button
              onClick={enviar}
              disabled={!texto.trim() || enviando}
              className={cn(
                'w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-colors',
                texto.trim()
                  ? 'bg-gradient-to-br from-[#34495e] to-[#46627f] text-white'
                  : 'bg-[#ece9e2] dark:bg-[#1c2530] text-[#9aa1a8] dark:text-[#5a6675]'
              )}
            >
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
