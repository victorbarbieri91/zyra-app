import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { COLUNAS_DISPONIVEIS } from '@/types/relatorios'
import { reportRateLimit } from '@/lib/rate-limit'

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

// Funcao para limpar markdown do texto (remove **, *, #, etc)
function limparMarkdown(texto: string): string {
  if (!texto) return ''
  return texto
    .replace(/\*\*/g, '')      // Remove **negrito**
    .replace(/\*/g, '')        // Remove *italico*
    .replace(/#{1,6}\s?/g, '') // Remove # headers
    .replace(/`/g, '')         // Remove `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [link](url) -> link
    .replace(/^\s*[-•]\s*/gm, '• ') // Normaliza bullets
    .trim()
}

// Cores do design system
const CORES = {
  primaria: '34495e',      // Azul escuro
  secundaria: '46627f',    // Azul médio
  destaque: '89bcbe',      // Verde-azulado
  claro: 'aacfd0',         // Verde claro
  fundo: 'f0f9f9',         // Fundo suave
  branco: 'ffffff',
  texto: '2c3e50',
  bordaHeader: '1E3A8A',   // Azul accent
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

    // Rate limiting
    const rateLimitResult = reportRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return reportRateLimit.errorResponse(rateLimitResult)
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

    // Nome do cliente para o titulo
    const nomesClientes = clientes?.map(c => c.nome_completo).join(', ') || 'Cliente'

    // Criar workbook com ExcelJS (dynamic import para reduzir bundle size)
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.default.Workbook()
    workbook.creator = 'Zyra Legal'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Processos', {
      properties: { tabColor: { argb: CORES.primaria } }
      // Removido frozen header para evitar cabeçalho duplicado
    })

    // ========================================
    // CABEÇALHO DO RELATÓRIO
    // ========================================

    let linhaAtual = 1

    // Tentar adicionar logo se disponível
    if (incluir_logo && escritorio?.logo_url) {
      try {
        // Baixar imagem do logo
        const logoResponse = await fetch(escritorio.logo_url)
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer()
          const logoBase64 = Buffer.from(logoBuffer).toString('base64')

          // Detectar tipo de imagem
          const contentType = logoResponse.headers.get('content-type') || 'image/png'
          const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpeg' : 'png'

          const imageId = workbook.addImage({
            base64: logoBase64,
            extension: extension as 'png' | 'jpeg',
          })

          // Configurar altura das linhas para o logo (mais espaço vertical)
          worksheet.getRow(1).height = 30
          worksheet.getRow(2).height = 30
          worksheet.getRow(3).height = 30

          // Adicionar logo usando posicionamento por células (mantém proporção melhor)
          // Ocupa da coluna 0 até coluna 2, da linha 0 até linha 3
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 } as any,
            br: { col: 2, row: 3 } as any, // Bottom-right: termina na coluna 2, linha 3
            editAs: 'oneCell' // Mantém proporção ao redimensionar
          })

          linhaAtual = 4
        }
      } catch (logoErr) {
        console.log('Erro ao carregar logo, continuando sem logo:', logoErr)
        linhaAtual = 1
      }
    }

    // Linha com nome do escritório (se não tiver logo ou após logo)
    const rowEscritorio = worksheet.getRow(linhaAtual)
    rowEscritorio.getCell(1).value = escritorio?.nome || 'Escritório'
    rowEscritorio.getCell(1).font = {
      size: 18,
      bold: true,
      color: { argb: CORES.primaria }
    }
    rowEscritorio.height = 28
    worksheet.mergeCells(linhaAtual, 1, linhaAtual, Math.min(colunasConfig.length, 6))
    linhaAtual++

    // Linha com título do relatório
    const rowTitulo = worksheet.getRow(linhaAtual)
    rowTitulo.getCell(1).value = `Relatório de Processos - ${nomesClientes}`
    rowTitulo.getCell(1).font = {
      size: 14,
      bold: true,
      color: { argb: CORES.secundaria }
    }
    rowTitulo.height = 22
    worksheet.mergeCells(linhaAtual, 1, linhaAtual, Math.min(colunasConfig.length, 6))
    linhaAtual++

    // Linha com data de geração
    const dataFormatada = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const horaFormatada = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const rowData = worksheet.getRow(linhaAtual)
    rowData.getCell(1).value = `Gerado em ${dataFormatada} às ${horaFormatada}`
    rowData.getCell(1).font = {
      size: 10,
      italic: true,
      color: { argb: '666666' }
    }
    rowData.height = 18
    worksheet.mergeCells(linhaAtual, 1, linhaAtual, Math.min(colunasConfig.length, 6))
    linhaAtual++

    // Linha com total de processos
    const rowTotal = worksheet.getRow(linhaAtual)
    rowTotal.getCell(1).value = `Total: ${processos?.length || 0} processo(s)`
    rowTotal.getCell(1).font = {
      size: 10,
      color: { argb: CORES.secundaria }
    }
    rowTotal.height = 18
    linhaAtual++

    // Linha em branco
    linhaAtual++

    // ========================================
    // CABEÇALHO DA TABELA
    // ========================================

    const headerRow = worksheet.getRow(linhaAtual)
    headerRow.height = 28

    colunasConfig.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = col.label
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: CORES.branco }
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: CORES.bordaHeader }
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      }
      cell.border = {
        top: { style: 'thin', color: { argb: CORES.primaria } },
        left: { style: 'thin', color: { argb: CORES.primaria } },
        bottom: { style: 'thin', color: { argb: CORES.primaria } },
        right: { style: 'thin', color: { argb: CORES.primaria } }
      }
    })

    linhaAtual++

    // ========================================
    // DADOS DA TABELA
    // ========================================

    (processos || []).forEach((processo, rowIndex) => {
      const dataRow = worksheet.getRow(linhaAtual)

      // Cor alternada para as linhas
      const isEven = rowIndex % 2 === 0
      const bgColor = isEven ? CORES.fundo : CORES.branco

      // Armazenar valores e calcular altura necessária para cada célula
      const valoresCelulas: { valor: any; colIndex: number; colField: string }[] = []
      let alturaMaxima = 22 // Altura mínima padrão

      colunasConfig.forEach((col, colIndex) => {
        let valor: any

        switch (col.field) {
          case 'responsavel_nome':
            valor = (processo.profiles as any)?.nome_completo || ''
            break
          case 'resumo_ia':
            valor = limparMarkdown(resumos[processo.id]) || 'Processo em andamento normal.'
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
            valor = processo[col.field] === 'ativo' ? 'Autor' : 'Réu'
            break
          case 'status':
            valor = processo[col.field] || ''
            // Capitalizar primeira letra
            if (valor) {
              valor = valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase()
            }
            break
          default:
            valor = (processo as Record<string, any>)[col.field] || ''
        }

        valoresCelulas.push({ valor, colIndex, colField: col.field })

        // Calcular altura necessária para células com wrapText
        const isTextoLongo = col.field === 'resumo_ia' || col.field === 'objeto_acao'
        if (isTextoLongo && valor && typeof valor === 'string') {
          // Estimar número de linhas baseado na largura da coluna e tamanho do texto
          const larguraColuna = col.field === 'resumo_ia' ? 70 : (col.field === 'objeto_acao' ? 50 : 45)
          const caracteresPorlinha = larguraColuna - 2 // Margem
          const numLinhas = Math.ceil(valor.length / caracteresPorlinha)
          // Cada linha de texto precisa de ~15 pixels de altura
          const alturaCalculada = Math.max(22, numLinhas * 15)
          alturaMaxima = Math.max(alturaMaxima, Math.min(alturaCalculada, 120)) // Máximo de 120
        }
      })

      // Definir altura da linha baseado no maior conteúdo
      dataRow.height = alturaMaxima

      // Agora preencher as células
      valoresCelulas.forEach(({ valor, colIndex, colField }) => {
        const col = colunasConfig[colIndex]
        const cell = dataRow.getCell(colIndex + 1)
        cell.value = valor
        cell.font = {
          size: 10,
          color: { argb: CORES.texto }
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: colField === 'resumo_ia' || colField === 'objeto_acao' ? 'left' : 'center',
          wrapText: colField === 'resumo_ia' || colField === 'objeto_acao'
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'e0e0e0' } },
          left: { style: 'thin', color: { argb: 'e0e0e0' } },
          bottom: { style: 'thin', color: { argb: 'e0e0e0' } },
          right: { style: 'thin', color: { argb: 'e0e0e0' } }
        }
      })

      linhaAtual++
    })

    // ========================================
    // CONFIGURAR LARGURAS DAS COLUNAS (AUTO-FIT)
    // ========================================

    colunasConfig.forEach((col, colIndex) => {
      const column = worksheet.getColumn(colIndex + 1)

      // Calcular largura baseada no maior conteudo
      let maxLength = col.label.length // Começa com o tamanho do header

      // Percorrer todas as celulas da coluna para encontrar o maior conteudo
      ;(processos || []).forEach(processo => {
        let valor: string = ''

        switch (col.field) {
          case 'responsavel_nome':
            valor = (processo.profiles as any)?.nome_completo || ''
            break
          case 'resumo_ia':
            valor = limparMarkdown(resumos[processo.id]) || 'Processo em andamento normal.'
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
            valor = processo[col.field] === 'ativo' ? 'Autor' : 'Réu'
            break
          default:
            valor = String((processo as Record<string, any>)[col.field] || '')
        }

        // Para campos de texto longo, limitar a largura maxima
        const isTextoLongo = col.field === 'resumo_ia' || col.field === 'objeto_acao'
        const maxWidthLimit = isTextoLongo ? 60 : 40

        // Pegar a primeira linha do valor (para textos com quebra de linha)
        const primeiraLinha = valor.split('\n')[0] || ''
        const comprimento = Math.min(primeiraLinha.length, maxWidthLimit)

        if (comprimento > maxLength) {
          maxLength = comprimento
        }
      })

      // Definir largura minima e maxima
      const larguraMinima = 10
      const larguraMaxima = col.field === 'resumo_ia' ? 70 : (col.field === 'objeto_acao' ? 50 : 45)

      // Adicionar margem extra para o conteudo nao ficar colado
      const larguraFinal = Math.max(larguraMinima, Math.min(maxLength + 3, larguraMaxima))

      column.width = larguraFinal
    })

    // ========================================
    // RODAPÉ
    // ========================================

    linhaAtual++ // Linha em branco
    const footerRow = worksheet.getRow(linhaAtual)
    footerRow.getCell(1).value = `Relatório gerado por Zyra Legal • ${escritorio?.nome || ''}`
    footerRow.getCell(1).font = {
      size: 9,
      italic: true,
      color: { argb: '999999' }
    }
    worksheet.mergeCells(linhaAtual, 1, linhaAtual, Math.min(colunasConfig.length, 6))

    // ========================================
    // GERAR ARQUIVO
    // ========================================

    // Gerar buffer do Excel
    const excelBuffer = await workbook.xlsx.writeBuffer()

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
