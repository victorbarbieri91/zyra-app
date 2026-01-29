// ============================================
// API ROUTE: Debug - Ver aparições de um monitoramento
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarAparicoes } from '@/lib/escavador/publicacoes'

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

    const { searchParams } = new URL(request.url)
    const monitoramentoId = searchParams.get('id')

    if (!monitoramentoId) {
      return NextResponse.json(
        { sucesso: false, error: 'Parametro id obrigatorio' },
        { status: 400 }
      )
    }

    console.log('[Debug Aparicoes] Buscando aparicoes para monitoramento:', monitoramentoId)

    const resultado = await buscarAparicoes(parseInt(monitoramentoId, 10))

    console.log('[Debug Aparicoes] Resultado:', JSON.stringify(resultado, null, 2))

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
    console.error('[Debug Aparicoes] Erro:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
