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
  Receipt,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Pencil,
  Ban,
  Banknote,
  ShieldCheck,
  Clock,
  CheckCircle2,
  X,
  FolderOpen,
  Tag,
  CreditCard,
  MessageSquare,
  Undo2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import type { CustaDespesa } from '@/hooks/useCustasDespesas'
export type { CustaDespesa }

const CATEGORIAS_LABELS: Record<string, string> = {
  custas: 'Custas Processuais',
  honorarios_perito: 'Honorários de Perito',
  oficial_justica: 'Oficial de Justiça',
  correios: 'Correios / Envios',
  cartorio: 'Cartório',
  copia: 'Cópias / Impressões',
  publicacao: 'Publicação',
  certidao: 'Certidão',
  protesto: 'Protesto',
  deslocamento: 'Deslocamento',
  estacionamento: 'Estacionamento',
  hospedagem: 'Hospedagem',
  alimentacao: 'Alimentação',
  combustivel: 'Combustível',
  viagem: 'Viagem',
  aluguel: 'Aluguel',
  folha: 'Folha de Pagamento',
  pro_labore: 'Pró-labore',
  beneficios: 'Benefícios',
  impostos: 'Impostos',
  taxas_bancarias: 'Taxas Bancárias',
  tecnologia: 'Tecnologia / Software',
  assinaturas: 'Assinaturas',
  telefonia: 'Telefonia',
  material: 'Material de Escritório',
  marketing: 'Marketing',
  capacitacao: 'Capacitação',
  associacoes: 'Associações',
  fornecedor: 'Fornecedor',
  emprestimos: 'Empréstimos',
  juros: 'Juros',
  cartao_credito: 'Cartão de Crédito',
  comissao: 'Comissão',
  outra: 'Outra Despesa',
  outros: 'Outros',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  pendente: {
    label: 'Pendente',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  agendado: {
    label: 'Agendado',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Calendar className="w-3 h-3" />,
  },
  liberado: {
    label: 'Liberado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  pago: {
    label: 'Pago',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejeitado: {
    label: 'Rejeitado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <X className="w-3 h-3" />,
  },
}

const REEMBOLSO_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  faturado: 'Faturado',
  pago: 'Reembolsado',
}

interface DespesaDetalhesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa: CustaDespesa | null
  onEditar: (item: CustaDespesa) => void
  onCancelar: (item: CustaDespesa) => void
  onAgendar: (item: CustaDespesa) => void
  onLiberar: (item: CustaDespesa) => void
  onRejeitar: (item: CustaDespesa) => void
  onPagar: (item: CustaDespesa) => void
  onReverter?: (item: CustaDespesa) => void
}

function getCasoLabel(item: CustaDespesa) {
  if (item.processo_id) {
    const pasta = item.processo_numero_pasta ? `${item.processo_numero_pasta} - ` : ''
    if (item.processo_autor && item.processo_reu) {
      return `${pasta}${item.processo_autor} x ${item.processo_reu}`
    }
    if (item.processo_autor) return `${pasta}${item.processo_autor}`
    if (item.processo_reu) return `${pasta}${item.processo_reu}`
    if (item.processo_numero_cnj) return item.processo_numero_cnj
    if (pasta) return pasta.replace(' - ', '')
    return 'Processo vinculado'
  }
  if (item.consulta_titulo) return item.consulta_titulo
  return null
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | React.ReactElement }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm text-slate-700 mt-0.5">{value}</div>
      </div>
    </div>
  )
}

