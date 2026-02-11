// ============================================
// API ROUTE: ANÁLISE COM IA PARA MAPEAMENTO
// ============================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SCHEMAS } from '@/lib/migracao/constants'
import { ModuloMigracao, CampoSchema } from '@/types/migracao'
import { migrationRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = migrationRateLimit.check(request, user.id)
    if (!rateLimitResult.success) {
      return migrationRateLimit.errorResponse(rateLimitResult)
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

    // Fallback: mapeamento heurístico com análise de dados
    const resultado = mapeamentoHeuristico(headers, amostra, schema)
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

IMPORTANTE: Analise PRINCIPALMENTE os DADOS de cada coluna, não apenas os nomes dos headers!

## Headers da Planilha:
${JSON.stringify(headers)}

## Amostra de Dados (primeiras linhas):
${JSON.stringify(amostra.slice(0, 5), null, 2)}

## Campos do Sistema (${modulo.toUpperCase()}):
${JSON.stringify(schema.map(c => ({
  campo: c.campo,
  tipo: c.tipo,
  obrigatorio: c.obrigatorio,
  descricao: c.descricao,
  valores: c.valores
})), null, 2)}

## REGRAS CRÍTICAS DE ANÁLISE:

### 1. NÚMERO CNJ (numero_cnj) - PRIORIDADE MÁXIMA
- Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (ex: 5005161-16.2020.4.03.6100)
- Se os DADOS contêm esse padrão, mesmo com prefixos como "CNJ:", "Processo:", "Nº", mapear para numero_cnj
- O sistema vai limpar os prefixos automaticamente
- Exemplo: "CNJ: 5005161-16.2020.4.03.6100" → deve mapear para numero_cnj

### 2. CLIENTE/NOME (cliente_ref para processos, nome_completo para CRM)
- Procure colunas com nomes de pessoas ou empresas
- Headers como: "Autor", "Réu", "Parte", "Cliente", "Polo do cliente", "Nome"
- Se for módulo PROCESSOS e houver coluna "Autor" ou "Polo do cliente" com nomes, mapear para cliente_ref

### 3. ANÁLISE POR TIPO DE DADO:
- CPF: 11 dígitos ou XXX.XXX.XXX-XX → cpf_cnpj
- CNPJ: 14 dígitos ou XX.XXX.XXX/XXXX-XX → cpf_cnpj
- Datas: DD/MM/YYYY ou YYYY-MM-DD → campos de data
- E-mail: contém @ → email_principal
- Valores monetários: R$, números decimais → valor_causa, valor_total
- UF: 2 letras maiúsculas (SP, RJ, MG...) → uf

### 4. MAPEAMENTOS COMUNS EM PLANILHAS JURÍDICAS:
- "Número", "Nº", "N°" com dados tipo CNJ → numero_cnj
- "Área", "Matéria" → area
- "Comarca", "Foro" → comarca
- "Vara", "Juízo" → vara
- "Tribunal", "Órgão Julgador" → tribunal
- "Situação do Processo", "Status" → status
- "Polo", "Posição" → polo_cliente
- "Parte Contrária", "Réu", "Autor" (oposto ao cliente) → parte_contraria
- "Advogado responsável", "Responsável" → responsavel_ref
- "Valor da causa", "Valor" → valor_causa

### 5. REGRA DE OURO:
Se o nome do header não combina mas os DADOS claramente pertencem a um campo, USE OS DADOS para decidir!

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

// Mapeamento heurístico (fallback) com análise de dados
function mapeamentoHeuristico(headers: string[], amostra: Record<string, unknown>[], schema: CampoSchema[]) {
  const mapeamento: Record<string, string | null> = {}
  const confianca: Record<string, number> = {}
  const sugestoes: string[] = []

  // Funções de detecção de padrões nos dados
  const padroes = {
    // Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (pode ter prefixos)
    cnj: (valor: string) => /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(valor),
    // UF: exatamente 2 letras maiúsculas
    uf: (valor: string) => /^[A-Z]{2}$/.test(valor.trim()),
    // CPF: 11 dígitos
    cpf: (valor: string) => /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(valor.replace(/\s/g, '')),
    // CNPJ: 14 dígitos
    cnpj: (valor: string) => /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(valor.replace(/\s/g, '')),
    // Email
    email: (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor),
    // Data brasileira
    data: (valor: string) => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(valor),
    // Valor monetário
    valor: (valor: string) => /^R?\$?\s*[\d.,]+$/.test(valor),
  }

  // Analisar dados de cada coluna para detectar padrões
  const detectarPadraoDados = (header: string): { campo: string; confianca: number } | null => {
    const valores = amostra
      .map(row => String(row[header] || '').trim())
      .filter(v => v && v !== '-')

    if (valores.length === 0) return null

    // Verificar padrão CNJ (prioridade máxima)
    const temCNJ = valores.some(v => padroes.cnj(v))
    if (temCNJ) {
      return { campo: 'numero_cnj', confianca: 95 }
    }

    // Verificar UF (exatamente 2 letras em todos os valores)
    const todosUF = valores.every(v => padroes.uf(v) || v === '')
    if (todosUF && valores.some(v => padroes.uf(v))) {
      return { campo: 'uf', confianca: 90 }
    }

    // Verificar CPF/CNPJ
    const temDocumento = valores.some(v => padroes.cpf(v) || padroes.cnpj(v))
    if (temDocumento) {
      return { campo: 'cpf_cnpj', confianca: 90 }
    }

    // Verificar email
    const temEmail = valores.some(v => padroes.email(v))
    if (temEmail) {
      return { campo: 'email_principal', confianca: 90 }
    }

    return null
  }

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

    // Tipo de contato
    'tipo': [{ campo: 'tipo_contato', confianca: 90 }],
    'type': [{ campo: 'tipo_contato', confianca: 85 }],
    'tipo_contato': [{ campo: 'tipo_contato', confianca: 95 }],
    'tipo contato': [{ campo: 'tipo_contato', confianca: 95 }],
    'categoria': [{ campo: 'tipo_contato', confianca: 85 }],
    'classificação': [{ campo: 'tipo_contato', confianca: 85 }],
    'classificacao': [{ campo: 'tipo_contato', confianca: 85 }],

    // Data de nascimento
    'nascimento': [{ campo: 'data_nascimento', confianca: 90 }],
    'data nascimento': [{ campo: 'data_nascimento', confianca: 95 }],
    'data_nascimento': [{ campo: 'data_nascimento', confianca: 95 }],
    'dt nascimento': [{ campo: 'data_nascimento', confianca: 85 }],
    'dt. nascimento': [{ campo: 'data_nascimento', confianca: 85 }],

    // Profissão
    'profissão': [{ campo: 'profissao', confianca: 95 }],
    'profissao': [{ campo: 'profissao', confianca: 95 }],
    'ocupação': [{ campo: 'profissao', confianca: 85 }],
    'ocupacao': [{ campo: 'profissao', confianca: 85 }],

    // ========================================
    // PROCESSOS
    // ========================================

    // Tipo de processo
    'tipo processo': [{ campo: 'tipo', confianca: 95 }],
    'tipo_processo': [{ campo: 'tipo', confianca: 95 }],
    'natureza': [{ campo: 'tipo', confianca: 80 }],

    // Fase processual
    'fase': [{ campo: 'fase', confianca: 95 }],
    'fase processual': [{ campo: 'fase', confianca: 95 }],
    'fase_processual': [{ campo: 'fase', confianca: 95 }],
    'etapa': [{ campo: 'fase', confianca: 80 }],

    // Instância
    'instância': [{ campo: 'instancia', confianca: 95 }],
    'instancia': [{ campo: 'instancia', confianca: 95 }],
    'grau': [{ campo: 'instancia', confianca: 85 }],
    'grau jurisdicional': [{ campo: 'instancia', confianca: 90 }],

    // Tribunal
    'tribunal': [{ campo: 'tribunal', confianca: 95 }],
    'órgão julgador': [{ campo: 'tribunal', confianca: 85 }],
    'orgao julgador': [{ campo: 'tribunal', confianca: 85 }],

    // Comarca
    'comarca': [{ campo: 'comarca', confianca: 95 }],
    'foro': [{ campo: 'comarca', confianca: 85 }],
    'circunscrição': [{ campo: 'comarca', confianca: 80 }],

    // Vara
    'vara': [{ campo: 'vara', confianca: 95 }],
    'juízo': [{ campo: 'vara', confianca: 85 }],
    'juizo': [{ campo: 'vara', confianca: 85 }],

    // Juiz
    'juiz': [{ campo: 'juiz', confianca: 95 }],
    'juíz': [{ campo: 'juiz', confianca: 95 }],
    'magistrado': [{ campo: 'juiz', confianca: 90 }],
    'relator': [{ campo: 'juiz', confianca: 80 }],

    // Polo do cliente
    'polo': [{ campo: 'polo_cliente', confianca: 90 }],
    'polo cliente': [{ campo: 'polo_cliente', confianca: 95 }],
    'polo_cliente': [{ campo: 'polo_cliente', confianca: 95 }],
    'posição processual': [{ campo: 'polo_cliente', confianca: 85 }],

    // Cliente em processos (referência)
    'polo do cliente': [{ campo: 'cliente_ref', confianca: 90 }],
    'nome do cliente': [{ campo: 'cliente_ref', confianca: 95 }],
    'cliente_ref': [{ campo: 'cliente_ref', confianca: 95 }],
    'parte ativa': [{ campo: 'cliente_ref', confianca: 70 }],
    'parte passiva': [{ campo: 'cliente_ref', confianca: 70 }],

    // Autor da ação
    'autor': [{ campo: 'autor', confianca: 95 }],
    'requerente': [{ campo: 'autor', confianca: 90 }],
    'demandante': [{ campo: 'autor', confianca: 90 }],
    'reclamante': [{ campo: 'autor', confianca: 90 }],
    'exequente': [{ campo: 'autor', confianca: 85 }],

    // Réu da ação
    'réu': [{ campo: 'reu', confianca: 95 }],
    'reu': [{ campo: 'reu', confianca: 95 }],
    'requerido': [{ campo: 'reu', confianca: 90 }],
    'demandado': [{ campo: 'reu', confianca: 90 }],
    'reclamado': [{ campo: 'reu', confianca: 90 }],
    'executado': [{ campo: 'reu', confianca: 85 }],

    // Parte contrária
    'parte contrária': [{ campo: 'parte_contraria', confianca: 95 }],
    'parte contraria': [{ campo: 'parte_contraria', confianca: 95 }],
    'parte_contraria': [{ campo: 'parte_contraria', confianca: 95 }],
    'terceiro(s)': [{ campo: 'parte_contraria', confianca: 70 }],
    'adversário': [{ campo: 'parte_contraria', confianca: 85 }],
    'adversario': [{ campo: 'parte_contraria', confianca: 85 }],

    // Rito
    'rito': [{ campo: 'rito', confianca: 95 }],
    'procedimento': [{ campo: 'rito', confianca: 85 }],
    'rito processual': [{ campo: 'rito', confianca: 95 }],

    // Responsável
    'responsável': [{ campo: 'responsavel_ref', confianca: 90 }],
    'responsavel': [{ campo: 'responsavel_ref', confianca: 90 }],
    'advogado responsável': [{ campo: 'responsavel_ref', confianca: 95 }],
    'advogado responsavel': [{ campo: 'responsavel_ref', confianca: 95 }],
    'advogado': [{ campo: 'responsavel_ref', confianca: 80 }],

    // Número da pasta
    'pasta': [{ campo: 'numero_pasta', confianca: 90 }],
    'número pasta': [{ campo: 'numero_pasta', confianca: 95 }],
    'numero pasta': [{ campo: 'numero_pasta', confianca: 95 }],
    'numero_pasta': [{ campo: 'numero_pasta', confianca: 95 }],
    'código interno': [{ campo: 'numero_pasta', confianca: 85 }],

    // Valor da causa
    'valor causa': [{ campo: 'valor_causa', confianca: 95 }],
    'valor_causa': [{ campo: 'valor_causa', confianca: 95 }],
    'valor da causa': [{ campo: 'valor_causa', confianca: 95 }],

    // Valor do acordo
    'valor acordo': [{ campo: 'valor_acordo', confianca: 95 }],
    'valor_acordo': [{ campo: 'valor_acordo', confianca: 95 }],
    'acordo': [{ campo: 'valor_acordo', confianca: 75 }],

    // Valor da condenação
    'valor condenação': [{ campo: 'valor_condenacao', confianca: 95 }],
    'valor condenacao': [{ campo: 'valor_condenacao', confianca: 95 }],
    'valor_condenacao': [{ campo: 'valor_condenacao', confianca: 95 }],
    'condenação': [{ campo: 'valor_condenacao', confianca: 80 }],

    // Valor atualizado
    'valor atualizado': [{ campo: 'valor_atualizado', confianca: 95 }],
    'valor_atualizado': [{ campo: 'valor_atualizado', confianca: 95 }],
    'vlr atualizado': [{ campo: 'valor_atualizado', confianca: 90 }],
    'valor corrigido': [{ campo: 'valor_atualizado', confianca: 85 }],

    // Data de distribuição
    'data distribuição': [{ campo: 'data_distribuicao', confianca: 95 }],
    'data distribuicao': [{ campo: 'data_distribuicao', confianca: 95 }],
    'data_distribuicao': [{ campo: 'data_distribuicao', confianca: 95 }],
    'distribuição': [{ campo: 'data_distribuicao', confianca: 85 }],
    'distribuicao': [{ campo: 'data_distribuicao', confianca: 85 }],
    'dt. distribuição': [{ campo: 'data_distribuicao', confianca: 90 }],

    // Objeto da ação
    'objeto': [{ campo: 'objeto_acao', confianca: 85 }],
    'objeto ação': [{ campo: 'objeto_acao', confianca: 95 }],
    'objeto acao': [{ campo: 'objeto_acao', confianca: 95 }],
    'objeto_acao': [{ campo: 'objeto_acao', confianca: 95 }],
    'pedido': [{ campo: 'objeto_acao', confianca: 80 }],

    // Link do tribunal
    'link': [{ campo: 'link_tribunal', confianca: 75 }],
    'link tribunal': [{ campo: 'link_tribunal', confianca: 95 }],
    'link_tribunal': [{ campo: 'link_tribunal', confianca: 95 }],
    'url': [{ campo: 'link_tribunal', confianca: 80 }],
    'consulta pública': [{ campo: 'link_tribunal', confianca: 85 }],

    // Área do direito (processos)
    'área': [{ campo: 'area', confianca: 90 }],
    'area': [{ campo: 'area', confianca: 90 }],
    'área do direito': [{ campo: 'area', confianca: 95 }],
    'area do direito': [{ campo: 'area', confianca: 95 }],
    'matéria': [{ campo: 'area', confianca: 85 }],
    'materia': [{ campo: 'area', confianca: 85 }],

    // UF / Estado (adicional)
    'unidade federativa': [{ campo: 'uf', confianca: 95 }],
  }

  const camposSchema = schema.map(c => c.campo)
  const camposUsados = new Set<string>()

  // FASE 1: Detectar padrões nos DADOS (prioridade alta para CNJ)
  for (const header of headers) {
    const padrao = detectarPadraoDados(header)
    if (padrao && camposSchema.includes(padrao.campo) && !camposUsados.has(padrao.campo)) {
      mapeamento[header] = padrao.campo
      confianca[header] = padrao.confianca
      camposUsados.add(padrao.campo)
      sugestoes.push(`Campo "${header}" mapeado para ${padrao.campo} por análise de dados`)
    }
  }

  // FASE 2: Para campos não mapeados, usar mapeamento por nome
  for (const header of headers) {
    // Pular se já foi mapeado
    if (mapeamento[header] !== undefined) continue

    const headerNormalizado = header.toLowerCase().trim()

    // Buscar mapeamento conhecido por nome exato
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

    // Busca parcial por nome
    let encontrou = false
    for (const [key, matches] of Object.entries(mapeamentosConhecidos)) {
      if (headerNormalizado.includes(key) || key.includes(headerNormalizado)) {
        const match = matches.find(m =>
          camposSchema.includes(m.campo) && !camposUsados.has(m.campo)
        )

        if (match) {
          mapeamento[header] = match.campo
          confianca[header] = Math.max(match.confianca - 20, 50)
          camposUsados.add(match.campo)
          encontrou = true
          break
        }
      }
    }

    // Se não encontrou, marcar como null
    if (!encontrou) {
      mapeamento[header] = null
      sugestoes.push(`Campo "${header}" não foi mapeado automaticamente`)
    }
  }

  return { mapeamento, confianca, sugestoes }
}
