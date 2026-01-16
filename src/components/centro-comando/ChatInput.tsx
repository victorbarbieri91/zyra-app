'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { COMANDOS_SUGERIDOS, ComandoSugestao } from '@/types/centro-comando'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [value])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (sugestao: ComandoSugestao) => {
    setValue(sugestao.texto)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* Sugestões */}
      {showSuggestions && value === '' && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sugestões de comandos
            </span>
          </div>
          <div className="p-1">
            {COMANDOS_SUGERIDOS.map((sugestao, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(sugestao)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md transition-colors"
              >
                <div className="text-sm text-slate-700">{sugestao.texto}</div>
                <div className="text-xs text-slate-400">{sugestao.descricao}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input principal */}
      <div className="flex items-end gap-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder || "Digite seu comando ou pergunta..."}
            disabled={disabled}
            className="min-h-[44px] max-h-[150px] resize-none border-0 focus-visible:ring-0 p-0 text-sm"
            rows={1}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          size="icon"
          className="flex-shrink-0 bg-[#34495e] hover:bg-[#2c3e50] h-10 w-10"
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Dica de atalho */}
      <div className="mt-1 text-center">
        <span className="text-[10px] text-slate-400">
          Pressione <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500">Enter</kbd> para enviar
          ou <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500">Shift+Enter</kbd> para nova linha
        </span>
      </div>
    </div>
  )
}
