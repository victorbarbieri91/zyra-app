// ============================================
// API ROUTE: ANÁLISE COM IA PARA MAPEAMENTO
// ============================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SCHEMAS } from '@/lib/migracao/constants'
import { ModuloMigracao, CampoSchema } from '@/types/migracao'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { headers, amostra, modulo } = body as {
      headers: string[]
      amostra: Record<string, unknown>[]
      modulo: ModuloMigracao
    }

    // Validar inputs
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json({ error: 'Headers inválidos' }, { status: 400 })
    }

    if (!modulo || !SCHEMAS[modulo]) {
      return NextResponse.json({ error: 'Módulo inválido' }, { status: 400 })
    }

    // Obter schema do módulo
    const schema = SCHEMAS[modulo]

    // Tentar chamar OpenAI
    const apiKey = process.env.OPENAI_API_KEY

    if (apiKey) {
      try {
        const resultado = await analisarComOpenAI(apiKey, headers, amostra, modulo, schema)
        return NextResponse.json(resultado)
      } catch (error) {
        console.error('Erro ao chamar OpenAI:', error)
        // Fall back para mapeamento heurístico
      }
    }

    // Fallback: mapeamento heurístico
    const resultado = mapeamentoHeuristico(headers, schema)
    return NextResponse.json(resultado)

  } catch (error) {
    console.error('Erro na API de análise:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Análise com OpenAI
async function analisarComOpenAI(
  apiKey: string,
  headers: string[],
  amostra: Record<string, unknown>[],
  modulo: string,
  schema: CampoSchema[]
) {
  const prompt = `Você é um assistente especializado em mapeamento de dados para sistemas jurídicos brasileiros.

Analise os headers e amostra de dados de uma planilha e sugira o mapeamento para os campos do sistema.

## Headers da Planilha:
${JSON.stringify(headers)}

## Amostra de Dados (primeiras linhas):
${JSON.stringify(amostra.slice(0, 3), null, 2)}

## Campos do Sistema (${modulo.toUpperCase()}):
${JSON.stringify(schema.map(c => ({
  campo: c.campo,
  tipo: c.tipo,
  obrigatorio: c.obrigatorio,
  descricao: c.descricao
})), null, 2)}

## Regras:
1. Mapeie cada header para o campo mais apropriado do sistema
2. Se não houver correspondência clara, retorne null para esse header
3. Considere variações comuns em português:
   - "Nome", "Nome Completo", "Cliente", "Razão Social" → nome_completo
   - "CPF", "CNPJ", "CPF/CNPJ", "Documento" → cpf_cnpj
   - "E-mail", "Email", "Correio Eletrônico" → email_principal
   - "Telefone", "Tel", "Fone" → telefone_principal
   - "Celular", "WhatsApp", "Cel" → celular
   - "Processo", "Nº Processo", "Número CNJ" → numero_cnj
4. Analise os dados de amostra para inferir o tipo (ex: formato de CPF, data, etc.)
5. Retorne o nível de confiança (0-100) para cada mapeamento

## Resposta esperada (JSON válido):
{
  "mapeamento": {
    "Header da Planilha": "campo_do_sistema_ou_null"
  },
  "confianca": {
    "Header da Planilha": numero_de_0_a_100
  },
  "sugestoes": ["lista de sugestões ou avisos opcionais"]
}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('Resposta vazia da OpenAI')
  }

  return JSON.parse(content)
}

// Mapeamento heurístico (fallback)
function mapeamentoHeuristico(headers: string[], schema: CampoSchema[]) {
  const mapeamento: Record<string, string | null> = {}
  const confianca: Record<string, number> = {}
  const sugestoes: string[] = []

  // Mapeamentos conhecidos
  const mapeamentosConhecidos: Record<string, { campo: string; confianca: number }[]> = {
    // Nome
    'nome': [{ campo: 'nome_completo', confianca: 90 }],
    'nome completo': [{ campo: 'nome_completo', confianca: 95 }],
    'cliente': [{ campo: 'nome_completo', confianca: 80 }, { campo: 'cliente_ref', confianca: 85 }],
    'razão social': [{ campo: 'nome_completo', confianca: 90 }],
    'razao social': [{ campo: 'nome_completo', confianca: 90 }],

    // Documento
    'cpf': [{ campo: 'cpf_cnpj', confianca: 95 }],
    'cnpj': [{ campo: 'cpf_cnpj', confianca: 95 }],
    'cpf/cnpj': [{ campo: 'cpf_cnpj', confianca: 95 }],
    'cpf_cnpj': [{ campo: 'cpf_cnpj', confianca: 95 }],
    'documento': [{ campo: 'cpf_cnpj', confianca: 80 }],

    // Contato
    'email': [{ campo: 'email_principal', confianca: 90 }],
    'e-mail': [{ campo: 'email_principal', confianca: 90 }],
    'e_mail': [{ campo: 'email_principal', confianca: 90 }],
    'telefone': [{ campo: 'telefone_principal', confianca: 85 }],
    'tel': [{ campo: 'telefone_principal', confianca: 80 }],
    'fone': [{ campo: 'telefone_principal', confianca: 80 }],
    'celular': [{ campo: 'celular', confianca: 90 }],
    'cel': [{ campo: 'celular', confianca: 80 }],
    'whatsapp': [{ campo: 'celular', confianca: 85 }],

    // Endereço
    'cep': [{ campo: 'cep', confianca: 95 }],
    'endereço': [{ campo: 'logradouro', confianca: 70 }],
    'endereco': [{ campo: 'logradouro', confianca: 70 }],
    'rua': [{ campo: 'logradouro', confianca: 85 }],
    'logradouro': [{ campo: 'logradouro', confianca: 95 }],
    'número': [{ campo: 'numero', confianca: 85 }],
    'numero': [{ campo: 'numero', confianca: 85 }],
    'nº': [{ campo: 'numero', confianca: 80 }],
    'complemento': [{ campo: 'complemento', confianca: 95 }],
    'bairro': [{ campo: 'bairro', confianca: 95 }],
    'cidade': [{ campo: 'cidade', confianca: 95 }],
    'município': [{ campo: 'cidade', confianca: 90 }],
    'municipio': [{ campo: 'cidade', confianca: 90 }],
    'estado': [{ campo: 'uf', confianca: 85 }],
    'uf': [{ campo: 'uf', confianca: 95 }],

    // Processo
    'processo': [{ campo: 'numero_cnj', confianca: 85 }],
    'nº processo': [{ campo: 'numero_cnj', confianca: 90 }],
    'número processo': [{ campo: 'numero_cnj', confianca: 90 }],
    'numero processo': [{ campo: 'numero_cnj', confianca: 90 }],
    'numero_cnj': [{ campo: 'numero_cnj', confianca: 95 }],
    'cnj': [{ campo: 'numero_cnj', confianca: 90 }],

    // Outros
    'observação': [{ campo: 'observacoes', confianca: 90 }],
    'observacao': [{ campo: 'observacoes', confianca: 90 }],
    'observações': [{ campo: 'observacoes', confianca: 90 }],
    'observacoes': [{ campo: 'observacoes', confianca: 90 }],
    'obs': [{ campo: 'observacoes', confianca: 80 }],
    'descrição': [{ campo: 'descricao', confianca: 85 }],
    'descricao': [{ campo: 'descricao', confianca: 85 }],
    'assunto': [{ campo: 'assunto', confianca: 90 }],
    'titulo': [{ campo: 'titulo', confianca: 90 }],
    'título': [{ campo: 'titulo', confianca: 90 }],
    'valor': [{ campo: 'valor_total', confianca: 80 }, { campo: 'valor_causa', confianca: 75 }],
    'data': [{ campo: 'data_inicio', confianca: 70 }],
    'status': [{ campo: 'status', confianca: 85 }],
    'situação': [{ campo: 'status', confianca: 80 }],
    'situacao': [{ campo: 'status', confianca: 80 }],
  }

  const camposSchema = schema.map(c => c.campo)
  const camposUsados = new Set<string>()

  for (const header of headers) {
    const headerNormalizado = header.toLowerCase().trim()

    // Buscar mapeamento conhecido
    const matches = mapeamentosConhecidos[headerNormalizado]

    if (matches) {
      // Encontrar primeiro campo disponível que existe no schema
      const match = matches.find(m =>
        camposSchema.includes(m.campo) && !camposUsados.has(m.campo)
      )

      if (match) {
        mapeamento[header] = match.campo
        confianca[header] = match.confianca
        camposUsados.add(match.campo)
        continue
      }
    }

    // Busca parcial
    for (const [key, matches] of Object.entries(mapeamentosConhecidos)) {
      if (headerNormalizado.includes(key) || key.includes(headerNormalizado)) {
        const match = matches.find(m =>
          camposSchema.includes(m.campo) && !camposUsados.has(m.campo)
        )

        if (match) {
          mapeamento[header] = match.campo
          confianca[header] = Math.max(match.confianca - 20, 50) // Reduzir confiança para match parcial
          camposUsados.add(match.campo)
          break
        }
      }
    }

    // Se não encontrou, marcar como null
    if (mapeamento[header] === undefined) {
      mapeamento[header] = null
      sugestoes.push(`Campo "${header}" não foi mapeado automaticamente`)
    }
  }

  return { mapeamento, confianca, sugestoes }
}
