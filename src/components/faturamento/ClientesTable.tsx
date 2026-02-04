'use client'

import { useState, useMemo } from 'react'
import { Clock, DollarSign, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, LayoutList, Rows3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatHoras } from '@/lib/utils'
import type { ClienteParaFaturar } from '@/hooks/useFaturamento'

type SortField = 'nome' | 'total' | 'horas' | 'honorarios'
type SortDirection = 'asc' | 'desc'
type Density = 'compact' | 'comfortable' | 'spacious'

interface ClientesTableProps {
  clientes: ClienteParaFaturar[]
  selectedCliente: ClienteParaFaturar | null
  onSelectCliente: (cliente: ClienteParaFaturar) => void
  loading: boolean
}

export function ClientesTable({
  clientes,
  selectedCliente,
  onSelectCliente,
  loading,
}: ClientesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [density, setDensity] = useState<Density>('comfortable')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Filtrar e ordenar clientes
  const filteredAndSortedClientes = useMemo(() => {
    let result = [...clientes]

    // Filtrar por busca
    if (searchTerm) {
      result = result.filter((cliente) =>
        cliente.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ordenar
    result.sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'nome':
          compareValue = a.cliente_nome.localeCompare(b.cliente_nome)
          break
        case 'total':
          compareValue = a.total_faturar - b.total_faturar
          break
        case 'horas':
          compareValue = a.soma_horas - b.soma_horas
          break
        case 'honorarios':
          compareValue = a.total_honorarios - b.total_honorarios
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })

    return result
  }, [clientes, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#1E3A8A]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#1E3A8A]" />
    )
  }

  const densityClasses = {
    compact: 'py-2',
    comfortable: 'py-2.5',
    spacious: 'py-3',
  }

  const densityIcons = {
    compact: <Rows3 className="h-4 w-4" />,
    comfortable: <LayoutList className="h-4 w-4" />,
    spacious: <LayoutGrid className="h-4 w-4" />,
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200"
          />
        </div>

        {/* Densidade */}
        <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
          <SelectTrigger className="w-[140px] h-9 border-slate-200">
            <div className="flex items-center gap-2">
              {densityIcons[density]}
              <span className="text-xs capitalize">{density === 'compact' ? 'Compacto' : density === 'comfortable' ? 'Confortável' : 'Espaçoso'}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compacto</SelectItem>
            <SelectItem value="comfortable">Confortável</SelectItem>
            <SelectItem value="spacious">Espaçoso</SelectItem>
          </SelectContent>
        </Select>

        {/* Contador */}
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 h-9 px-3">
          {filteredAndSortedClientes.length} {filteredAndSortedClientes.length === 1 ? 'cliente' : 'clientes'}
        </Badge>
      </div>

      {/* Tabela */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5">
            <div className="col-span-5">
              <button
                onClick={() => handleSort('nome')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[#1E3A8A] transition-colors"
              >
                CLIENTE
                <SortIcon field="nome" />
              </button>
            </div>
            <div className="col-span-2 text-center">
              <button
                onClick={() => handleSort('horas')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[#1E3A8A] transition-colors mx-auto"
              >
                HORAS
                <SortIcon field="horas" />
              </button>
            </div>
            <div className="col-span-2 text-center">
              <button
                onClick={() => handleSort('honorarios')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[#1E3A8A] transition-colors mx-auto"
              >
                HONORÁRIOS
                <SortIcon field="honorarios" />
              </button>
            </div>
            <div className="col-span-2 text-right">
              <button
                onClick={() => handleSort('total')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[#1E3A8A] transition-colors ml-auto"
              >
                TOTAL
                <SortIcon field="total" />
              </button>
            </div>
            <div className="col-span-1"></div>
          </div>
        </div>

        {/* Body */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center">
              <Clock className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : filteredAndSortedClientes.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente pronto para faturar'}
              </p>
            </div>
          ) : (
            filteredAndSortedClientes.map((cliente) => (
              <div
                key={cliente.cliente_id}
                className={cn(
                  'grid grid-cols-12 gap-3 px-4 cursor-pointer transition-all',
                  densityClasses[density],
                  selectedCliente?.cliente_id === cliente.cliente_id
                    ? 'bg-blue-50 border-l-2 border-l-[#1E3A8A]'
                    : 'hover:bg-slate-50'
                )}
                onClick={() => onSelectCliente(cliente)}
              >
                {/* Nome do Cliente */}
                <div className="col-span-5 flex items-center">
                  <p className="text-sm font-medium text-[#34495e] truncate">
                    {cliente.cliente_nome}
                  </p>
                </div>

                {/* Horas */}
                <div className="col-span-2 flex items-center justify-center">
                  {cliente.qtd_horas > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-[#89bcbe]/20 flex items-center justify-center">
                        <Clock className="h-3 w-3 text-[#34495e]" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-700">
                          {formatHoras(cliente.soma_horas, 'curto')}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatCurrency(cliente.total_horas)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>

                {/* Honorários */}
                <div className="col-span-2 flex items-center justify-center">
                  {cliente.qtd_honorarios > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-[#aacfd0]/30 flex items-center justify-center">
                        <DollarSign className="h-3 w-3 text-[#34495e]" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-700">
                          {cliente.qtd_honorarios}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatCurrency(cliente.total_honorarios)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>

                {/* Total */}
                <div className="col-span-2 flex items-center justify-end">
                  <p className="text-sm font-bold text-emerald-600">
                    {formatCurrency(cliente.total_faturar)}
                  </p>
                </div>

                {/* Ação */}
                <div className="col-span-1 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-[#1E3A8A]/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCliente(cliente)
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 text-[#46627f]" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
