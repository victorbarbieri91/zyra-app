// ============================================
// API ROUTE: Gerenciar Monitoramento Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  criarMonitoramento,
  removerMonitoramento,
  listarMonitoramentos,
  verificarStatusMonitoramento
} from '@/lib/escavador/client'
import { validarFormatoCNJ, formatarNumeroCNJ } from '@/lib/datajud/validators'

/**
 * POST /api/escavador/monitoramento
 *
 * Cria monitoramento para um processo no Escavador.
 *
 * Body: { numero_cnj: string, processo_id?: string, tribunal?: string }
 * Response: { sucesso: boolean, monitoramento_id?: number, error?: string }
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

    // Parsear body
    let body: { numero_cnj?: string; processo_id?: string; tribunal?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { numero_cnj, processo_id, tribunal } = body

    // Validar numero CNJ
    if (!numero_cnj || typeof numero_cnj !== 'string') {
      return NextResponse.json(
        { sucesso: false, error: 'Numero CNJ e obrigatorio' },
        { status: 400 }
      )
    }

    // Normalizar numero CNJ
    let numeroCNJNormalizado = numero_cnj.trim()
    if (!validarFormatoCNJ(numeroCNJNormalizado)) {
      const apenasDigitos = numeroCNJNormalizado.replace(/\D/g, '')
      if (apenasDigitos.length === 20) {
        numeroCNJNormalizado = formatarNumeroCNJ(apenasDigitos)
      }
    }

    console.log('[Escavador Monitoramento] Criando para:', numeroCNJNormalizado)

    // Criar monitoramento no Escavador
    const resultado = await criarMonitoramento({
      numero_cnj: numeroCNJNormalizado,
      tribunal: tribunal
    })

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro || 'Erro ao criar monitoramento' },
        { status: 400 }
      )
    }

    // Se temos processo_id, atualizar a tabela de monitoramento local
    if (processo_id) {
      const { error: updateError } = await supabase
        .from('processos_monitoramento')
        .update({
          escavador_monitoramento_id: resultado.monitoramento_id?.toString(),
          escavador_status: resultado.status || 'PENDENTE'
        })
        .eq('processo_id', processo_id)

      if (updateError) {
        console.error('[Escavador Monitoramento] Erro ao atualizar processo:', updateError)
        // Nao falha a requisicao, apenas loga
      }
    }

    return NextResponse.json({
      sucesso: true,
      monitoramento_id: resultado.monitoramento_id,
      status: resultado.status
    })

  } catch (error) {
    console.error('[Escavador Monitoramento] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao criar monitoramento' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/escavador/monitoramento
 *
 * Remove monitoramento de um processo no Escavador.
 *
 * Body: { monitoramento_id: number, processo_id?: string }
 * Response: { sucesso: boolean, error?: string }
 */
export async function DELETE(request: NextRequest) {
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

    // Parsear body
    let body: { monitoramento_id?: number; processo_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { monitoramento_id, processo_id } = body

    if (!monitoramento_id || typeof monitoramento_id !== 'number') {
      return NextResponse.json(
        { sucesso: false, error: 'monitoramento_id e obrigatorio' },
        { status: 400 }
      )
    }

    console.log('[Escavador Monitoramento] Removendo:', monitoramento_id)

    // Remover monitoramento no Escavador
    const resultado = await removerMonitoramento(monitoramento_id)

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro || 'Erro ao remover monitoramento' },
        { status: 400 }
      )
    }

    // Se temos processo_id, atualizar a tabela de monitoramento local
    if (processo_id) {
      const { error: updateError } = await supabase
        .from('processos_monitoramento')
        .update({
          escavador_monitoramento_id: null,
          escavador_status: 'inativo'
        })
        .eq('processo_id', processo_id)

      if (updateError) {
        console.error('[Escavador Monitoramento] Erro ao atualizar processo:', updateError)
      }
    }

    return NextResponse.json({ sucesso: true })

  } catch (error) {
    console.error('[Escavador Monitoramento] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao remover monitoramento' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/escavador/monitoramento
 *
 * Lista monitoramentos ou verifica status de um especifico.
 *
 * Query: ?monitoramento_id=number (opcional)
 * Response: { sucesso: boolean, monitoramentos?: [], monitoramento?: {}, error?: string }
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const monitoramentoIdParam = searchParams.get('monitoramento_id')

    // Se temos ID especifico, retorna detalhes daquele monitoramento
    if (monitoramentoIdParam) {
      const monitoramentoId = parseInt(monitoramentoIdParam, 10)
      if (isNaN(monitoramentoId)) {
        return NextResponse.json(
          { sucesso: false, error: 'monitoramento_id invalido' },
          { status: 400 }
        )
      }

      const resultado = await verificarStatusMonitoramento(monitoramentoId)

      if (!resultado.sucesso) {
        return NextResponse.json(
          { sucesso: false, error: resultado.erro || 'Monitoramento nao encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        sucesso: true,
        monitoramento: resultado.monitoramento
      })
    }

    // Senao, lista todos os monitoramentos
    const pagina = parseInt(searchParams.get('page') || '1', 10)
    const limite = parseInt(searchParams.get('limit') || '50', 10)

    const resultado = await listarMonitoramentos(pagina, limite)

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro || 'Erro ao listar monitoramentos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      monitoramentos: resultado.monitoramentos,
      total: resultado.total,
      pagina,
      limite
    })

  } catch (error) {
    console.error('[Escavador Monitoramento] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao listar monitoramentos' },
      { status: 500 }
    )
  }
}
