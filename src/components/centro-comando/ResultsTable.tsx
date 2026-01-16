'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatBrazilDate, formatBrazilDateTime } from '@/lib/timezone'

interface ResultsTableProps {
  data: Record<string, any>[]
  maxRows?: number
}

// Colunas a esconder por padrão
const HIDDEN_COLUMNS = ['id', 'escritorio_id', 'created_at', 'updated_at', 'created_by']

// Formatadores por tipo de coluna
const COLUMN_FORMATTERS: Record<string, (value: any) => string | React.ReactNode> = {
  // Datas
  data_inicio: (v) => v ? formatBrazilDateTime(new Date(v)) : '-',
  data_fim: (v) => v ? formatBrazilDateTime(new Date(v)) : '-',
  data_limite: (v) => v ? formatBrazilDate(new Date(v)) : '-',
  data_distribuicao: (v) => v ? formatBrazilDate(new Date(v)) : '-',
  data_vencimento: (v) => v ? formatBrazilDate(new Date(v)) : '-',
  data_trabalho: (v) => v ? formatBrazilDate(new Date(v)) : '-',
  data_hora: (v) => v ? formatBrazilDateTime(new Date(v)) : '-',

  // Valores monetários
  valor_causa: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
  valor_total: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
  valor: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',

  // Horas
  horas: (v) => v ? `${Number(v).toFixed(1)}h` : '-',

  // Status com badges
  status: (v) => {
    if (!v) return '-'
    const colors: Record<string, string> = {
      ativo: 'bg-green-100 text-green-700',
      pendente: 'bg-amber-100 text-amber-700',
      concluida: 'bg-green-100 text-green-700',
      concluido: 'bg-green-100 text-green-700',
      cancelado: 'bg-red-100 text-red-700',
      cancelada: 'bg-red-100 text-red-700',
      em_andamento: 'bg-blue-100 text-blue-700',
      arquivado: 'bg-slate-100 text-slate-700',
      suspenso: 'bg-orange-100 text-orange-700',
      pago: 'bg-green-100 text-green-700',
      atrasado: 'bg-red-100 text-red-700',
    }
    return (
      <Badge className={colors[v] || 'bg-slate-100 text-slate-700'}>
        {v.replace(/_/g, ' ')}
      </Badge>
    )
  },

  // Prioridade
  prioridade: (v) => {
    if (!v) return '-'
    const colors: Record<string, string> = {
      baixa: 'bg-slate-100 text-slate-700',
      media: 'bg-blue-100 text-blue-700',
      alta: 'bg-orange-100 text-orange-700',
      urgente: 'bg-red-100 text-red-700',
    }
    return (
      <Badge className={colors[v] || 'bg-slate-100 text-slate-700'}>
        {v}
      </Badge>
    )
  },

  // Área
  area: (v) => {
    if (!v) return '-'
    const colors: Record<string, string> = {
      civel: 'bg-blue-100 text-blue-700',
      trabalhista: 'bg-amber-100 text-amber-700',
      tributaria: 'bg-green-100 text-green-700',
      criminal: 'bg-red-100 text-red-700',
      familia: 'bg-pink-100 text-pink-700',
    }
    return (
      <Badge className={colors[v] || 'bg-slate-100 text-slate-700'}>
        {v}
      </Badge>
    )
  },

  // Booleanos
  faturavel: (v) => v ? 'Sim' : 'Não',
  faturado: (v) => v ? 'Sim' : 'Não',
  aprovado: (v) => v ? 'Sim' : 'Não',
}

// Tradução de colunas
const COLUMN_LABELS: Record<string, string> = {
  numero_cnj: 'Número CNJ',
  numero_pasta: 'Pasta',
  nome_completo: 'Nome',
  nome_fantasia: 'Nome Fantasia',
  cpf_cnpj: 'CPF/CNPJ',
  email_principal: 'E-mail',
  telefone_principal: 'Telefone',
  titulo: 'Título',
  descricao: 'Descrição',
  data_inicio: 'Início',
  data_fim: 'Fim',
  data_limite: 'Prazo',
  data_distribuicao: 'Distribuição',
  data_vencimento: 'Vencimento',
  data_trabalho: 'Data',
  data_hora: 'Data/Hora',
  valor_causa: 'Valor da Causa',
  valor_total: 'Valor Total',
  valor: 'Valor',
  horas: 'Horas',
  status: 'Status',
  prioridade: 'Prioridade',
  area: 'Área',
  fase: 'Fase',
  instancia: 'Instância',
  tribunal: 'Tribunal',
  comarca: 'Comarca',
  vara: 'Vara',
  juiz: 'Juiz',
  parte_contraria: 'Parte Contrária',
  polo_cliente: 'Polo',
  objeto_acao: 'Objeto',
  responsavel_nome: 'Responsável',
  faturavel: 'Faturável',
  faturado: 'Faturado',
  aprovado: 'Aprovado',
  tipo_pessoa: 'Tipo',
  tipo_contato: 'Tipo Contato',
}

export function ResultsTable({ data, maxRows = 10 }: ResultsTableProps) {
  // Determinar colunas visíveis
  const columns = useMemo(() => {
    if (!data.length) return []

    const allColumns = Object.keys(data[0])
    return allColumns.filter(col => !HIDDEN_COLUMNS.includes(col))
  }, [data])

  // Dados limitados
  const displayData = data.slice(0, maxRows)
  const hasMore = data.length > maxRows

  // Formatador de célula
  const formatCell = (column: string, value: any) => {
    // Usar formatador específico se existir
    if (COLUMN_FORMATTERS[column]) {
      return COLUMN_FORMATTERS[column](value)
    }

    // Valores nulos
    if (value === null || value === undefined) {
      return <span className="text-slate-400">-</span>
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.join(', ')
    }

    // Objetos
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    // Booleanos
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não'
    }

    // Strings longas
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...'
    }

    return String(value)
  }

  if (!data.length || !columns.length) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        Nenhum dado para exibir
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            {columns.map(col => (
              <TableHead key={col} className="text-xs font-medium text-slate-600 whitespace-nowrap">
                {COLUMN_LABELS[col] || col.replace(/_/g, ' ')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-slate-50">
              {columns.map(col => (
                <TableCell key={col} className="text-xs text-slate-700 whitespace-nowrap">
                  {formatCell(col, row[col])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasMore && (
        <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t">
          Mostrando {maxRows} de {data.length} registros
        </div>
      )}
    </div>
  )
}
