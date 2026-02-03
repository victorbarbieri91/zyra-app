// ============================================
// API ROUTE: Busca Global do Sistema
// Busca simplificada: Processos e Consultivo
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ResultadoBusca, RespostaBuscaGlobal } from '@/types/search'

const MAX_RESULTADOS_POR_TIPO = 10
const MAX_RESULTADOS_TOTAL = 20

/**
 * GET /api/search?q=termo
 *
 * Busca global em: Processos e Consultivo
 * - Processos: nome do cliente, nº da pasta, nº CNJ
 * - Consultivo: nome do cliente, nº da pasta
 */
export async function GET(request: NextRequest) {
  const inicio = Date.now()

  try {
    // Autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Não autorizado', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 401 }
      )
    }

    // Obter escritorio_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (!profile?.escritorio_id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Escritório não encontrado', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 400 }
      )
    }

    const escritorioId = profile.escritorio_id

    // Parâmetros da busca
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { sucesso: false, erro: 'Termo de busca deve ter pelo menos 2 caracteres', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 400 }
      )
    }

    const resultados: ResultadoBusca[] = []
    const termoBusca = `%${query}%`

    // Executar todas as buscas em paralelo
    const [
      processosResult,
      processosPorClienteResult,
      consultivosResult,
      consultivosPorClienteResult
    ] = await Promise.all([
      // ========================================
      // BUSCA EM PROCESSOS (por nº CNJ e nº pasta)
      // ========================================
      supabase
        .from('processos_processos')
        .select(`
          id,
          numero_cnj,
          numero_pasta,
          parte_contraria,
          area,
          tribunal,
          status,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`numero_cnj.ilike.${termoBusca},numero_pasta.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO),

      // BUSCA EM PROCESSOS (por nome do cliente)
      supabase
        .from('processos_processos')
        .select(`
          id,
          numero_cnj,
          numero_pasta,
          parte_contraria,
          area,
          tribunal,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO),

      // ========================================
      // BUSCA EM CONSULTIVO (por nº da pasta)
      // ========================================
      supabase
        .from('consultivo_consultas')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          status,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('numero', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO),

      // BUSCA EM CONSULTIVO (por nome do cliente)
      supabase
        .from('consultivo_consultas')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO)
    ])

    // Processar resultados de PROCESSOS
    const processosIds = new Set<string>()

    if (processosResult.data) {
      processosResult.data.forEach((p: any) => {
        processosIds.add(p.id)
        resultados.push({
          id: p.id,
          tipo: 'processo',
          titulo: p.numero_pasta || p.numero_cnj || 'Processo sem número',
          subtitulo: p.cliente?.nome_completo || p.parte_contraria || 'Sem cliente',
          navegacao: `/dashboard/processos/${p.id}`,
          destaque: p.numero_cnj || undefined,
          icone: 'Scale',
          modulo: 'Processos',
          status: p.status,
          numero_cnj: p.numero_cnj,
          numero_pasta: p.numero_pasta,
          area: p.area,
          tribunal: p.tribunal,
          cliente_nome: p.cliente?.nome_completo,
          parte_contraria: p.parte_contraria
        })
      })
    }

    if (processosPorClienteResult.data) {
      processosPorClienteResult.data.forEach((p: any) => {
        if (!processosIds.has(p.id)) {
          processosIds.add(p.id)
          resultados.push({
            id: p.id,
            tipo: 'processo',
            titulo: p.numero_pasta || p.numero_cnj || 'Processo sem número',
            subtitulo: p.cliente?.nome_completo || p.parte_contraria || 'Sem cliente',
            navegacao: `/dashboard/processos/${p.id}`,
            destaque: p.numero_cnj || undefined,
            icone: 'Scale',
            modulo: 'Processos',
            status: p.status,
            numero_cnj: p.numero_cnj,
            numero_pasta: p.numero_pasta,
            area: p.area,
            tribunal: p.tribunal,
            cliente_nome: p.cliente?.nome_completo,
            parte_contraria: p.parte_contraria
          })
        }
      })
    }

    // Processar resultados de CONSULTIVO
    const consultivosIds = new Set<string>()

    if (consultivosResult.data) {
      consultivosResult.data.forEach((c: any) => {
        consultivosIds.add(c.id)
        resultados.push({
          id: c.id,
          tipo: 'consultivo',
          titulo: c.numero || c.titulo || 'Consulta sem número',
          subtitulo: c.cliente?.nome_completo || c.descricao?.substring(0, 100),
          navegacao: `/dashboard/consultivo/${c.id}`,
          destaque: c.titulo || undefined,
          icone: 'BookOpen',
          modulo: 'Consultivo',
          status: c.status,
          numero: c.numero,
          cliente_nome: c.cliente?.nome_completo
        })
      })
    }

    if (consultivosPorClienteResult.data) {
      consultivosPorClienteResult.data.forEach((c: any) => {
        if (!consultivosIds.has(c.id)) {
          consultivosIds.add(c.id)
          resultados.push({
            id: c.id,
            tipo: 'consultivo',
            titulo: c.numero || c.titulo || 'Consulta sem número',
            subtitulo: c.cliente?.nome_completo || c.descricao?.substring(0, 100),
            navegacao: `/dashboard/consultivo/${c.id}`,
            destaque: c.titulo || undefined,
            icone: 'BookOpen',
            modulo: 'Consultivo',
            status: c.status,
            numero: c.numero,
            cliente_nome: c.cliente?.nome_completo
          })
        }
      })
    }

    // Limitar resultados totais e calcular tempo
    const resultadosFinais = resultados.slice(0, MAX_RESULTADOS_TOTAL)
    const tempoBusca = Date.now() - inicio

    const resposta: RespostaBuscaGlobal = {
      sucesso: true,
      resultados: resultadosFinais,
      total: resultados.length,
      tempo_busca_ms: tempoBusca
    }

    return NextResponse.json(resposta)

  } catch (error) {
    console.error('[Search API] Erro interno:', error)
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Erro interno ao realizar busca',
        resultados: [],
        total: 0,
        tempo_busca_ms: Date.now() - inicio
      },
      { status: 500 }
    )
  }
}
