// ============================================
// API ROUTE: Gerenciar Termos de Monitoramento Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  criarMonitoramentoTermo,
  removerMonitoramentoDiario,
  listarMonitoramentosDiario,
  editarMonitoramentoDiario
} from '@/lib/escavador/publicacoes'

/**
 * POST /api/escavador/publicacoes/termos
 *
 * Cria um novo termo de monitoramento no Escavador
 *
 * Body: {
 *   termo: string,
 *   descricao?: string,
 *   variacoes?: string[],
 *   origens_ids?: number[]
 * }
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

    // Parsear body
    let body: {
      termo?: string
      descricao?: string
      variacoes?: string[]
      origens_ids?: number[]
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { termo, descricao, variacoes, origens_ids } = body

    // Validar termo
    if (!termo || typeof termo !== 'string' || termo.trim().length < 3) {
      return NextResponse.json(
        { sucesso: false, error: 'Termo deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    const termoNormalizado = termo.trim()

    // Verificar se termo ja existe para este escritorio
    const { data: termoExistente } = await supabase
      .from('publicacoes_termos_escavador')
      .select('id')
      .eq('escritorio_id', profile.escritorio_id)
      .eq('termo', termoNormalizado)
      .single()

    if (termoExistente) {
      return NextResponse.json(
        { sucesso: false, error: 'Este termo ja esta cadastrado' },
        { status: 409 }
      )
    }

    console.log('[API Termos] Criando monitoramento no Escavador para:', termoNormalizado)

    // Verificar se token Escavador está configurado
    if (!process.env.ESCAVADOR_API_TOKEN) {
      console.error('[API Termos] ESCAVADOR_API_TOKEN não configurado')
      return NextResponse.json(
        { sucesso: false, error: 'Token da API Escavador não configurado. Configure ESCAVADOR_API_TOKEN no .env.local' },
        { status: 500 }
      )
    }

    // Criar monitoramento no Escavador
    let resultadoEscavador
    try {
      resultadoEscavador = await criarMonitoramentoTermo({
        termo: termoNormalizado,
        variacoes: variacoes || [],
        origens_ids: origens_ids || []
      })
      console.log('[API Termos] Resultado Escavador:', JSON.stringify(resultadoEscavador))
    } catch (escavadorError: any) {
      console.error('[API Termos] Exceção ao chamar Escavador:', escavadorError)
      return NextResponse.json(
        { sucesso: false, error: `Erro de conexão com Escavador: ${escavadorError.message}` },
        { status: 500 }
      )
    }

    if (!resultadoEscavador.sucesso) {
      console.error('[API Termos] Erro no Escavador:', resultadoEscavador.erro)
      return NextResponse.json(
        { sucesso: false, error: resultadoEscavador.erro || 'Erro ao criar monitoramento no Escavador' },
        { status: 400 }
      )
    }

    // Salvar termo no banco local
    const { data: novoTermo, error: insertError } = await supabase
      .from('publicacoes_termos_escavador')
      .insert({
        escritorio_id: profile.escritorio_id,
        termo: termoNormalizado,
        descricao: descricao || null,
        variacoes: variacoes || [],
        origens_ids: origens_ids || [],
        escavador_monitoramento_id: resultadoEscavador.monitoramento_id?.toString(),
        escavador_status: 'ativo',
        ativo: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API Termos] Erro ao salvar termo:', insertError)

      // Tentar remover monitoramento do Escavador se falhou ao salvar
      if (resultadoEscavador.monitoramento_id) {
        await removerMonitoramentoDiario(resultadoEscavador.monitoramento_id)
      }

      return NextResponse.json(
        { sucesso: false, error: 'Erro ao salvar termo no banco' },
        { status: 500 }
      )
    }

    console.log('[API Termos] Termo criado com sucesso:', novoTermo.id)

    return NextResponse.json({
      sucesso: true,
      termo: novoTermo
    })

  } catch (error) {
    console.error('[API Termos] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao criar termo' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/escavador/publicacoes/termos
 *
 * Lista todos os termos de monitoramento do escritório
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

    // Buscar termos
    const { data: termos, error: selectError } = await supabase
      .from('publicacoes_termos_escavador')
      .select('*')
      .eq('escritorio_id', profile.escritorio_id)
      .order('created_at', { ascending: false })

    if (selectError) {
      console.error('[API Termos] Erro ao buscar termos:', selectError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao buscar termos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      termos: termos || []
    })

  } catch (error) {
    console.error('[API Termos] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao listar termos' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/escavador/publicacoes/termos
 *
 * Ativa/Registra um termo existente no Escavador
 * Usado para termos que foram criados mas não foram registrados na API
 *
 * Body: { termo_id: string }
 */
