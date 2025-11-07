'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, X, Mail, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Lembrete {
  id?: string
  tempo_antes_minutos: number
  metodos: ('push' | 'email' | 'sms')[]
}

interface LembretesEditorProps {
  lembretes: Lembrete[]
  onChange: (lembretes: Lembrete[]) => void
  className?: string
}

const TEMPO_OPCOES = [
  { value: 0, label: 'No momento do evento' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 2880, label: '2 dias antes' },
  { value: 4320, label: '3 dias antes' },
  { value: 10080, label: '1 semana antes' },
]

const METODO_CONFIG = {
  push: {
    label: 'Notificação Push',
    icon: Monitor,
    color: 'blue',
  },
  email: {
    label: 'E-mail',
    icon: Mail,
    color: 'emerald',
  },
  sms: {
    label: 'SMS',
    icon: Smartphone,
    color: 'amber',
  },
}

export default function LembretesEditor({
  lembretes,
  onChange,
  className,
}: LembretesEditorProps) {
  const [tempoSelecionado, setTempoSelecionado] = useState<number>(15)
  const [metodosAtivos, setMetodosAtivos] = useState<Set<'push' | 'email' | 'sms'>>(
    new Set(['push'])
  )

  const handleToggleMetodo = (metodo: 'push' | 'email' | 'sms') => {
    const novosMetodos = new Set(metodosAtivos)
    if (novosMetodos.has(metodo)) {
      novosMetodos.delete(metodo)
    } else {
      novosMetodos.add(metodo)
    }
    setMetodosAtivos(novosMetodos)
  }

  const handleAdicionarLembrete = () => {
    if (metodosAtivos.size === 0) {
      alert('Selecione pelo menos um método de notificação')
      return
    }

    // Verificar se já existe lembrete com mesmo tempo e métodos
    const jaExiste = lembretes.some(
      l =>
        l.tempo_antes_minutos === tempoSelecionado &&
        l.metodos.length === metodosAtivos.size &&
        l.metodos.every(m => metodosAtivos.has(m))
    )

    if (jaExiste) {
      alert('Este lembrete já existe!')
      return
    }

    const novoLembrete: Lembrete = {
      tempo_antes_minutos: tempoSelecionado,
      metodos: Array.from(metodosAtivos),
    }

    onChange([...lembretes, novoLembrete])

    // Reset
    setMetodosAtivos(new Set(['push']))
  }

  const handleRemoverLembrete = (index: number) => {
    const novosLembretes = lembretes.filter((_, i) => i !== index)
    onChange(novosLembretes)
  }

  const formatarTempo = (minutos: number): string => {
    const opcao = TEMPO_OPCOES.find(o => o.value === minutos)
    return opcao?.label || `${minutos} minutos antes`
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Lista de Lembretes Ativos */}
      {lembretes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#46627f]">Lembretes Ativos</Label>
          <div className="space-y-2">
            {lembretes.map((lembrete, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#34495e]">
                    {formatarTempo(lembrete.tempo_antes_minutos)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {lembrete.metodos.map(metodo => {
                      const config = METODO_CONFIG[metodo]
                      const Icon = config.icon
                      return (
                        <Badge
                          key={metodo}
                          variant="outline"
                          className={cn(
                            'text-[10px] flex items-center gap-1',
                            config.color === 'blue' && 'border-blue-200 text-blue-700',
                            config.color === 'emerald' && 'border-emerald-200 text-emerald-700',
                            config.color === 'amber' && 'border-amber-200 text-amber-700'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoverLembrete(index)}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar Novo Lembrete */}
      <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-white">
        <Label className="text-sm font-medium text-[#46627f]">Adicionar Lembrete</Label>

        {/* Seletor de Tempo */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Quando notificar?</Label>
          <Select
            value={String(tempoSelecionado)}
            onValueChange={value => setTempoSelecionado(Number(value))}
          >
            <SelectTrigger className="border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPO_OPCOES.map(opcao => (
                <SelectItem key={opcao.value} value={String(opcao.value)}>
                  {opcao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seletor de Métodos */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Métodos de Notificação</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(METODO_CONFIG) as [keyof typeof METODO_CONFIG, typeof METODO_CONFIG[keyof typeof METODO_CONFIG]][]).map(
              ([metodo, config]) => {
                const Icon = config.icon
                const ativo = metodosAtivos.has(metodo)

                return (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => handleToggleMetodo(metodo)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      ativo
                        ? cn(
                            'border-current shadow-sm',
                            config.color === 'blue' && 'bg-blue-50 text-blue-600 border-blue-300',
                            config.color === 'emerald' &&
                              'bg-emerald-50 text-emerald-600 border-emerald-300',
                            config.color === 'amber' && 'bg-amber-50 text-amber-600 border-amber-300'
                          )
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {config.label}
                    </span>
                  </button>
                )
              }
            )}
          </div>
        </div>

        {/* Botão Adicionar */}
        <Button
          type="button"
          onClick={handleAdicionarLembrete}
          disabled={metodosAtivos.size === 0}
          className="w-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#5a9a9c] text-white"
        >
          <Bell className="w-4 h-4 mr-2" />
          Adicionar Lembrete
        </Button>
      </div>

      {/* Empty State */}
      {lembretes.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          Nenhum lembrete configurado. Configure acima para ser notificado.
        </div>
      )}
    </div>
  )
}
