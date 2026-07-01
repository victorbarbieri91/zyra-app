'use client'

import { useMemo, useState } from 'react'
import { Users, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAgendaRespFilter } from './AgendaRespFilterContext'

// Avatar com iniciais + cor determinística (mesmo padrão do TarefaWizard).
const AVATAR_CORES = ['#34495e', '#46627f', '#3f7376', '#6b9e84', '#8a6438', '#a85a3e', '#415a7e']
function avatarCor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_CORES[h % AVATAR_CORES.length]
}
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function AvatarMini({ nome, url }: { nome: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nome} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <span
      className="w-7 h-7 rounded-full text-white text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0"
      style={{ background: avatarCor(nome) }}
    >
      {iniciais(nome)}
    </span>
  )
}

export function AgendaResponsavelFilter({ className }: { className?: string }) {
  const { membros, userId, ocultos, togglePessoa, marcarTodos, desmarcarTodos } = useAgendaRespFilter()
  const [open, setOpen] = useState(false)

  // Membros ativos, com o próprio usuário sempre no topo, resto alfabético.
  const lista = useMemo(() => {
    const ativos = membros.filter((m) => m.ativo)
    return [...ativos].sort((a, b) => {
      if (a.user_id === userId) return -1
      if (b.user_id === userId) return 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [membros, userId])

  const nOcultos = ocultos.length
  // Quantos colegas (fora eu) existem — para saber se "desmarcar todos" já está no limite.
  const totalColegas = useMemo(() => lista.filter((m) => m.user_id !== userId).length, [lista, userId])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-colors border',
            nOcultos > 0
              ? 'bg-[#34495e] text-white border-[#34495e] hover:bg-[#2c3e50]'
              : 'bg-white dark:bg-[#10161f] text-[#5a6775] dark:text-[#8a97a8] border-[#e2ddd2] dark:border-[#253345] hover:text-[#34495e] dark:hover:text-slate-300',
            className,
          )}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Responsáveis</span>
          {nOcultos > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-white text-[11px] font-bold">
              {nOcultos}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0 rounded-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">Filtrar responsáveis</p>
          <p className="text-[11px] leading-snug text-[#6c757d] dark:text-slate-400 mt-0.5">
            Desmarque colegas para esconder as tarefas deles e limpar sua agenda.
          </p>
        </div>

        {/* Lista de pessoas */}
        <div className="border-t border-slate-100 dark:border-slate-700">
          <div className="max-h-64 overflow-y-auto py-1.5">
            {lista.map((m) => {
              const isSelf = m.user_id === userId
              const oculto = ocultos.includes(m.user_id)
              const visivel = !oculto
              return (
                <button
                  key={m.user_id}
                  type="button"
                  disabled={isSelf}
                  onClick={() => togglePessoa(m.user_id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors',
                    isSelf ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-surface-2',
                  )}
                >
                  <AvatarMini nome={m.nome} url={m.avatar_url} />
                  <span className="flex-1 min-w-0 text-[13px] text-[#34495e] dark:text-slate-200 truncate">
                    {m.nome}
                    {isSelf && <span className="ml-1.5 text-[11px] text-[#89bcbe] font-medium">você</span>}
                  </span>
                  {/* Caixa de seleção: marcada = visível */}
                  <span
                    className={cn(
                      'w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-colors',
                      visivel
                        ? 'bg-[#3f7376] border-[#3f7376] text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent',
                    )}
                  >
                    {visivel && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
            {lista.length === 0 && (
              <p className="px-4 py-3 text-[13px] text-[#6c757d] dark:text-slate-400">Nenhum membro encontrado.</p>
            )}
          </div>

          {/* Rodapé: marcar / desmarcar todos */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={marcarTodos}
              disabled={nOcultos === 0}
              className={cn(
                'text-[12px] font-semibold transition-colors',
                nOcultos === 0
                  ? 'text-slate-300 dark:text-slate-600 cursor-default'
                  : 'text-[#3f7376] hover:text-[#2f5658] dark:text-[#7fb8ba]',
              )}
            >
              Marcar todos
            </button>
            <button
              type="button"
              onClick={desmarcarTodos}
              disabled={totalColegas === 0 || nOcultos >= totalColegas}
              className={cn(
                'text-[12px] font-semibold transition-colors',
                totalColegas === 0 || nOcultos >= totalColegas
                  ? 'text-slate-300 dark:text-slate-600 cursor-default'
                  : 'text-[#a85a3e] hover:text-[#8f4a32] dark:text-[#e0a085]',
              )}
            >
              Desmarcar todos
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
