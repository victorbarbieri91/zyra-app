'use client'

import {
  CreditCard,
  AlertCircle,
  Pencil,
  Check,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CATEGORIAS_DESPESA_CARTAO,
} from '@/hooks/useCartoesCredito'
import type { CartaoCredito, FaturaCartao } from '@/hooks/useCartoesCredito'
import type { TransacaoExtraida } from './useImportarFatura'
import { cn } from '@/lib/utils'

interface ImportarFaturaStep2Props {
  cartaoSelecionado: CartaoCredito | undefined
  uploadedFile: File | null
  dadosFatura: {
    valor_total: number
    data_vencimento: string | null
  } | null
  mesReferenciaFatura: string
  setMesReferenciaFatura: (mes: string) => void
  opcoesMeses: { value: string; label: string }[]
  transacoes: TransacaoExtraida[]
  transacoesSelecionadas: TransacaoExtraida[]
  totalSelecionado: number
  faturaExistente: FaturaCartao | null
  verificandoDuplicatas: boolean

  // Inline edit
  editingDescricaoId: string | null
  editingDescricaoValue: string
  setEditingDescricaoValue: (v: string) => void
  editingDataId: string | null
  editingDataValue: string
  setEditingDataValue: (v: string) => void

  // Edit modal
  editingTransacao: TransacaoExtraida | null
  setEditingTransacao: (t: TransacaoExtraida | null) => void
  editModalOpen: boolean
  setEditModalOpen: (open: boolean) => void

  // Handlers
  toggleTransacao: (id: string) => void
  toggleTodas: (selecionar: boolean) => void
  startEditingDescricao: (t: TransacaoExtraida) => void
  saveDescricao: () => void
  cancelEditingDescricao: () => void
  startEditingData: (t: TransacaoExtraida) => void
  saveData: () => void
  cancelEditingData: () => void
  updateCategoria: (id: string, cat: string) => void
  updateTipoTransacao: (id: string, tipo: 'debito' | 'credito') => void
  handleEditTransacao: (t: TransacaoExtraida) => void
  handleSaveEdit: () => void
  handleRemoveTransacao: (id: string) => void
  toggleRecorrente: (id: string) => void

  // Helpers
  formatCurrency: (value: number) => string
  formatDate: (dateStr: string) => string
}

