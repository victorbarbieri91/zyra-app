// ============================================
// API ROUTE: Gerenciar Monitoramento de Processos via Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { criarMonitoramento, removerMonitoramento } from '@/lib/escavador/client'
import type { FrequenciaMonitoramento } from '@/lib/escavador/types'
import { integrationRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/processos/monitoramento
 *
 * Ativa monitoramento para um ou mais processos via Escavador.
 *
 * Body: { processo_ids: string[] }
 * Response: { sucesso: boolean, resultados: array, erro?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticacao
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nao autorizado' },
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
    const { processo_ids, frequencia } = body as {
      processo_ids?: string[]
      frequencia?: FrequenciaMonitoramento
    }

    if (!processo_ids || !Array.isArray(processo_ids) || processo_ids.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'processo_ids e obrigatorio' },
        { status: 400 }
      )
    }

    // Limitar quantidade por requisicao
    if (processo_ids.length > 50) {
      return NextResponse.json(
        { sucesso: false, erro: 'Maximo de 50 processos por requisicao' },
        { status: 400 }
      )
    }

    // Buscar dados dos processos
    const { data: processos, error: queryError } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, numero_pasta, escavador_monitoramento_id')
      .in('id', processo_ids)

    if (queryError) {
      logger.error('Erro ao buscar processos', { module: 'processos', action: 'monitoramento', error: queryError.message })
      return NextResponse.json(
        { sucesso: false, erro: 'Erro ao buscar processos' },
        { status: 500 }
      )
    }

    if (!processos || processos.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum processo encontrado' },
        { status: 404 }
      )
    }

    const resultados: Array<{
      processo_id: string
      numero_pasta: string
      status: 'sucesso' | 'erro' | 'sem_cnj' | 'ja_monitorado'
      monitoramento_id?: number
      erro?: string
    }> = []

    let sucessos = 0
    let erros = 0

    // Processar cada processo
    for (const processo of processos) {
      // Verificar se tem CNJ
      if (!processo.numero_cnj) {
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'sem_cnj',
          erro: 'Processo sem numero CNJ'
        })
        continue
      }

      // Verificar se ja esta monitorado
      if (processo.escavador_monitoramento_id) {
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'ja_monitorado',
          monitoramento_id: processo.escavador_monitoramento_id
        })
        continue
      }

      try {
        logger.debug('Criando monitoramento para processo', { module: 'processos', action: 'monitoramento', frequencia: frequencia || 'SEMANAL' })

        // Criar monitoramento no Escavador
        const resultado = await criarMonitoramento({
          numero_cnj: processo.numero_cnj,
          frequencia: frequencia || 'SEMANAL'
        })

        if (!resultado.sucesso || !resultado.monitoramento_id) {
          logger.debug('Falha ao criar monitoramento', { module: 'processos', action: 'monitoramento' })
          resultados.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta || '',
            status: 'erro',
            erro: resultado.erro || 'Erro ao criar monitoramento'
          })
          erros++
          continue
        }

        // Atualizar processo com o ID do monitoramento
        const { error: updateError } = await supabase
          .from('processos_processos')
          .update({ escavador_monitoramento_id: resultado.monitoramento_id })
          .eq('id', processo.id)

        if (updateError) {
          logger.error('Erro ao atualizar processo com monitoramento', { module: 'processos', action: 'monitoramento', error: updateError.message })
          // Mesmo com erro no banco, o monitoramento foi criado no Escavador
          resultados.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta || '',
            status: 'erro',
            monitoramento_id: resultado.monitoramento_id,
            erro: 'Monitoramento criado mas erro ao salvar no banco'
          })
          erros++
          continue
        }

        logger.debug('Monitoramento criado com sucesso', { module: 'processos', action: 'monitoramento' })
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'sucesso',
          monitoramento_id: resultado.monitoramento_id
        })
        sucessos++

        // Delay para nao sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        logger.error('Erro ao criar monitoramento para processo', { module: 'processos', action: 'monitoramento' }, error instanceof Error ? error : undefined)
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        erros++
      }
    }

    return NextResponse.json({
      sucesso: true,
      total: processos.length,
      sucessos,
      erros,
      resultados
    })

  } catch (error) {
    logger.error('Erro interno no POST monitoramento', { module: 'processos', action: 'monitoramento' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/processos/monitoramento
 *
 * Desativa monitoramento de um ou mais processos.
 *
 * Body: { processo_ids: string[] }
 * Response: { sucesso: boolean, resultados: array, erro?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Autenticacao
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResultDelete = integrationRateLimit.check(request, user.id)
    if (!rateLimitResultDelete.success) {
      return integrationRateLimit.errorResponse(rateLimitResultDelete)
    }

    // Parsear body
    const body = await request.json().catch(() => ({}))
    const { processo_ids } = body as { processo_ids?: string[] }

    if (!processo_ids || !Array.isArray(processo_ids) || processo_ids.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'processo_ids e obrigatorio' },
        { status: 400 }
      )
    }

    // Buscar dados dos processos
    const { data: processos, error: queryError } = await supabase
      .from('processos_processos')
      .select('id, numero_pasta, escavador_monitoramento_id')
      .in('id', processo_ids)
      .not('escavador_monitoramento_id', 'is', null)

    if (queryError) {
      logger.error('Erro ao buscar processos para remocao', { module: 'processos', action: 'monitoramento', error: queryError.message })
      return NextResponse.json(
        { sucesso: false, erro: 'Erro ao buscar processos' },
        { status: 500 }
      )
    }

    if (!processos || processos.length === 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Nenhum processo com monitoramento ativo encontrado',
        total: 0,
        sucessos: 0,
        erros: 0,
        resultados: []
      })
    }

    const resultados: Array<{
      processo_id: string
      numero_pasta: string
      status: 'sucesso' | 'erro'
      erro?: string
    }> = []

    let sucessos = 0
    let erros = 0

    // Processar cada processo
    for (const processo of processos) {
      try {
        logger.debug('Removendo monitoramento de processo', { module: 'processos', action: 'monitoramento' })

        // Remover monitoramento no Escavador
        const resultado = await removerMonitoramento(processo.escavador_monitoramento_id!)

        if (!resultado.sucesso) {
          logger.debug('Falha ao remover monitoramento no Escavador', { module: 'processos', action: 'monitoramento' })
          // Mesmo com erro no Escavador, vamos limpar o campo no banco
        }

        // Limpar campo no banco
        const { error: updateError } = await supabase
          .from('processos_processos')
          .update({ escavador_monitoramento_id: null })
          .eq('id', processo.id)

        if (updateError) {
          logger.error('Erro ao limpar monitoramento no banco', { module: 'processos', action: 'monitoramento', error: updateError.message })
          resultados.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta || '',
            status: 'erro',
            erro: 'Erro ao atualizar banco'
          })
          erros++
          continue
        }

        logger.debug('Monitoramento removido com sucesso', { module: 'processos', action: 'monitoramento' })
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'sucesso'
        })
        sucessos++

        // Delay para nao sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        logger.error('Erro ao remover monitoramento de processo', { module: 'processos', action: 'monitoramento' }, error instanceof Error ? error : undefined)
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        erros++
      }
    }

    return NextResponse.json({
      sucesso: true,
      total: processos.length,
      sucessos,
      erros,
      resultados
    })

  } catch (error) {
    logger.error('Erro interno no DELETE monitoramento', { module: 'processos', action: 'monitoramento' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processos/monitoramento
 *
 * Retorna estatisticas de monitoramento.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Contar processos monitorados
    const { count: totalMonitorados } = await supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .not('escavador_monitoramento_id', 'is', null)

    // Contar total de processos com CNJ
    const { count: totalComCnj } = await supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .not('numero_cnj', 'is', null)

    return NextResponse.json({
      sucesso: true,
      estatisticas: {
        total_monitorados: totalMonitorados || 0,
        total_com_cnj: totalComCnj || 0,
        percentual_monitorado: totalComCnj ? Math.round(((totalMonitorados || 0) / totalComCnj) * 100) : 0
      }
    })

  } catch (error) {
    logger.error('Erro no GET monitoramento', { module: 'processos', action: 'monitoramento' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno' },
      { status: 500 }
    )
  }
}
