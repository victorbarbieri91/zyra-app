'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2, Lightbulb, Scale, Calendar, DollarSign, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MENU_SUGESTOES, CategoriaMenu } from '@/types/centro-comando'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

// Mapear ícones por categoria
const ICONES_CATEGORIA: Record<string, React.ReactNode> = {
  scale: <Scale className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  'dollar-sign': <DollarSign className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
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
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (texto: string) => {
    onSend(texto)
  }

  return (
    <div className="relative bg-slate-50/80 rounded-2xl">
      <div className="flex items-end gap-3 px-4 py-3">
        {/* Botão de sugestões */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10 text-slate-400 hover:text-[#34495e] hover:bg-transparent rounded-xl transition-colors"
              disabled={disabled}
            >
              <Lightbulb className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 rounded-xl shadow-xl border-slate-200">
            <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-3 py-2">
              Sugestões de comandos
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MENU_SUGESTOES.map((categoria: CategoriaMenu) => (
              <DropdownMenuGroup key={categoria.id}>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-slate-500 px-3 py-1.5">
                  <span className="text-[#89bcbe]">{ICONES_CATEGORIA[categoria.icone]}</span>
                  {categoria.nome}
                </DropdownMenuLabel>
                {categoria.comandos.map((cmd, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => handleSuggestionClick(cmd.texto)}
                    className="cursor-pointer py-2.5 px-3 mx-1 rounded-lg focus:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm text-slate-700">{cmd.texto}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{cmd.descricao}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {categoria.id !== 'acoes' && <DropdownMenuSeparator className="my-1" />}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Input principal */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Digite sua mensagem..."}
            disabled={disabled}
            className="min-h-[40px] max-h-[150px] resize-none border-0 focus-visible:ring-0 bg-transparent py-2 px-1 text-sm text-slate-700 placeholder:text-slate-400"
            rows={1}
          />
        </div>

        {/* Botão enviar */}
        <Button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          size="icon"
          variant="ghost"
          className={`flex-shrink-0 h-10 w-10 rounded-xl transition-all duration-200 ${
            value.trim() && !disabled
              ? 'text-[#34495e] hover:bg-slate-200/50'
              : 'text-slate-300'
          }`}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