export async function PATCH(request: NextRequest) {
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

    // Parsear body
    let body: { termo_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { termo_id } = body

    if (!termo_id) {
      return NextResponse.json(
        { sucesso: false, error: 'termo_id e obrigatorio' },
        { status: 400 }
      )
    }

    // Buscar termo existente
    const { data: termo, error: selectError } = await supabase
      .from('publicacoes_termos_escavador')
      .select('*')
      .eq('id', termo_id)
      .eq('escritorio_id', profile.escritorio_id)
      .single()

    if (selectError || !termo) {
      return NextResponse.json(
        { sucesso: false, error: 'Termo nao encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já tem monitoramento_id
    if (termo.escavador_monitoramento_id) {
      return NextResponse.json(
        { sucesso: false, error: 'Termo ja esta registrado no Escavador' },
        { status: 409 }
      )
    }

    console.log('[API Termos PATCH] Registrando termo existente no Escavador:', termo.termo)

    // Verificar se token Escavador está configurado
    if (!process.env.ESCAVADOR_API_TOKEN) {
      console.error('[API Termos PATCH] ESCAVADOR_API_TOKEN não configurado')
      return NextResponse.json(
        { sucesso: false, error: 'Token da API Escavador não configurado' },
        { status: 500 }
      )
    }

    // Primeiro, verificar se o termo já existe no Escavador
    // Isso evita criar duplicatas e recupera o ID se já existir
    console.log('[API Termos PATCH] Verificando se termo já existe no Escavador...')
    console.log('[API Termos PATCH] Termo local:', termo.termo)
    const monitoramentosExistentes = await listarMonitoramentosDiario()

    if (monitoramentosExistentes.sucesso && monitoramentosExistentes.monitoramentos) {
      // Log detalhado de todos os monitoramentos para debug
      console.log('[API Termos PATCH] Monitoramentos existentes:', JSON.stringify(monitoramentosExistentes.monitoramentos, null, 2))

      // Função para normalizar texto (remove acentos e lowercase)
      const normalizar = (str: string) => {
        return str
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      }

      const termoNormalizado = normalizar(termo.termo)
      console.log('[API Termos PATCH] Termo normalizado:', termoNormalizado)

      // Tentar várias estratégias de correspondência
      let monitoramentoExistente = monitoramentosExistentes.monitoramentos.find(m => {
        const termoApi = m.termo || ''
        const termoApiNorm = normalizar(termoApi)

        console.log(`[API Termos PATCH] Comparando: "${termoNormalizado}" com "${termoApiNorm}"`)

        // Correspondência exata normalizada
        if (termoApiNorm === termoNormalizado) return true
        // Um contém o outro
        if (termoApiNorm.includes(termoNormalizado) || termoNormalizado.includes(termoApiNorm)) return true

        return false
      })

      if (monitoramentoExistente) {
        console.log('[API Termos PATCH] Termo já existe no Escavador, ID:', monitoramentoExistente.id)

        // Atualizar termo com monitoramento_id existente
        const { data: termoAtualizado, error: updateError } = await supabase
          .from('publicacoes_termos_escavador')
          .update({
            escavador_monitoramento_id: monitoramentoExistente.id.toString(),
            escavador_status: 'ativo',
            escavador_erro: null
          })
          .eq('id', termo_id)
          .select()
          .single()

        if (updateError) {
          console.error('[API Termos PATCH] Erro ao atualizar termo:', updateError)
          return NextResponse.json(
            { sucesso: false, error: 'Erro ao atualizar termo no banco' },
            { status: 500 }
          )
        }

        console.log('[API Termos PATCH] Termo vinculado a monitoramento existente:', monitoramentoExistente.id)

        return NextResponse.json({
          sucesso: true,
          termo: termoAtualizado,
          monitoramento_id: monitoramentoExistente.id,
          mensagem: 'Termo já estava registrado no Escavador e foi vinculado'
        })
      }
    }

    // Se não existe, criar novo monitoramento
    let resultadoEscavador
    try {
      resultadoEscavador = await criarMonitoramentoTermo({
        termo: termo.termo,
        variacoes: termo.variacoes || [],
        origens_ids: termo.origens_ids || []
      })
      console.log('[API Termos PATCH] Resultado Escavador:', JSON.stringify(resultadoEscavador))
    } catch (escavadorError: any) {
      console.error('[API Termos PATCH] Exceção ao chamar Escavador:', escavadorError)

      // Atualizar status de erro
      await supabase
        .from('publicacoes_termos_escavador')
        .update({
          escavador_status: 'erro',
          escavador_erro: escavadorError.message
        })
        .eq('id', termo_id)

      return NextResponse.json(
        { sucesso: false, error: `Erro de conexão com Escavador: ${escavadorError.message}` },
        { status: 500 }
      )
    }

    if (!resultadoEscavador.sucesso) {
      console.error('[API Termos PATCH] Erro no Escavador:', resultadoEscavador.erro)

      // Se o erro indica que já monitora, tentar buscar o ID existente
      const erroJaMonitora = resultadoEscavador.erro?.toLowerCase().includes('já monitora') ||
                            resultadoEscavador.erro?.toLowerCase().includes('ja monitora')

      if (erroJaMonitora) {
        console.log('[API Termos PATCH] Termo já existe no Escavador, buscando ID existente...')

        // Listar todos os monitoramentos e buscar o correto
        const todosMonitoramentos = await listarMonitoramentosDiario()

        if (todosMonitoramentos.sucesso && todosMonitoramentos.monitoramentos) {
          console.log('[API Termos PATCH] Monitoramentos encontrados:', todosMonitoramentos.monitoramentos.length)
          console.log('[API Termos PATCH] Dados completos:', JSON.stringify(todosMonitoramentos.monitoramentos, null, 2))

          // Função para normalizar texto (remove acentos e lowercase)
          const normalizar = (str: string) => {
            return str
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          }

          const termoNormalizado = normalizar(termo.termo)
          console.log('[API Termos PATCH] Buscando termo normalizado:', termoNormalizado)

          const monitoramentoEncontrado = todosMonitoramentos.monitoramentos.find(m => {
            const termoApi = normalizar(m.termo || '')
            console.log(`[API Termos PATCH] Comparando: "${termoNormalizado}" com "${termoApi}"`)
            // Verificar correspondência exata ou se um contém o outro
            return termoApi === termoNormalizado ||
                   termoApi.includes(termoNormalizado) ||
                   termoNormalizado.includes(termoApi)
          })

          if (monitoramentoEncontrado) {
            console.log('[API Termos PATCH] Monitoramento encontrado:', monitoramentoEncontrado.id, '-', monitoramentoEncontrado.termo)

            // Atualizar termo com monitoramento_id encontrado
            const { data: termoAtualizado, error: updateError } = await supabase
              .from('publicacoes_termos_escavador')
              .update({
                escavador_monitoramento_id: monitoramentoEncontrado.id.toString(),
                escavador_status: 'ativo',
                escavador_erro: null
              })
              .eq('id', termo_id)
              .select()
              .single()

            if (updateError) {
              console.error('[API Termos PATCH] Erro ao atualizar termo:', updateError)
              return NextResponse.json(
                { sucesso: false, error: 'Erro ao atualizar termo no banco' },
                { status: 500 }
              )
            }

            return NextResponse.json({
              sucesso: true,
              termo: termoAtualizado,
              monitoramento_id: monitoramentoEncontrado.id,
              mensagem: 'Termo já existia no Escavador e foi vinculado'
            })
          } else {
            // Logar todos os termos para debug
            console.log('[API Termos PATCH] Termos no Escavador:', todosMonitoramentos.monitoramentos.map(m => m.termo))
          }
        }
      }

      // Se não conseguiu recuperar, salvar erro
      await supabase
        .from('publicacoes_termos_escavador')
        .update({
          escavador_status: 'erro',
          escavador_erro: resultadoEscavador.erro || 'Erro desconhecido'
        })
        .eq('id', termo_id)

      return NextResponse.json(
        { sucesso: false, error: resultadoEscavador.erro || 'Erro ao criar monitoramento no Escavador' },
        { status: 400 }
      )
    }

    // Atualizar termo com monitoramento_id
    const { data: termoAtualizado, error: updateError } = await supabase
      .from('publicacoes_termos_escavador')
      .update({
        escavador_monitoramento_id: resultadoEscavador.monitoramento_id?.toString(),
        escavador_status: 'ativo',
        escavador_erro: null
      })
      .eq('id', termo_id)
      .select()
      .single()

    if (updateError) {
      console.error('[API Termos PATCH] Erro ao atualizar termo:', updateError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao atualizar termo no banco' },
        { status: 500 }
      )
    }

    console.log('[API Termos PATCH] Termo ativado com sucesso:', termo_id, '-> Monitoramento:', resultadoEscavador.monitoramento_id)

    return NextResponse.json({
      sucesso: true,
      termo: termoAtualizado,
      monitoramento_id: resultadoEscavador.monitoramento_id
    })

  } catch (error) {
    console.error('[API Termos PATCH] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao ativar termo' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/escavador/publicacoes/termos
 *
 * Edita um termo de monitoramento existente (variações e descrição)
 *
 * Body: {
 *   termo_id: string,
 *   variacoes?: string[],
 *   descricao?: string
 * }
 */
export async function PUT(request: NextRequest) {
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

    // Parsear body
    let body: {
      termo_id?: string
      variacoes?: string[]
      descricao?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { termo_id, variacoes, descricao } = body

    if (!termo_id) {
      return NextResponse.json(
        { sucesso: false, error: 'termo_id e obrigatorio' },
        { status: 400 }
      )
    }

    // Buscar termo existente
    const { data: termo, error: selectError } = await supabase
      .from('publicacoes_termos_escavador')
      .select('*')
      .eq('id', termo_id)
      .eq('escritorio_id', profile.escritorio_id)
      .single()

    if (selectError || !termo) {
      return NextResponse.json(
        { sucesso: false, error: 'Termo nao encontrado' },
        { status: 404 }
      )
    }

    console.log('[API Termos PUT] Editando termo:', termo.termo)
    console.log('[API Termos PUT] Novas variações:', variacoes)

    // Se tem monitoramento_id no Escavador, atualizar lá também
    if (termo.escavador_monitoramento_id && variacoes !== undefined) {
      console.log('[API Termos PUT] Atualizando no Escavador, ID:', termo.escavador_monitoramento_id)

      const resultadoEscavador = await editarMonitoramentoDiario(
        parseInt(termo.escavador_monitoramento_id, 10),
        { variacoes: variacoes || [] }
      )

      if (!resultadoEscavador.sucesso) {
        console.error('[API Termos PUT] Erro ao atualizar no Escavador:', resultadoEscavador.erro)
        // Continua para salvar no banco local mesmo se falhar no Escavador
        // Isso permite pelo menos ter o registro local atualizado
      } else {
        console.log('[API Termos PUT] Atualizado no Escavador com sucesso')
      }
    }

    // Atualizar no banco local
    const updateData: any = {}
    if (variacoes !== undefined) updateData.variacoes = variacoes
    if (descricao !== undefined) updateData.descricao = descricao
    updateData.updated_at = new Date().toISOString()

    const { data: termoAtualizado, error: updateError } = await supabase
      .from('publicacoes_termos_escavador')
      .update(updateData)
      .eq('id', termo_id)
      .select()
      .single()

    if (updateError) {
      console.error('[API Termos PUT] Erro ao atualizar termo:', updateError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao atualizar termo no banco' },
        { status: 500 }
      )
    }

    console.log('[API Termos PUT] Termo atualizado com sucesso:', termo_id)

    return NextResponse.json({
      sucesso: true,
      termo: termoAtualizado
    })

  } catch (error) {
    console.error('[API Termos PUT] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao editar termo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/escavador/publicacoes/termos
 *
 * Remove um termo de monitoramento
 *
 * Body: { termo_id: string }
 */
export async function DELETE(request: NextRequest) {
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

    // Parsear body
    let body: { termo_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { sucesso: false, error: 'Body invalido' },
        { status: 400 }
      )
    }

    const { termo_id } = body

    if (!termo_id) {
      return NextResponse.json(
        { sucesso: false, error: 'termo_id e obrigatorio' },
        { status: 400 }
      )
    }

    // Buscar termo para obter ID do Escavador
    const { data: termo, error: selectError } = await supabase
      .from('publicacoes_termos_escavador')
      .select('*')
      .eq('id', termo_id)
      .eq('escritorio_id', profile.escritorio_id)
      .single()

    if (selectError || !termo) {
      return NextResponse.json(
        { sucesso: false, error: 'Termo nao encontrado' },
        { status: 404 }
      )
    }

    // Remover monitoramento no Escavador se existir
    if (termo.escavador_monitoramento_id) {
      console.log('[API Termos] Removendo monitoramento do Escavador:', termo.escavador_monitoramento_id)
      const resultadoEscavador = await removerMonitoramentoDiario(
        parseInt(termo.escavador_monitoramento_id, 10)
      )

      if (!resultadoEscavador.sucesso) {
        console.error('[API Termos] Erro ao remover do Escavador:', resultadoEscavador.erro)
        // Continua mesmo com erro para remover do banco local
      }
    }

    // Remover do banco local
    const { error: deleteError } = await supabase
      .from('publicacoes_termos_escavador')
      .delete()
      .eq('id', termo_id)
      .eq('escritorio_id', profile.escritorio_id)

    if (deleteError) {
      console.error('[API Termos] Erro ao deletar termo:', deleteError)
      return NextResponse.json(
        { sucesso: false, error: 'Erro ao remover termo' },
        { status: 500 }
      )
    }

    console.log('[API Termos] Termo removido:', termo_id)

    return NextResponse.json({
      sucesso: true
    })

  } catch (error) {
    console.error('[API Termos] Erro interno:', error)
    return NextResponse.json(
      { sucesso: false, error: 'Erro interno ao remover termo' },
      { status: 500 }
    )
  }
}
