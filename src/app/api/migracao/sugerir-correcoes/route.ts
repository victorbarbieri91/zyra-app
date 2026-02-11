// ============================================
// API DE SUGESTÃO DE CORREÇÕES COM IA
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { migrationRateLimit } from '@/lib/rate-limit'

interface ErroComDados {
  linha: number
  erros: string[]
  dados: Record<string, unknown>
  dadosSaneados?: Record<string, unknown>
}

interface Sugestao {
  linha: number
  campo: string
  valorSugerido: string
  origem: string // De onde veio a sugestão
  confianca: number
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = migrationRateLimit.check(request)
    if (!rateLimitResult.success) {
      return migrationRateLimit.errorResponse(rateLimitResult)
    }

    const body = await request.json()
    const { erros, modulo } = body as {
      erros: ErroComDados[]
      modulo: string
    }

    if (!erros || erros.length === 0) {
      return NextResponse.json({ sugestoes: {} })
    }

    // Analisar cada erro e sugerir correções
    const sugestoes: Record<number, Sugestao[]> = {}

    for (const erro of erros) {
      const sugestoesLinha: Sugestao[] = []

      // Analisar dados originais para encontrar valores que podem ter sido mapeados errado
      const dados = erro.dados
      const dadosSaneados = erro.dadosSaneados || {}

      // ========================================
      // CORREÇÃO DE NÚMERO CNJ
      // ========================================
      if (erro.erros.some(e => e.includes('CNJ'))) {
        // Procurar em TODOS os campos por algo que pareça CNJ
        const padraoCNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/

        for (const [campo, valor] of Object.entries(dados)) {
          if (valor && typeof valor === 'string') {
            const match = valor.match(padraoCNJ)
            if (match) {
              sugestoesLinha.push({
                linha: erro.linha,
                campo: 'numero_cnj',
                valorSugerido: match[0],
                origem: `Encontrado na coluna "${campo}"`,
                confianca: 95
              })
              break
            }
          }
        }
      }

      // ========================================
      // CORREÇÃO DE CLIENTE
      // ========================================
      if (erro.erros.some(e => e.includes('Cliente'))) {
        // Procurar campos que possam conter o nome do cliente
        const camposCliente = [
          'polo do cliente', 'polo_do_cliente', 'cliente', 'nome do cliente',
          'autor', 'réu', 'reu', 'parte ativa', 'parte passiva', 'parte_ativa',
          'parte_passiva', 'nome', 'razão social', 'razao social'
        ]

        for (const [campo, valor] of Object.entries(dados)) {
          const campoLower = campo.toLowerCase()
          if (valor && typeof valor === 'string' && valor.trim()) {
            // Verificar se o campo parece ser um campo de cliente
            const pareceCliente = camposCliente.some(c => campoLower.includes(c))
            // Ou se o valor parece ser um nome (não é número, não é data)
            const pareceNome = valor.length > 3 &&
                              !/^\d+$/.test(valor) &&
                              !/^\d{2}\/\d{2}\/\d{4}$/.test(valor) &&
                              !valor.includes('@')

            if (pareceCliente || (pareceNome && !dadosSaneados.cliente_ref)) {
              // Priorizar campos que claramente são de cliente
              const confianca = pareceCliente ? 90 : 60

              // Verificar se já não foi sugerido este valor
              const jaExiste = sugestoesLinha.some(s =>
                s.campo === 'cliente_ref' && s.valorSugerido === valor.trim()
              )

              if (!jaExiste && confianca > 60) {
                sugestoesLinha.push({
                  linha: erro.linha,
                  campo: 'cliente_ref',
                  valorSugerido: valor.trim(),
                  origem: `Encontrado na coluna "${campo}"`,
                  confianca
                })
              }
            }
          }
        }

        // Ordenar por confiança e pegar o melhor
        const sugestoesCliente = sugestoesLinha.filter(s => s.campo === 'cliente_ref')
        if (sugestoesCliente.length > 1) {
          sugestoesCliente.sort((a, b) => b.confianca - a.confianca)
          // Manter apenas a melhor sugestão de cliente
          const melhor = sugestoesCliente[0]
          sugestoesLinha.splice(0, sugestoesLinha.length,
            ...sugestoesLinha.filter(s => s.campo !== 'cliente_ref'),
            melhor
          )
        }
      }

      // ========================================
      // CORREÇÃO DE CPF/CNPJ
      // ========================================
      if (erro.erros.some(e => e.includes('CPF') || e.includes('CNPJ'))) {
        const padraoCPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/
        const padraoCNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/

        for (const [campo, valor] of Object.entries(dados)) {
          if (valor && typeof valor === 'string') {
            const matchCPF = valor.match(padraoCPF)
            const matchCNPJ = valor.match(padraoCNPJ)

            if (matchCNPJ) {
              sugestoesLinha.push({
                linha: erro.linha,
                campo: 'cpf_cnpj',
                valorSugerido: matchCNPJ[0],
                origem: `Encontrado na coluna "${campo}"`,
                confianca: 90
              })
              break
            } else if (matchCPF) {
              sugestoesLinha.push({
                linha: erro.linha,
                campo: 'cpf_cnpj',
                valorSugerido: matchCPF[0],
                origem: `Encontrado na coluna "${campo}"`,
                confianca: 90
              })
              break
            }
          }
        }
      }

      if (sugestoesLinha.length > 0) {
        sugestoes[erro.linha] = sugestoesLinha
      }
    }

    return NextResponse.json({ sugestoes })

  } catch (error) {
    console.error('Erro ao sugerir correções:', error)
    return NextResponse.json(
      { error: 'Erro ao processar sugestões' },
      { status: 500 }
    )
  }
}