export default function ImportarFaturaStep2({
  cartaoSelecionado,
  uploadedFile,
  dadosFatura,
  mesReferenciaFatura,
  setMesReferenciaFatura,
  opcoesMeses,
  transacoes,
  transacoesSelecionadas,
  totalSelecionado,
  faturaExistente,
  editingDescricaoId,
  editingDescricaoValue,
  setEditingDescricaoValue,
  editingDataId,
  editingDataValue,
  setEditingDataValue,
  editingTransacao,
  setEditingTransacao,
  editModalOpen,
  setEditModalOpen,
  toggleTransacao,
  toggleTodas,
  startEditingDescricao,
  saveDescricao,
  cancelEditingDescricao,
  startEditingData,
  saveData,
  cancelEditingData,
  updateCategoria,
  updateTipoTransacao,
  handleEditTransacao,
  handleSaveEdit,
  handleRemoveTransacao,
  toggleRecorrente,
  formatCurrency,
  formatDate,
}: ImportarFaturaStep2Props) {
  // Formatar label do mês selecionado
  const mesLabel = opcoesMeses.find(m => m.value === mesReferenciaFatura)?.label || ''

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior: cartão + mês em destaque */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: cartaoSelecionado?.cor || '#64748B' }}
          >
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {cartaoSelecionado?.nome} •••• {cartaoSelecionado?.ultimos_digitos}
            </p>
            <p className="text-[10px] text-slate-400">{uploadedFile?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dadosFatura?.data_vencimento && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400">Venc.</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{formatDate(dadosFatura.data_vencimento)}</p>
            </div>
          )}
          {dadosFatura?.valor_total && dadosFatura.valor_total > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400">Total PDF</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{formatCurrency(dadosFatura.valor_total)}</p>
            </div>
          )}

          {/* Mês da fatura em destaque */}
          <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
            <Select value={mesReferenciaFatura} onValueChange={setMesReferenciaFatura}>
              <SelectTrigger className="h-8 w-auto min-w-[160px] px-3 text-xs font-semibold border-0 bg-[#34495e] text-white rounded-md hover:bg-[#2c3e50] focus:ring-0 capitalize [&>svg]:text-white/70">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {opcoesMeses.map((mes) => (
                  <SelectItem key={mes.value} value={mes.value} className="text-xs capitalize">
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(faturaExistente || transacoes.some(t => t.possivelDuplicata) || transacoes.some(t => t.regraRecorrenteId)) && (
        <div className="flex-shrink-0 px-6 py-2 space-y-1.5">
          {/* Recorrentes identificados */}
          {transacoes.some(t => t.regraRecorrenteId) && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-800">
              <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-purple-800 dark:text-purple-300">
                  {transacoes.filter(t => t.regraRecorrenteId).length} recorrentes identificados automaticamente
                </p>
                {transacoes.some(t => t.regraValorAnterior !== undefined) && (
                  <p className="text-[10px] text-purple-600 dark:text-purple-400">
                    {transacoes.filter(t => t.regraValorAnterior !== undefined).length} com valor diferente — serão atualizados ao importar
                  </p>
                )}
              </div>
            </div>
          )}
          {faturaExistente && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200">
              <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-amber-800">
                  Fatura {faturaExistente.status === 'paga' ? 'paga' : 'pendente'} existente
                </p>
                <p className="text-[10px] text-amber-600">
                  Lançamentos serão adicionados à fatura ({formatCurrency(faturaExistente.valor_total || 0)})
                </p>
              </div>
            </div>
          )}
          {transacoes.some(t => t.possivelDuplicata) && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {transacoes.filter(t => t.possivelDuplicata).length} possíveis duplicatas encontradas
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista de transações */}
      <div className="flex-1 overflow-hidden px-6 py-3">
        {transacoes.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header da lista */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={transacoes.length > 0 && transacoes.every(t => t.selecionada)}
                  onCheckedChange={(checked) => toggleTodas(!!checked)}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {transacoesSelecionadas.length}/{transacoes.length}
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                Total: {formatCurrency(totalSelecionado)}
              </Badge>
            </div>

            {/* Tabela compacta */}
            <div className="border rounded-lg overflow-hidden flex-1 flex flex-col overflow-x-auto">
              {/* Cabeçalho sticky */}
              <div className="grid grid-cols-[28px_74px_minmax(120px,320px)_72px_95px_130px_28px] gap-2 px-3 py-1.5 bg-slate-50 dark:bg-surface-0 border-b dark:border-slate-700 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                <div></div>
                <div className="flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  Data
                </div>
                <div>Descrição</div>
                <div className="text-center">Tipo</div>
                <div className="flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />
                  Valor
                </div>
                <div className="flex items-center gap-0.5">
                  <Tag className="w-2.5 h-2.5" />
                  Categoria
                </div>
                <div></div>
              </div>

              {/* Linhas scrolláveis */}
              <div className="flex-1 overflow-y-auto">
                {transacoes.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'grid grid-cols-[28px_74px_minmax(120px,320px)_72px_95px_130px_28px] gap-2 px-3 py-2 items-center text-xs border-b last:border-b-0 transition-colors',
                      t.selecionada ? 'bg-white dark:bg-surface-1' : 'bg-slate-50/50 dark:bg-surface-0/50 opacity-50'
                    )}
                  >
                    {/* Checkbox + duplicata */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={t.selecionada}
                        onCheckedChange={() => toggleTransacao(t.id)}
                        className="h-3.5 w-3.5"
                      />
                      {t.possivelDuplicata && (
                        <span title="Possível duplicata"><AlertTriangle className="w-2.5 h-2.5 text-amber-500 ml-0.5" /></span>
                      )}
                    </div>

                    {/* Data editável */}
                    <div>
                      {editingDataId === t.id ? (
                        <Input
                          type="date"
                          value={editingDataValue}
                          onChange={(e) => setEditingDataValue(e.target.value)}
                          onBlur={saveData}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveData()
                            if (e.key === 'Escape') cancelEditingData()
                          }}
                          className="h-6 text-[11px] px-1"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEditingData(t)}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-surface-3 rounded px-0.5 py-0.5 transition-colors text-[11px] text-slate-600 dark:text-slate-400"
                          title="Clique para editar"
                        >
                          {formatDate(t.data)}
                        </div>
                      )}
                    </div>

                    {/* Descrição editável */}
                    <div className="min-w-0">
                      {editingDescricaoId === t.id ? (
                        <Input
                          value={editingDescricaoValue}
                          onChange={(e) => setEditingDescricaoValue(e.target.value)}
                          onBlur={saveDescricao}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDescricao()
                            if (e.key === 'Escape') cancelEditingDescricao()
                          }}
                          className="h-6 text-[11px] px-1"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEditingDescricao(t)}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-surface-3 rounded px-0.5 py-0.5 transition-colors"
                          title="Clique para editar"
                        >
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">{t.descricao}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {t.parcela && (
                              <span className="text-[9px] text-blue-600 dark:text-blue-400">Parcela {t.parcela}</span>
                            )}
                            {/* Recorrente identificado automaticamente */}
                            {t.regraRecorrenteId ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                                title={`Identificado como recorrente: ${t.regraDescricao || t.descricao}`}
                              >
                                <RefreshCw className="w-2 h-2" />
                                Recorrente ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleRecorrente(t.id)
                                }}
                                className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors',
                                  t.tipo === 'recorrente'
                                    ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:text-purple-600 hover:border-purple-300'
                                )}
                                title={t.tipo === 'recorrente' ? 'Remover recorrência' : 'Marcar como recorrente'}
                              >
                                ↻ {t.tipo === 'recorrente' ? 'Recorrente' : 'Recorrente?'}
                              </button>
                            )}
                            {/* Indicação de mudança de valor */}
                            {t.regraValorAnterior !== undefined && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                title={`Valor anterior: ${formatCurrency(t.regraValorAnterior)} → Novo: ${formatCurrency(t.valor)}`}
                              >
                                {formatCurrency(t.regraValorAnterior)}
                                <ArrowRight className="w-2 h-2" />
                                {formatCurrency(t.valor)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tipo D/C - dropdown */}
                    <div className="flex justify-center">
                      <Select
                        value={t.tipo_transacao}
                        onValueChange={(v) => updateTipoTransacao(t.id, v as 'debito' | 'credito')}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-5 w-[60px] text-[10px] font-medium border-0 px-1.5 focus:ring-0',
                            t.tipo_transacao === 'debito'
                              ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debito" className="text-xs">Débito</SelectItem>
                          <SelectItem value="credito" className="text-xs">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor */}
                    <div className={cn(
                      'text-[11px] font-medium',
                      t.tipo_transacao === 'credito'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {t.tipo_transacao === 'credito' && '- '}
                      {formatCurrency(t.valor)}
                    </div>

                    {/* Categoria */}
                    <div>
                      <Select
                        value={t.categoria_sugerida}
                        onValueChange={(v) => updateCategoria(t.id, v)}
                      >
                        <SelectTrigger className="h-5 text-[10px] border-transparent bg-slate-100 dark:bg-surface-2 hover:bg-slate-200 dark:hover:bg-surface-3 focus:ring-0 px-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value} className="text-xs">
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => handleRemoveTransacao(t.id)}
                        title="Remover"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e] dark:text-slate-200">Editar Lançamento</DialogTitle>
            <DialogDescription>Ajuste os dados antes de importar</DialogDescription>
          </DialogHeader>
          {editingTransacao && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={editingTransacao.descricao}
                  onChange={(e) =>
                    setEditingTransacao({ ...editingTransacao, descricao: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editingTransacao.data}
                    onChange={(e) =>
                      setEditingTransacao({ ...editingTransacao, data: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTransacao.valor}
                    onChange={(e) =>
                      setEditingTransacao({
                        ...editingTransacao,
                        valor: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editingTransacao.tipo_transacao}
                    onValueChange={(v) =>
                      setEditingTransacao({ ...editingTransacao, tipo_transacao: v as 'debito' | 'credito' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parcela</Label>
                  <Input
                    placeholder="Ex: 1/3"
                    value={editingTransacao.parcela || ''}
                    onChange={(e) =>
                      setEditingTransacao({
                        ...editingTransacao,
                        parcela: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editingTransacao.categoria_sugerida}
                    onValueChange={(v) =>
                      setEditingTransacao({ ...editingTransacao, categoria_sugerida: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
