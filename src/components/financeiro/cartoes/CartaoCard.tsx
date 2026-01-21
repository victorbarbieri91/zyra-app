'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CreditCard,
  MoreVertical,
  Eye,
  Plus,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { CartaoComFaturaAtual, BANDEIRAS_CARTAO } from '@/hooks/useCartoesCredito'
import { cn } from '@/lib/utils'

interface CartaoCardProps {
  cartao: CartaoComFaturaAtual
  onViewDetails: (cartaoId: string) => void
  onAddExpense: (cartaoId: string) => void
  onViewInvoice: (cartaoId: string) => void
  onEdit: (cartao: CartaoComFaturaAtual) => void
  onDelete: (cartaoId: string) => void
}

export default function CartaoCard({
  cartao,
  onViewDetails,
  onAddExpense,
  onViewInvoice,
  onEdit,
  onDelete,
}: CartaoCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const bandeira = BANDEIRAS_CARTAO.find((b) => b.value === cartao.bandeira)
  const fatura = cartao.fatura_atual

  // Determinar status de urgência
  const getUrgencyStatus = () => {
    if (!fatura) return 'normal'
    if (fatura.status === 'paga') return 'paid'
    if (fatura.dias_para_vencimento < 0) return 'overdue'
    if (fatura.dias_para_vencimento <= 5) return 'urgent'
    if (fatura.dias_para_vencimento <= 10) return 'warning'
    return 'normal'
  }

  const urgency = getUrgencyStatus()

  const getStatusBadge = () => {
    if (!fatura) return null

    switch (fatura.status) {
      case 'paga':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paga
          </Badge>
        )
      case 'fechada':
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            <AlertCircle className="w-3 h-3 mr-1" />
            Aguardando
          </Badge>
        )
      case 'aberta':
        return (
          <Badge className="bg-slate-50 text-slate-600 border border-slate-200 font-medium">
            <Calendar className="w-3 h-3 mr-1" />
            Aberta
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md',
        urgency === 'overdue' && 'border-red-200 ring-1 ring-red-100',
        urgency === 'urgent' && 'border-amber-200 ring-1 ring-amber-100',
        urgency === 'warning' && 'border-yellow-200',
        urgency === 'paid' && 'border-emerald-200',
        urgency === 'normal' && 'border-slate-200'
      )}
    >
      {/* Header do Cartão - Design fosco/mate */}
      <div
        className="p-4 text-white relative overflow-hidden"
        style={{ backgroundColor: cartao.cor }}
      >
        {/* Padrão sutil de fundo */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
          }}
        />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{cartao.nome}</h3>
              <p className="text-xs opacity-70">{cartao.banco}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(cartao.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(cartao)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(cartao.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Número do cartão */}
        <div className="relative mt-5 flex items-center">
          <span className="text-base tracking-[0.2em] font-mono opacity-70">
            •••• •••• •••• {cartao.ultimos_digitos}
          </span>
        </div>

        {/* Bandeira e vencimento */}
        <div className="relative mt-4 flex items-center justify-between">
          <span className="text-xs opacity-60">
            Venc. dia {cartao.dia_vencimento}
          </span>
          <span className="text-xs font-medium opacity-90">{bandeira?.label}</span>
        </div>
      </div>

      {/* Corpo do Card */}
      <div className="p-4">
        {/* Status e Valor da Fatura Atual */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Fatura Atual</p>
            <p className="text-xl font-semibold text-[#34495e]">
              {fatura ? formatCurrency(fatura.valor_total) : formatCurrency(0)}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Info de fechamento/vencimento */}
        {fatura && (
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
            {fatura.status === 'aberta' && fatura.dias_para_fechamento > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha em {fatura.dias_para_fechamento} dias
              </span>
            )}
            {fatura.status === 'fechada' && (
              <span
                className={cn(
                  'flex items-center gap-1',
                  fatura.dias_para_vencimento < 0 && 'text-red-600 font-medium',
                  fatura.dias_para_vencimento <= 5 && fatura.dias_para_vencimento >= 0 && 'text-amber-600 font-medium'
                )}
              >
                <DollarSign className="w-3 h-3" />
                {fatura.dias_para_vencimento < 0
                  ? `Vencida há ${Math.abs(fatura.dias_para_vencimento)} dias`
                  : fatura.dias_para_vencimento === 0
                  ? 'Vence hoje'
                  : `Vence em ${fatura.dias_para_vencimento} dias`}
              </span>
            )}
            <span className="text-slate-400">
              {fatura.total_despesas} {fatura.total_despesas === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-slate-600 border-slate-200 hover:bg-slate-50"
            onClick={() => onAddExpense(cartao.id)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nova Despesa
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 bg-[#34495e] hover:bg-[#2c3e50] text-white"
            onClick={() => onViewInvoice(cartao.id)}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Ver Fatura
          </Button>
        </div>

        {/* Limite disponível (se configurado) */}
        {cartao.limite_total && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Limite disponível</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(cartao.limite_total - (fatura?.valor_total || 0))}
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  ((fatura?.valor_total || 0) / cartao.limite_total) > 0.9
                    ? 'bg-red-400'
                    : ((fatura?.valor_total || 0) / cartao.limite_total) > 0.7
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                )}
                style={{
                  width: `${Math.min(((fatura?.valor_total || 0) / cartao.limite_total) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
