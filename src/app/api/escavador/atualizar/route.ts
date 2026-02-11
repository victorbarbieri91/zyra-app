// ============================================
// API ROUTE: Atualizar Processo via Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarMovimentacoes, solicitarAtualizacao } from '@/lib/escavador/client'
import { validarFormatoCNJ, formatarNumeroCNJ } from '@/lib/datajud/validators'
import { integrationRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

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

    // Rate limiting
    const rateLimitResult = integrationRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return integrationRateLimit.errorResponse(rateLimitResult)
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

    logger.debug('Atualizando processo', { module: 'escavador', action: 'atualizar' })

    // Verificar se o token do Escavador esta configurado
    if (!process.env.ESCAVADOR_API_TOKEN) {
      logger.error('ESCAVADOR_API_TOKEN nao configurado', { module: 'escavador', action: 'atualizar' })
      return NextResponse.json({
        sucesso: false,
        error: 'Integracao com Escavador nao configurada'
      }, { status: 503 })
    }

    // Buscar processo no banco
    const { data: processo } = await supabase
      .from('processos_processos')
      .select('id')
      .eq('numero_cnj', numeroCNJNormalizado)
      .eq('escritorio_id', profile.escritorio_id)
      .single()

    if (!processo) {
      logger.debug('Processo nao encontrado no sistema', { module: 'escavador', action: 'atualizar' })
      return NextResponse.json(
        { sucesso: false, error: 'Processo nao encontrado no sistema' },
        { status: 404 }
      )
    }

    // 1. Solicitar atualizacao no Escavador (opcional - pode falhar se ja foi solicitado recentemente)
    try {
      const resultadoAtualizacao = await solicitarAtualizacao(numeroCNJNormalizado)
      if (resultadoAtualizacao.sucesso) {
        logger.debug('Atualizacao solicitada com sucesso', { module: 'escavador', action: 'atualizar' })
      } else {
        logger.debug('Nao foi possivel solicitar atualizacao', { module: 'escavador', action: 'atualizar' })
      }
    } catch (err) {
      logger.debug('Erro ao solicitar atualizacao (ignorando)', { module: 'escavador', action: 'atualizar' })
      // Continua mesmo se falhar - vamos buscar as movimentacoes existentes
    }

    // 2. Buscar movimentacoes do Escavador
    const resultadoMovs = await buscarMovimentacoes(numeroCNJNormalizado, 1, 50)

    if (!resultadoMovs.sucesso) {
      logger.error('Erro ao buscar movimentacoes', { module: 'escavador', action: 'atualizar' })
      return NextResponse.json({
        sucesso: false,
        error: resultadoMovs.erro || 'Erro ao buscar movimentacoes no Escavador'
      }, { status: 400 })
    }

    // Se nao encontrou movimentacoes, retorna sucesso mas avisa
    if (!resultadoMovs.movimentacoes || resultadoMovs.movimentacoes.length === 0) {
      logger.debug('Nenhuma movimentacao encontrada no Escavador', { module: 'escavador', action: 'atualizar' })
      return NextResponse.json({
        sucesso: true,
        movimentacoes_novas: 0,
        total_encontradas: 0,
        mensagem: 'Nenhuma movimentacao encontrada no Escavador para este processo'
      })
    }

    logger.debug(`${resultadoMovs.movimentacoes.length} movimentacoes encontradas`, { module: 'escavador', action: 'atualizar' })

    // 3. Obter movimentacoes existentes no banco para evitar duplicatas
    const { data: movsExistentes } = await supabase
      .from('processos_movimentacoes')
      .select('data_movimento, descricao')
      .eq('processo_id', processo.id)

    // Funcao para normalizar data para YYYY-MM-DD (ignorando hora)
    const normalizarData = (data: string | null | undefined): string => {
      if (!data) return ''
      // Se for timestamp ISO, pega só a parte da data
      return data.substring(0, 10)
    }

    // Funcao para normalizar texto (trim, lowercase, primeiros 100 chars)
    const normalizarTexto = (texto: string | null | undefined): string => {
      if (!texto) return ''
      return texto.trim().toLowerCase().substring(0, 100)
    }

    const existentesSet = new Set(
      (movsExistentes || []).map(m =>
        `${normalizarData(m.data_movimento)}|${normalizarTexto(m.descricao)}`
      )
    )

    logger.debug(`${movsExistentes?.length || 0} movimentacoes existentes no banco`, { module: 'escavador', action: 'atualizar' })

    // 4. Filtrar apenas movimentacoes novas (verificando banco E duplicatas no mesmo lote)
    const movsParaInserir: typeof resultadoMovs.movimentacoes = []
    const chavesNoLote = new Set<string>()

    for (const mov of resultadoMovs.movimentacoes) {
      const chave = `${normalizarData(mov.data)}|${normalizarTexto(mov.conteudo)}`

      // Verificar se já existe no banco
      if (existentesSet.has(chave)) {
        logger.debug('Duplicata ignorada (banco)', { module: 'escavador', action: 'atualizar' })
        continue
      }

      // Verificar se já existe no lote atual (evita duplicatas intra-lote)
      if (chavesNoLote.has(chave)) {
        logger.debug('Duplicata ignorada (lote)', { module: 'escavador', action: 'atualizar' })
        continue
      }

      // Adicionar ao conjunto de chaves do lote e à lista de inserção
      chavesNoLote.add(chave)
      movsParaInserir.push(mov)
    }

    logger.debug(`${movsParaInserir.length} movimentacoes novas para inserir`, { module: 'escavador', action: 'atualizar' })

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
        logger.error('Erro ao inserir movimentacoes', { module: 'escavador', action: 'atualizar' }, insertError instanceof Error ? insertError : undefined)
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
    logger.error('Erro interno', { module: 'escavador', action: 'atualizar' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao atualizar processo' },
      { status: 500 }
    )
  }
}
