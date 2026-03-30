'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface ContaBancaria {
  id: string
  banco: string
  numero_conta: string
  escritorio_id: string
  escritorio_nome: string
}

interface ContaBancariaSelectProps {
  value: string
  onValueChange: (v: string) => void
  escritorioIds: string[]
  placeholder?: string
}

/**
 * Dropdown de contas bancárias agrupado por escritório.
 * Quando há apenas 1 escritório, renderiza sem agrupamento.
 */
export default function ContaBancariaSelect({
  value,
  onValueChange,
  escritorioIds,
  placeholder = 'Selecione a conta',
}: ContaBancariaSelectProps) {
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const supabase = createClient()

  const carregarContas = useCallback(async () => {
    if (!escritorioIds.length) return
    const { data } = await supabase
      .from('financeiro_contas_bancarias')
      .select('id, banco, numero_conta, escritorio_id, escritorios:escritorio_id(nome)')
      .in('escritorio_id', escritorioIds)
      .eq('ativa', true)
      .order('banco')

    if (data) {
      setContas(
        data.map((c: any) => ({
          id: c.id,
          banco: c.banco,
          numero_conta: c.numero_conta,
          escritorio_id: c.escritorio_id,
          escritorio_nome: (c.escritorios as any)?.nome || '',
        }))
      )
    }
  }, [escritorioIds, supabase])

  useEffect(() => {
    carregarContas()
  }, [carregarContas])

  // Agrupar contas por escritório
  const contasPorEscritorio = contas.reduce<Record<string, { nome: string; contas: ContaBancaria[] }>>(
    (acc, conta) => {
      if (!acc[conta.escritorio_id]) {
        acc[conta.escritorio_id] = { nome: conta.escritorio_nome, contas: [] }
      }
      acc[conta.escritorio_id].contas.push(conta)
      return acc
    },
    {}
  )

  const grupos = Object.values(contasPorEscritorio)
  const multiGrupo = grupos.length > 1

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {multiGrupo ? (
          grupos.map((grupo) => (
            <SelectGroup key={grupo.nome}>
              <SelectLabel className="text-xs font-semibold text-[#46627f]">
                {grupo.nome}
              </SelectLabel>
              {grupo.contas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.banco}{c.numero_conta ? ` - ${c.numero_conta}` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          contas.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.banco}{c.numero_conta ? ` - ${c.numero_conta}` : ''}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
