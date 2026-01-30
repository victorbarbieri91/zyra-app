// ============================================
// API ROUTE: Atualizar Processo via Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarMovimentacoes, solicitarAtualizacao } from '@/lib/escavador/client'
import { validarFormatoCNJ, formatarNumeroCNJ } from '@/lib/datajud/validators'

/**
 * POST /api/escavador/atualizar
 *
 * Solicita atualizacao do processo no Escavador e busca as movimentacoes mais recentes.
 * Salva as novas movimentacoes no banco de dados.
 *
 * Body: { numero_cnj: string }
 * Response: { sucesso: boolean, movimentacoes_novas?: number, error?: string }
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

    // Obter escritorio_id do usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (!profile?.escritorio_id) {
      return NextResponse.json(
        { sucesso: false, error: 'Escritorio nao encontrado' },
        { status: 400 }
      )
    }

    // Parsear body
    let body: { numero_cnj?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { numero_cnj } = body

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

    console.log('[Escavador Atualizar] Atualizando processo:', numeroCNJNormalizado)

    // Buscar processo no banco
    const { data: processo } = await supabase
      .from('processos_processos')
      .select('id')
      .eq('numero_cnj', numeroCNJNormalizado)
      .eq('escritorio_id', profile.escritorio_id)
      .single()

    if (!processo) {
      return NextResponse.json(
        { sucesso: false, error: 'Processo nao encontrado no sistema' },
        { status: 404 }
      )
    }

    // 1. Solicitar atualizacao no Escavador (opcional - pode falhar se ja foi solicitado recentemente)
    try {
      await solicitarAtualizacao(numeroCNJNormalizado)
      console.log('[Escavador Atualizar] Atualizacao solicitada')
    } catch (err) {
      console.log('[Escavador Atualizar] Erro ao solicitar atualizacao (ignorando):', err)
      // Continua mesmo se falhar - vamos buscar as movimentacoes existentes
    }

    // 2. Buscar movimentacoes do Escavador
    const resultadoMovs = await buscarMovimentacoes(numeroCNJNormalizado, 1, 50)

    if (!resultadoMovs.sucesso || !resultadoMovs.movimentacoes) {
      return NextResponse.json({
        sucesso: false,
        error: resultadoMovs.erro || 'Erro ao buscar movimentacoes'
      }, { status: 400 })
    }

    console.log('[Escavador Atualizar] Movimentacoes encontradas:', resultadoMovs.movimentacoes.length)

    // 3. Obter movimentacoes existentes no banco para evitar duplicatas
    const { data: movsExistentes } = await supabase
      .from('processos_movimentacoes')
      .select('data_movimento, descricao')
      .eq('processo_id', processo.id)

    const existentesSet = new Set(
      (movsExistentes || []).map(m => `${m.data_movimento}|${m.descricao?.substring(0, 100)}`)
    )

    // 4. Filtrar apenas movimentacoes novas
    const movsParaInserir = resultadoMovs.movimentacoes.filter(mov => {
      const chave = `${mov.data}|${mov.conteudo?.substring(0, 100)}`
      return !existentesSet.has(chave)
    })

    console.log('[Escavador Atualizar] Movimentacoes novas para inserir:', movsParaInserir.length)

    // 5. Inserir novas movimentacoes
    if (movsParaInserir.length > 0) {
      const movimentacoesParaInsert = movsParaInserir.map(mov => ({
        processo_id: processo.id,
        escritorio_id: profile.escritorio_id,
        data_movimento: mov.data,
        tipo_descricao: mov.titulo,
        descricao: mov.conteudo,
        origem: 'escavador',
        lida: false
      }))

      const { error: insertError } = await supabase
        .from('processos_movimentacoes')
        .insert(movimentacoesParaInsert)

      if (insertError) {
        console.error('[Escavador Atualizar] Erro ao inserir movimentacoes:', insertError)
        return NextResponse.json({
          sucesso: false,
          error: 'Erro ao salvar movimentacoes'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      sucesso: true,
      movimentacoes_novas: movsParaInserir.length,
      total_encontradas: resultadoMovs.movimentacoes.length
    })

  } catch (error) {
    console.error('[Escavador Atualizar] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao atualizar processo' },
      { status: 500 }
    )
  }
}
