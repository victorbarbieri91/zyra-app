// ============================================
// API PARA CRIAR CLIENTE DURANTE MIGRAÇÃO
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { migrationRateLimit } from '@/lib/rate-limit'

interface CriarClienteRequest {
  nome_completo: string
  tipo_contato?: string
  escritorio_id: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = migrationRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return migrationRateLimit.errorResponse(rateLimitResult)
    }

    const body = await request.json() as CriarClienteRequest
    const { nome_completo, tipo_contato, escritorio_id } = body

    if (!nome_completo || !escritorio_id) {
      return NextResponse.json(
        { error: 'nome_completo e escritorio_id são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se usuário pertence ao escritório
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.escritorio_id !== escritorio_id) {
      return NextResponse.json(
        { error: 'Acesso negado ao escritório' },
        { status: 403 }
      )
    }

    // Verificar se já existe cliente com mesmo nome
    const { data: existente } = await supabase
      .from('crm_pessoas')
      .select('id, nome_completo')
      .eq('escritorio_id', escritorio_id)
      .ilike('nome_completo', nome_completo)
      .limit(1)

    if (existente && existente.length > 0) {
      return NextResponse.json({
        success: true,
        cliente: existente[0],
        mensagem: 'Cliente já existente foi retornado'
      })
    }

    // Criar novo cliente
    const { data: novoCliente, error: insertError } = await supabase
      .from('crm_pessoas')
      .insert({
        escritorio_id,
        nome_completo: nome_completo.trim(),
        tipo_cadastro: tipo_contato || 'cliente'
      })
      .select('id, nome_completo, tipo_cadastro')
      .single()

    if (insertError) {
      console.error('Erro ao criar cliente:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar cliente: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cliente: novoCliente,
      mensagem: 'Cliente criado com sucesso'
    })

  } catch (error) {
    console.error('Erro na API criar-cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
