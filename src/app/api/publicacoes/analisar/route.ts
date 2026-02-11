// ============================================
// API ROUTE: Analisar Publicacao com IA
// ============================================
// Proxy para a Edge Function publicacoes-analisar

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publicationsRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/publicacoes/analisar
 *
 * Chama a Edge Function para analisar uma publicacao usando DeepSeek Reasoner
 *
 * Body: { publicacao_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticacao
    const supabase = await createClient()
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json(
        { sucesso: false, error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = publicationsRateLimit.check(request, session.user.id)
    if (!rateLimitResult.success) {
      return publicationsRateLimit.errorResponse(rateLimitResult)
    }

    // Parsear body
    const body = await request.json()
    const { publicacao_id } = body

    if (!publicacao_id) {
      return NextResponse.json(
        { sucesso: false, error: 'publicacao_id e obrigatorio' },
        { status: 400 }
      )
    }

    // Chamar Edge Function usando o token do usuario (mesmo padrao do centro-comando-ia)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { sucesso: false, error: 'Configuracao do Supabase ausente' },
        { status: 500 }
      )
    }

    logger.debug('Chamando Edge Function', { module: 'publicacoes', action: 'analisar' })

    const response = await fetch(`${supabaseUrl}/functions/v1/publicacoes-analisar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ publicacao_id }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error('Erro da Edge Function ao analisar publicacao', { module: 'publicacoes', action: 'analisar', statusCode: response.status })
      return NextResponse.json(
        { sucesso: false, error: data.erro || 'Erro ao analisar publicacao' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    logger.error('Erro interno ao analisar publicacao', { module: 'publicacoes', action: 'analisar' }, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao analisar publicacao' },
      { status: 500 }
    )
  }
}
