'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Loader2,
  Search,
  FileText,
  Briefcase,
  X,
  DollarSign,
  Ban,
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateForDB, formatBrazilDate } from '@/lib/timezone'

interface TimesheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Pré-seleção opcional
  processoId?: string
  consultaId?: string
  tarefaId?: string
  // Callbacks
  onSuccess?: () => void
}

interface ProcessoOption {
  id: string
  numero_cnj: string
  numero_pasta?: string
  cliente_nome?: string
  contrato_id?: string
  forma_cobranca?: string
}

interface ConsultaOption {
  id: string
  numero?: string
  titulo: string
  cliente_nome?: string
  contrato_id?: string
  forma_cobranca?: string
}

interface ContratoInfo {
  id: string
  forma_cobranca: string
  horas_faturaveis: boolean
  titulo?: string
}

// Formas de cobrança que tornam horas faturáveis por padrão
const FORMAS_FATURAVEIS = ['por_hora', 'por_cargo']

// Formata data para input HTML type="date" (YYYY-MM-DD)
const formatDateForInput = (date: Date = new Date()): string => {
  return formatBrazilDate(date, 'yyyy-MM-dd')
}

const FORMA_COBRANCA_LABELS: Record<string, string> = {
  por_hora: 'Por Hora',
  por_cargo: 'Por Cargo',
  fixo: 'Valor Fixo',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
}

