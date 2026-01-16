// ============================================
// API ROUTE: Buscar Processo no Escavador
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarProcessoPorCNJ } from '@/lib/escavador/client'
import { validarNumeroCNJCompleto, formatarNumeroCNJ, validarFormatoCNJ } from '@/lib/datajud/validators'
import type { ProcessoEscavadorNormalizado } from '@/lib/escavador/types'

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
    console.log('[Escavador API] Numero recebido:', numero_cnj)

    // Validar input
    if (!numero_cnj || typeof numero_cnj !== 'string') {
      console.log('[Escavador API] Erro: Numero CNJ nao fornecido ou tipo invalido')
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
        console.log('[Escavador API] Numero auto-formatado:', numeroCNJNormalizado)
      }
    }
    console.log('[Escavador API] Numero normalizado:', numeroCNJNormalizado)

    // Validar formato (digito verificador apenas como aviso, nao bloqueia)
    const validacao = validarNumeroCNJCompleto(numeroCNJNormalizado)
    if (!validacao.valido) {
      // Se for erro de formato, rejeita
      if (validacao.erro?.includes('Formato')) {
        console.log('[Escavador API] Erro de formato:', validacao.erro)
        return NextResponse.json(
          { sucesso: false, error: validacao.erro },
          { status: 400 }
        )
      }
      // Se for erro de digito, apenas avisa mas continua
      console.log('[Escavador API] Aviso de validacao (continuando):', validacao.erro)
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
      console.log(`[Escavador API] Cache hit para ${numeroCNJNormalizado}`)
      console.log('[Escavador API] Cache dados_capa keys:', Object.keys(cacheHit.dados_capa || {}))

      // Verifica se o cache tem a estrutura nova (com titulo_polo_ativo)
      const dadosCapa = cacheHit.dados_capa as ProcessoEscavadorNormalizado
      if (!dadosCapa.titulo_polo_ativo && !dadosCapa.titulo_polo_passivo) {
        console.log('[Escavador API] Cache com estrutura antiga, ignorando...')
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
    console.log(`[Escavador API] Consultando API para ${numeroCNJNormalizado}`)
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
      console.error('[Escavador API] Erro ao salvar cache:', cacheError)
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
            console.error('[Escavador API] Erro ao atualizar creditos:', error)
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
    console.error('[Escavador API] Erro interno:', error)
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
