// ============================================
// EDGE FUNCTION: PROCESSAMENTO DE MIGRAÇÃO
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id, acao } = await req.json()

    if (!job_id || !acao) {
      return new Response(
        JSON.stringify({ error: 'job_id e acao são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar job
    const { data: job, error: jobError } = await supabase
      .from('migracao_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Executar ação
    switch (acao) {
      case 'processar':
        // Processar em background
        EdgeRuntime.waitUntil(processarArquivo(supabase, job))
        break

      case 'importar':
        // Importar em background
        EdgeRuntime.waitUntil(importarDados(supabase, job))
        break

      case 'cancelar':
        await cancelarJob(supabase, job)
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// PROCESSAMENTO DO ARQUIVO
// ============================================

async function processarArquivo(supabase: any, job: any) {
  try {
    // 1. Atualizar status
    await atualizarJob(supabase, job.id, {
      status: 'processando',
      etapa_atual: 'baixando_arquivo',
      iniciado_em: new Date().toISOString()
    })

    // 2. Baixar arquivo do storage
    const { data: arquivoData, error: downloadError } = await supabase.storage
      .from('migracao-temp')
      .download(job.arquivo_storage_path)

    if (downloadError) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`)
    }

    // 3. Parse do arquivo
    await atualizarJob(supabase, job.id, { etapa_atual: 'parseando_arquivo' })

    const linhas = await parseArquivo(arquivoData, job.arquivo_nome)

    await atualizarJob(supabase, job.id, { total_linhas: linhas.length })

    // 4. Validar cada linha
    await atualizarJob(supabase, job.id, {
      status: 'validando',
      etapa_atual: 'validando_dados'
    })

    const resultado = await validarLinhas(supabase, job, linhas)

    // 5. Atualizar com resultados
    await atualizarJob(supabase, job.id, {
      status: 'aguardando_revisao',
      etapa_atual: null,
      linhas_processadas: linhas.length,
      linhas_validas: resultado.validas.length,
      linhas_com_erro: resultado.erros.length,
      linhas_duplicadas: resultado.duplicatas.length,
      erros: resultado.erros,
      duplicatas: resultado.duplicatas,
      campos_extras: resultado.camposExtras,
      resultado_final: { dados_validados: resultado.validas }
    })

  } catch (error) {
    console.error('Erro ao processar:', error)
    await atualizarJob(supabase, job.id, {
      status: 'erro',
      resultado_final: { erro: error.message }
    })
  }
}

// ============================================
// PARSE DE ARQUIVO
// ============================================

async function parseArquivo(blob: Blob, fileName: string): Promise<Record<string, any>[]> {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    return parseCSV(blob)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(blob)
  }

  throw new Error('Formato não suportado')
}

async function parseCSV(blob: Blob): Promise<Record<string, any>[]> {
  const text = await blob.text()
  const lines = text.split('\n').filter(line => line.trim())

  if (lines.length < 2) return []

  // Detectar separador
  const firstLine = lines[0]
  const separator = firstLine.includes(';') ? ';' : ','

  const headers = parseCSVLine(firstLine, separator)
  const result: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator)
    const row: Record<string, any> = {}

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || ''
    })

    result.push(row)
  }

  return result
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result.map(s => s.replace(/^"|"$/g, ''))
}

async function parseExcel(blob: Blob): Promise<Record<string, any>[]> {
  const buffer = await blob.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

  if (data.length < 2) return []

  // Detectar linha de headers (pular linhas de título)
  const headerRowIndex = encontrarLinhaHeaders(data)

  const headers = data[headerRowIndex].map((h: any) => String(h).trim()).filter(Boolean)
  const result: Record<string, any>[] = []

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row: Record<string, any> = {}
    const values = data[i]

    if (!values.some((v: any) => v !== '')) continue // Pular linhas vazias

    headers.forEach((header, index) => {
      let value = values[index]

      // Converter Date para string
      if (value instanceof Date) {
        value = formatarData(value)
      }

      row[header] = value !== undefined && value !== null ? String(value).trim() : ''
    })

    result.push(row)
  }

  return result
}

/**
 * Encontrar a linha que contém os headers reais
 * Pula linhas de título que geralmente têm poucas colunas preenchidas
 */
function encontrarLinhaHeaders(data: any[][]): number {
  const maxLinhasVerificar = Math.min(5, data.length)

  for (let i = 0; i < maxLinhasVerificar; i++) {
    const linha = data[i]
    const celulasPreenchidas = linha.filter((cell: any) => cell !== '' && cell !== null && cell !== undefined)

    // Se a linha tem 3+ colunas preenchidas, provavelmente é a linha de headers
    if (celulasPreenchidas.length >= 3) {
      // Verificar se a próxima linha também tem dados
      if (i + 1 < data.length) {
        const proximaLinha = data[i + 1]
        const proximasPreenchidas = proximaLinha.filter((cell: any) => cell !== '' && cell !== null && cell !== undefined)

        if (proximasPreenchidas.length >= celulasPreenchidas.length * 0.5) {
          return i
        }
      }
      return i
    }
  }

  return 0
}

function formatarData(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const ano = date.getFullYear()
  return `${dia}/${mes}/${ano}`
}

// ============================================
// VALIDAÇÃO DE LINHAS
// ============================================

async function validarLinhas(supabase: any, job: any, linhas: Record<string, any>[]) {
  const mapeamento = job.mapeamento
  const modulo = job.modulo
  const escritorioId = job.escritorio_id

  const validas: any[] = []
  const erros: any[] = []
  const duplicatas: any[] = []
  const camposExtras = new Set<string>()

  // Identificar campos não mapeados
  const camposMapeados = Object.entries(mapeamento)
    .filter(([_, v]) => v)
    .map(([k, _]) => k)

  if (linhas.length > 0) {
    Object.keys(linhas[0]).forEach(h => {
      if (!camposMapeados.includes(h)) {
        camposExtras.add(h)
      }
    })
  }

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const numLinha = i + 2 // +2 porque linha 1 é header

    // Aplicar mapeamento
    const registro = aplicarMapeamento(linha, mapeamento, Array.from(camposExtras))

    // Validar
    const errosLinha = validarRegistro(registro, modulo)

    if (errosLinha.length > 0) {
      erros.push({ linha: numLinha, erros: errosLinha, dados: linha })
      continue
    }

    // Checar duplicata
    const duplicata = await checarDuplicata(supabase, registro, modulo, escritorioId)

    if (duplicata) {
      duplicatas.push({
        linha: numLinha,
        campo: duplicata.campo,
        valor: duplicata.valor,
        existente: duplicata.existente,
        dados: linha
      })
      continue
    }

    validas.push({ linha: numLinha, dados: registro })

    // Atualizar progresso a cada 20 linhas
    if (i % 20 === 0) {
      await atualizarJob(supabase, job.id, { linhas_processadas: i + 1 })
    }
  }

  return {
    validas,
    erros,
    duplicatas,
    camposExtras: Array.from(camposExtras)
  }
}

function aplicarMapeamento(
  linha: Record<string, any>,
  mapeamento: Record<string, string | null>,
  camposExtras: string[]
): Record<string, any> {
  const resultado: Record<string, any> = {}
  const observacoesExtras: string[] = []

  // Aplicar mapeamento
  for (const [header, campo] of Object.entries(mapeamento)) {
    if (campo && linha[header] !== undefined) {
      resultado[campo] = linha[header]
    }
  }

  // Concatenar campos extras nas observações
  for (const header of camposExtras) {
    const valor = linha[header]
    if (valor && String(valor).trim()) {
      observacoesExtras.push(`${header}: ${valor}`)
    }
  }

  if (observacoesExtras.length > 0) {
    resultado.observacoes = [
      resultado.observacoes || '',
      observacoesExtras.join(' | ')
    ].filter(Boolean).join('\n')
  }

  return resultado
}

function validarRegistro(registro: Record<string, any>, modulo: string): string[] {
  const erros: string[] = []

  // Validações por módulo
  switch (modulo) {
    case 'crm':
      if (!registro.nome_completo?.trim()) {
        erros.push('Nome é obrigatório')
      }
      if (registro.cpf_cnpj) {
        const docValido = validarDocumento(registro.cpf_cnpj)
        if (!docValido.valido) {
          erros.push(docValido.erro!)
        }
      }
      if (registro.email_principal && !validarEmail(registro.email_principal)) {
        erros.push('E-mail inválido')
      }
      break

    case 'processos':
      if (!registro.numero_cnj?.trim()) {
        erros.push('Número do processo é obrigatório')
      } else if (!validarNumeroCNJ(registro.numero_cnj)) {
        erros.push('Número CNJ em formato inválido')
      }
      if (!registro.cliente_ref?.trim()) {
        erros.push('Cliente é obrigatório')
      }
      break

    case 'consultivo':
      if (!registro.assunto?.trim()) {
        erros.push('Assunto é obrigatório')
      }
      if (!registro.cliente_ref?.trim()) {
        erros.push('Cliente é obrigatório')
      }
      break

    case 'agenda':
      if (!registro.titulo?.trim()) {
        erros.push('Título é obrigatório')
      }
      if (!registro.data_inicio) {
        erros.push('Data é obrigatória')
      }
      break

    case 'financeiro':
      if (!registro.descricao?.trim()) {
        erros.push('Descrição é obrigatória')
      }
      if (!registro.valor_total || isNaN(parseFloat(String(registro.valor_total).replace(',', '.')))) {
        erros.push('Valor é obrigatório e deve ser numérico')
      }
      if (!registro.cliente_ref?.trim()) {
        erros.push('Cliente é obrigatório')
      }
      break
  }

  return erros
}

// ============================================
// VALIDADORES
// ============================================

function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(numeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(numeros[10])) return false

  return true
}

function validarCNPJ(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numeros[i]) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(numeros[12])) return false

  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numeros[i]) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  if (digito2 !== parseInt(numeros[13])) return false

  return true
}

function validarDocumento(doc: string): { valido: boolean; erro?: string } {
  if (!doc) return { valido: true }

  const numeros = doc.replace(/\D/g, '')

  if (numeros.length === 11) {
    if (validarCPF(numeros)) {
      return { valido: true }
    }
    return { valido: false, erro: 'CPF inválido' }
  }

  if (numeros.length === 14) {
    if (validarCNPJ(numeros)) {
      return { valido: true }
    }
    return { valido: false, erro: 'CNPJ inválido' }
  }

  return { valido: false, erro: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos' }
}

function validarEmail(email: string): boolean {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function validarNumeroCNJ(numero: string): boolean {
  if (!numero) return false
  return /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(numero.trim())
}

// ============================================
// CHECAGEM DE DUPLICATAS
// ============================================

async function checarDuplicata(
  supabase: any,
  registro: Record<string, any>,
  modulo: string,
  escritorioId: string
) {
  switch (modulo) {
    case 'crm':
      if (registro.cpf_cnpj) {
        const doc = registro.cpf_cnpj.replace(/\D/g, '')
        const { data } = await supabase
          .from('crm_pessoas')
          .select('id, nome_completo')
          .eq('escritorio_id', escritorioId)
          .ilike('cpf_cnpj', `%${doc}%`)
          .limit(1)

        if (data?.length > 0) {
          return {
            campo: 'cpf_cnpj',
            valor: registro.cpf_cnpj,
            existente: { id: data[0].id, nome: data[0].nome_completo }
          }
        }
      }
      break

    case 'processos':
      if (registro.numero_cnj) {
        const { data } = await supabase
          .from('processos_processos')
          .select('id, numero_cnj')
          .eq('escritorio_id', escritorioId)
          .eq('numero_cnj', registro.numero_cnj.trim())
          .limit(1)

        if (data?.length > 0) {
          return {
            campo: 'numero_cnj',
            valor: registro.numero_cnj,
            existente: { id: data[0].id, numero: data[0].numero_cnj }
          }
        }
      }
      break
  }

  return null
}

// ============================================
// IMPORTAÇÃO DE DADOS
// ============================================

async function importarDados(supabase: any, job: any) {
  try {
    await atualizarJob(supabase, job.id, {
      status: 'importando',
      etapa_atual: 'inserindo_registros'
    })

    const dados = job.resultado_final?.dados_validados || []
    const correcoes = job.correcoes_usuario || {}
    const modulo = job.modulo
    const escritorioId = job.escritorio_id

    // Filtrar dados com base nas correções
    const dadosParaImportar = dados.filter((d: any) => {
      const correcao = correcoes[d.linha]
      return !correcao || correcao.tipo !== 'pular'
    })

    // Aplicar correções
    const dadosCorrigidos = dadosParaImportar.map((d: any) => {
      const correcao = correcoes[d.linha]
      if (correcao?.tipo === 'corrigir' && correcao.campo && correcao.valor) {
        d.dados[correcao.campo] = correcao.valor
      } else if (correcao?.tipo === 'remover_campo' && correcao.campo) {
        delete d.dados[correcao.campo]
      }
      return d
    })

    // Importar em batches
    const batchSize = 50
    let importados = 0

    for (let i = 0; i < dadosCorrigidos.length; i += batchSize) {
      const batch = dadosCorrigidos.slice(i, i + batchSize)

      await inserirBatch(supabase, batch, modulo, escritorioId, job.criado_por)

      importados += batch.length
      await atualizarJob(supabase, job.id, { linhas_importadas: importados })
    }

    // Finalizar
    await atualizarJob(supabase, job.id, {
      status: 'concluido',
      etapa_atual: null,
      concluido_em: new Date().toISOString()
    })

    // Registrar no histórico
    await supabase.from('migracao_historico').insert({
      escritorio_id: escritorioId,
      job_id: job.id,
      modulo: modulo,
      arquivo_nome: job.arquivo_nome,
      total_importados: importados,
      total_erros: job.linhas_com_erro,
      total_duplicatas: job.linhas_duplicadas,
      executado_por: job.criado_por
    })

    // Limpar arquivo do storage
    await supabase.storage
      .from('migracao-temp')
      .remove([job.arquivo_storage_path])

  } catch (error) {
    console.error('Erro ao importar:', error)
    await atualizarJob(supabase, job.id, {
      status: 'erro',
      resultado_final: { ...job.resultado_final, erro: error.message }
    })
  }
}

async function inserirBatch(
  supabase: any,
  batch: any[],
  modulo: string,
  escritorioId: string,
  userId: string
) {
  switch (modulo) {
    case 'crm':
      await inserirCRM(supabase, batch, escritorioId)
      break
    case 'processos':
      await inserirProcessos(supabase, batch, escritorioId, userId)
      break
    case 'consultivo':
      await inserirConsultivo(supabase, batch, escritorioId, userId)
      break
    case 'agenda':
      await inserirAgenda(supabase, batch, escritorioId, userId)
      break
    case 'financeiro':
      await inserirFinanceiro(supabase, batch, escritorioId, userId)
      break
  }
}

// ============================================
// IMPORTERS POR MÓDULO
// ============================================

async function inserirCRM(supabase: any, batch: any[], escritorioId: string) {
  const registros = batch.map(item => {
    const dados = item.dados
    const doc = dados.cpf_cnpj?.replace(/\D/g, '') || ''

    return {
      escritorio_id: escritorioId,
      nome_completo: dados.nome_completo,
      tipo_pessoa: doc.length === 14 ? 'pj' : 'pf',
      tipo_contato: dados.tipo_contato || 'cliente',
      cpf_cnpj: formatarDocumento(dados.cpf_cnpj),
      email_principal: dados.email_principal || null,
      telefone_principal: dados.telefone_principal || null,
      celular: dados.celular || null,
      cep: dados.cep || null,
      logradouro: dados.logradouro || null,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro || null,
      cidade: dados.cidade || null,
      uf: dados.uf || null,
      observacoes: dados.observacoes || null,
      status: 'ativo'
    }
  })

  const { error } = await supabase.from('crm_pessoas').insert(registros)
  if (error) throw error
}

async function inserirProcessos(supabase: any, batch: any[], escritorioId: string, userId: string) {
  for (const item of batch) {
    const dados = item.dados

    // Resolver cliente_id
    const clienteId = await resolverClienteId(supabase, dados.cliente_ref, escritorioId)

    const registro = {
      escritorio_id: escritorioId,
      numero_cnj: dados.numero_cnj,
      cliente_id: clienteId,
      polo_cliente: dados.polo_cliente || 'ativo',
      area: dados.area || 'civel',
      tribunal: dados.tribunal || null,
      vara: dados.vara || null,
      comarca: dados.comarca || null,
      valor_causa: parseValor(dados.valor_causa),
      data_distribuicao: parseData(dados.data_distribuicao),
      objeto_acao: dados.objeto_acao || null,
      observacoes: dados.observacoes || null,
      status: dados.status || 'ativo',
      tipo: 'judicial',
      fase: 'conhecimento',
      instancia: '1a',
      responsavel_id: userId
    }

    const { error } = await supabase.from('processos_processos').insert(registro)
    if (error) throw error
  }
}

async function inserirConsultivo(supabase: any, batch: any[], escritorioId: string, userId: string) {
  for (const item of batch) {
    const dados = item.dados

    const clienteId = await resolverClienteId(supabase, dados.cliente_ref, escritorioId)

    const registro = {
      escritorio_id: escritorioId,
      numero_interno: dados.numero_interno || `CONS-${Date.now()}`,
      cliente_id: clienteId,
      tipo: dados.tipo || 'simples',
      area: dados.area || 'civel',
      assunto: dados.assunto,
      descricao: dados.descricao || dados.assunto,
      data_recebimento: parseData(dados.data_recebimento) || new Date().toISOString(),
      status: dados.status || 'nova',
      responsavel_id: userId,
      observacoes: dados.observacoes || null
    }

    const { error } = await supabase.from('consultivo_consultas').insert(registro)
    if (error) throw error
  }
}

async function inserirAgenda(supabase: any, batch: any[], escritorioId: string, userId: string) {
  for (const item of batch) {
    const dados = item.dados
    const tipoItem = dados.tipo_item || 'tarefa'

    // Resolver vinculações opcionais
    let processoId = null
    let clienteId = null

    if (dados.processo_ref) {
      processoId = await resolverProcessoId(supabase, dados.processo_ref, escritorioId)
    }
    if (dados.cliente_ref) {
      clienteId = await resolverClienteId(supabase, dados.cliente_ref, escritorioId)
    }

    if (tipoItem === 'tarefa' || tipoItem === 'evento') {
      const tabela = tipoItem === 'tarefa' ? 'agenda_tarefas' : 'agenda_eventos'

      const registro: any = {
        escritorio_id: escritorioId,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        data_inicio: parseDataHora(dados.data_inicio),
        data_fim: parseDataHora(dados.data_fim),
        status: dados.status || (tipoItem === 'tarefa' ? 'pendente' : 'agendado'),
        responsavel_id: userId,
        criado_por: userId,
        observacoes: dados.observacoes || null
      }

      if (tipoItem === 'tarefa') {
        registro.tipo = 'outro'
        registro.prioridade = dados.prioridade || 'media'
      } else {
        registro.tipo = 'compromisso'
        registro.local = dados.local || null
        registro.cliente_id = clienteId
        registro.processo_id = processoId
      }

      const { error } = await supabase.from(tabela).insert(registro)
      if (error) throw error
    }
  }
}

async function inserirFinanceiro(supabase: any, batch: any[], escritorioId: string, userId: string) {
  for (const item of batch) {
    const dados = item.dados

    const clienteId = await resolverClienteId(supabase, dados.cliente_ref, escritorioId)
    let processoId = null
    if (dados.processo_ref) {
      processoId = await resolverProcessoId(supabase, dados.processo_ref, escritorioId)
    }

    const registro = {
      escritorio_id: escritorioId,
      numero_interno: `HON-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      cliente_id: clienteId,
      processo_id: processoId,
      descricao: dados.descricao,
      valor_total: parseValor(dados.valor_total),
      tipo_lancamento: dados.tipo_lancamento || 'avulso',
      data_competencia: parseData(dados.data_competencia) || new Date().toISOString().split('T')[0],
      data_emissao: new Date().toISOString().split('T')[0],
      status: dados.status || 'em_aberto',
      responsavel_id: userId,
      observacoes: dados.observacoes || null
    }

    const { error } = await supabase.from('honorarios').insert(registro)
    if (error) throw error
  }
}

// ============================================
// HELPERS
// ============================================

async function resolverClienteId(supabase: any, referencia: string, escritorioId: string): Promise<string | null> {
  if (!referencia) return null

  // Tentar por CPF/CNPJ
  const doc = referencia.replace(/\D/g, '')
  if (doc.length === 11 || doc.length === 14) {
    const { data } = await supabase
      .from('crm_pessoas')
      .select('id')
      .eq('escritorio_id', escritorioId)
      .ilike('cpf_cnpj', `%${doc}%`)
      .limit(1)

    if (data?.length > 0) return data[0].id
  }

  // Tentar por nome
  const { data } = await supabase
    .from('crm_pessoas')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .ilike('nome_completo', `%${referencia}%`)
    .limit(1)

  return data?.[0]?.id || null
}

async function resolverProcessoId(supabase: any, referencia: string, escritorioId: string): Promise<string | null> {
  if (!referencia) return null

  const { data } = await supabase
    .from('processos_processos')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .eq('numero_cnj', referencia.trim())
    .limit(1)

  return data?.[0]?.id || null
}

function formatarDocumento(doc: string | null): string | null {
  if (!doc) return null

  const numeros = doc.replace(/\D/g, '')

  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  return doc
}

function parseValor(valor: any): number | null {
  if (!valor) return null

  let limpo = String(valor).replace(/[R$\s]/g, '')

  // Tratar formato brasileiro
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }

  const numero = parseFloat(limpo)
  return isNaN(numero) ? null : numero
}

function parseData(data: any): string | null {
  if (!data) return null

  const str = String(data).trim()

  // DD/MM/YYYY ou DD-MM-YYYY
  const matchDMY = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (matchDMY) {
    const [, dia, mes, ano] = matchDMY
    return `${ano}-${mes}-${dia}`
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  return null
}

function parseDataHora(data: any): string | null {
  const dataStr = parseData(data)
  if (dataStr) {
    return `${dataStr}T09:00:00`
  }
  return null
}

async function atualizarJob(supabase: any, jobId: string, updates: Record<string, any>) {
  await supabase
    .from('migracao_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function cancelarJob(supabase: any, job: any) {
  await atualizarJob(supabase, job.id, {
    status: 'cancelado',
    concluido_em: new Date().toISOString()
  })

  // Limpar arquivo
  await supabase.storage
    .from('migracao-temp')
    .remove([job.arquivo_storage_path])
}
