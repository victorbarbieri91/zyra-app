// ============================================
// API ROUTE: Busca Global do Sistema
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ResultadoBusca, RespostaBuscaGlobal } from '@/types/search'

const MAX_RESULTADOS_POR_TIPO = 5
const MAX_RESULTADOS_TOTAL = 20

/**
 * GET /api/search?q=termo&tipos=processo,pessoa,tarefa
 *
 * Busca global em múltiplas tabelas do sistema.
 * Respeita RLS para retornar apenas dados do escritório do usuário.
 */
export async function GET(request: NextRequest) {
  const inicio = Date.now()

  try {
    // Autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: 'Não autorizado', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 401 }
      )
    }

    // Obter escritorio_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('escritorio_id')
      .eq('id', user.id)
      .single()

    if (!profile?.escritorio_id) {
      return NextResponse.json(
        { sucesso: false, erro: 'Escritório não encontrado', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 400 }
      )
    }

    const escritorioId = profile.escritorio_id

    // Parâmetros da busca
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()
    const tiposParam = searchParams.get('tipos')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { sucesso: false, erro: 'Termo de busca deve ter pelo menos 2 caracteres', resultados: [], total: 0, tempo_busca_ms: 0 },
        { status: 400 }
      )
    }

    // Tipos de busca (default: todos)
    const tiposSolicitados = tiposParam
      ? tiposParam.split(',').filter(Boolean)
      : ['processo', 'pessoa', 'tarefa', 'evento', 'audiencia', 'contrato', 'publicacao', 'consultivo', 'produto', 'projeto']

    const resultados: ResultadoBusca[] = []
    const termoBusca = `%${query}%`

    // ========================================
    // BUSCA EM PROCESSOS
    // ========================================
    if (tiposSolicitados.includes('processo')) {
      const { data: processos } = await supabase
        .from('processos_processos')
        .select(`
          id,
          numero_cnj,
          numero_pasta,
          parte_contraria,
          area,
          tribunal,
          status,
          prioridade,
          observacoes,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`numero_cnj.ilike.${termoBusca},numero_pasta.ilike.${termoBusca},parte_contraria.ilike.${termoBusca},observacoes.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (processos) {
        processos.forEach((p: any) => {
          resultados.push({
            id: p.id,
            tipo: 'processo',
            titulo: p.numero_cnj || p.numero_pasta || 'Processo sem número',
            subtitulo: p.cliente?.nome_completo || p.parte_contraria || 'Sem cliente',
            navegacao: `/dashboard/processos?id=${p.id}`,
            destaque: p.area ? `${p.area} - ${p.tribunal || 'N/A'}` : undefined,
            icone: 'Scale',
            modulo: 'Processos',
            status: p.status,
            numero_cnj: p.numero_cnj,
            numero_pasta: p.numero_pasta,
            area: p.area,
            tribunal: p.tribunal,
            cliente_nome: p.cliente?.nome_completo,
            parte_contraria: p.parte_contraria
          })
        })
      }

      // Busca adicional por nome do cliente
      const { data: processosPorCliente } = await supabase
        .from('processos_processos')
        .select(`
          id,
          numero_cnj,
          numero_pasta,
          parte_contraria,
          area,
          tribunal,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (processosPorCliente) {
        processosPorCliente.forEach((p: any) => {
          // Evitar duplicatas
          if (!resultados.find(r => r.id === p.id && r.tipo === 'processo')) {
            resultados.push({
              id: p.id,
              tipo: 'processo',
              titulo: p.numero_cnj || p.numero_pasta || 'Processo sem número',
              subtitulo: p.cliente?.nome_completo || p.parte_contraria || 'Sem cliente',
              navegacao: `/dashboard/processos?id=${p.id}`,
              destaque: p.area ? `${p.area} - ${p.tribunal || 'N/A'}` : undefined,
              icone: 'Scale',
              modulo: 'Processos',
              status: p.status,
              numero_cnj: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              area: p.area,
              tribunal: p.tribunal,
              cliente_nome: p.cliente?.nome_completo,
              parte_contraria: p.parte_contraria
            })
          }
        })
      }
    }

    // ========================================
    // BUSCA EM PESSOAS (CRM)
    // ========================================
    if (tiposSolicitados.includes('pessoa')) {
      const { data: pessoas } = await supabase
        .from('crm_pessoas')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .or(`nome_completo.ilike.${termoBusca},nome_fantasia.ilike.${termoBusca},cpf_cnpj.ilike.${termoBusca},email.ilike.${termoBusca},telefone.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (pessoas) {
        pessoas.forEach((p: any) => {
          const tipoCadastroLabel = {
            cliente: 'Cliente',
            prospecto: 'Prospecto',
            parte_contraria: 'Parte Contrária',
            correspondente: 'Correspondente',
            testemunha: 'Testemunha',
            perito: 'Perito',
            juiz: 'Juiz',
            promotor: 'Promotor',
            outros: 'Outros'
          }[p.tipo_cadastro] || p.tipo_cadastro

          resultados.push({
            id: p.id,
            tipo: 'pessoa',
            titulo: p.nome_completo,
            subtitulo: p.nome_fantasia || p.email || p.telefone,
            navegacao: `/dashboard/crm/pessoas?id=${p.id}`,
            destaque: tipoCadastroLabel,
            icone: 'Users',
            modulo: 'CRM',
            status: p.status,
            tipo_cadastro: tipoCadastroLabel,
            cpf_cnpj: p.cpf_cnpj,
            email: p.email,
            telefone: p.telefone
          })
        })
      }
    }

    // ========================================
    // BUSCA EM TAREFAS
    // ========================================
    if (tiposSolicitados.includes('tarefa')) {
      const { data: tarefas } = await supabase
        .from('agenda_tarefas')
        .select(`
          id,
          titulo,
          descricao,
          status,
          prioridade,
          data_inicio,
          data_fim
        `)
        .eq('escritorio_id', escritorioId)
        .or(`titulo.ilike.${termoBusca},descricao.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (tarefas) {
        tarefas.forEach((t: any) => {
          resultados.push({
            id: t.id,
            tipo: 'tarefa',
            titulo: t.titulo,
            subtitulo: t.descricao?.substring(0, 100) || undefined,
            navegacao: `/dashboard/agenda?tarefa=${t.id}`,
            destaque: t.prioridade === 'alta' ? 'Prioridade Alta' : undefined,
            icone: 'CheckSquare',
            modulo: 'Agenda',
            status: t.status,
            data: t.data_inicio,
            data_inicio: t.data_inicio,
            data_fim: t.data_fim,
            prioridade: t.prioridade
          })
        })
      }
    }

    // ========================================
    // BUSCA EM EVENTOS
    // ========================================
    if (tiposSolicitados.includes('evento')) {
      const { data: eventos } = await supabase
        .from('agenda_eventos')
        .select(`
          id,
          titulo,
          descricao,
          data_inicio,
          local
        `)
        .eq('escritorio_id', escritorioId)
        .or(`titulo.ilike.${termoBusca},descricao.ilike.${termoBusca},local.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (eventos) {
        eventos.forEach((e: any) => {
          resultados.push({
            id: e.id,
            tipo: 'evento',
            titulo: e.titulo,
            subtitulo: e.local || e.descricao?.substring(0, 100),
            navegacao: `/dashboard/agenda?evento=${e.id}`,
            icone: 'Calendar',
            modulo: 'Agenda',
            data: e.data_inicio,
            data_hora: e.data_inicio,
            local: e.local
          })
        })
      }
    }

    // ========================================
    // BUSCA EM AUDIÊNCIAS
    // ========================================
    if (tiposSolicitados.includes('audiencia')) {
      const { data: audiencias } = await supabase
        .from('agenda_audiencias')
        .select(`
          id,
          titulo,
          tipo_audiencia,
          data_hora,
          local,
          status,
          processo:processo_id(numero_cnj)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`titulo.ilike.${termoBusca},local.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (audiencias) {
        audiencias.forEach((a: any) => {
          const tipoAudienciaLabel = {
            inicial: 'Inicial',
            instrucao: 'Instrução',
            conciliacao: 'Conciliação',
            julgamento: 'Julgamento',
            una: 'Una'
          }[a.tipo_audiencia] || a.tipo_audiencia

          resultados.push({
            id: a.id,
            tipo: 'audiencia',
            titulo: a.titulo || `Audiência de ${tipoAudienciaLabel}`,
            subtitulo: a.processo?.numero_cnj || a.local,
            navegacao: `/dashboard/agenda?audiencia=${a.id}`,
            destaque: tipoAudienciaLabel,
            icone: 'Gavel',
            modulo: 'Agenda',
            status: a.status,
            data: a.data_hora,
            data_hora: a.data_hora,
            tipo_audiencia: tipoAudienciaLabel,
            processo_numero: a.processo?.numero_cnj
          })
        })
      }
    }

    // ========================================
    // BUSCA EM CONTRATOS DE HONORÁRIOS
    // ========================================
    if (tiposSolicitados.includes('contrato')) {
      const { data: contratos } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          id,
          titulo,
          forma_cobranca,
          valor_total,
          status,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`titulo.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (contratos) {
        contratos.forEach((c: any) => {
          resultados.push({
            id: c.id,
            tipo: 'contrato',
            titulo: c.titulo || 'Contrato sem título',
            subtitulo: c.cliente?.nome_completo,
            navegacao: `/dashboard/financeiro/contratos?id=${c.id}`,
            destaque: c.forma_cobranca,
            icone: 'FileText',
            modulo: 'Financeiro',
            status: c.status,
            cliente_nome: c.cliente?.nome_completo,
            valor: c.valor_total,
            forma_cobranca: c.forma_cobranca
          })
        })
      }

      // Busca adicional por nome do cliente
      const { data: contratosPorCliente } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          id,
          titulo,
          forma_cobranca,
          valor_total,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (contratosPorCliente) {
        contratosPorCliente.forEach((c: any) => {
          if (!resultados.find(r => r.id === c.id && r.tipo === 'contrato')) {
            resultados.push({
              id: c.id,
              tipo: 'contrato',
              titulo: c.titulo || 'Contrato sem título',
              subtitulo: c.cliente?.nome_completo,
              navegacao: `/dashboard/financeiro/contratos?id=${c.id}`,
              destaque: c.forma_cobranca,
              icone: 'FileText',
              modulo: 'Financeiro',
              status: c.status,
              cliente_nome: c.cliente?.nome_completo,
              valor: c.valor_total,
              forma_cobranca: c.forma_cobranca
            })
          }
        })
      }
    }

    // ========================================
    // BUSCA EM PUBLICAÇÕES
    // ========================================
    if (tiposSolicitados.includes('publicacao')) {
      const { data: publicacoes } = await supabase
        .from('publicacoes_publicacoes')
        .select(`
          id,
          titulo,
          descricao,
          tipo_publicacao,
          publicacao_data,
          status,
          processo:processo_id(numero_cnj)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`titulo.ilike.${termoBusca},descricao.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (publicacoes) {
        publicacoes.forEach((p: any) => {
          resultados.push({
            id: p.id,
            tipo: 'publicacao',
            titulo: p.titulo || 'Publicação',
            subtitulo: p.processo?.numero_cnj || p.descricao?.substring(0, 100),
            navegacao: `/dashboard/publicacoes?id=${p.id}`,
            destaque: p.tipo_publicacao,
            icone: 'Newspaper',
            modulo: 'Publicações',
            status: p.status,
            data: p.publicacao_data,
            tipo_publicacao: p.tipo_publicacao,
            data_publicacao: p.publicacao_data,
            processo_numero: p.processo?.numero_cnj
          })
        })
      }
    }

    // ========================================
    // BUSCA EM CONSULTIVO
    // ========================================
    if (tiposSolicitados.includes('consultivo')) {
      const { data: consultivos } = await supabase
        .from('consultivo_consultas')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          status,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`numero.ilike.${termoBusca},titulo.ilike.${termoBusca},descricao.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (consultivos) {
        consultivos.forEach((c: any) => {
          resultados.push({
            id: c.id,
            tipo: 'consultivo',
            titulo: c.titulo || `Consulta ${c.numero}`,
            subtitulo: c.cliente?.nome_completo || c.descricao?.substring(0, 100),
            navegacao: `/dashboard/consultivo?id=${c.id}`,
            destaque: c.numero,
            icone: 'BookOpen',
            modulo: 'Consultivo',
            status: c.status,
            numero: c.numero,
            cliente_nome: c.cliente?.nome_completo
          })
        })
      }

      // Busca adicional por nome do cliente
      const { data: consultivosPorCliente } = await supabase
        .from('consultivo_consultas')
        .select(`
          id,
          numero,
          titulo,
          descricao,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (consultivosPorCliente) {
        consultivosPorCliente.forEach((c: any) => {
          // Evitar duplicatas
          if (!resultados.find(r => r.id === c.id && r.tipo === 'consultivo')) {
            resultados.push({
              id: c.id,
              tipo: 'consultivo',
              titulo: c.titulo || `Consulta ${c.numero}`,
              subtitulo: c.cliente?.nome_completo || c.descricao?.substring(0, 100),
              navegacao: `/dashboard/consultivo?id=${c.id}`,
              destaque: c.numero,
              icone: 'BookOpen',
              modulo: 'Consultivo',
              status: c.status,
              numero: c.numero,
              cliente_nome: c.cliente?.nome_completo
            })
          }
        })
      }
    }

    // ========================================
    // BUSCA EM PRODUTOS (PORTFOLIO)
    // ========================================
    if (tiposSolicitados.includes('produto')) {
      const { data: produtos } = await supabase
        .from('portfolio_produtos')
        .select(`
          id,
          nome,
          descricao,
          codigo,
          area_juridica,
          categoria,
          status
        `)
        .eq('escritorio_id', escritorioId)
        .or(`nome.ilike.${termoBusca},descricao.ilike.${termoBusca},codigo.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (produtos) {
        produtos.forEach((p: any) => {
          resultados.push({
            id: p.id,
            tipo: 'produto',
            titulo: p.nome,
            subtitulo: p.descricao?.substring(0, 100),
            navegacao: `/dashboard/portfolio?produto=${p.id}`,
            destaque: p.area_juridica || p.categoria,
            icone: 'Package',
            modulo: 'Portfólio',
            status: p.status,
            codigo: p.codigo,
            area_juridica: p.area_juridica,
            categoria: p.categoria
          })
        })
      }
    }

    // ========================================
    // BUSCA EM PROJETOS (PORTFOLIO)
    // ========================================
    if (tiposSolicitados.includes('projeto')) {
      const { data: projetos } = await supabase
        .from('portfolio_projetos')
        .select(`
          id,
          nome,
          descricao,
          status,
          cliente:cliente_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .or(`nome.ilike.${termoBusca},descricao.ilike.${termoBusca}`)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (projetos) {
        projetos.forEach((p: any) => {
          resultados.push({
            id: p.id,
            tipo: 'projeto',
            titulo: p.nome,
            subtitulo: p.cliente?.nome_completo || p.descricao?.substring(0, 100),
            navegacao: `/dashboard/portfolio?projeto=${p.id}`,
            icone: 'Briefcase',
            modulo: 'Portfólio',
            status: p.status,
            cliente_nome: p.cliente?.nome_completo
          })
        })
      }

      // Busca adicional por nome do cliente
      const { data: projetosPorCliente } = await supabase
        .from('portfolio_projetos')
        .select(`
          id,
          nome,
          descricao,
          status,
          cliente:cliente_id!inner(nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .ilike('cliente.nome_completo', termoBusca)
        .limit(MAX_RESULTADOS_POR_TIPO)

      if (projetosPorCliente) {
        projetosPorCliente.forEach((p: any) => {
          // Evitar duplicatas
          if (!resultados.find(r => r.id === p.id && r.tipo === 'projeto')) {
            resultados.push({
              id: p.id,
              tipo: 'projeto',
              titulo: p.nome,
              subtitulo: p.cliente?.nome_completo || p.descricao?.substring(0, 100),
              navegacao: `/dashboard/portfolio?projeto=${p.id}`,
              icone: 'Briefcase',
              modulo: 'Portfólio',
              status: p.status,
              cliente_nome: p.cliente?.nome_completo
            })
          }
        })
      }
    }

    // Limitar resultados totais e calcular tempo
    const resultadosFinais = resultados.slice(0, MAX_RESULTADOS_TOTAL)
    const tempoBusca = Date.now() - inicio

    const resposta: RespostaBuscaGlobal = {
      sucesso: true,
      resultados: resultadosFinais,
      total: resultados.length,
      tempo_busca_ms: tempoBusca
    }

    return NextResponse.json(resposta)

  } catch (error) {
    console.error('[Search API] Erro interno:', error)
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Erro interno ao realizar busca',
        resultados: [],
        total: 0,
        tempo_busca_ms: Date.now() - inicio
      },
      { status: 500 }
    )
  }
}
