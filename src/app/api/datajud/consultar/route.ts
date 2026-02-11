// ============================================
// API ROUTE: Consultar Processo no DataJud
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consultarDataJud } from '@/lib/datajud/client'
import { validarNumeroCNJCompleto, extrairTribunalDoNumero, formatarNumeroCNJ, validarFormatoCNJ } from '@/lib/datajud/validators'
import { CACHE_TTL_MINUTOS } from '@/lib/datajud/constants'
import type { ProcessoDataJud } from '@/types/datajud'
import { integrationRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/datajud/consultar
 *
 * Consulta dados de um processo pelo numero CNJ na API publica do DataJud.
 * Utiliza cache local para evitar consultas repetidas.
 *
 * Body: { numero_cnj: string }
 * Response: { sucesso: boolean, dados?: ProcessoDataJud, fonte?: 'api'|'cache', error?: string }
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
    logger.debug('Numero CNJ recebido', { module: 'datajud', action: 'consultar' })

    // Validar input
    if (!numero_cnj || typeof numero_cnj !== 'string') {
      logger.debug('Numero CNJ nao fornecido ou tipo invalido', { module: 'datajud', action: 'consultar' })
      return NextResponse.json(
        { sucesso: false, error: 'Numero CNJ e obrigatorio' },
        { status: 400 }
      )
    }

    // Normalizar numero (trim e tentar formatar se necessario)
    let numeroCNJNormalizado = numero_cnj.trim()

    // Se nao estiver formatado, tenta formatar (usuario pode digitar sem pontuacao)
    if (!validarFormatoCNJ(numeroCNJNormalizado)) {
      const apenasDigitos = numeroCNJNormalizado.replace(/\D/g, '')
      if (apenasDigitos.length === 20) {
        numeroCNJNormalizado = formatarNumeroCNJ(apenasDigitos)
        logger.debug('Numero CNJ auto-formatado', { module: 'datajud', action: 'consultar' })
      }
    }
    logger.debug('Numero CNJ normalizado', { module: 'datajud', action: 'consultar' })

    // Validar formato (digito verificador apenas como aviso, nao bloqueia)
    const validacao = validarNumeroCNJCompleto(numeroCNJNormalizado)
    if (!validacao.valido) {
      // Se for erro de formato, rejeita
      if (validacao.erro?.includes('Formato')) {
        logger.debug('Erro de formato CNJ', { module: 'datajud', action: 'consultar' })
        return NextResponse.json(
          { sucesso: false, error: validacao.erro },
          { status: 400 }
        )
      }
      // Se for erro de digito, apenas avisa mas continua
      logger.debug('Aviso de validacao CNJ (continuando)', { module: 'datajud', action: 'consultar' })
    }

    // Verificar se tribunal e suportado
    const tribunal = extrairTribunalDoNumero(numeroCNJNormalizado)
    if (!tribunal) {
      logger.debug('Tribunal nao identificado', { module: 'datajud', action: 'consultar' })
      return NextResponse.json(
        { sucesso: false, error: 'Tribunal nao identificado ou nao suportado' },
        { status: 400 }
      )
    }
    logger.debug('Tribunal identificado', { module: 'datajud', action: 'consultar' })

    // Verificar cache
    const agora = new Date().toISOString()
    const { data: cacheHit } = await supabase
      .from('datajud_consultas')
      .select('dados_normalizados, consultado_em')
      .eq('numero_cnj', numeroCNJNormalizado)
      .gt('expira_em', agora)
      .single()

    if (cacheHit) {
      logger.debug('Cache hit', { module: 'datajud', action: 'consultar' })
      return NextResponse.json({
        sucesso: true,
        dados: cacheHit.dados_normalizados as ProcessoDataJud,
        fonte: 'cache'
      })
    }

    // Consultar API DataJud
    logger.debug('Consultando API DataJud', { module: 'datajud', action: 'consultar' })
    const resultado = await consultarDataJud(numeroCNJNormalizado)

    if (!resultado.sucesso || !resultado.dados) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro || 'Processo nao encontrado' },
        { status: 404 }
      )
    }

    // Calcular expiracao do cache
    const expiraEm = new Date()
    expiraEm.setMinutes(expiraEm.getMinutes() + CACHE_TTL_MINUTOS)

    // Salvar no cache (upsert para evitar conflitos)
    const { error: cacheError } = await supabase
      .from('datajud_consultas')
      .upsert({
        numero_cnj: numeroCNJNormalizado,
        tribunal: resultado.tribunal?.nome || null,
        dados_normalizados: resultado.dados,
        consultado_em: new Date().toISOString(),
        expira_em: expiraEm.toISOString(),
        user_id: user.id
      }, {
        onConflict: 'numero_cnj'
      })

    if (cacheError) {
      // Log mas nao falha a requisicao por erro de cache
      logger.error('Erro ao salvar cache', { module: 'datajud', action: 'consultar' }, cacheError instanceof Error ? cacheError : undefined)
    }

    return NextResponse.json({
      sucesso: true,
      dados: resultado.dados,
      fonte: 'api'
    })

  } catch (error) {
    logger.error('Erro interno', { module: 'datajud', action: 'consultar' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao consultar DataJud' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/datajud/consultar
 *
 * Retorna informacoes sobre o endpoint (health check)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/datajud/consultar',
    metodo: 'POST',
    descricao: 'Consulta dados de um processo judicial pelo numero CNJ na API publica do DataJud (CNJ)',
    body: {
      numero_cnj: 'string - Numero do processo no formato NNNNNNN-DD.AAAA.J.TR.OOOO'
    },
    resposta: {
      sucesso: 'boolean',
      dados: 'ProcessoDataJud | undefined',
      fonte: "'api' | 'cache' | undefined",
      error: 'string | undefined'
    },
    cache_ttl: `${CACHE_TTL_MINUTOS} minutos`
  })
}