export default function TimesheetModal({
  open,
  onOpenChange,
  processoId,
  consultaId,
  tarefaId,
  onSuccess,
}: TimesheetModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Form state
  const [dataTrabalho, setDataTrabalho] = useState(formatDateForInput())
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [atividade, setAtividade] = useState('')
  const [faturavel, setFaturavel] = useState<boolean | null>(null) // null = usar padrão do contrato
  const [faturavelManual, setFaturavelManual] = useState(false) // Indica se usuário sobrescreveu

  // Vínculo state
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo')
  const [searchTerm, setSearchTerm] = useState('')

  // Selected state
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoOption | null>(null)
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaOption | null>(null)
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)

  // Search results
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [consultas, setConsultas] = useState<ConsultaOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Submit state
  const [loading, setLoading] = useState(false)

  // Calcular horas - retorna formato legível (1h54min)
  const calcularHorasDisplay = useCallback(() => {
    const [hi, mi] = horaInicio.split(':').map(Number)
    const [hf, mf] = horaFim.split(':').map(Number)
    const totalMinutos = (hf * 60 + mf) - (hi * 60 + mi)

    if (totalMinutos <= 0) return '0min'

    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60

    if (horas === 0) return `${minutos}min`
    if (minutos === 0) return `${horas}h`
    return `${horas}h${minutos}min`
  }, [horaInicio, horaFim])

  // Calcular faturável padrão baseado no contrato
  const faturavelPadrao = useCallback((): boolean => {
    if (!contratoInfo) return true // Sem contrato, assume faturável

    if (contratoInfo.forma_cobranca === 'misto') {
      return contratoInfo.horas_faturaveis
    }

    return FORMAS_FATURAVEIS.includes(contratoInfo.forma_cobranca)
  }, [contratoInfo])

  // Valor efetivo de faturável (manual ou padrão)
  const faturavelEfetivo = faturavel !== null ? faturavel : faturavelPadrao()

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      setDataTrabalho(formatDateForInput())
      setHoraInicio('09:00')
      setHoraFim('10:00')
      setAtividade('')
      setFaturavel(null)
      setFaturavelManual(false)
      setSearchTerm('')
      setProcessoSelecionado(null)
      setConsultaSelecionada(null)
      setContratoInfo(null)

      // Se tem processoId ou consultaId, carregar
      if (processoId) {
        setVinculoTipo('processo')
        loadProcessoById(processoId)
      } else if (consultaId) {
        setVinculoTipo('consulta')
        loadConsultaById(consultaId)
      }
    }
  }, [open, processoId, consultaId])

  // Função auxiliar para carregar contrato por ID
  const loadContratoById = async (contratoId: string): Promise<ContratoInfo | null> => {
    const { data, error } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, forma_cobranca, horas_faturaveis, titulo')
      .eq('id', contratoId)
      .single()

    if (error || !data) {
      console.error('Erro ao carregar contrato:', error)
      return null
    }

    return {
      id: data.id,
      forma_cobranca: data.forma_cobranca,
      horas_faturaveis: data.horas_faturaveis ?? true,
      titulo: data.titulo,
    }
  }

  // Carregar processo por ID
  const loadProcessoById = async (id: string) => {
    // Buscar processo com cliente
    const { data: processoData, error: processoError } = await supabase
      .from('processos_processos')
      .select(`
        id,
        numero_cnj,
        numero_pasta,
        contrato_id,
        cliente_id
      `)
      .eq('id', id)
      .single()

    if (processoError || !processoData) {
      console.error('Erro ao carregar processo:', processoError)
      return
    }

    // Buscar nome do cliente separadamente
    let clienteNome: string | undefined
    if (processoData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', processoData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    // Buscar contrato separadamente (mais confiável que join)
    let contrato: ContratoInfo | null = null
    if (processoData.contrato_id) {
      contrato = await loadContratoById(processoData.contrato_id)
    }

    // Definir processo selecionado
    setProcessoSelecionado({
      id: processoData.id,
      numero_cnj: processoData.numero_cnj,
      numero_pasta: processoData.numero_pasta,
      cliente_nome: clienteNome,
      contrato_id: processoData.contrato_id,
      forma_cobranca: contrato?.forma_cobranca,
    })

    // Definir info do contrato
    setContratoInfo(contrato)
  }

  // Carregar consulta por ID
  const loadConsultaById = async (id: string) => {
    // Buscar consulta com cliente
    const { data: consultaData, error: consultaError } = await supabase
      .from('consultivo_consultas')
      .select(`
        id,
        numero,
        titulo,
        contrato_id,
        cliente_id
      `)
      .eq('id', id)
      .single()

    if (consultaError || !consultaData) {
      console.error('Erro ao carregar consulta:', consultaError)
      return
    }

    // Buscar nome do cliente separadamente
    let clienteNome: string | undefined
    if (consultaData.cliente_id) {
      const { data: clienteData } = await supabase
        .from('crm_pessoas')
        .select('nome_completo')
        .eq('id', consultaData.cliente_id)
        .single()
      clienteNome = clienteData?.nome_completo
    }

    // Buscar contrato separadamente (mais confiável que join)
    let contrato: ContratoInfo | null = null
    if (consultaData.contrato_id) {
      contrato = await loadContratoById(consultaData.contrato_id)
    }

    // Definir consulta selecionada
    setConsultaSelecionada({
      id: consultaData.id,
      numero: consultaData.numero,
      titulo: consultaData.titulo,
      cliente_nome: clienteNome,
      contrato_id: consultaData.contrato_id,
      forma_cobranca: contrato?.forma_cobranca,
    })

    // Definir info do contrato
    setContratoInfo(contrato)
  }

  // Buscar processos/consultas
  useEffect(() => {
    const buscar = async () => {
      if (!escritorioAtivo || searchTerm.length < 2) {
        setProcessos([])
        setConsultas([])
        return
      }

      setSearchLoading(true)
      try {
        if (vinculoTipo === 'processo') {
          // Busca por numero_cnj, numero_pasta OU parte_contraria
          const { data: processosData } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`numero_cnj.ilike.%${searchTerm}%,numero_pasta.ilike.%${searchTerm}%,parte_contraria.ilike.%${searchTerm}%`)
            .limit(15)

          // Também buscar por nome do cliente no CRM
          const { data: clientesData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMap = new Map((clientesData || []).map((c: any) => [c.id, c.nome_completo]))

          // Buscar processos desses clientes
          let processosCliente: any[] = []
          if (clienteMap.size > 0) {
            const { data: pcData } = await supabase
              .from('processos_processos')
              .select('id, numero_cnj, numero_pasta, parte_contraria, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10)
            processosCliente = pcData || []
          }

          // Combinar e remover duplicados
          const todosProcessos = [...(processosData || []), ...processosCliente]
          const processosUnicos = Array.from(
            new Map(todosProcessos.map((p: any) => [p.id, p])).values()
          ).slice(0, 10)

          // Buscar nomes dos clientes para os processos que não vieram da busca por cliente
          const clienteIdsParaBuscar = processosUnicos
            .filter((p: any) => p.cliente_id && !clienteMap.has(p.cliente_id))
            .map((p: any) => p.cliente_id)

          if (clienteIdsParaBuscar.length > 0) {
            const { data: clientesAdicionais } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsParaBuscar)

            ;(clientesAdicionais || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo))
          }

          // Buscar forma_cobranca dos contratos
          const contratoIds = processosUnicos
            .filter((p: any) => p.contrato_id)
            .map((p: any) => p.contrato_id)

          const contratoMap = new Map<string, string>()
          if (contratoIds.length > 0) {
            const { data: contratos } = await supabase
              .from('financeiro_contratos_honorarios')
              .select('id, forma_cobranca')
              .in('id', contratoIds)

            ;(contratos || []).forEach((c: any) => contratoMap.set(c.id, c.forma_cobranca))
          }

          setProcessos(
            processosUnicos.map((p: any) => ({
              id: p.id,
              numero_cnj: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              cliente_nome: clienteMap.get(p.cliente_id) || p.parte_contraria,
              contrato_id: p.contrato_id,
              forma_cobranca: p.contrato_id ? contratoMap.get(p.contrato_id) : undefined,
            }))
          )
        } else {
          // Busca por numero ou titulo
          const { data: consultasResultado } = await supabase
            .from('consultivo_consultas')
            .select('id, numero, titulo, contrato_id, cliente_id')
            .eq('escritorio_id', escritorioAtivo)
            .or(`titulo.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%`)
            .limit(15)

          // Também buscar por nome do cliente
          const { data: clientesConsultas } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10)

          const clienteMapConsultas = new Map((clientesConsultas || []).map((c: any) => [c.id, c.nome_completo]))

          // Buscar consultas desses clientes
          let consultasDoCliente: any[] = []
          if (clienteMapConsultas.size > 0) {
            const { data: ccData } = await supabase
              .from('consultivo_consultas')
              .select('id, numero, titulo, contrato_id, cliente_id')
              .eq('escritorio_id', escritorioAtivo)
              .in('cliente_id', Array.from(clienteMapConsultas.keys()))
              .limit(10)
            consultasDoCliente = ccData || []
          }

          // Combinar e remover duplicados
          const todasConsultas = [...(consultasResultado || []), ...consultasDoCliente]
          const consultasUnicas = Array.from(
            new Map(todasConsultas.map((c: any) => [c.id, c])).values()
          ).slice(0, 10)

          // Buscar nomes dos clientes para as consultas que não vieram da busca por cliente
          const clienteIdsBuscarConsultas = consultasUnicas
            .filter((c: any) => c.cliente_id && !clienteMapConsultas.has(c.cliente_id))
            .map((c: any) => c.cliente_id)

          if (clienteIdsBuscarConsultas.length > 0) {
            const { data: clientesExtra } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsBuscarConsultas)

            ;(clientesExtra || []).forEach((c: any) => clienteMapConsultas.set(c.id, c.nome_completo))
          }

          // Buscar forma_cobranca dos contratos
          const contratoIdsConsultas = consultasUnicas
            .filter((c: any) => c.contrato_id)
            .map((c: any) => c.contrato_id)

          const contratoMapConsultas = new Map<string, string>()
          if (contratoIdsConsultas.length > 0) {
            const { data: contratosConsultas } = await supabase
              .from('financeiro_contratos_honorarios')
              .select('id, forma_cobranca')
              .in('id', contratoIdsConsultas)

            ;(contratosConsultas || []).forEach((c: any) => contratoMapConsultas.set(c.id, c.forma_cobranca))
          }

          setConsultas(
            consultasUnicas.map((c: any) => ({
              id: c.id,
              numero: c.numero,
              titulo: c.titulo,
              cliente_nome: clienteMapConsultas.get(c.cliente_id),
              contrato_id: c.contrato_id,
              forma_cobranca: c.contrato_id ? contratoMapConsultas.get(c.contrato_id) : undefined,
            }))
          )
        }
      } catch (err) {
        console.error('Erro ao buscar:', err)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(buscar, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, vinculoTipo, escritorioAtivo, supabase])

  // Selecionar processo
  const handleSelectProcesso = async (processo: ProcessoOption) => {
    setProcessoSelecionado(processo)
    setConsultaSelecionada(null)
    setSearchTerm('')
    setFaturavel(null)
    setFaturavelManual(false)

    // Carregar contrato se existir
    if (processo.contrato_id) {
      const contrato = await loadContratoById(processo.contrato_id)
      setContratoInfo(contrato)
    } else {
      setContratoInfo(null)
    }
  }

  // Selecionar consulta
  const handleSelectConsulta = async (consulta: ConsultaOption) => {
    setConsultaSelecionada(consulta)
    setProcessoSelecionado(null)
    setSearchTerm('')
    setFaturavel(null)
    setFaturavelManual(false)

    // Carregar contrato se existir
    if (consulta.contrato_id) {
      const contrato = await loadContratoById(consulta.contrato_id)
      setContratoInfo(contrato)
    } else {
      setContratoInfo(null)
    }
  }

  // Limpar seleção
  const handleClearSelection = () => {
    setProcessoSelecionado(null)
    setConsultaSelecionada(null)
    setContratoInfo(null)
    setFaturavel(null)
    setFaturavelManual(false)
  }

  // Definir faturável manualmente
  const handleSetFaturavel = (value: boolean) => {
    setFaturavel(value)
    setFaturavelManual(true)
  }

  // Submit
  const handleSubmit = async () => {
    const vinculoId = processoSelecionado?.id || consultaSelecionada?.id

    if (!vinculoId) {
      toast.error('Selecione um processo ou consulta')
      return
    }

    if (!processoSelecionado?.contrato_id && !consultaSelecionada?.contrato_id) {
      toast.error('Este caso não tem contrato de honorários vinculado. Vincule um contrato antes de lançar horas.')
      return
    }

    if (horaFim <= horaInicio) {
      toast.error('Hora fim deve ser maior que hora início')
      return
    }

    if (!atividade.trim()) {
      toast.error('Informe a atividade realizada')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.rpc('registrar_tempo_retroativo', {
        p_escritorio_id: escritorioAtivo,
        p_user_id: user.id,
        p_data_trabalho: dataTrabalho,
        p_hora_inicio: horaInicio,
        p_hora_fim: horaFim,
        p_atividade: atividade.trim(),
        p_processo_id: processoSelecionado?.id || null,
        p_consulta_id: consultaSelecionada?.id || null,
        p_tarefa_id: tarefaId || null,
        p_faturavel: faturavelEfetivo,
        p_faturavel_manual: faturavelManual,
      })

      if (error) throw error

      toast.success('Horas registradas com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error('Erro ao registrar horas:', err)
      toast.error(err?.message || 'Erro ao registrar horas')
    } finally {
      setLoading(false)
    }
  }

  const hasSelection = processoSelecionado || consultaSelecionada
  const opcoes = vinculoTipo === 'processo' ? processos : consultas

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Clock className="w-5 h-5 text-[#89bcbe]" />
            Lançar Horas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vínculo selecionado - Card minimalista com mais info */}
          {hasSelection ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {/* Header com tipo e ação de remover */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  {processoSelecionado ? (
                    <>
                      <FileText className="w-3 h-3 text-[#34495e]" />
                      <span className="text-[10px] font-medium text-[#34495e] uppercase tracking-wide">Processo</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-3 h-3 text-[#34495e]" />
                      <span className="text-[10px] font-medium text-[#34495e] uppercase tracking-wide">Consulta</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {contratoInfo && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 border",
                        FORMAS_FATURAVEIS.includes(contratoInfo.forma_cobranca)
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      )}
                    >
                      {FORMA_COBRANCA_LABELS[contratoInfo.forma_cobranca] || contratoInfo.forma_cobranca}
                    </Badge>
                  )}
                  {!processoId && !consultaId && (
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={handleClearSelection}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conteúdo principal */}
              <div className="px-3 py-2 bg-white">
                {processoSelecionado ? (
                  <div className="space-y-1">
                    {/* Número da pasta + CNJ */}
                    <div className="flex items-baseline gap-2">
                      {processoSelecionado.numero_pasta && (
                        <span className="text-xs font-semibold text-[#34495e]">
                          {processoSelecionado.numero_pasta}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        {processoSelecionado.numero_cnj}
                      </span>
                    </div>
                    {/* Cliente */}
                    {processoSelecionado.cliente_nome && (
                      <p className="text-[11px] text-slate-600 truncate">
                        {processoSelecionado.cliente_nome}
                      </p>
                    )}
                  </div>
                ) : consultaSelecionada && (
                  <div className="space-y-1">
                    {/* Número + Título */}
                    <div className="flex items-baseline gap-2">
                      {consultaSelecionada.numero && (
                        <span className="text-xs font-semibold text-[#34495e]">
                          {consultaSelecionada.numero}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-700 truncate">
                        {consultaSelecionada.titulo}
                      </span>
                    </div>
                    {/* Cliente */}
                    {consultaSelecionada.cliente_nome && (
                      <p className="text-[11px] text-slate-600 truncate">
                        {consultaSelecionada.cliente_nome}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Alerta se não tem contrato */}
              {!contratoInfo && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border-t border-amber-100">
                  <Info className="w-3 h-3 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-600">
                    Sem contrato vinculado
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Busca de vínculo */
            <div>
              <Label className="text-xs text-slate-600">Vincular a</Label>

              {/* Toggle Processo/Consulta */}
              <div className="flex gap-2 mt-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setVinculoTipo('processo')
                    setSearchTerm('')
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs rounded-lg border transition-colors",
                    vinculoTipo === 'processo'
                      ? "border-[#34495e] bg-[#34495e] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Processo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVinculoTipo('consulta')
                    setSearchTerm('')
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs rounded-lg border transition-colors",
                    vinculoTipo === 'consulta'
                      ? "border-[#34495e] bg-[#34495e] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Briefcase className="w-3 h-3 inline mr-1" />
                  Consulta
                </button>
              </div>

              {/* Campo de busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  placeholder={vinculoTipo === 'processo'
                    ? "Buscar por CNJ, pasta, cliente ou parte contrária..."
                    : "Buscar por número, título ou cliente..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />

                {/* Dropdown de resultados */}
                {searchTerm.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    ) : opcoes.length > 0 ? (
                      <>
                        {vinculoTipo === 'processo' ? (
                          processos.map((processo) => (
                            <button
                              key={processo.id}
                              type="button"
                              onClick={() => handleSelectProcesso(processo)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-100 last:border-b-0"
                            >
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#34495e] truncate">
                                  {processo.numero_pasta ? `${processo.numero_pasta} - ` : ''}{processo.numero_cnj}
                                </p>
                                <div className="flex items-center gap-2">
                                  {processo.cliente_nome && (
                                    <span className="text-[10px] text-slate-500 truncate">
                                      {processo.cliente_nome}
                                    </span>
                                  )}
                                  {processo.forma_cobranca && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                      {FORMA_COBRANCA_LABELS[processo.forma_cobranca] || processo.forma_cobranca}
                                    </Badge>
                                  )}
                                  {!processo.contrato_id && (
                                    <span className="text-[9px] text-amber-600">Sem contrato</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          consultas.map((consulta) => (
                            <button
                              key={consulta.id}
                              type="button"
                              onClick={() => handleSelectConsulta(consulta)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-100 last:border-b-0"
                            >
                              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#34495e] truncate">
                                  {consulta.numero ? `${consulta.numero} - ` : ''}{consulta.titulo}
                                </p>
                                <div className="flex items-center gap-2">
                                  {consulta.cliente_nome && (
                                    <span className="text-[10px] text-slate-500 truncate">
                                      {consulta.cliente_nome}
                                    </span>
                                  )}
                                  {consulta.forma_cobranca && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                      {FORMA_COBRANCA_LABELS[consulta.forma_cobranca] || consulta.forma_cobranca}
                                    </Badge>
                                  )}
                                  {!consulta.contrato_id && (
                                    <span className="text-[9px] text-amber-600">Sem contrato</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    ) : (
                      <div className="py-4 text-center text-sm text-slate-500">
                        Nenhum resultado encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data e Horários */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-600">Data</Label>
              <Input
                type="date"
                value={dataTrabalho}
                onChange={(e) => setDataTrabalho(e.target.value)}
                max={formatDateForInput()}
                className="h-9 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Início</Label>
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="h-9 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Fim</Label>
              <Input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="h-9 mt-1 text-sm"
              />
            </div>
          </div>

          {/* Total de horas */}
          <div className="flex items-center justify-center gap-2 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Clock className="w-4 h-4 text-[#89bcbe]" />
            <span className="text-sm text-slate-600">
              Total: <strong className="text-[#34495e]">{calcularHorasDisplay()}</strong>
            </span>
          </div>

          {/* Atividade */}
          <div>
            <Label className="text-xs text-slate-600">Atividade realizada *</Label>
            <Textarea
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              rows={2}
              className="mt-1 text-sm resize-none"
              placeholder="Descreva a atividade..."
            />
          </div>

          {/* Faturável - Botões */}
          <div>
            <Label className="text-xs text-slate-600 mb-2 block">Tipo de hora</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetFaturavel(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                  faturavelEfetivo
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Cobrável</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetFaturavel(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                  !faturavelEfetivo
                    ? "border-slate-500 bg-slate-100 text-slate-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                <Ban className="w-4 h-4" />
                <span className="text-sm font-medium">Não Cobrável</span>
              </button>
            </div>

            {/* Info sobre faturável - apenas quando automático */}
            {contratoInfo && !faturavelManual && (
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Padrão do contrato ({FORMA_COBRANCA_LABELS[contratoInfo.forma_cobranca]})
              </p>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !hasSelection || !atividade.trim()}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Registrar Horas
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
