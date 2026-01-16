'use client'

import { cn } from '@/lib/utils'
import { PassoThinking } from '@/types/centro-comando'
import { Loader2, Check, Database, Search, FileText, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ThinkingStepsProps {
  passos: PassoThinking[]
  className?: string
}

// Mapeia tools para icones
const TOOL_ICONS: Record<string, React.ReactNode> = {
  listar_tabelas: <Database className="w-3.5 h-3.5" />,
  consultar_schema: <FileText className="w-3.5 h-3.5" />,
  consultar_dados: <Search className="w-3.5 h-3.5" />,
  preparar_cadastro: <FileText className="w-3.5 h-3.5" />,
  preparar_alteracao: <FileText className="w-3.5 h-3.5" />,
  preparar_exclusao: <FileText className="w-3.5 h-3.5" />,
  navegar_pagina: <ArrowRight className="w-3.5 h-3.5" />,
}

export function ThinkingSteps({ passos, className }: ThinkingStepsProps) {
  if (passos.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-4 mb-4',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#89bcbe]/20 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-[#34495e] animate-spin" />
        </div>
        <span className="text-sm font-medium text-[#34495e]">
          Zyra está trabalhando...
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-2 pl-8">
          {passos.map((passo, index) => (
            <motion.div
              key={passo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-start gap-2 text-sm',
                passo.concluido && 'text-slate-400'
              )}
            >
              {/* Icone do passo */}
              <div className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                passo.type === 'thinking' && 'bg-blue-100 text-blue-600',
                passo.type === 'tool_start' && 'bg-amber-100 text-amber-600',
                passo.type === 'tool_end' && 'bg-emerald-100 text-emerald-600'
              )}>
                {passo.type === 'tool_start' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : passo.type === 'tool_end' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  TOOL_ICONS[passo.tool || ''] || <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </div>

              {/* Mensagem */}
              <span className={cn(
                'flex-1',
                passo.concluido ? 'text-slate-400' : 'text-slate-600'
              )}>
                {passo.message}
              </span>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  )
}