export default function DespesaDetalhesModal({
  open,
  onOpenChange,
  despesa,
  onEditar,
  onCancelar,
  onAgendar,
  onLiberar,
  onRejeitar,
  onPagar,
  onReverter,
}: DespesaDetalhesModalProps) {
  if (!despesa) return null

  const statusConf = STATUS_CONFIG[despesa.status] || STATUS_CONFIG.pendente
  const casoLabel = getCasoLabel(despesa)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-[#34495e]">
              <Receipt className="w-4 h-4 text-rose-600" />
              Detalhes da Despesa
            </DialogTitle>
            <Badge variant="outline" className={`text-[10px] gap-1 ${statusConf.color}`}>
              {statusConf.icon}
              {statusConf.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Layout em 2 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            {/* Coluna esquerda */}
            <div className="space-y-1">
              <InfoRow
                icon={Tag}
                label="Categoria"
                value={CATEGORIAS_LABELS[despesa.categoria] || despesa.categoria}
              />
              <InfoRow
                icon={FileText}
                label="Descrição"
                value={despesa.descricao}
              />
              <InfoRow
                icon={Banknote}
                label="Valor"
                value={<span className="text-base font-bold text-[#34495e]">{formatCurrency(despesa.valor)}</span>}
              />
              {despesa.fornecedor && (
                <InfoRow
                  icon={User}
                  label="Fornecedor / Beneficiário"
                  value={despesa.fornecedor}
                />
              )}
              <InfoRow
                icon={CreditCard}
                label="Reembolsável"
                value={
                  despesa.reembolsavel ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
                        Sim
                      </Badge>
                      {despesa.reembolso_status && (
                        <span className="text-xs text-slate-500">
                          ({REEMBOLSO_STATUS_LABELS[despesa.reembolso_status] || despesa.reembolso_status})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Não</span>
                  )
                }
              />
            </div>

            {/* Coluna direita */}
            <div className="space-y-1">
              <InfoRow
                icon={Calendar}
                label="Data de Criação"
                value={formatBrazilDate(despesa.created_at)}
              />
              <InfoRow
                icon={Calendar}
                label="Data de Vencimento"
                value={formatBrazilDate(despesa.data_vencimento)}
              />
              {despesa.data_pagamento_programada && (
                <InfoRow
                  icon={Calendar}
                  label="Pagamento Programado"
                  value={formatBrazilDate(despesa.data_pagamento_programada)}
                />
              )}
              {despesa.data_pagamento && (
                <InfoRow
                  icon={CheckCircle2}
                  label="Data de Pagamento"
                  value={formatBrazilDate(despesa.data_pagamento)}
                />
              )}
              {casoLabel && (
                <InfoRow
                  icon={FolderOpen}
                  label={despesa.processo_id ? 'Processo' : 'Caso Consultivo'}
                  value={casoLabel}
                />
              )}
              {despesa.cliente_nome && (
                <InfoRow
                  icon={User}
                  label="Cliente"
                  value={despesa.cliente_nome}
                />
              )}
              {despesa.comprovante_url ? (
                <div className="flex items-start gap-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Comprovante</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1.5 text-xs h-8"
                      onClick={() => window.open(despesa.comprovante_url!, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Ver Comprovante
                    </Button>
                  </div>
                </div>
              ) : (
                <InfoRow
                  icon={FileText}
                  label="Comprovante"
                  value={<span className="text-slate-400 italic">Nenhum anexado</span>}
                />
              )}
            </div>
          </div>

          {/* Seções full-width (observações, rejeição) */}
          {despesa.observacoes_financeiro && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <InfoRow
                icon={MessageSquare}
                label="Observações do Financeiro"
                value={despesa.observacoes_financeiro}
              />
            </div>
          )}

          {despesa.motivo_rejeicao && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-[11px] text-red-500 uppercase tracking-wide mb-1">Motivo da Rejeição</p>
                <p className="text-sm text-red-700">{despesa.motivo_rejeicao}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                onOpenChange(false)
                onEditar(despesa)
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>

            {['pendente', 'agendado'].includes(despesa.status) && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => {
                  onOpenChange(false)
                  onCancelar(despesa)
                }}
              >
                <Ban className="w-3.5 h-3.5 mr-1.5" />
                Cancelar
              </Button>
            )}

            {onReverter && ['agendado', 'liberado', 'pago'].includes(despesa.status) && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-slate-500 hover:text-slate-600 hover:bg-slate-50 border-slate-300"
                onClick={() => {
                  onOpenChange(false)
                  onReverter(despesa)
                }}
              >
                <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                Voltar Etapa
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {despesa.status === 'pendente' && (
              <Button
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  onOpenChange(false)
                  onAgendar(despesa)
                }}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Agendar Pagamento
              </Button>
            )}

            {despesa.status === 'agendado' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    onOpenChange(false)
                    onRejeitar(despesa)
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    onOpenChange(false)
                    onLiberar(despesa)
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Liberar
                </Button>
              </>
            )}

            {despesa.status === 'liberado' && (
              <Button
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  onOpenChange(false)
                  onPagar(despesa)
                }}
              >
                <Banknote className="w-3.5 h-3.5 mr-1.5" />
                Registrar Pagamento
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
