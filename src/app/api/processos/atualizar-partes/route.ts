// ============================================
// API ROUTE: Atualizar Partes dos Processos via Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarProcessoPorCNJ } from '@/lib/escavador/client'
import { integrationRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/processos/atualizar-partes
 *
 * Busca processos sem parte_contraria e atualiza usando dados do Escavador.
 *
 * Body: { limite?: number, processo_ids?: string[] }
 * Response: { sucesso: boolean, atualizados: number, erros: number, detalhes: array }
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticacao
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = integrationRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return integrationRateLimit.errorResponse(rateLimitResult)
    }

    // Parsear body
    const body = await request.json().catch(() => ({}))
    const { limite = 20, processo_ids } = body as { limite?: number, processo_ids?: string[] }

    // Buscar processos sem parte_contraria
    let query = supabase
      .from('processos_processos')
      .select(`
        id,
        numero_cnj,
        numero_pasta,
        polo_cliente,
        parte_contraria,
        cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo)
      `)
      .or('parte_contraria.is.null,parte_contraria.eq.')

    if (processo_ids && processo_ids.length > 0) {
      query = query.in('id', processo_ids)
    }

    const { data: processos, error: queryError } = await query
      .not('numero_cnj', 'is', null)
      .limit(limite)

    if (queryError) {
      logger.error('Erro na query de processos', { module: 'processos', action: 'atualizar-partes', error: queryError.message })
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao buscar processos' },
        { status: 500 }
      )
    }

    if (!processos || processos.length === 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Nenhum processo encontrado para atualizar',
        atualizados: 0,
        erros: 0,
        detalhes: []
      })
    }

    logger.debug(`Processando ${processos.length} processos`, { module: 'processos', action: 'atualizar-partes' })

    const resultados: Array<{
      numero_pasta: string
      numero_cnj: string
      status: 'atualizado' | 'erro' | 'sem_dados'
      parte_contraria_nova?: string
      erro?: string
    }> = []

    let atualizados = 0
    let erros = 0

    // Processar cada processo
    for (const processo of processos) {
      try {
        logger.debug('Buscando processo no Escavador', { module: 'processos', action: 'atualizar-partes' })

        // Buscar no Escavador
        const resultado = await buscarProcessoPorCNJ(processo.numero_cnj!)

        if (!resultado.sucesso || !resultado.dados) {
          logger.debug('Processo nao encontrado no Escavador', { module: 'processos', action: 'atualizar-partes' })
          resultados.push({
            numero_pasta: processo.numero_pasta || '',
            numero_cnj: processo.numero_cnj || '',
            status: 'sem_dados',
            erro: resultado.erro || 'Processo nao encontrado no Escavador'
          })
          continue
        }

        const dados = resultado.dados
        const clienteNome = (processo.cliente as { nome_completo: string }[] | null)?.[0]?.nome_completo?.toLowerCase() || ''

        // Determinar parte contraria
        let parteContraria: string | null = null

        // Lógica: Se cliente está no polo ativo, parte contrária é o polo passivo
        // Se cliente está no polo passivo, parte contrária é o polo ativo
        if (processo.polo_cliente === 'ativo') {
          // Cliente é autor, parte contrária é réu (polo passivo)
          parteContraria = dados.titulo_polo_passivo
        } else if (processo.polo_cliente === 'passivo') {
          // Cliente é réu, parte contrária é autor (polo ativo)
          parteContraria = dados.titulo_polo_ativo
        } else {
          // Terceiro - tenta identificar pela lista de partes
          const partesNaoCliente = dados.partes?.filter(
            p => p.nome.toLowerCase() !== clienteNome && p.polo !== 'outro'
          )
          if (partesNaoCliente && partesNaoCliente.length > 0) {
            parteContraria = partesNaoCliente[0].nome
          }
        }

        // Se não conseguiu identificar pelos títulos, tenta pelo array de partes
        if (!parteContraria && dados.partes && dados.partes.length > 0) {
          // Encontrar parte que não é o cliente
          const partesDiferentes = dados.partes.filter(
            p => p.nome.toLowerCase() !== clienteNome
          )
          if (partesDiferentes.length > 0) {
            // Prioriza polo oposto ao do cliente
            const poloOposto = processo.polo_cliente === 'ativo' ? 'passivo' : 'ativo'
            const parteOposita = partesDiferentes.find(p => p.polo === poloOposto)
            parteContraria = parteOposita?.nome || partesDiferentes[0].nome
          }
        }

        if (!parteContraria) {
          logger.debug('Nao foi possivel determinar parte contraria', { module: 'processos', action: 'atualizar-partes' })
          resultados.push({
            numero_pasta: processo.numero_pasta || '',
            numero_cnj: processo.numero_cnj || '',
            status: 'sem_dados',
            erro: 'Nao foi possivel determinar a parte contraria'
          })
          continue
        }

        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('processos_processos')
          .update({ parte_contraria: parteContraria })
          .eq('id', processo.id)

        if (updateError) {
          logger.error('Erro ao atualizar parte contraria no banco', { module: 'processos', action: 'atualizar-partes', error: updateError.message })
          resultados.push({
            numero_pasta: processo.numero_pasta || '',
            numero_cnj: processo.numero_cnj || '',
            status: 'erro',
            erro: updateError.message
          })
          erros++
        } else {
          logger.debug('Parte contraria atualizada com sucesso', { module: 'processos', action: 'atualizar-partes' })
          resultados.push({
            numero_pasta: processo.numero_pasta || '',
            numero_cnj: processo.numero_cnj || '',
            status: 'atualizado',
            parte_contraria_nova: parteContraria
          })
          atualizados++
        }

        // Delay para não sobrecarregar a API do Escavador
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        logger.error('Erro ao processar atualizacao de partes', { module: 'processos', action: 'atualizar-partes' }, error instanceof Error ? error : undefined)
        resultados.push({
          numero_pasta: processo.numero_pasta || '',
          numero_cnj: processo.numero_cnj || '',
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        erros++
      }
    }

    return NextResponse.json({
      sucesso: true,
      total_processados: processos.length,
      atualizados,
      erros,
      sem_dados: processos.length - atualizados - erros,
      detalhes: resultados
    })

  } catch (error) {
    logger.error('Erro interno na atualizacao de partes', { module: 'processos', action: 'atualizar-partes' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processos/atualizar-partes
 *
 * Retorna lista de processos que precisam de atualização
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Buscar processos sem parte_contraria que têm CNJ
    const { data: processos, error } = await supabase
      .from('processos_processos')
      .select(`
        id,
        numero_cnj,
        numero_pasta,
        polo_cliente,
        cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo)
      `)
      .or('parte_contraria.is.null,parte_contraria.eq.')
      .not('numero_cnj', 'is', null)
      .order('numero_pasta', { ascending: false })

    if (error) {
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao buscar processos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      total: processos?.length || 0,
      processos: processos?.map(p => ({
        id: p.id,
        numero_pasta: p.numero_pasta,
        numero_cnj: p.numero_cnj,
        cliente: (p.cliente as { nome_completo: string }[] | null)?.[0]?.nome_completo,
        polo_cliente: p.polo_cliente
      }))
    })

  } catch (error) {
    logger.error('Erro no GET atualizar-partes', { module: 'processos', action: 'atualizar-partes' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
