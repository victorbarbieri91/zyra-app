// ============================================
// API ROUTE: Debug - Ver aparições de um monitoramento
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarAparicoes } from '@/lib/escavador/publicacoes'
import { debugRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * GET /api/escavador/debug/aparicoes?id=2134565
 *
 * Busca aparições de um monitoramento específico para debug
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

    // Rate limiting
    const rateLimitResult = debugRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return debugRateLimit.errorResponse(rateLimitResult)
    }

    const { searchParams } = new URL(request.url)
    const monitoramentoId = searchParams.get('id')

    if (!monitoramentoId) {
      return NextResponse.json(
        { sucesso: false, error: 'Parametro id obrigatorio' },
        { status: 400 }
      )
    }

    logger.debug('Buscando aparicoes para monitoramento', { module: 'escavador', action: 'debug-aparicoes' })

    const resultado = await buscarAparicoes(parseInt(monitoramentoId, 10))

    logger.debug(`Aparicoes encontradas: ${resultado.aparicoes?.length || 0}`, { module: 'escavador', action: 'debug-aparicoes' })

    // Para debug: mostrar estrutura completa das aparições incluindo todos os campos
    const aparicoesCampetos = resultado.aparicoes?.slice(0, 5).map((ap: any) => ({
      _raw_keys: Object.keys(ap),
      _diario_keys: ap.diario ? Object.keys(ap.diario) : null,
      _publicacao_keys: ap.publicacao ? Object.keys(ap.publicacao) : null,
      _tem_texto: Boolean(ap.texto),
      _tem_conteudo: Boolean(ap.conteudo),
      _tem_content: Boolean(ap.content),
      _tem_descricao: Boolean(ap.descricao),
      _texto_length: ap.texto?.length || 0,
      _conteudo_length: ap.conteudo?.length || 0,
      ...ap
    })) || []

    return NextResponse.json({
      sucesso: resultado.sucesso,
      monitoramento_id: monitoramentoId,
      total: resultado.total || 0,
      aparicoes: aparicoesCampetos,
      erro: resultado.erro,
      _debug_info: {
        timestamp: new Date().toISOString(),
        aparicoes_raw_count: resultado.aparicoes?.length || 0
      }
    })

  } catch (error) {
    logger.error('Erro no debug aparicoes', { module: 'escavador', action: 'debug-aparicoes' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
