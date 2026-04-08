import { useEffect, useState, useCallback, useRef } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

// ---------- Types ----------

export interface ChartDataItem {
  mes: string
  receitas: number
  despesas: number
}

export interface FluxoCaixaItem {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

export interface FinanceiroDashboardData {
  // KPIs financeiros
  receitaMes: number
  despesasMes: number
  lucroMes: number
  variacaoReceita: number
  variacaoLucro: number
  margemLucro: number
  taxaInadimplencia: number
  totalAtrasado: number
  totalPendente: number

  // KPIs operacionais
  horasTrabalhadasMes: number
  horasFaturaveisMes: number
  valorHorasFaturaveis: number

  // Faturamento pendente
  itensProntosFaturar: number
  valorProntoFaturar: number

  // Resumo do mês
  totalAReceber: number
  totalAPagar: number
  saldoMes: number

  // Charts
  chartData: ChartDataItem[]
  fluxoCaixaData: FluxoCaixaItem[]

  // Loading states
  loadingKpis: boolean
  loadingChart: boolean
  loadingFluxo: boolean
  loadingResumo: boolean
}

interface UseFinanceiroDashboardParams {
  escritorioIds: string[]
  mes: Date
}

const initialData: FinanceiroDashboardData = {
  receitaMes: 0,
  despesasMes: 0,
  lucroMes: 0,
  variacaoReceita: 0,
  variacaoLucro: 0,
  margemLucro: 0,
  taxaInadimplencia: 0,
  totalAtrasado: 0,
  totalPendente: 0,
  horasTrabalhadasMes: 0,
  horasFaturaveisMes: 0,
  valorHorasFaturaveis: 0,
  itensProntosFaturar: 0,
  valorProntoFaturar: 0,
  totalAReceber: 0,
  totalAPagar: 0,
  saldoMes: 0,
  chartData: [],
  fluxoCaixaData: [],
  loadingKpis: true,
  loadingChart: true,
  loadingFluxo: true,
  loadingResumo: true,
}

// ---------- Helpers ----------

const getValorReceita = (r: { valor?: number; valor_pago?: number }): number => {
  const vp = Number(r.valor_pago) || 0
  return vp > 0 ? vp : Number(r.valor) || 0
}

const fmtMonth = (date: Date) => format(startOfMonth(date), 'yyyy-MM-dd')
const fmtMonthEnd = (date: Date) => format(endOfMonth(date), 'yyyy-MM-dd')

// ---------- Hook ----------

export function useFinanceiroDashboard({ escritorioIds, mes }: UseFinanceiroDashboardParams) {
  const [data, setData] = useState<FinanceiroDashboardData>(initialData)
  const supabase = createClient()
  const abortRef = useRef(0)

  const updateData = useCallback((partial: Partial<FinanceiroDashboardData>) => {
    setData(prev => ({ ...prev, ...partial }))
  }, [])

  // ── KPIs: Receita, Despesa, Lucro, Variação, Horas ──
  const loadKpis = useCallback(async (ids: string[], mesSel: Date) => {
    updateData({ loadingKpis: true })
    try {
      const inicioMes = fmtMonth(mesSel)
      const fimMes = fmtMonthEnd(mesSel)
      const mesAnterior = subMonths(mesSel, 1)
      const inicioMesAnt = fmtMonth(mesAnterior)
      const fimMesAnt = fmtMonthEnd(mesAnterior)

      const [
        { data: extratoMes },
        { data: extratoMesAnt },
        { data: timesheet },
      ] = await Promise.all([
        supabase
          .from('v_extrato_financeiro')
          .select('*')
          .in('escritorio_id', ids)
          .gte('data_referencia', inicioMes)
          .lte('data_referencia', fimMes),
        supabase
          .from('v_extrato_financeiro')
          .select('*')
          .in('escritorio_id', ids)
          .gte('data_referencia', inicioMesAnt)
          .lte('data_referencia', fimMesAnt),
        supabase
          .from('financeiro_timesheet')
          .select('horas, faturavel')
          .in('escritorio_id', ids)
          .gte('data_trabalho', inicioMes)
          .lte('data_trabalho', fimMes),
      ])

      const mesArr = Array.isArray(extratoMes) ? extratoMes : []
      const mesAntArr = Array.isArray(extratoMesAnt) ? extratoMesAnt : []
      const tsArr = Array.isArray(timesheet) ? timesheet : []

      // Para KPIs, somar tudo: efetivado (pago) + previsto (recorrentes virtuais) + pendente
      // Excluir transferências internas (tipo_movimento = 'transferencia_*')
      const totalReceita = mesArr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'receita' &&
          r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => {
          // Para efetivados, usar valor_pago se disponível
          if (r.status === 'efetivado') {
            const vp = Number(r.valor_pago) || 0
            return s + (vp > 0 ? vp : Number(r.valor) || 0)
          }
          return s + (Number(r.valor) || 0)
        }, 0)

      const totalReceitaAnt = mesAntArr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'receita' &&
          r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => {
          if (r.status === 'efetivado') {
            const vp = Number(r.valor_pago) || 0
            return s + (vp > 0 ? vp : Number(r.valor) || 0)
          }
          return s + (Number(r.valor) || 0)
        }, 0)

      const totalDespesa = mesArr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'despesa' &&
          r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.valor) || 0), 0)

      const totalDespesaAnt = mesAntArr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'despesa' &&
          r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.valor) || 0), 0)

      const lucro = totalReceita - totalDespesa
      const lucroAnt = totalReceitaAnt - totalDespesaAnt

      const variacaoReceita = totalReceitaAnt > 0
        ? ((totalReceita - totalReceitaAnt) / totalReceitaAnt) * 100
        : 0
      const variacaoLucro = lucroAnt !== 0
        ? ((lucro - lucroAnt) / Math.abs(lucroAnt)) * 100
        : 0
      const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0

      const horasTrab = tsArr.reduce((s, t) => s + (Number(t.horas) || 0), 0)
      const horasFat = tsArr.filter(t => t.faturavel).reduce((s, t) => s + (Number(t.horas) || 0), 0)

      updateData({
        receitaMes: totalReceita,
        despesasMes: totalDespesa,
        lucroMes: lucro,
        variacaoReceita,
        variacaoLucro,
        margemLucro: margem,
        horasTrabalhadasMes: horasTrab,
        horasFaturaveisMes: horasFat,
        loadingKpis: false,
      })
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error)
      updateData({ loadingKpis: false })
    }
  }, [supabase, updateData])

  // ── Inadimplência acumulada ──
  const loadInadimplencia = useCallback(async (ids: string[]) => {
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const { data: receitas } = await supabase
        .from('financeiro_receitas')
        .select('valor, valor_pago, status')
        .in('escritorio_id', ids)
        .in('status', ['pendente', 'atrasado', 'parcial'])
        .lte('data_vencimento', hoje)

      const arr = Array.isArray(receitas) ? receitas : []
      const totalPendente = arr.reduce((s, r) => s + (Number(r.valor) || 0) - (Number(r.valor_pago) || 0), 0)
      const totalAtrasado = arr
        .filter(r => r.status === 'atrasado')
        .reduce((s, r) => s + (Number(r.valor) || 0) - (Number(r.valor_pago) || 0), 0)
      const taxa = totalPendente > 0 ? (totalAtrasado / totalPendente) * 100 : 0

      updateData({ taxaInadimplencia: taxa, totalAtrasado, totalPendente })
    } catch (error) {
      console.error('Erro ao carregar inadimplência:', error)
    }
  }, [supabase, updateData])

  // ── Resumo do mês ──
  const loadResumoMes = useCallback(async (ids: string[], mesSel: Date) => {
    updateData({ loadingResumo: true })
    try {
      const inicioMes = fmtMonth(mesSel)
      const fimMes = fmtMonthEnd(mesSel)

      const { data: extrato, error } = await supabase
        .from('v_extrato_financeiro')
        .select('*')
        .in('escritorio_id', ids)
        .gte('data_referencia', inicioMes)
        .lte('data_referencia', fimMes)

      if (error) throw error

      const arr = Array.isArray(extrato) ? extrato : []

      // A receber: receitas pendentes/previstas (não efetivadas)
      const totalReceber = arr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'receita' &&
          r.status !== 'efetivado' && r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.valor) || 0), 0)

      // A pagar: despesas pendentes/previstas (não efetivadas)
      const totalPagar = arr
        .filter((r: Record<string, unknown>) =>
          r.tipo_movimento === 'despesa' &&
          r.status !== 'efetivado' && r.status !== 'cancelado'
        )
        .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.valor) || 0), 0)

      updateData({ totalAReceber: totalReceber, totalAPagar: totalPagar, saldoMes: totalReceber - totalPagar, loadingResumo: false })
    } catch (error) {
      console.error('Erro ao carregar resumo do mês:', error)
      updateData({ loadingResumo: false })
    }
  }, [supabase, updateData])

  // ── Faturamento pendente + valor horas faturáveis ──
  const loadFaturamentoPendente = useCallback(async (ids: string[]) => {
    try {
      const { data: itens } = await supabase
        .from('v_lancamentos_prontos_faturar')
        .select('valor, tipo_lancamento')
        .in('escritorio_id', ids)

      const arr = Array.isArray(itens) ? itens : []
      const total = arr.reduce((s, i) => s + (Number(i.valor) || 0), 0)
      const valorHoras = arr
        .filter((i: Record<string, unknown>) => i.tipo_lancamento === 'timesheet')
        .reduce((s, i) => s + (Number(i.valor) || 0), 0)

      updateData({
        itensProntosFaturar: arr.length,
        valorProntoFaturar: total,
        valorHorasFaturaveis: valorHoras,
      })
    } catch (error) {
      console.error('Erro ao carregar faturamento pendente:', error)
    }
  }, [supabase, updateData])

  // ── Chart: Receitas vs Despesas (6 meses passados) ──
  const loadChartData = useCallback(async (ids: string[], mesSel: Date) => {
    updateData({ loadingChart: true })
    try {
      const dataInicio = subMonths(startOfMonth(mesSel), 5)
      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd')
      const dataFimStr = fmtMonthEnd(mesSel)

      const [{ data: receitas }, { data: despesas }] = await Promise.all([
        supabase
          .from('financeiro_receitas')
          .select('valor, valor_pago, data_pagamento')
          .in('escritorio_id', ids)
          .eq('status', 'pago')
          .gte('data_pagamento', dataInicioStr)
          .lte('data_pagamento', dataFimStr),
        supabase
          .from('financeiro_despesas')
          .select('valor, data_pagamento')
          .in('escritorio_id', ids)
          .eq('status', 'pago')
          .gte('data_pagamento', dataInicioStr)
          .lte('data_pagamento', dataFimStr),
      ])

      const recArr = Array.isArray(receitas) ? receitas : []
      const despArr = Array.isArray(despesas) ? despesas : []

      const porMes: Record<string, { receitas: number; despesas: number }> = {}
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(mesSel, i)
        porMes[format(m, 'yyyy-MM')] = { receitas: 0, despesas: 0 }
      }

      recArr.forEach(r => {
        if (!r.data_pagamento) return
        const chave = (r.data_pagamento as string).substring(0, 7)
        if (porMes[chave]) porMes[chave].receitas += getValorReceita(r)
      })
      despArr.forEach(d => {
        if (!d.data_pagamento) return
        const chave = (d.data_pagamento as string).substring(0, 7)
        if (porMes[chave]) porMes[chave].despesas += Number(d.valor) || 0
      })

      const chartData = Object.entries(porMes).map(([chave, v]) => ({
        mes: format(parseISO(chave + '-01'), 'MMM', { locale: ptBR }),
        receitas: v.receitas,
        despesas: v.despesas,
      }))

      updateData({ chartData, loadingChart: false })
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
      updateData({ chartData: [], loadingChart: false })
    }
  }, [supabase, updateData])

  // ── Fluxo de Caixa (projeção 6 meses futuros) ──
  const loadFluxoCaixa = useCallback(async (ids: string[]) => {
    updateData({ loadingFluxo: true })
    try {
      const dataInicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const dataFim = format(endOfMonth(addMonths(new Date(), 5)), 'yyyy-MM-dd')

      const { data: extrato, error } = await supabase
        .from('v_extrato_financeiro')
        .select('*')
        .in('escritorio_id', ids)
        .gte('data_referencia', dataInicio)
        .lte('data_referencia', dataFim)

      if (error) throw error

      const porMes: Record<string, { entradas: number; saidas: number }> = {}
      for (let i = 0; i < 6; i++) {
        const m = addMonths(new Date(), i)
        porMes[format(m, 'yyyy-MM')] = { entradas: 0, saidas: 0 }
      }

      const arr = Array.isArray(extrato) ? extrato : []
      arr.forEach((item: Record<string, unknown>) => {
        const venc = item.data_vencimento as string | null
        if (!venc) return
        const chave = venc.substring(0, 7)
        if (!porMes[chave]) return
        const valor = Number(item.valor) || 0
        if (item.tipo_movimento === 'receita') {
          porMes[chave].entradas += valor
        } else {
          porMes[chave].saidas += valor
        }
      })

      const fluxo = Object.entries(porMes).map(([chave, v]) => ({
        mes: format(parseISO(chave + '-01'), 'MMM', { locale: ptBR }),
        entradas: v.entradas,
        saidas: v.saidas,
        saldo: v.entradas - v.saidas,
      }))

      updateData({ fluxoCaixaData: fluxo, loadingFluxo: false })
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error)
      updateData({ fluxoCaixaData: [], loadingFluxo: false })
    }
  }, [supabase, updateData])

  // ── Efeito principal ──
  useEffect(() => {
    if (escritorioIds.length === 0) return

    const loadId = ++abortRef.current

    setData(prev => ({
      ...prev,
      loadingKpis: true,
      loadingChart: true,
      loadingFluxo: true,
      loadingResumo: true,
    }))

    const load = async () => {
      await Promise.all([
        loadKpis(escritorioIds, mes),
        loadInadimplencia(escritorioIds),
        loadResumoMes(escritorioIds, mes),
        loadFaturamentoPendente(escritorioIds),
        loadChartData(escritorioIds, mes),
        loadFluxoCaixa(escritorioIds),
      ])
    }

    if (abortRef.current === loadId) {
      load()
    }
  }, [escritorioIds, mes, loadKpis, loadInadimplencia, loadResumoMes, loadFaturamentoPendente, loadChartData, loadFluxoCaixa])

  return data
}
