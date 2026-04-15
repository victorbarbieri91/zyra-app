'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CalendarDays, Info, Loader2, Pencil, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  FORMAS_PAGAMENTO,
  type LancamentoDetalhes,
  type LancamentoEditFormData,
  type LancamentoRef,
} from '@/lib/financeiro/lancamento-types'
import { useLancamentoMutations } from '@/lib/financeiro/useLancamentoMutations'

const supabase = createClient()

type Escopo = 'instancia' | 'serie'

interface ContaBancariaOption {
  id: string
  banco: string
  apelido: string | null
  tipo: string
  numero_conta: string | null
}

interface PessoaOption {
  id: string
  nome: string
}

interface LancamentoEditarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lancamento: LancamentoRef | null
  escritorioId: string | null
  contasBancarias: ContaBancariaOption[]
  onSuccess: () => void
}

const formInicial: LancamentoEditFormData = {
  descricao: '',
  valor: 0,
  data_vencimento: '',
  dia_vencimento: 5,
  categoria: '',
  fornecedor: '',
  observacoes: '',
  conta_bancaria_id: '',
  pago_por_id: '',
  forma_pagamento: '',
  data_pagamento: '',
}

export default function LancamentoEditarModal({
  open,
  onOpenChange,
  lancamento,
  escritorioId,
  contasBancarias,
  onSuccess,
}: LancamentoEditarModalProps) {
  const { carregarDetalhes, atualizarInstancia, atualizarSerie } = useLancamentoMutations()

  const [detalhes, setDetalhes] = useState<LancamentoDetalhes | null>(null)
  const [form, setForm] = useState<LancamentoEditFormData>(formInicial)
  const [pessoas, setPessoas] = useState<PessoaOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [escopo, setEscopo] = useState<Escopo>('instancia')

  const isDespesa = detalhes?.tipo === 'despesa'
  const isEfetivado = detalhes?.status === 'pago'
  const pendentes = detalhes?.regra?.pendentes_futuras ?? 0
  const temSerieEditavel = Boolean(detalhes?.regra && pendentes > 1)
  const isSerie = escopo === 'serie'
  const isParcelamento = detalhes?.regra?.is_parcelamento ?? false

  const categorias = useMemo(
    () => (isDespesa ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA),
    [isDespesa],
  )

  const tipoLabel = isDespesa ? 'Despesa' : 'Receita'

  // Carregar detalhes ao abrir
  useEffect(() => {
    if (!open || !lancamento) {
      setDetalhes(null)
      setForm(formInicial)
      setEscopo('instancia')
      return
    }

    let cancelado = false
    setLoading(true)
    setEscopo('instancia')

    carregarDetalhes(lancamento)
      .then((det) => {
        if (cancelado) return
        if (!det) {
          toast.error('Não foi possível carregar este lançamento.')
          onOpenChange(false)
          return
        }

        setDetalhes(det)
        setForm({
          descricao: det.descricao,
          valor: det.valor,
          data_vencimento: det.data_vencimento,
          dia_vencimento: det.regra?.dia_vencimento ?? 5,
          categoria: det.categoria,
          fornecedor: det.fornecedor ?? '',
          observacoes: det.observacoes ?? '',
          conta_bancaria_id: det.conta_bancaria_id ?? '',
          pago_por_id: det.pago_por_id ?? '',
          forma_pagamento: det.forma_pagamento ?? '',
          data_pagamento: det.data_pagamento ?? '',
        })
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [open, lancamento, carregarDetalhes, onOpenChange])

  // Carregar usuários do escritório para dropdown "Pago por"
  useEffect(() => {
    if (!open || !escritorioId) return

    type EscritorioUsuarioRow = {
      user_id: string
      profile:
        | { id: string; nome_completo: string }
        | { id: string; nome_completo: string }[]
        | null
    }

    ;(async () => {
      const { data } = await supabase
        .from('escritorios_usuarios')
        .select('user_id, profile:profiles(id, nome_completo)')
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true)

      if (data) {
        const rows = data as unknown as EscritorioUsuarioRow[]
        const lista: PessoaOption[] = rows
          .map((row) => {
            const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
            return profile ? { id: profile.id, nome: profile.nome_completo } : null
          })
          .filter((p): p is PessoaOption => p !== null)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

        setPessoas(lista)
      }
    })()
  }, [open, escritorioId])

  const handleSalvar = async () => {
    if (!detalhes) return

    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    if (!form.valor || form.valor <= 0) {
      toast.error('Valor inválido')
      return
    }

    setSaving(true)
    try {
      if (isSerie) {
        const atualizadas = await atualizarSerie(detalhes, form)
        if (atualizadas === null) {
          toast.error('Erro ao atualizar a série')
          return
        }
        toast.success(
          atualizadas === 0
            ? 'Regra atualizada. Nenhuma ocorrência pendente foi alterada.'
            : `${atualizadas} ${atualizadas === 1 ? 'ocorrência pendente atualizada' : 'ocorrências pendentes atualizadas'}.`,
        )
      } else {
        const ok = await atualizarInstancia(detalhes, form)
        if (!ok) {
          toast.error('Erro ao salvar alterações')
          return
        }
        toast.success('Lançamento atualizado')
      }

      onSuccess()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto !p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-3 text-[#34495e] dark:text-slate-200">
            <div className="w-10 h-10 rounded-lg bg-[#f0f9f9] dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-4 h-4 text-[#89bcbe]" />
            </div>
            <span className="text-lg font-semibold">Editar {tipoLabel}</span>
          </DialogTitle>
          {detalhes && (
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 pl-[52px]">
                <span className="text-sm font-medium text-[#34495e] dark:text-slate-300">
                  {detalhes.descricao}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isDespesa ? 'text-red-600' : 'text-emerald-600',
                  )}
                >
                  {formatCurrency(detalhes.valor)}
                </span>
                {detalhes.data_vencimento && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Venc. {formatBrazilDate(detalhes.data_vencimento)}
                  </span>
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
          </div>
        )}

        {!loading && detalhes && (
          <div className="px-6 py-5 space-y-5">
            {/* Escopo (toggle dentro do modal — sem mini dialog prévio) */}
            {temSerieEditavel && (
              <div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-surface-2 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEscopo('instancia')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                      escopo === 'instancia'
                        ? 'bg-[#34495e] text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                    )}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Apenas este mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscopo('serie')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                      escopo === 'serie'
                        ? 'bg-[#34495e] text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                    )}
                  >
                    <Repeat className="w-4 h-4" />
                    Toda a série ({pendentes})
                  </button>
                </div>
                {isSerie && (
                  <div className="mt-3 flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-[#f0f9f9] border border-[#89bcbe]/40 dark:bg-teal-500/10 dark:border-teal-500/30">
                    <Info className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-[#46627f] dark:text-slate-300">
                      Alterações aplicadas a{' '}
                      <strong className="text-[#34495e] dark:text-slate-200">
                        {pendentes}{' '}
                        {pendentes === 1 ? 'ocorrência pendente' : 'ocorrências pendentes'}
                      </strong>
                      . Lançamentos já pagos permanecem intactos.
                      {isParcelamento && (
                        <span className="block mt-1 text-xs">
                          Parcelamento: o novo valor se aplica apenas às parcelas pendentes.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seção: Dados principais */}
            <section className="space-y-4">
              <SectionTitle>Dados principais</SectionTitle>

              <div>
                <Label className="text-sm">Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição do lançamento"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Valor</Label>
                  <CurrencyInput
                    value={form.valor}
                    onChange={(val) => setForm({ ...form, valor: val })}
                    disabled={!isSerie && isEfetivado}
                    className={cn(
                      'mt-1.5',
                      !isSerie && isEfetivado ? 'bg-slate-50 dark:bg-surface-2' : '',
                    )}
                  />
                  {!isSerie && isEfetivado && (
                    <p className="text-xs text-slate-500 mt-1">
                      Não editável em lançamento efetivado.
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">
                    {isSerie ? 'Dia do vencimento' : 'Data de vencimento'}
                  </Label>
                  {isSerie ? (
                    <select
                      value={form.dia_vencimento}
                      onChange={(e) =>
                        setForm({ ...form, dia_vencimento: Number(e.target.value) })
                      }
                      className="w-full mt-1.5 h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-sm dark:bg-surface-1 dark:text-slate-300"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Dia {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="date"
                      value={form.data_vencimento}
                      onChange={(e) =>
                        setForm({ ...form, data_vencimento: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Categoria</Label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full mt-1.5 h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-sm dark:bg-surface-1 dark:text-slate-300"
                  >
                    <option value="">Selecione</option>
                    {categorias.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Conta bancária</Label>
                  <select
                    value={form.conta_bancaria_id}
                    onChange={(e) =>
                      setForm({ ...form, conta_bancaria_id: e.target.value })
                    }
                    className="w-full mt-1.5 h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-sm dark:bg-surface-1 dark:text-slate-300"
                  >
                    <option value="">Nenhuma</option>
                    {contasBancarias.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.banco}
                        {conta.apelido ? ` — ${conta.apelido}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isDespesa && (
                <div>
                  <Label className="text-sm">Fornecedor</Label>
                  <Input
                    value={form.fornecedor}
                    onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                    placeholder="Nome do fornecedor"
                    className="mt-1.5"
                  />
                </div>
              )}
            </section>

            {/* Seção: Pagamento (apenas instância + efetivado) */}
            {!isSerie && isEfetivado && (
              <section className="space-y-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                <SectionTitle>Pagamento</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Pago por</Label>
                    <select
                      value={form.pago_por_id}
                      onChange={(e) => setForm({ ...form, pago_por_id: e.target.value })}
                      className="w-full mt-1.5 h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-sm dark:bg-surface-1 dark:text-slate-300"
                    >
                      <option value="">Não informado</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Data do pagamento</Label>
                    <Input
                      type="date"
                      value={form.data_pagamento}
                      onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Forma de pagamento</Label>
                  <select
                    value={form.forma_pagamento}
                    onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                    className="w-full mt-1.5 h-10 rounded-md border border-slate-200 dark:border-slate-700 px-3 text-sm dark:bg-surface-1 dark:text-slate-300"
                  >
                    <option value="">Não informado</option>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {/* Seção: Observações */}
            <section className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-800">
              <SectionTitle>Observações</SectionTitle>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais sobre este lançamento"
                rows={3}
              />
            </section>
          </div>
        )}

        {!loading && detalhes && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-2/30">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-[#46627f] dark:text-slate-400 uppercase tracking-wider">
      {children}
    </div>
  )
}
