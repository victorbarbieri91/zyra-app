// ============================================
// API ROUTE: Sincronizar Publicações do Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buscarAparicoes,
  normalizarAparicao
} from '@/lib/escavador/publicacoes'

/**
 * POST /api/escavador/publicacoes/sync
 *
 * Sincroniza publicações de todos os termos monitorados ou de um termo específico
 *
 * Body: { termo_id?: string } (opcional - se não informado, sincroniza todos)
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

    const escritorioId = profile.escritorio_id

    // Parsear body
    let body: { termo_id?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Body vazio é OK
    }

    const { termo_id } = body

    // Buscar termos ativos para sincronizar
    let query = supabase
      .from('publicacoes_termos_escavador')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true)
      .not('escavador_monitoramento_id', 'is', null)

    if (termo_id) {
      query = query.eq('id', termo_id)
    }

    const { data: termos, error: termosError } = await query

    if (termosError) {
      console.error('[Sync Escavador] Erro ao buscar termos:', termosError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao buscar termos' },
        { status: 500 }
      )
    }

    if (!termos || termos.length === 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Nenhum termo ativo para sincronizar',
        publicacoes_novas: 0,
        publicacoes_duplicadas: 0,
        publicacoes_vinculadas: 0
      })
    }

    console.log(`[Sync Escavador] Sincronizando ${termos.length} termo(s)`)

    // Registrar início da sincronização
    const { data: syncLog } = await supabase
      .from('publicacoes_sync_escavador')
      .insert({
        escritorio_id: escritorioId,
        termo_id: termo_id || null,
        tipo: 'manual',
        data_inicio: new Date().toISOString()
      })
      .select()
      .single()

    let totalNovas = 0
    let totalDuplicadas = 0
    let totalVinculadas = 0
    let erros: string[] = []

    // Processar cada termo
    for (const termo of termos) {
      try {
        const monitoramentoId = parseInt(termo.escavador_monitoramento_id, 10)

        console.log(`[Sync Escavador] Buscando aparicoes do termo "${termo.termo}" (ID: ${monitoramentoId})`)

        // Buscar aparições no Escavador
        const resultado = await buscarAparicoes(monitoramentoId)

        if (!resultado.sucesso) {
          console.error(`[Sync Escavador] Erro ao buscar aparicoes do termo ${termo.id}:`, resultado.erro)
          erros.push(`Termo "${termo.termo}": ${resultado.erro}`)

          // Atualizar status do termo para erro
          await supabase
            .from('publicacoes_termos_escavador')
            .update({
              escavador_status: 'erro',
              escavador_erro: resultado.erro
            })
            .eq('id', termo.id)

          continue
        }

        if (!resultado.aparicoes || resultado.aparicoes.length === 0) {
          console.log(`[Sync Escavador] Nenhuma aparicao encontrada para termo "${termo.termo}"`)

          // Atualizar ultima_sync mesmo sem aparições
          await supabase
            .from('publicacoes_termos_escavador')
            .update({
              ultima_sync: new Date().toISOString(),
              escavador_status: 'ativo',
              escavador_erro: null
            })
            .eq('id', termo.id)

          continue
        }

        console.log(`[Sync Escavador] ${resultado.aparicoes.length} aparicoes encontradas`)

        // Processar cada aparição
        for (const aparicao of resultado.aparicoes) {
          try {
            // Verificar se já existe (pelo escavador_aparicao_id)
            const { data: existente } = await supabase
              .from('publicacoes_publicacoes')
              .select('id')
              .eq('escavador_aparicao_id', aparicao.id.toString())
              .single()

            if (existente) {
              totalDuplicadas++
              continue
            }

            // Normalizar aparição
            const publicacao = normalizarAparicao(aparicao, monitoramentoId, escritorioId)

            // Verificar duplicata por hash_conteudo
            const crypto = await import('crypto')
            const hashConteudo = crypto
              .createHash('sha256')
              .update(publicacao.texto_completo)
              .digest('hex')

            const { data: duplicataHash } = await supabase
              .from('publicacoes_publicacoes')
              .select('id')
              .eq('escritorio_id', escritorioId)
              .eq('hash_conteudo', hashConteudo)
              .single()

            if (duplicataHash) {
              totalDuplicadas++
              continue
            }

            // Inserir publicação
            // O trigger vincular_publicacao_processo vai preencher processo_id automaticamente
            const { data: novaPublicacao, error: insertError } = await supabase
              .from('publicacoes_publicacoes')
              .insert({
                ...publicacao,
                hash_conteudo: hashConteudo,
                tipo_publicacao: 'outro' // Será classificado pela IA depois
              })
              .select('id, processo_id')
              .single()

            if (insertError) {
              console.error('[Sync Escavador] Erro ao inserir publicacao:', insertError)
              continue
            }

            totalNovas++

            // Verificar se foi vinculado a processo
            if (novaPublicacao?.processo_id) {
              totalVinculadas++
            }

          } catch (aparicaoError) {
            console.error('[Sync Escavador] Erro ao processar aparicao:', aparicaoError)
          }
        }

        // Atualizar termo
        await supabase
          .from('publicacoes_termos_escavador')
          .update({
            ultima_sync: new Date().toISOString(),
            total_aparicoes: (termo.total_aparicoes || 0) + totalNovas,
            ultima_aparicao: resultado.aparicoes[0]?.data_publicacao || null,
            escavador_status: 'ativo',
            escavador_erro: null
          })
          .eq('id', termo.id)

      } catch (termoError) {
        console.error(`[Sync Escavador] Erro ao processar termo ${termo.id}:`, termoError)
        erros.push(`Termo "${termo.termo}": Erro interno`)
      }
    }

    // Atualizar log de sincronização
    if (syncLog?.id) {
      await supabase
        .from('publicacoes_sync_escavador')
        .update({
          data_fim: new Date().toISOString(),
          publicacoes_novas: totalNovas,
          publicacoes_duplicadas: totalDuplicadas,
          publicacoes_vinculadas: totalVinculadas,
          sucesso: erros.length === 0,
          erro_mensagem: erros.length > 0 ? erros.join('; ') : null
        })
        .eq('id', syncLog.id)
    }

    console.log(`[Sync Escavador] Sync finalizado: ${totalNovas} novas, ${totalDuplicadas} duplicadas, ${totalVinculadas} vinculadas`)

    return NextResponse.json({
      sucesso: true,
      mensagem: erros.length > 0
        ? `Sincronização concluída com ${erros.length} erro(s)`
        : 'Sincronização concluída com sucesso',
      publicacoes_novas: totalNovas,
      publicacoes_duplicadas: totalDuplicadas,
      publicacoes_vinculadas: totalVinculadas,
      erros: erros.length > 0 ? erros : undefined
    })

  } catch (error) {
    console.error('[Sync Escavador] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao sincronizar' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/escavador/publicacoes/sync
 *
 * Retorna histórico de sincronizações
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

    // Buscar histórico
    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') || '10', 10)

    const { data: historico, error: selectError } = await supabase
      .from('publicacoes_sync_escavador')
      .select(`
        *,
        termo:publicacoes_termos_escavador(termo)
      `)
      .eq('escritorio_id', profile.escritorio_id)
      .order('created_at', { ascending: false })
      .limit(limite)

    if (selectError) {
      console.error('[Sync Escavador] Erro ao buscar historico:', selectError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao buscar historico' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      historico: historico || []
    })

  } catch (error) {
    console.error('[Sync Escavador] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao buscar historico' },
      { status: 500 }
    )
  }
}
