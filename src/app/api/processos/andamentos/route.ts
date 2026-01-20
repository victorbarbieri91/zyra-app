// ============================================
// API ROUTE: Atualizar Andamentos/Movimentacoes de Processos
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { solicitarAtualizacao, buscarMovimentacoes } from '@/lib/escavador/client'
import { normalizarTermoJuridico, normalizarTextoMovimentacao } from '@/lib/utils/text-normalizer'

/**
 * POST /api/processos/andamentos
 *
 * Solicita atualizacao de andamentos de um ou mais processos via Escavador.
 * Busca as movimentacoes e salva no banco de dados.
 *
 * Body: { processo_ids: string[] }
 * Response: { sucesso: boolean, resultados: array, erro?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticacao
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nao autorizado' },
        { status: 401 }
      )
    }

    // Buscar escritorio_id do usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (!profile?.escritorio_id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Escritorio nao encontrado' },
        { status: 400 }
      )
    }

    // Parsear body
    const body = await request.json().catch(() => ({}))
    const { processo_ids } = body as { processo_ids?: string[] }

    if (!processo_ids || !Array.isArray(processo_ids) || processo_ids.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'processo_ids e obrigatorio' },
        { status: 400 }
      )
    }

    // Limitar quantidade por requisicao
    if (processo_ids.length > 20) {
      return NextResponse.json(
        { sucesso: false, erro: 'Maximo de 20 processos por requisicao' },
        { status: 400 }
      )
    }

    // Buscar dados dos processos
    const { data: processos, error: queryError } = await supabase
      .from('processos_processos')
      .select('id, numero_cnj, numero_pasta')
      .in('id', processo_ids)

    if (queryError) {
      console.error('[Andamentos] Erro ao buscar processos:', queryError)
      return NextResponse.json(
        { sucesso: false, erro: 'Erro ao buscar processos' },
        { status: 500 }
      )
    }

    if (!processos || processos.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum processo encontrado' },
        { status: 404 }
      )
    }

    const resultados: Array<{
      processo_id: string
      numero_pasta: string
      status: 'sucesso' | 'erro' | 'sem_cnj'
      movimentacoes_novas?: number
      erro?: string
    }> = []

    let totalMovimentacoesNovas = 0
    let sucessos = 0
    let erros = 0

    // Processar cada processo
    for (const processo of processos) {
      // Verificar se tem CNJ
      if (!processo.numero_cnj) {
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'sem_cnj',
          erro: 'Processo sem numero CNJ'
        })
        continue
      }

      try {
        console.log(`[Andamentos] Atualizando ${processo.numero_pasta}`)

        // 1. Solicitar atualizacao no Escavador
        const resultadoAtualizacao = await solicitarAtualizacao(processo.numero_cnj)

        if (!resultadoAtualizacao.sucesso) {
          console.log(`[Andamentos] Erro ao solicitar atualizacao: ${resultadoAtualizacao.erro}`)
          // Continua mesmo com erro, pois pode ter dados em cache
        }

        // 2. Buscar movimentacoes
        const resultadoMovimentacoes = await buscarMovimentacoes(processo.numero_cnj, 1, 100)

        if (!resultadoMovimentacoes.sucesso || !resultadoMovimentacoes.movimentacoes) {
          console.log(`[Andamentos] Erro ao buscar movimentacoes: ${resultadoMovimentacoes.erro}`)
          resultados.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta || '',
            status: 'erro',
            erro: resultadoMovimentacoes.erro || 'Erro ao buscar movimentacoes'
          })
          erros++
          continue
        }

        // 3. Buscar movimentacoes existentes para evitar duplicatas
        const { data: movimentacoesExistentes } = await supabase
          .from('processos_movimentacoes')
          .select('data_movimento, descricao')
          .eq('processo_id', processo.id)

        const existentesSet = new Set(
          (movimentacoesExistentes || []).map(m =>
            `${m.data_movimento}_${m.descricao?.substring(0, 50)}`
          )
        )

        // 4. Filtrar apenas novas movimentacoes
        const novasMovimentacoes = resultadoMovimentacoes.movimentacoes.filter(mov => {
          const key = `${mov.data}_${mov.conteudo?.substring(0, 50)}`
          return !existentesSet.has(key)
        })

        // 5. Inserir novas movimentacoes
        if (novasMovimentacoes.length > 0) {
          const movimentacoesParaInserir = novasMovimentacoes.map(mov => {
            // Converter data para timestamp - adiciona meio-dia em UTC para evitar problemas de timezone
            const dataTimestamp = mov.data ? `${mov.data}T12:00:00Z` : new Date().toISOString()

            // tipo_descricao = classificação/tipo (ex: Publicação, Conclusão, Distribuição)
            // descricao = resumo do conteúdo (o texto real da movimentação)
            // conteudo_completo = texto completo da movimentação

            // Normaliza o tipo para formato correto (PUBLICACAO -> Publicação)
            const tipoNormalizado = normalizarTermoJuridico(mov.titulo || mov.tipo)

            // Normaliza o conteúdo da movimentação
            const conteudoNormalizado = normalizarTextoMovimentacao(mov.conteudo)
            const descricaoTexto = conteudoNormalizado?.trim()
              ? conteudoNormalizado.substring(0, 500)
              : tipoNormalizado || 'Movimentação sem descrição'

            return {
              processo_id: processo.id,
              escritorio_id: profile.escritorio_id,
              data_movimento: dataTimestamp,
              tipo_descricao: tipoNormalizado || null,
              descricao: descricaoTexto,
              conteudo_completo: conteudoNormalizado || null,
              origem: 'escavador',
              importante: false,
              lida: false
            }
          })

          console.log(`[Andamentos] Inserindo ${movimentacoesParaInserir.length} movimentacoes...`)
          console.log(`[Andamentos] Exemplo de data:`, movimentacoesParaInserir[0]?.data_movimento)

          const { error: insertError } = await supabase
            .from('processos_movimentacoes')
            .insert(movimentacoesParaInserir)

          if (insertError) {
            console.error(`[Andamentos] Erro ao inserir movimentacoes:`, insertError.message, insertError.details, insertError.code)
            resultados.push({
              processo_id: processo.id,
              numero_pasta: processo.numero_pasta || '',
              status: 'erro',
              erro: `Erro ao salvar: ${insertError.message}`
            })
            erros++
            continue
          }

          totalMovimentacoesNovas += novasMovimentacoes.length
        }

        console.log(`[Andamentos] ${processo.numero_pasta}: ${novasMovimentacoes.length} novas movimentacoes`)
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'sucesso',
          movimentacoes_novas: novasMovimentacoes.length
        })
        sucessos++

        // Delay para nao sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`[Andamentos] Erro em ${processo.numero_pasta}:`, error)
        resultados.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta || '',
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        erros++
      }
    }

    return NextResponse.json({
      sucesso: true,
      total: processos.length,
      sucessos,
      erros,
      movimentacoes_novas: totalMovimentacoesNovas,
      resultados
    })

  } catch (error) {
    console.error('[Andamentos] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processos/andamentos?processo_id=xxx
 *
 * Retorna movimentacoes de um processo especifico
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const processoId = searchParams.get('processo_id')

    if (!processoId) {
      return NextResponse.json(
        { sucesso: false, erro: 'processo_id e obrigatorio' },
        { status: 400 }
      )
    }

    const { data: movimentacoes, error } = await supabase
      .from('processos_movimentacoes')
      .select('*')
      .eq('processo_id', processoId)
      .order('data_movimento', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { sucesso: false, erro: 'Erro ao buscar movimentacoes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      total: movimentacoes?.length || 0,
      movimentacoes
    })

  } catch (error) {
    console.error('[Andamentos] Erro:', error)
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno' },
      { status: 500 }
    )
  }
}
