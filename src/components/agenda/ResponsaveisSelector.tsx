'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, UserPlus, Users, Check, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros'

interface Membro {
  id: string
  user_id: string
  nome: string
  email?: string
  avatar_url?: string
}

interface ResponsaveisSelectorProps {
  escritorioId: string | undefined
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  maxDisplay?: number // Máximo de avatares a exibir antes de mostrar "+N"
}

export default function ResponsaveisSelector({
  escritorioId,
  selectedIds,
  onChange,
  label = 'Responsáveis',
  placeholder = 'Selecionar responsáveis...',
  disabled = false,
  className,
  maxDisplay = 3,
}: ResponsaveisSelectorProps) {
  const { membros, carregando } = useEscritorioMembros(escritorioId)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filtra membros pela busca
  const membrosFiltrados = useMemo(() => {
    if (!search.trim()) return membros
    const termo = search.toLowerCase()
    return membros.filter(
      (m) =>
        m.nome.toLowerCase().includes(termo) ||
        m.email?.toLowerCase().includes(termo)
    )
  }, [membros, search])

  // Membros selecionados com dados completos
  const selectedMembros = useMemo(() => {
    return membros.filter((m) => selectedIds.includes(m.user_id))
  }, [membros, selectedIds])

  const handleToggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId))
    } else {
      onChange([...selectedIds, userId])
    }
  }

  const handleRemove = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId))
  }

  const handleClear = () => {
    onChange([])
  }

  // Gera iniciais para avatar
  const getInitials = (nome: string) => {
    const parts = nome.split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Cores para avatares (baseado no user_id para consistência)
  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-amber-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-indigo-500',
      'bg-rose-500',
    ]
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium text-[#46627f]">{label}</Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || carregando}
            className={cn(
              'w-full justify-between border-slate-200 hover:bg-slate-50',
              selectedIds.length === 0 && 'text-slate-500'
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedIds.length === 0 ? (
                <>
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{placeholder}</span>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  {/* Avatares dos selecionados */}
                  <div className="flex -space-x-2">
                    {selectedMembros.slice(0, maxDisplay).map((membro) => (
                      <div
                        key={membro.user_id}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-white',
                          getAvatarColor(membro.user_id)
                        )}
                        title={membro.nome}
                      >
                        {membro.avatar_url ? (
                          <img
                            src={membro.avatar_url}
                            alt={membro.nome}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(membro.nome)
                        )}
                      </div>
                    ))}
                    {selectedMembros.length > maxDisplay && (
                      <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-medium text-slate-700 ring-2 ring-white">
                        +{selectedMembros.length - maxDisplay}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-slate-600 ml-1">
                    {selectedIds.length === 1
                      ? selectedMembros[0]?.nome
                      : `${selectedIds.length} selecionados`}
                  </span>
                </div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0" align="start">
          {/* Busca */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar membro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 border-slate-200"
              />
            </div>
          </div>

          {/* Lista de membros */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {carregando ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                Carregando membros...
              </div>
            ) : membrosFiltrados.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                {search ? 'Nenhum membro encontrado' : 'Nenhum membro disponível'}
              </div>
            ) : (
              membrosFiltrados.map((membro) => {
                const isSelected = selectedIds.includes(membro.user_id)
                return (
                  <button
                    key={membro.user_id}
                    type="button"
                    onClick={() => handleToggle(membro.user_id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors',
                      isSelected && 'bg-[#89bcbe]/10'
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0',
                        getAvatarColor(membro.user_id)
                      )}
                    >
                      {membro.avatar_url ? (
                        <img
                          src={membro.avatar_url}
                          alt={membro.nome}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(membro.nome)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#34495e] truncate">
                        {membro.nome}
                      </p>
                      {membro.email && (
                        <p className="text-xs text-slate-500 truncate">
                          {membro.email}
                        </p>
                      )}
                    </div>

                    {/* Checkbox visual */}
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-[#89bcbe] border-[#89bcbe]'
                          : 'border-slate-300'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer com ações */}
          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedIds.length} selecionado{selectedIds.length !== 1 && 's'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs text-slate-600 hover:text-red-600"
              >
                Limpar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Chips dos selecionados (exibidos abaixo do seletor) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedMembros.map((membro) => (
            <div
              key={membro.user_id}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#89bcbe]/10 border border-[#89bcbe]/30 rounded-full text-xs"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium',
                  getAvatarColor(membro.user_id)
                )}
              >
                {membro.avatar_url ? (
                  <img
                    src={membro.avatar_url}
                    alt={membro.nome}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(membro.nome)
                )}
              </div>
              <span className="text-[#34495e] font-medium max-w-[100px] truncate">
                {membro.nome.split(' ')[0]}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(membro.user_id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
