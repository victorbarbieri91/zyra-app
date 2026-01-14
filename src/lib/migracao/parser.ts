// ============================================
// PARSER DE ARQUIVOS CSV/EXCEL
// ============================================

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { ParseResult } from '@/types/migracao'

/**
 * Parse arquivo CSV ou Excel
 */
export async function parseArquivo(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    return parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file)
  }

  throw new Error('Formato de arquivo não suportado. Use .csv, .xlsx ou .xls')
}

/**
 * Parse arquivo CSV usando PapaParse
 */
async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    let totalLinhas = 0

    // Primeiro, contar total de linhas
    Papa.parse(file, {
      header: false,
      complete: (countResults) => {
        totalLinhas = countResults.data.length - 1 // -1 para header
      }
    })

    // Depois, parsear com header
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value?.trim() || '',
      complete: (results) => {
        // Filtrar headers vazios
        const allHeaders = results.meta.fields || []
        const headers = allHeaders.filter(h => h && h.trim())

        // Filtrar dados para incluir apenas campos com headers válidos
        const amostra = results.data.slice(0, 10).map(row => {
          const obj: Record<string, unknown> = {}
          headers.forEach(header => {
            obj[header] = (row as Record<string, unknown>)[header]
          })
          return obj
        })

        resolve({
          headers,
          amostra,
          totalLinhas: totalLinhas || results.data.length
        })
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`))
      }
    })
  })
}

/**
 * Parse arquivo Excel usando SheetJS
 */
async function parseExcel(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

    // Usar primeira planilha
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('Arquivo Excel vazio')
    }

    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

    if (data.length === 0) {
      throw new Error('Planilha vazia')
    }

    // Detectar linha de headers (pular linhas de título)
    const headerRowIndex = encontrarLinhaHeaders(data)

    // Headers são da linha detectada - manter mapeamento de índices
    const rawHeaders = (data[headerRowIndex] as string[]).map(h => String(h).trim())

    // Criar mapeamento: índice do header válido → índice original na planilha
    const headerMapping: { header: string; originalIndex: number }[] = []
    rawHeaders.forEach((header, originalIndex) => {
      if (header) { // Apenas headers não vazios
        headerMapping.push({ header, originalIndex })
      }
    })

    const headers = headerMapping.map(h => h.header)
    const rows = data.slice(headerRowIndex + 1).filter(row => (row as unknown[]).some(cell => cell !== ''))

    // Converter para objetos usando mapeamento correto de índices
    const amostra = rows.slice(0, 10).map(row => {
      const obj: Record<string, unknown> = {}
      headerMapping.forEach(({ header, originalIndex }) => {
        let value = (row as unknown[])[originalIndex] // Usar índice original!

        // Converter Date para string
        if (value instanceof Date) {
          value = formatarData(value)
        }

        obj[header] = value !== undefined && value !== null ? String(value).trim() : ''
      })
      return obj
    })

    return {
      headers,
      amostra,
      totalLinhas: rows.length
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao processar arquivo Excel')
  }
}

/**
 * Encontrar a linha que contém os headers reais
 * Pula linhas de título que geralmente têm poucas colunas preenchidas
 */
function encontrarLinhaHeaders(data: unknown[][]): number {
  // Verificar as primeiras 5 linhas
  const maxLinhasVerificar = Math.min(5, data.length)

  for (let i = 0; i < maxLinhasVerificar; i++) {
    const linha = data[i] as unknown[]
    const celulasPreenchidas = linha.filter(cell => cell !== '' && cell !== null && cell !== undefined)

    // Se a linha tem 3+ colunas preenchidas, provavelmente é a linha de headers
    if (celulasPreenchidas.length >= 3) {
      // Verificar se a próxima linha também tem dados (confirmação)
      if (i + 1 < data.length) {
        const proximaLinha = data[i + 1] as unknown[]
        const proximasPreenchidas = proximaLinha.filter(cell => cell !== '' && cell !== null && cell !== undefined)

        // Se a próxima linha tem quantidade similar de células, é header
        if (proximasPreenchidas.length >= celulasPreenchidas.length * 0.5) {
          return i
        }
      }
      return i
    }
  }

  // Default: primeira linha
  return 0
}

/**
 * Formatar data para string
 */
function formatarData(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const ano = date.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/**
 * Validar arquivo antes do parse
 */
export function validarArquivo(file: File): { valido: boolean; erro?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = [
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  const allowedExtensions = ['csv', 'xlsx', 'xls']

  // Verificar tamanho
  if (file.size > maxSize) {
    return { valido: false, erro: 'Arquivo muito grande. Máximo permitido: 10MB' }
  }

  // Verificar extensão
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valido: false, erro: 'Formato não suportado. Use .csv, .xlsx ou .xls' }
  }

  return { valido: true }
}
