// ============================================
// API ROUTE: Debug Escavador - Ver monitoramentos existentes
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listarMonitoramentosDiario } from '@/lib/escavador/publicacoes'
import { debugRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/escavador/debug
 *
 * Lista todos os monitoramentos existentes no Escavador
 * para fins de debug e vinculação manual
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

    // Buscar escritorio do usuario
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

    // Listar monitoramentos no Escavador
    const resultado = await listarMonitoramentosDiario()

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, error: resultado.erro },
        { status: 500 }
      )
    }

    // Buscar termos locais para comparar
    const { data: termosLocais } = await supabase
      .from('publicacoes_termos_escavador')
      .select('id, termo, escavador_monitoramento_id, escavador_status')
      .eq('escritorio_id', profile.escritorio_id)

    return NextResponse.json({
      sucesso: true,
      escavador: {
        total: resultado.monitoramentos?.length || 0,
        monitoramentos: resultado.monitoramentos?.map(m => ({
          id: m.id,
          tipo: m.tipo,
          termo: m.termo,
          status: m.status,
          total_aparicoes: m.total_aparicoes,
          ultima_aparicao: m.ultima_aparicao
        }))
      },
      local: {
        total: termosLocais?.length || 0,
        termos: termosLocais
      }
    })

  } catch (error) {
    console.error('[API Debug] Erro:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
