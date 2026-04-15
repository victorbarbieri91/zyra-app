'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ContratoComissaoPadrao } from '@/hooks/useContratosHonorarios'

interface AdvogadoDisponivel {
  user_id: string
  nome: string
}

interface ComissaoPadraoSectionProps {
  escritorioId: string | undefined
  value: ContratoComissaoPadrao[]
  onChange: (next: ContratoComissaoPadrao[]) => void
}

export function ComissaoPadraoSection({
  escritorioId,
  value,
  onChange,
}: ComissaoPadraoSectionProps) {
  const supabase = useMemo(() => createClient(), [])
  const [advogados, setAdvogados] = useState<AdvogadoDisponivel[]>([])
  const [carregando, setCarregando] = useState(false)

  // Carregar advogados do escritório
  useEffect(() => {
    let cancelled = false
    async function carregar() {
      if (!escritorioId) {
        setAdvogados([])
        return
      }
      setCarregando(true)
      const { data, error } = await supabase
        .from('escritorios_usuarios')
        .select(`
          user_id,
          profiles:user_id (
            nome_completo
          )
        `)
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true)

      if (cancelled) return
      if (error) {
        console.error('[ComissaoPadraoSection] Erro ao carregar advogados:', error)
        setAdvogados([])
      } else {
        const seen = new Set<string>()
        const mapped: AdvogadoDisponivel[] = []
        for (const u of (data ?? []) as Array<{
          user_id: string
          profiles: { nome_completo: string | null } | null
        }>) {
          if (!u.user_id || seen.has(u.user_id)) continue
          seen.add(u.user_id)
          mapped.push({
            user_id: u.user_id,
            nome: u.profiles?.nome_completo || 'Usuário',
          })
        }
        mapped.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setAdvogados(mapped)
      }
      setCarregando(false)
    }
    carregar()
    return () => {
      cancelled = true
    }
  }, [escritorioId, supabase])

  const totalPercentual = useMemo(
    () => value.reduce((sum, c) => sum + (Number(c.percentual) || 0), 0),
    [value]
  )

  const usuariosJaEscolhidos = useMemo(
    () => new Set(value.map((c) => c.user_id).filter(Boolean)),
    [value]
  )

  const adicionarLinha = useCallback(() => {
    onChange([
      ...value,
      {
        user_id: '',
        nome: '',
        percentual: 0,
        ordem: value.length,
        ativo: true,
      },
    ])
  }, [value, onChange])

  const removerLinha = useCallback(
    (idx: number) => {
      const next = value.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i }))
      onChange(next)
    },
    [value, onChange]
  )

  const atualizarLinha = useCallback(
    (idx: number, patch: Partial<ContratoComissaoPadrao>) => {
      const next = value.map((c, i) => (i === idx ? { ...c, ...patch } : c))
      onChange(next)
    },
    [value, onChange]
  )

  const podeAdicionar = advogados.length > value.length
  const somaInvalida = totalPercentual > 100

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f0f9f9] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[#46627f]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#34495e]">
              Comissão padrão por advogado
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Advogados e percentuais pré-preenchidos no modal de recebimento deste contrato.
              Editável no momento do recebimento.
            </p>
          </div>
        </div>
        {value.length > 0 && (
          <Badge
            variant={somaInvalida ? 'destructive' : 'secondary'}
            className="text-xs shrink-0"
          >
            Total: {totalPercentual.toFixed(2).replace(/\.?0+$/, '')}%
          </Badge>
        )}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">
          Nenhum advogado configurado. Adicione para habilitar o pré-preenchimento automático.
        </p>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((comissao, idx) => {
            // Advogados disponíveis para esta linha (exclui os outros já escolhidos)
            const advogadosLinha = advogados.filter(
              (a) => a.user_id === comissao.user_id || !usuariosJaEscolhidos.has(a.user_id)
            )
            return (
              <div
                key={comissao.id ?? `novo-${idx}`}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 p-2"
              >
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    Advogado
                  </Label>
                  <Select
                    value={comissao.user_id || undefined}
                    onValueChange={(userId) => {
                      const adv = advogados.find((a) => a.user_id === userId)
                      atualizarLinha(idx, {
                        user_id: userId,
                        nome: adv?.nome || '',
                      })
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm mt-0.5">
                      <SelectValue
                        placeholder={
                          carregando ? 'Carregando...' : 'Selecione um advogado'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {advogadosLinha.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-slate-400">
                          Nenhum advogado disponível
                        </div>
                      )}
                      {advogadosLinha.map((adv) => (
                        <SelectItem key={adv.user_id} value={adv.user_id}>
                          {adv.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    Percentual
                  </Label>
                  <div className="relative mt-0.5">
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={comissao.percentual || ''}
                      onChange={(e) =>
                        atualizarLinha(idx, {
                          percentual: Number(e.target.value) || 0,
                        })
                      }
                      className={cn(
                        'h-8 text-sm pr-6',
                        (comissao.percentual || 0) > 100 && 'border-red-400'
                      )}
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 mt-5 shrink-0"
                  onClick={() => removerLinha(idx)}
                  aria-label="Remover advogado"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {somaInvalida && (
        <p className="text-xs text-red-600 font-medium">
          A soma dos percentuais excede 100%. Ajuste antes de salvar.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={adicionarLinha}
        disabled={!podeAdicionar || carregando}
        className="w-full border-dashed text-xs h-8"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Adicionar advogado
      </Button>
    </div>
  )
}
