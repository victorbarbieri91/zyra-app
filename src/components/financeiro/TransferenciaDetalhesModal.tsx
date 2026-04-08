'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftRight,
  Building2,
  Banknote,
  Calendar,
  FileText,
  User,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'

interface ExtratoItem {
  id: string
  tipo_movimento: string
  descricao: string
  valor: number
  data_referencia: string
  data_vencimento: string | null
  data_efetivacao: string | null
  conta_bancaria_nome: string | null
  origem_id: string | null
}

interface TransferenciaDetalhesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ExtratoItem | null
  contaOrigemNome: string | null
  contaDestinoNome: string | null
  dataTransferencia: string | null
  criadoPorNome: string | null
  onEditar: () => void
  onExcluir: () => void
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | React.ReactElement }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{value}</div>
      </div>
    </div>
  )
}

export default function TransferenciaDetalhesModal({
  open,
  onOpenChange,
  item,
  contaOrigemNome,
  contaDestinoNome,
  dataTransferencia,
  criadoPorNome,
  onEditar,
  onExcluir,
}: TransferenciaDetalhesModalProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
              Detalhes da Transferência
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-100 text-emerald-800 border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Efetivado
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            {/* Coluna esquerda */}
            <div className="space-y-1">
              <InfoRow
                icon={Building2}
                label="Conta de Origem"
                value={contaOrigemNome || 'Não identificada'}
              />
              <InfoRow
                icon={Building2}
                label="Conta de Destino"
                value={contaDestinoNome || 'Não identificada'}
              />
              <InfoRow
                icon={Banknote}
                label="Valor"
                value={<span className="text-base font-bold text-blue-600">{formatCurrency(item.valor)}</span>}
              />
            </div>

            {/* Coluna direita */}
            <div className="space-y-1">
              <InfoRow
                icon={Calendar}
                label="Data da Transferência"
                value={dataTransferencia ? formatBrazilDate(dataTransferencia) : formatBrazilDate(item.data_referencia)}
              />
              <InfoRow
                icon={FileText}
                label="Descrição"
                value={item.descricao || 'Transferência entre contas'}
              />
              {criadoPorNome && (
                <InfoRow
                  icon={User}
                  label="Criado por"
                  value={criadoPorNome}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              onOpenChange(false)
              onEditar()
            }}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => {
              onOpenChange(false)
              onExcluir()
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
