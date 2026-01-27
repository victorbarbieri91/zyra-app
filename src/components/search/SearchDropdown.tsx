'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Loader2,
  Scale,
  Users,
  CheckSquare,
  Calendar,
  Gavel,
  FileText,
  Newspaper,
  BookOpen,
  Package,
  Briefcase
} from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import type { ResultadoBusca, TipoResultadoBusca } from '@/types/search'

const ICONES: Record<TipoResultadoBusca, React.ElementType> = {
  processo: Scale,
  pessoa: Users,
  tarefa: CheckSquare,
  evento: Calendar,
  audiencia: Gavel,
  contrato: FileText,
  publicacao: Newspaper,
  consultivo: BookOpen,
  produto: Package,
  projeto: Briefcase
}

const CORES: Record<TipoResultadoBusca, string> = {
  processo: '#34495e',
  pessoa: '#1E3A8A',
  tarefa: '#f97316',
  evento: '#8b5cf6',
  audiencia: '#dc2626',
  contrato: '#059669',
  publicacao: '#0891b2',
  consultivo: '#7c3aed',
  produto: '#84cc16',
  projeto: '#ea580c'
}

export default function SearchDropdown() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const { query, setQuery, resultados, isLoading, limpar } = useGlobalSearch({
    debounceMs: 200,
    minChars: 2
  })

  const showDropdown = isFocused && (query.length >= 2 || isLoading)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || resultados.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < resultados.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : resultados.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && resultados[selectedIndex]) {
          handleSelect(resultados[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelect = (resultado: ResultadoBusca) => {
    router.push(resultado.navegacao)
    setIsFocused(false)
    limpar()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-[#89bcbe]/10 to-[#aacfd0]/10 rounded-md flex items-center justify-center group-focus-within:from-[#89bcbe]/20 group-focus-within:to-[#aacfd0]/20 transition-all">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-[#89bcbe] group-focus-within:scale-110 transition-transform" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar processos, clientes, documentos..."
          className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-[#89bcbe]/30 rounded-lg text-sm text-[#34495e] placeholder:text-slate-400 focus:outline-none focus:border-[#89bcbe] focus:shadow-sm focus:shadow-[#89bcbe]/10 transition-all"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {isLoading && resultados.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              Buscando...
            </div>
          )}

          {!isLoading && query.length >= 2 && resultados.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              Nenhum resultado encontrado
            </div>
          )}

          {resultados.map((resultado, idx) => {
            const Icone = ICONES[resultado.tipo]
            const cor = CORES[resultado.tipo]

            return (
              <button
                key={`${resultado.tipo}-${resultado.id}`}
                onClick={() => handleSelect(resultado)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  idx === selectedIndex ? 'bg-[#f0f9f9]' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cor}15` }}
                >
                  <Icone className="w-3.5 h-3.5" style={{ color: cor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#34495e] truncate">
                      {resultado.titulo}
                    </span>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: `${cor}15`, color: cor }}
                    >
                      {resultado.modulo}
                    </span>
                  </div>
                  {resultado.subtitulo && (
                    <p className="text-xs text-slate-500 truncate">{resultado.subtitulo}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
