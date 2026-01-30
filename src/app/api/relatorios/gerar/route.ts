import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { COLUNAS_DISPONIVEIS } from '@/types/relatorios'

interface RequestBody {
  escritorio_id: string
  template_id?: string | null
  colunas: string[]
  clientes_ids: string[]
  incluir_logo: boolean
  salvar_andamentos: boolean
  resumos: Record<string, string>
  processos_ids: string[]
}

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

    const body: RequestBody = await request.json()

    const {
      escritorio_id,
      template_id,
      colunas,
      clientes_ids,
      incluir_logo,
      salvar_andamentos,
      resumos,
      processos_ids
    } = body

    // Buscar dados do escritorio
    const { data: escritorio } = await supabase
      .from('escritorios')
      .select('nome, logo_url')
      .eq('id', escritorio_id)
      .single()

    // Buscar dados dos clientes
    const { data: clientes } = await supabase
      .from('crm_pessoas')
      .select('id, nome_completo')
      .in('id', clientes_ids)

    // Buscar processos com todos os dados necessarios
    const { data: processos, error: processosError } = await supabase
      .from('processos_processos')
      .select(`
        id,
        numero_pasta,
        numero_cnj,
        area,
        fase,
        instancia,
        tribunal,
        vara,
        comarca,
        status,
        autor,
        reu,
        parte_contraria,
        polo_cliente,
        valor_causa,
        valor_atualizado,
        data_distribuicao,
        objeto_acao,
        cliente_id,
        crm_pessoas!processos_processos_cliente_id_fkey(nome_completo),
        profiles!processos_processos_responsavel_id_fkey(nome_completo)
      `)
      .in('id', processos_ids)
      .order('numero_pasta', { ascending: false })

    if (processosError) {
      console.error('Erro ao buscar processos:', processosError)
      return NextResponse.json({
        sucesso: false,
        erro: 'Erro ao buscar processos'
      }, { status: 500 })
    }

    // Mapear colunas para labels
    const colunasConfig = colunas.map(field => {
      const config = COLUNAS_DISPONIVEIS.find(c => c.field === field)
      return config || { field, label: field, width: 15 }
    })

    // Preparar dados para o Excel
    const dadosExcel = (processos || []).map(processo => {
      const row: Record<string, any> = {}

      for (const col of colunasConfig) {
        let valor: any

        switch (col.field) {
          case 'responsavel_nome':
            valor = (processo.profiles as any)?.nome_completo || ''
            break
          case 'resumo_ia':
            valor = resumos[processo.id] || 'Processo em andamento normal.'
            break
          case 'valor_causa':
          case 'valor_atualizado':
            valor = processo[col.field]
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processo[col.field])
              : ''
            break
          case 'data_distribuicao':
            valor = processo[col.field]
              ? new Date(processo[col.field]).toLocaleDateString('pt-BR')
              : ''
            break
          case 'polo_cliente':
            valor = processo[col.field] === 'ativo' ? 'Autor' : 'Reu'
            break
          default:
            valor = (processo as Record<string, any>)[col.field] || ''
        }

        row[col.label] = valor
      }

      return row
    })

    // Criar workbook
    const workbook = XLSX.utils.book_new()

    // Criar worksheet com dados
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel)

    // Configurar larguras das colunas
    const colWidths = colunasConfig.map(col => ({ wch: col.width || 15 }))
    worksheet['!cols'] = colWidths

    // Adicionar cabecalho personalizado
    // Primeiro, vamos mover os dados para baixo para dar espaco ao cabecalho
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Nome do cliente para o titulo
    const nomesClientes = clientes?.map(c => c.nome_completo).join(', ') || 'Cliente'

    // Adicionar linhas de cabecalho no topo
    const headerRows = [
      [escritorio?.nome || 'Escritorio'],
      [`Relatorio de Processos - ${nomesClientes}`],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
      [''] // Linha em branco
    ]

    // Criar novo worksheet com cabecalho
    const newWs = XLSX.utils.aoa_to_sheet(headerRows)

    // Adicionar dados abaixo do cabecalho
    XLSX.utils.sheet_add_json(newWs, dadosExcel, { origin: 'A5' })

    // Atualizar larguras
    newWs['!cols'] = colWidths

    // Adicionar ao workbook
    XLSX.utils.book_append_sheet(workbook, newWs, 'Processos')

    // Gerar buffer do Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const clienteNomeArquivo = clientes?.[0]?.nome_completo?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) || 'Cliente'
    const nomeArquivo = `Relatorio_${clienteNomeArquivo}_${timestamp}.xlsx`

    // Upload para Supabase Storage
    const storagePath = `${escritorio_id}/${nomeArquivo}`

    const { error: uploadError } = await supabase
      .storage
      .from('relatorios')
      .upload(storagePath, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      })

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError)
      return NextResponse.json({
        sucesso: false,
        erro: 'Erro ao salvar arquivo'
      }, { status: 500 })
    }

    // Gerar URL assinada para download
    const { data: signedUrlData } = await supabase
      .storage
      .from('relatorios')
      .createSignedUrl(storagePath, 3600) // URL valida por 1 hora

    const arquivoUrl = signedUrlData?.signedUrl

    // Salvar andamentos se solicitado
    if (salvar_andamentos) {
      const andamentosParaInserir = Object.entries(resumos).map(([processoId, resumo]) => ({
        processo_id: processoId,
        escritorio_id: escritorio_id,
        data_movimento: new Date().toISOString(),
        tipo_descricao: 'Relatorio para Cliente',
        descricao: resumo,
        origem: 'manual',
        lida: true
      }))

      if (andamentosParaInserir.length > 0) {
        const { error: andamentosError } = await supabase
          .from('processos_movimentacoes')
          .insert(andamentosParaInserir)

        if (andamentosError) {
          console.error('Erro ao salvar andamentos:', andamentosError)
        }
      }
    }

    // Salvar no historico
    const { data: relatorio, error: relatorioError } = await supabase
      .from('relatorios_gerados')
      .insert({
        escritorio_id: escritorio_id,
        template_id: template_id || null,
        titulo: `Relatorio - ${nomesClientes}`,
        clientes_ids: clientes_ids,
        processos_ids: processos_ids,
        colunas_usadas: colunas,
        resumos_ia: resumos,
        arquivo_url: storagePath,
        arquivo_nome: nomeArquivo,
        status: 'concluido',
        andamentos_salvos: salvar_andamentos,
        gerado_por: user.id
      })
      .select()
      .single()

    if (relatorioError) {
      console.error('Erro ao salvar historico:', relatorioError)
    }

    return NextResponse.json({
      sucesso: true,
      relatorio_id: relatorio?.id,
      arquivo_url: arquivoUrl,
      arquivo_nome: nomeArquivo
    })

  } catch (error) {
    console.error('Erro ao gerar relatorio:', error)
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno ao gerar relatorio'
    }, { status: 500 })
  }
}
