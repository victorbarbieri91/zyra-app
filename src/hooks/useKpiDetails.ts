'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

// ─── Types ───────────────────────────────────────────────

export interface ProcessoItem {
  id: string
  numero_cnj: string | null
  numero_pasta: string | null
  autor: string | null
  reu: string | null
  area: string | null
  status: string
  data: string // created_at or updated_at
  cliente_nome: string | null
  responsavel_nome: string | null
}

export interface ClienteItem {
  id: string
  nome_completo: string | null
  tipo_pessoa: string | null
  email: string | null
  telefone: string | null
  created_at: string
}

export interface ConsultaItem {
  id: string
  numero: string | null
  titulo: string | null
  area: string | null
  status: string
  data: string
  cliente_nome: string | null
  responsavel_nome: string | null
}

export interface ProfissionalHoras {
  userId: string
  nome: string
  horasEsteMes: number
  horasMesPassado: number
  variacao: number
  variacaoPercent: number
}

export interface ProcessosDetailData {
  novos: ProcessoItem[]
  encerrados: ProcessoItem[]
}

export interface ClientesDetailData {
  novos: ClienteItem[]
}

export interface ConsultivosDetailData {
  novas: ConsultaItem[]
  finalizadas: ConsultaItem[]
}

export interface HorasDetailData {
  totalEsteMes: number
  totalMesPassado: number
  diaAtual: number
  profissionais: ProfissionalHoras[]
}

export type KpiType = 'processos' | 'clientes' | 'consultivo' | 'horas'

// ─── Fetch Functions ─────────────────────────────────────

