// ============================================
// API ROUTE: Listar Diários Oficiais Disponíveis
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listarOrigens } from '@/lib/escavador/publicacoes'
import { publicationsRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/escavador/publicacoes/origens
 *
 * Lista todos os diários oficiais disponíveis para monitoramento no Escavador
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
    const rateLimitResult = publicationsRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return publicationsRateLimit.errorResponse(rateLimitResult)
    }

    console.log('[API Origens] Listando diarios oficiais disponiveis')

    // Buscar origens no Escavador
    const resultado = await listarOrigens()

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro || 'Erro ao buscar origens' },
        { status: 500 }
      )
    }

    // Agrupar por UF se disponível
    const origens = resultado.origens || []
    const porUF: Record<string, typeof origens> = {}

    for (const origem of origens) {
      const uf = origem.uf || 'Nacional'
      if (!porUF[uf]) {
        porUF[uf] = []
      }
      porUF[uf].push(origem)
    }

    return NextResponse.json({
      sucesso: true,
      origens,
      porUF,
      total: origens.length
    })

  } catch (error) {
    console.error('[API Origens] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao listar origens' },
      { status: 500 }
    )
  }
}
