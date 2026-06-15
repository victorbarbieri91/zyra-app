'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, ChevronDown, Folder, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { parseDateInBrazil } from '@/lib/timezone'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  CONSULTIVO_ANDAMENTO_TIPOS,
  TIPOS_ANDAMENTO_CONSULTIVO_MANUAL,
  type ConsultivoAndamentoTipo,
} from '@/lib/constants/consultivo-andamento-tipos'

interface RegistrarAndamentoConsultivoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultaId: string
  escritorioId: string | null
  clienteNome?: string
  numero?: string
  area?: string
  onSuccess?: () => void
}

// Dropdown rico de tipo de andamento
function TipoDropdown({
  value,
  onChange,
}: {
  value: ConsultivoAndamentoTipo
  onChange: (v: ConsultivoAndamentoTipo) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const sel = CONSULTIVO_ANDAMENTO_TIPOS[value]
  const SelIcon = sel.Icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full h-10 px-3 rounded-[10px] bg-white dark:bg-surface-1 border flex items-center gap-2.5 text-left transition-all',
          open
            ? 'border-[#89bcbe] ring-[3px] ring-[#89bcbe]/25'
            : 'border-[#e6e3da] dark:border-[#253345]',
        )}
      >
        <span className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-white flex-shrink-0" style={{ background: sel.cor }}>
          <SelIcon className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#2c3e50] dark:text-slate-200 truncate">{sel.label}</span>
        <ChevronDown className={cn('w-[15px] h-[15px] text-[#9aa1a8] flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-white dark:bg-surface-1 border border-[#e6e3da] dark:border-[#253345] rounded-xl shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] p-1.5 max-h-[296px] overflow-y-auto">
          {TIPOS_ANDAMENTO_CONSULTIVO_MANUAL.map((tipo) => {
            const o = CONSULTIVO_ANDAMENTO_TIPOS[tipo]
            const OptIcon = o.Icon
            const active = tipo === value
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => { onChange(tipo); setOpen(false) }}
                className={cn(
                  'w-full px-2.5 py-2 rounded-lg flex items-center gap-2.5 text-left transition-colors',
                  active ? 'bg-[#f3faf9] dark:bg-teal-500/10' : 'hover:bg-[#f6f5f0] dark:hover:bg-surface-2',
                )}
              >
                <span
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0"
                  style={active ? { background: o.cor, color: '#fff' } : { background: 'rgba(0,0,0,0.04)', color: o.cor }}
                >
                  <OptIcon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-[#2c3e50] dark:text-slate-200">{o.label}</span>
                  {o.descricao && <span className="block text-[11px] text-[#9aa1a8] dark:text-slate-500 mt-0.5">{o.descricao}</span>}
                </span>
                {active && <Check className="w-[15px] h-[15px] flex-shrink-0" style={{ color: o.cor }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RegistrarAndamentoConsultivoModal({
  open,
  onOpenChange,
  consultaId,
  escritorioId,
  clienteNome,
  numero,
  area,
  onSuccess,
}: RegistrarAndamentoConsultivoModalProps) {
  const supabase = createClient()
  const [tipo, setTipo] = useState<ConsultivoAndamentoTipo>('analise')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [descricao, setDescricao] = useState('')
  const [visivelCliente, setVisivelCliente] = useState(true)
  const [continuar, setContinuar] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setTipo('analise')
      setData(format(new Date(), 'yyyy-MM-dd'))
      setDescricao('')
      setVisivelCliente(true)
      setContinuar(false)
    }
  }, [open])

  const sel = CONSULTIVO_ANDAMENTO_TIPOS[tipo]

  const handleSubmit = async () => {
    if (!descricao.trim() || !escritorioId) {
      if (!escritorioId) toast.error('Erro: escritório não identificado')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dataMovimento = parseDateInBrazil(data, 'yyyy-MM-dd')
      const { error } = await supabase.from('consultivo_movimentacoes').insert({
        consulta_id: consultaId,
        escritorio_id: escritorioId,
        data_movimento: dataMovimento.toISOString(),
        tipo_codigo: tipo,
        tipo_descricao: sel.label,
        descricao: descricao.trim(),
        origem: 'manual',
        created_by: user?.id ?? null,
        visivel_cliente: visivelCliente,
      })
      if (error) throw error

      toast.success('Andamento registrado!')
      onSuccess?.()

      if (continuar) {
        setDescricao('')
      } else {
        onOpenChange(false)
      }
    } catch (e) {
      console.error('Erro ao registrar andamento:', e)
      toast.error('Erro ao registrar andamento')
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500 mb-1.5 block'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-visible">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-[#f0ede3] dark:border-[#1d2a3c]">
          <DialogTitle className="text-[19px] font-semibold text-[#2c3e50] dark:text-slate-200" style={{ fontFamily: 'var(--font-fraunces)', letterSpacing: '-0.02em' }}>
            Registrar andamento
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#9aa1a8] dark:text-slate-400">
            Adicione um andamento manual à timeline da consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* contexto da consulta */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-5 rounded-[10px] bg-[#faf8f2] dark:bg-[#0f141c] border border-[#f0ede3] dark:border-[#1d2a3c]">
            <span className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-[#2c3e50] to-[#46627f] text-white flex items-center justify-center flex-shrink-0">
              <Folder className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-[#2c3e50] dark:text-slate-200 truncate">
                {clienteNome || 'Consulta'}
              </div>
              <div className="text-[11px] text-[#9aa1a8] dark:text-slate-500 font-mono mt-0.5">
                {numero}{area ? ` · ${area}` : ''}
              </div>
            </div>
          </div>

          {/* Tipo + Data */}
          <div className="grid grid-cols-[1fr_168px] gap-3.5 mb-[18px]">
            <div>
              <label className={lbl}>Tipo de andamento</label>
              <TipoDropdown value={tipo} onChange={setTipo} />
            </div>
            <div>
              <label className={lbl}>Data</label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="h-10 font-mono text-[13px]"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className={cn(lbl, 'mb-0')}>Descrição</label>
              <span className="text-[11px] text-[#9aa1a8] dark:text-slate-500 font-mono">{descricao.length}/600</span>
            </div>
            <Textarea
              rows={5}
              maxLength={600}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={sel.descricao ? `Descreva o andamento — ${sel.descricao.toLowerCase()}…` : 'Descreva o andamento…'}
              className="min-h-[110px] text-[13px] leading-relaxed resize-y"
            />
          </div>

          {/* Visibilidade */}
          <div className="mt-[18px]">
            <label className={lbl}>Visibilidade</label>
            <div className="flex gap-1 p-1 rounded-[11px] bg-[#f1efe8] dark:bg-[#0f141c]">
              {([
                { v: true, Icon: Eye, label: 'Visível ao cliente' },
                { v: false, Icon: EyeOff, label: 'Interno' },
              ] as const).map((o) => {
                const on = visivelCliente === o.v
                return (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setVisivelCliente(o.v)}
                    className={cn(
                      'flex-1 h-[38px] rounded-lg flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-all',
                      on
                        ? o.v
                          ? 'bg-gradient-to-br from-[#34495e] to-[#46627f] text-white shadow-sm'
                          : 'bg-[#6c757d] text-white shadow-sm'
                        : 'text-[#5a6775] dark:text-slate-400',
                    )}
                  >
                    <o.Icon className="w-3.5 h-3.5" />
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0ede3] dark:border-[#1d2a3c] bg-slate-50/60 dark:bg-[#0f141c]/60 flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-[12px] text-[#5a6775] dark:text-slate-400 mr-auto cursor-pointer">
            <input type="checkbox" checked={continuar} onChange={(e) => setContinuar(e.target.checked)} className="accent-[#34495e]" />
            Continuar registrando
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!descricao.trim() || saving}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
            Registrar andamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