async function fetchProcessosDetail(
  supabase: ReturnType<typeof createClient>,
  escritorioId: string
): Promise<ProcessosDetailData> {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [novosResult, encerradosResult] = await Promise.all([
    supabase
      .from('processos_processos')
      .select(`
        id, numero_cnj, numero_pasta, autor, reu, area, status, created_at,
        cliente:crm_pessoas!cliente_id(nome_completo),
        responsavel:profiles!responsavel_id(nome_completo)
      `)
      .eq('escritorio_id', escritorioId)
      .gte('created_at', inicioMes.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('processos_processos')
      .select(`
        id, numero_cnj, numero_pasta, autor, reu, area, status, updated_at,
        cliente:crm_pessoas!cliente_id(nome_completo),
        responsavel:profiles!responsavel_id(nome_completo)
      `)
      .eq('escritorio_id', escritorioId)
      .in('status', ['arquivado', 'encerrado', 'baixado'])
      .gte('updated_at', inicioMes.toISOString())
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const mapProcesso = (p: Record<string, unknown>, dateField: 'created_at' | 'updated_at'): ProcessoItem => ({
    id: p.id as string,
    numero_cnj: p.numero_cnj as string | null,
    numero_pasta: p.numero_pasta as string | null,
    autor: p.autor as string | null,
    reu: p.reu as string | null,
    area: p.area as string | null,
    status: p.status as string,
    data: p[dateField] as string,
    cliente_nome: (p.cliente as Record<string, unknown> | null)?.nome_completo as string | null,
    responsavel_nome: (p.responsavel as Record<string, unknown> | null)?.nome_completo as string | null,
  })

  return {
    novos: (novosResult.data || []).map((p: Record<string, unknown>) => mapProcesso(p, 'created_at')),
    encerrados: (encerradosResult.data || []).map((p: Record<string, unknown>) => mapProcesso(p, 'updated_at')),
  }
}

async function fetchClientesDetail(
  supabase: ReturnType<typeof createClient>,
  escritorioId: string
): Promise<ClientesDetailData> {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const { data } = await supabase
    .from('crm_pessoas')
    .select('id, nome_completo, tipo_pessoa, email, telefone, created_at')
    .eq('escritorio_id', escritorioId)
    .eq('tipo_cadastro', 'cliente')
    .gte('created_at', inicioMes.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    novos: (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      nome_completo: c.nome_completo as string | null,
      tipo_pessoa: c.tipo_pessoa as string | null,
      email: c.email as string | null,
      telefone: c.telefone as string | null,
      created_at: c.created_at as string,
    })),
  }
}

async function fetchConsultivosDetail(
  supabase: ReturnType<typeof createClient>,
  escritorioId: string
): Promise<ConsultivosDetailData> {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [novasResult, finalizadasResult] = await Promise.all([
    supabase
      .from('consultivo_consultas')
      .select(`
        id, numero, titulo, area, status, created_at,
        cliente:crm_pessoas!cliente_id(nome_completo),
        responsavel:profiles!responsavel_id(nome_completo)
      `)
      .eq('escritorio_id', escritorioId)
      .gte('created_at', inicioMes.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('consultivo_consultas')
      .select(`
        id, numero, titulo, area, status, updated_at,
        cliente:crm_pessoas!cliente_id(nome_completo),
        responsavel:profiles!responsavel_id(nome_completo)
      `)
      .eq('escritorio_id', escritorioId)
      .eq('status', 'arquivado')
      .gte('updated_at', inicioMes.toISOString())
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const mapConsulta = (c: Record<string, unknown>, dateField: 'created_at' | 'updated_at'): ConsultaItem => ({
    id: c.id as string,
    numero: c.numero as string | null,
    titulo: c.titulo as string | null,
    area: c.area as string | null,
    status: c.status as string,
    data: c[dateField] as string,
    cliente_nome: (c.cliente as Record<string, unknown> | null)?.nome_completo as string | null,
    responsavel_nome: (c.responsavel as Record<string, unknown> | null)?.nome_completo as string | null,
  })

  return {
    novas: (novasResult.data || []).map((c: Record<string, unknown>) => mapConsulta(c, 'created_at')),
    finalizadas: (finalizadasResult.data || []).map((c: Record<string, unknown>) => mapConsulta(c, 'updated_at')),
  }
}

async function fetchHorasDetail(
  supabase: ReturnType<typeof createClient>,
  escritorioId: string
): Promise<HorasDetailData> {
  const hoje = new Date()
  const diaAtual = hoje.getDate()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mesmoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaAtual)

  const [esteMesResult, mesPassadoResult, profilesResult] = await Promise.all([
    // Horas cobráveis este mês por profissional (até hoje)
    supabase
      .from('financeiro_timesheet')
      .select('user_id, horas')
      .eq('escritorio_id', escritorioId)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
      .lte('data_trabalho', hoje.toISOString().split('T')[0]),

    // Horas cobráveis mês passado por profissional (até mesmo dia)
    supabase
      .from('financeiro_timesheet')
      .select('user_id, horas')
      .eq('escritorio_id', escritorioId)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMesAnterior.toISOString().split('T')[0])
      .lte('data_trabalho', mesmoDiaMesPassado.toISOString().split('T')[0]),

    // Nomes dos profissionais
    supabase
      .from('escritorios_usuarios')
      .select('user_id, profiles:user_id(id, nome_completo)')
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true),
  ])

  // Agregar horas por profissional - este mês
  const horasEsteMesPorUser: Record<string, number> = {}
  let totalEsteMes = 0
  ;(esteMesResult.data || []).forEach((entry: { user_id: string | null; horas: number | null }) => {
    if (entry.user_id) {
      const h = Number(entry.horas || 0)
      horasEsteMesPorUser[entry.user_id] = (horasEsteMesPorUser[entry.user_id] || 0) + h
      totalEsteMes += h
    }
  })

  // Agregar horas por profissional - mês passado
  const horasMesPassadoPorUser: Record<string, number> = {}
  let totalMesPassado = 0
  ;(mesPassadoResult.data || []).forEach((entry: { user_id: string | null; horas: number | null }) => {
    if (entry.user_id) {
      const h = Number(entry.horas || 0)
      horasMesPassadoPorUser[entry.user_id] = (horasMesPassadoPorUser[entry.user_id] || 0) + h
      totalMesPassado += h
    }
  })

  // Map de nomes
  const nomesMap: Record<string, string> = {}
  ;(profilesResult.data || []).forEach((eu: Record<string, unknown>) => {
    const userId = eu.user_id as string
    const profile = eu.profiles as Record<string, unknown> | null
    if (userId && profile?.nome_completo) {
      nomesMap[userId] = profile.nome_completo as string
    }
  })

  // Combinar todos os user_ids que tem horas em qualquer mês
  const allUserIds = new Set([
    ...Object.keys(horasEsteMesPorUser),
    ...Object.keys(horasMesPassadoPorUser),
  ])

  const profissionais: ProfissionalHoras[] = Array.from(allUserIds).map(userId => {
    const esteMes = horasEsteMesPorUser[userId] || 0
    const mesPassado = horasMesPassadoPorUser[userId] || 0
    const variacao = esteMes - mesPassado
    const variacaoPercent = mesPassado > 0 ? ((variacao / mesPassado) * 100) : (esteMes > 0 ? 100 : 0)
    return {
      userId,
      nome: nomesMap[userId] || 'Sem nome',
      horasEsteMes: esteMes,
      horasMesPassado: mesPassado,
      variacao,
      variacaoPercent,
    }
  })

  // Ordenar por horas deste mês (desc)
  profissionais.sort((a, b) => b.horasEsteMes - a.horasEsteMes)

  return {
    totalEsteMes,
    totalMesPassado,
    diaAtual,
    profissionais,
  }
}

// ─── Hook ────────────────────────────────────────────────

export function useKpiDetails(kpiType: KpiType | null) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const processosQuery = useQuery({
    queryKey: ['kpi-detail', 'processos', escritorioAtivo],
    queryFn: () => fetchProcessosDetail(supabase, escritorioAtivo!),
    enabled: kpiType === 'processos' && !!escritorioAtivo,
    staleTime: 2 * 60 * 1000,
  })

  const clientesQuery = useQuery({
    queryKey: ['kpi-detail', 'clientes', escritorioAtivo],
    queryFn: () => fetchClientesDetail(supabase, escritorioAtivo!),
    enabled: kpiType === 'clientes' && !!escritorioAtivo,
    staleTime: 2 * 60 * 1000,
  })

  const consultivosQuery = useQuery({
    queryKey: ['kpi-detail', 'consultivo', escritorioAtivo],
    queryFn: () => fetchConsultivosDetail(supabase, escritorioAtivo!),
    enabled: kpiType === 'consultivo' && !!escritorioAtivo,
    staleTime: 2 * 60 * 1000,
  })

  const horasQuery = useQuery({
    queryKey: ['kpi-detail', 'horas', escritorioAtivo],
    queryFn: () => fetchHorasDetail(supabase, escritorioAtivo!),
    enabled: kpiType === 'horas' && !!escritorioAtivo,
    staleTime: 2 * 60 * 1000,
  })

  return {
    processos: processosQuery,
    clientes: clientesQuery,
    consultivos: consultivosQuery,
    horas: horasQuery,
  }
}
