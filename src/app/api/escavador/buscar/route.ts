// ============================================
// API ROUTE: Buscar Processo no Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarProcessoPorCNJ } from '@/lib/escavador/client'
import { validarNumeroCNJCompleto, formatarNumeroCNJ, validarFormatoCNJ } from '@/lib/datajud/validators'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'
import { integrationRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Cache TTL em minutos
const CACHE_TTL_MINUTOS = 30

/**
 * POST /api/escavador/buscar
 *
 * Busca dados de um processo pelo numero CNJ na API do Escavador.
 * Utiliza cache local para reduzir custos.
 *
 * Body: { numero_cnj: string }
 * Response: { sucesso: boolean, dados?: ProcessoEscavadorNormalizado, fonte?: 'api'|'cache', error?: string }
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
    logger.debug('Numero CNJ recebido', { module: 'escavador', action: 'buscar' })

    // Validar input
    if (!numero_cnj || typeof numero_cnj !== 'string') {
      logger.debug('Numero CNJ nao fornecido ou tipo invalido', { module: 'escavador', action: 'buscar' })
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
        logger.debug('Numero CNJ auto-formatado', { module: 'escavador', action: 'buscar' })
      }
    }
    logger.debug('Numero CNJ normalizado', { module: 'escavador', action: 'buscar' })

    // Validar formato (digito verificador apenas como aviso, nao bloqueia)
    const validacao = validarNumeroCNJCompleto(numeroCNJNormalizado)
    if (!validacao.valido) {
      // Se for erro de formato, rejeita
      if (validacao.erro?.includes('Formato')) {
        logger.debug('Erro de formato CNJ', { module: 'escavador', action: 'buscar' })
        return NextResponse.json(
          { sucesso: false, error: validacao.erro },
          { status: 400 }
        )
      }
      // Se for erro de digito, apenas avisa mas continua
      logger.debug('Aviso de validacao CNJ (continuando)', { module: 'escavador', action: 'buscar' })
    }

    // Verificar cache
    const agora = new Date().toISOString()
    const { data: cacheHit } = await supabase
      .from('escavador_cache')
      .select('dados_capa, dados_partes, dados_movimentacoes, consultado_em')
      .eq('numero_cnj', numeroCNJNormalizado)
      .gt('expira_em', agora)
      .single()

    if (cacheHit) {
      logger.debug('Cache hit', { module: 'escavador', action: 'buscar' })

      // Verifica se o cache tem a estrutura nova (com titulo_polo_ativo)
      const dadosCapa = cacheHit.dados_capa as ProcessoEscavadorNormalizado
      if (!dadosCapa.titulo_polo_ativo && !dadosCapa.titulo_polo_passivo) {
        logger.debug('Cache com estrutura antiga, ignorando', { module: 'escavador', action: 'buscar' })
        // Continua para buscar na API
      } else {
        // Monta dados do cache
        const dadosCache: ProcessoEscavadorNormalizado = {
          ...dadosCapa,
          partes: (cacheHit.dados_partes || []) as ProcessoEscavadorNormalizado['partes']
        }

        return NextResponse.json({
          sucesso: true,
          dados: dadosCache,
          fonte: 'cache'
        })
      }
    }

    // Consultar API Escavador
    logger.debug('Consultando API Escavador', { module: 'escavador', action: 'buscar' })
    const resultado = await buscarProcessoPorCNJ(numeroCNJNormalizado)

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
      .from('escavador_cache')
      .upsert({
        numero_cnj: numeroCNJNormalizado,
        dados_capa: resultado.dados,
        dados_partes: resultado.dados.partes,
        consultado_em: new Date().toISOString(),
        expira_em: expiraEm.toISOString()
      }, {
        onConflict: 'numero_cnj'
      })

    if (cacheError) {
      // Log mas nao falha a requisicao por erro de cache
      logger.error('Erro ao salvar cache', { module: 'escavador', action: 'buscar' }, cacheError instanceof Error ? cacheError : undefined)
    }

    // Incrementar contador de creditos do escritorio
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (profile?.escritorio_id && resultado.creditos_utilizados) {
      await supabase
        .from('escavador_config')
        .upsert({
          escritorio_id: profile.escritorio_id,
          creditos_usados_mes: resultado.creditos_utilizados
        }, {
          onConflict: 'escritorio_id'
        })
        .then(({ error }) => {
          if (error) {
            logger.error('Erro ao atualizar creditos', { module: 'escavador', action: 'buscar' }, error instanceof Error ? error : undefined)
          }
        })
    }

    return NextResponse.json({
      sucesso: true,
      dados: resultado.dados,
      fonte: 'api',
      creditos_utilizados: resultado.creditos_utilizados
    })

  } catch (error) {
    logger.error('Erro interno', { module: 'escavador', action: 'buscar' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao consultar Escavador' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/escavador/buscar
 *
 * Retorna informacoes sobre o endpoint (health check)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/escavador/buscar',
    metodo: 'POST',
    descricao: 'Busca dados de um processo judicial pelo numero CNJ na API do Escavador',
    body: {
      numero_cnj: 'string - Numero do processo no formato NNNNNNN-DD.AAAA.J.TR.OOOO'
    },
    resposta: {
      sucesso: 'boolean',
      dados: 'ProcessoEscavadorNormalizado | undefined',
      fonte: "'api' | 'cache' | undefined",
      creditos_utilizados: 'number | undefined',
      error: 'string | undefined'
    },
    cache_ttl: `${CACHE_TTL_MINUTOS} minutos`
  })
}
