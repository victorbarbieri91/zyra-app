# Plano de Implementação - Sistema de Migração de Dados

## Visão Geral

Sistema para migrar dados de planilhas CSV/Excel para o Zyra Legal, com assistência de IA para mapeamento automático de campos.

**Módulos:** CRM, Processos, Consultivo, Agenda, Financeiro
**Ordem obrigatória:** CRM → Processos/Consultivo → Agenda → Financeiro

---

## 1. Banco de Dados

### 1.1 Tabela: `migracao_jobs`

```sql
CREATE TABLE migracao_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,

  -- Configuração
  modulo TEXT NOT NULL CHECK (modulo IN ('crm', 'processos', 'consultivo', 'agenda', 'financeiro')),
  arquivo_nome TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL,
  mapeamento JSONB NOT NULL,
  config JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente',
    'processando',
    'validando',
    'aguardando_revisao',
    'importando',
    'concluido',
    'erro',
    'cancelado'
  )),
  etapa_atual TEXT,

  -- Contadores
  total_linhas INTEGER DEFAULT 0,
  linhas_processadas INTEGER DEFAULT 0,
  linhas_validas INTEGER DEFAULT 0,
  linhas_com_erro INTEGER DEFAULT 0,
  linhas_duplicadas INTEGER DEFAULT 0,
  linhas_importadas INTEGER DEFAULT 0,

  -- Resultados
  erros JSONB DEFAULT '[]',
  duplicatas JSONB DEFAULT '[]',
  campos_extras JSONB DEFAULT '[]',
  resultado_final JSONB,

  -- Correções do usuário
  correcoes_usuario JSONB DEFAULT '{}',

  -- Timestamps
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  criado_por UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_migracao_jobs_escritorio ON migracao_jobs(escritorio_id);
CREATE INDEX idx_migracao_jobs_status ON migracao_jobs(status);
CREATE INDEX idx_migracao_jobs_modulo ON migracao_jobs(modulo);

-- RLS
ALTER TABLE migracao_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migracao_jobs_policy" ON migracao_jobs
  FOR ALL USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER set_migracao_jobs_updated_at
  BEFORE UPDATE ON migracao_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Tabela: `migracao_historico`

```sql
CREATE TABLE migracao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  job_id UUID REFERENCES migracao_jobs(id) ON DELETE SET NULL,

  modulo TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  total_importados INTEGER NOT NULL,
  total_erros INTEGER DEFAULT 0,
  total_duplicatas INTEGER DEFAULT 0,

  detalhes JSONB,

  executado_por UUID REFERENCES profiles(id),
  executado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migracao_historico_escritorio ON migracao_historico(escritorio_id);

ALTER TABLE migracao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migracao_historico_policy" ON migracao_historico
  FOR ALL USING (
    escritorio_id IN (SELECT escritorio_id FROM profiles WHERE id = auth.uid())
  );
```

### 1.3 Storage Bucket

```sql
-- Criar bucket para arquivos temporários de migração
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'migracao-temp',
  'migracao-temp',
  false,
  10485760, -- 10MB
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Policy: usuários podem fazer upload para seu escritório
CREATE POLICY "migracao_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: usuários podem ler arquivos do seu escritório
CREATE POLICY "migracao_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: usuários podem deletar arquivos do seu escritório
CREATE POLICY "migracao_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'migracao-temp' AND
    (storage.foldername(name))[1] IN (
      SELECT escritorio_id::text FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 2. Edge Function: `migracao-processar`

### 2.1 Estrutura

```
supabase/functions/migracao-processar/
├── index.ts              # Entry point
├── types.ts              # Tipos TypeScript
├── parser.ts             # Parse CSV/Excel
├── validator.ts          # Validações gerais
├── validators/
│   ├── cpf.ts
│   ├── cnpj.ts
│   ├── cnj.ts
│   ├── email.ts
│   └── telefone.ts
├── importers/
│   ├── crm.ts
│   ├── processos.ts
│   ├── consultivo.ts
│   ├── agenda.ts
│   └── financeiro.ts
└── utils.ts              # Utilitários
```

### 2.2 Entry Point (`index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { parse as parseCSV } from "https://deno.land/std@0.168.0/csv/mod.ts"
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs"

serve(async (req) => {
  const { job_id, acao } = await req.json()

  // acao: 'processar' | 'importar' | 'cancelar'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Buscar job
  const { data: job } = await supabase
    .from('migracao_jobs')
    .select('*')
    .eq('id', job_id)
    .single()

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job não encontrado' }), { status: 404 })
  }

  try {
    switch (acao) {
      case 'processar':
        await processarArquivo(supabase, job)
        break
      case 'importar':
        await importarDados(supabase, job)
        break
      case 'cancelar':
        await cancelarJob(supabase, job)
        break
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    await supabase
      .from('migracao_jobs')
      .update({ status: 'erro', resultado_final: { erro: error.message } })
      .eq('id', job_id)

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

### 2.3 Fluxo de Processamento

```typescript
async function processarArquivo(supabase, job) {
  // 1. Atualizar status
  await atualizarJob(supabase, job.id, {
    status: 'processando',
    etapa_atual: 'baixando_arquivo',
    iniciado_em: new Date().toISOString()
  })

  // 2. Baixar arquivo do storage
  const { data: arquivo } = await supabase.storage
    .from('migracao-temp')
    .download(job.arquivo_storage_path)

  // 3. Parse do arquivo
  await atualizarJob(supabase, job.id, { etapa_atual: 'parseando_arquivo' })
  const linhas = await parseArquivo(arquivo, job.arquivo_nome)

  await atualizarJob(supabase, job.id, { total_linhas: linhas.length })

  // 4. Validar cada linha
  await atualizarJob(supabase, job.id, {
    status: 'validando',
    etapa_atual: 'validando_dados'
  })

  const resultado = await validarLinhas(supabase, job, linhas)

  // 5. Atualizar com resultados
  await atualizarJob(supabase, job.id, {
    status: resultado.temErros ? 'aguardando_revisao' : 'aguardando_revisao',
    linhas_processadas: linhas.length,
    linhas_validas: resultado.validas.length,
    linhas_com_erro: resultado.erros.length,
    linhas_duplicadas: resultado.duplicatas.length,
    erros: resultado.erros,
    duplicatas: resultado.duplicatas,
    campos_extras: resultado.camposExtras,
    resultado_final: { dados_validados: resultado.validas }
  })
}

async function validarLinhas(supabase, job, linhas) {
  const mapeamento = job.mapeamento
  const modulo = job.modulo
  const escritorioId = job.escritorio_id

  const validas = []
  const erros = []
  const duplicatas = []
  const camposExtras = new Set()

  // Identificar campos não mapeados
  const camposMapeados = Object.keys(mapeamento).filter(k => mapeamento[k])
  const todosHeaders = Object.keys(linhas[0] || {})
  todosHeaders.forEach(h => {
    if (!camposMapeados.includes(h)) {
      camposExtras.add(h)
    }
  })

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const numLinha = i + 2 // +2 porque linha 1 é header

    // Aplicar mapeamento
    const registro = aplicarMapeamento(linha, mapeamento, Array.from(camposExtras))

    // Validar
    const errosLinha = await validarRegistro(registro, modulo)

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

    // Atualizar progresso a cada 10 linhas
    if (i % 10 === 0) {
      await atualizarJob(supabase, job.id, { linhas_processadas: i + 1 })
    }
  }

  return {
    validas,
    erros,
    duplicatas,
    camposExtras: Array.from(camposExtras),
    temErros: erros.length > 0 || duplicatas.length > 0
  }
}

async function importarDados(supabase, job) {
  await atualizarJob(supabase, job.id, {
    status: 'importando',
    etapa_atual: 'inserindo_registros'
  })

  const dados = job.resultado_final.dados_validados
  const correcoes = job.correcoes_usuario || {}

  // Aplicar correções do usuário
  const dadosCorrigidos = aplicarCorrecoes(dados, correcoes)

  // Importar em batches de 50
  const batchSize = 50
  let importados = 0

  for (let i = 0; i < dadosCorrigidos.length; i += batchSize) {
    const batch = dadosCorrigidos.slice(i, i + batchSize)

    await inserirBatch(supabase, batch, job.modulo, job.escritorio_id)

    importados += batch.length
    await atualizarJob(supabase, job.id, { linhas_importadas: importados })
  }

  // Finalizar
  await atualizarJob(supabase, job.id, {
    status: 'concluido',
    etapa_atual: 'concluido',
    concluido_em: new Date().toISOString()
  })

  // Registrar no histórico
  await supabase.from('migracao_historico').insert({
    escritorio_id: job.escritorio_id,
    job_id: job.id,
    modulo: job.modulo,
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
}
```

### 2.4 Validadores por Módulo

```typescript
// validators/cpf.ts
export function validarCPF(cpf: string): boolean {
  if (!cpf) return true // Campo opcional

  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  // Validação dos dígitos verificadores
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

// validators/cnpj.ts
export function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return true

  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  // Validação dos dígitos verificadores
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

// validators/cnj.ts
export function validarNumeroCNJ(numero: string): boolean {
  if (!numero) return false

  // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
  const regex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/
  return regex.test(numero.trim())
}

// validator.ts - Validação por módulo
export async function validarRegistro(registro: any, modulo: string): string[] {
  const erros: string[] = []

  switch (modulo) {
    case 'crm':
      if (!registro.nome_completo?.trim()) {
        erros.push('Nome é obrigatório')
      }
      if (registro.cpf_cnpj) {
        const doc = registro.cpf_cnpj.replace(/\D/g, '')
        if (doc.length === 11 && !validarCPF(doc)) {
          erros.push('CPF inválido')
        } else if (doc.length === 14 && !validarCNPJ(doc)) {
          erros.push('CNPJ inválido')
        } else if (doc.length !== 11 && doc.length !== 14) {
          erros.push('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos')
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
      if (!registro.cliente_ref) {
        erros.push('Cliente é obrigatório')
      }
      break

    case 'consultivo':
      if (!registro.assunto?.trim()) {
        erros.push('Assunto é obrigatório')
      }
      if (!registro.cliente_ref) {
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
      if (!registro.valor_total || isNaN(parseFloat(registro.valor_total))) {
        erros.push('Valor é obrigatório e deve ser numérico')
      }
      if (!registro.cliente_ref) {
        erros.push('Cliente é obrigatório')
      }
      break
  }

  return erros
}
```

### 2.5 Checagem de Duplicatas

```typescript
async function checarDuplicata(supabase, registro, modulo, escritorioId) {
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

    // Outros módulos...
  }

  return null
}
```

### 2.6 Importers por Módulo

```typescript
// importers/crm.ts
export async function inserirCRM(supabase, registros, escritorioId) {
  const dados = registros.map(r => ({
    escritorio_id: escritorioId,
    nome_completo: r.dados.nome_completo,
    tipo_pessoa: inferirTipoPessoa(r.dados.cpf_cnpj),
    tipo_contato: r.dados.tipo_contato || 'cliente',
    cpf_cnpj: formatarDocumento(r.dados.cpf_cnpj),
    email_principal: r.dados.email_principal,
    telefone_principal: r.dados.telefone_principal,
    celular: r.dados.celular,
    cep: r.dados.cep,
    logradouro: r.dados.logradouro,
    numero: r.dados.numero,
    bairro: r.dados.bairro,
    cidade: r.dados.cidade,
    uf: r.dados.uf,
    observacoes: r.dados.observacoes,
    status: 'ativo'
  }))

  const { error } = await supabase
    .from('crm_pessoas')
    .insert(dados)

  if (error) throw error
}

// importers/processos.ts
export async function inserirProcessos(supabase, registros, escritorioId) {
  for (const r of registros) {
    // Resolver cliente_id pelo nome ou CPF
    const clienteId = await resolverClienteId(supabase, r.dados.cliente_ref, escritorioId)

    if (!clienteId) {
      throw new Error(`Cliente não encontrado: ${r.dados.cliente_ref} (linha ${r.linha})`)
    }

    await supabase.from('processos_processos').insert({
      escritorio_id: escritorioId,
      numero_cnj: r.dados.numero_cnj,
      cliente_id: clienteId,
      polo_cliente: r.dados.polo_cliente || 'ativo',
      area: r.dados.area || 'civel',
      tribunal: r.dados.tribunal,
      vara: r.dados.vara,
      comarca: r.dados.comarca,
      valor_causa: parseFloat(r.dados.valor_causa) || null,
      data_distribuicao: r.dados.data_distribuicao,
      objeto_acao: r.dados.objeto_acao,
      status: r.dados.status || 'ativo',
      tipo: 'judicial',
      fase: 'conhecimento',
      instancia: '1a',
      responsavel_id: r.dados.responsavel_id, // Pode ser null
      observacoes: r.dados.observacoes
    })
  }
}

async function resolverClienteId(supabase, referencia, escritorioId) {
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

  // Tentar por nome (busca aproximada)
  const { data } = await supabase
    .from('crm_pessoas')
    .select('id')
    .eq('escritorio_id', escritorioId)
    .ilike('nome_completo', `%${referencia}%`)
    .limit(1)

  return data?.[0]?.id || null
}
```

---

## 3. API Route: Análise com IA

### 3.1 Configuração

```typescript
// src/app/api/migracao/analisar/route.ts
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  const supabase = createClient()

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { headers, amostra, modulo } = await request.json()

  // Buscar API key do Supabase secrets (ou env)
  const apiKey = process.env.OPENAI_API_KEY

  const openai = new OpenAI({ apiKey })

  const schema = getSchemaParaModulo(modulo)

  const prompt = `Você é um assistente especializado em mapeamento de dados para sistemas jurídicos.

Analise os headers e amostra de dados de uma planilha e sugira o mapeamento para os campos do sistema.

## Headers da Planilha:
${JSON.stringify(headers)}

## Amostra de Dados (primeiras 5 linhas):
${JSON.stringify(amostra, null, 2)}

## Campos do Sistema (${modulo.toUpperCase()}):
${JSON.stringify(schema, null, 2)}

## Regras:
1. Mapeie cada header para o campo mais apropriado do sistema
2. Se não houver correspondência clara, retorne null
3. Considere variações comuns (ex: "Nome", "Nome Completo", "Cliente" → nome_completo)
4. Para campos de documento (CPF/CNPJ), identifique pelo formato dos dados
5. Retorne também o nível de confiança (0-100) para cada mapeamento

## Resposta esperada (JSON):
{
  "mapeamento": {
    "Header da Planilha": "campo_do_sistema" ou null
  },
  "confianca": {
    "Header da Planilha": número de 0 a 100
  },
  "sugestoes": ["lista de sugestões ou avisos"]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  })

  const resultado = JSON.parse(completion.choices[0].message.content)

  return Response.json(resultado)
}

function getSchemaParaModulo(modulo: string) {
  const schemas = {
    crm: [
      { campo: 'nome_completo', tipo: 'texto', obrigatorio: true, descricao: 'Nome completo ou razão social' },
      { campo: 'cpf_cnpj', tipo: 'documento', obrigatorio: false, descricao: 'CPF (11 dígitos) ou CNPJ (14 dígitos)' },
      { campo: 'email_principal', tipo: 'email', obrigatorio: false },
      { campo: 'telefone_principal', tipo: 'telefone', obrigatorio: false },
      { campo: 'celular', tipo: 'telefone', obrigatorio: false },
      { campo: 'cep', tipo: 'texto', obrigatorio: false },
      { campo: 'logradouro', tipo: 'texto', obrigatorio: false },
      { campo: 'numero', tipo: 'texto', obrigatorio: false },
      { campo: 'bairro', tipo: 'texto', obrigatorio: false },
      { campo: 'cidade', tipo: 'texto', obrigatorio: false },
      { campo: 'uf', tipo: 'texto', obrigatorio: false, descricao: '2 letras' },
      { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false }
    ],
    processos: [
      { campo: 'numero_cnj', tipo: 'texto', obrigatorio: true, descricao: 'Formato: NNNNNNN-DD.AAAA.J.TR.OOOO' },
      { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
      { campo: 'polo_cliente', tipo: 'enum', obrigatorio: false, valores: ['ativo', 'passivo', 'terceiro'] },
      { campo: 'area', tipo: 'enum', obrigatorio: false, valores: ['civel', 'trabalhista', 'tributaria', 'familia', 'criminal', 'previdenciaria', 'consumidor', 'empresarial'] },
      { campo: 'tribunal', tipo: 'texto', obrigatorio: false, descricao: 'Ex: TJSP, TRT-2' },
      { campo: 'vara', tipo: 'texto', obrigatorio: false },
      { campo: 'comarca', tipo: 'texto', obrigatorio: false },
      { campo: 'valor_causa', tipo: 'numero', obrigatorio: false },
      { campo: 'data_distribuicao', tipo: 'data', obrigatorio: false },
      { campo: 'objeto_acao', tipo: 'texto_longo', obrigatorio: false },
      { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['ativo', 'suspenso', 'arquivado'] },
      { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false }
    ],
    consultivo: [
      { campo: 'numero_interno', tipo: 'texto', obrigatorio: false, descricao: 'Código interno da consulta' },
      { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
      { campo: 'tipo', tipo: 'enum', obrigatorio: false, valores: ['simples', 'parecer', 'contrato', 'due_diligence'] },
      { campo: 'area', tipo: 'enum', obrigatorio: false, valores: ['tributaria', 'societaria', 'trabalhista', 'civel', 'contratual'] },
      { campo: 'assunto', tipo: 'texto', obrigatorio: true },
      { campo: 'descricao', tipo: 'texto_longo', obrigatorio: false },
      { campo: 'data_recebimento', tipo: 'data', obrigatorio: false },
      { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['nova', 'em_analise', 'concluida'] },
      { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false }
    ],
    agenda: [
      { campo: 'titulo', tipo: 'texto', obrigatorio: true },
      { campo: 'tipo', tipo: 'enum', obrigatorio: false, valores: ['tarefa', 'evento', 'audiencia'] },
      { campo: 'data_inicio', tipo: 'data_hora', obrigatorio: true },
      { campo: 'data_fim', tipo: 'data_hora', obrigatorio: false },
      { campo: 'descricao', tipo: 'texto_longo', obrigatorio: false },
      { campo: 'processo_ref', tipo: 'texto', obrigatorio: false, descricao: 'Número CNJ do processo' },
      { campo: 'cliente_ref', tipo: 'texto', obrigatorio: false, descricao: 'Nome ou CPF do cliente' },
      { campo: 'prioridade', tipo: 'enum', obrigatorio: false, valores: ['alta', 'media', 'baixa'] },
      { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['pendente', 'concluida', 'cancelada'] },
      { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false }
    ],
    financeiro: [
      { campo: 'cliente_ref', tipo: 'texto', obrigatorio: true, descricao: 'Nome ou CPF/CNPJ do cliente' },
      { campo: 'processo_ref', tipo: 'texto', obrigatorio: false, descricao: 'Número CNJ do processo' },
      { campo: 'descricao', tipo: 'texto', obrigatorio: true },
      { campo: 'valor_total', tipo: 'numero', obrigatorio: true },
      { campo: 'tipo_lancamento', tipo: 'enum', obrigatorio: false, valores: ['fixo', 'hora', 'etapa', 'avulso'] },
      { campo: 'data_competencia', tipo: 'data', obrigatorio: false },
      { campo: 'data_vencimento', tipo: 'data', obrigatorio: false },
      { campo: 'status', tipo: 'enum', obrigatorio: false, valores: ['em_aberto', 'pago', 'cancelado'] },
      { campo: 'observacoes', tipo: 'texto_longo', obrigatorio: false }
    ]
  }

  return schemas[modulo] || []
}
```

---

## 4. Frontend - Estrutura de Arquivos

```
src/
├── app/
│   └── dashboard/
│       └── migracao/
│           ├── page.tsx                    # Hub principal
│           └── [modulo]/
│               └── page.tsx                # Wizard do módulo
│
├── components/
│   └── migracao/
│       ├── MigracaoHub.tsx                 # Cards dos módulos
│       ├── MigracaoWizard.tsx              # Container wizard
│       ├── steps/
│       │   ├── StepUpload.tsx              # Upload arquivo
│       │   ├── StepMapeamento.tsx          # Mapeamento com IA
│       │   ├── StepValidacao.tsx           # Processando...
│       │   ├── StepRevisao.tsx             # Revisar erros
│       │   ├── StepConfirmacao.tsx         # Confirmar importação
│       │   └── StepConclusao.tsx           # Resultado final
│       └── ui/
│           ├── FieldMapper.tsx             # Select de mapeamento
│           ├── ErroCard.tsx                # Card de erro
│           ├── DuplicataCard.tsx           # Card de duplicata
│           └── ProgressBar.tsx             # Barra de progresso
│
├── hooks/
│   ├── useMigracao.ts                      # Estado do wizard
│   └── useMigracaoJob.ts                   # Polling do job
│
├── lib/
│   └── migracao/
│       ├── parser.ts                       # Parse CSV/Excel no client
│       ├── constants.ts                    # Constantes
│       └── utils.ts                        # Utilitários
│
└── types/
    └── migracao.ts                         # Tipos TypeScript
```

---

## 5. Tipos TypeScript

```typescript
// src/types/migracao.ts

export type ModuloMigracao = 'crm' | 'processos' | 'consultivo' | 'agenda' | 'financeiro'

export type StatusJob =
  | 'pendente'
  | 'processando'
  | 'validando'
  | 'aguardando_revisao'
  | 'importando'
  | 'concluido'
  | 'erro'
  | 'cancelado'

export interface MigracaoJob {
  id: string
  escritorio_id: string
  modulo: ModuloMigracao
  arquivo_nome: string
  arquivo_storage_path: string
  mapeamento: Record<string, string | null>
  config: Record<string, any>
  status: StatusJob
  etapa_atual: string | null
  total_linhas: number
  linhas_processadas: number
  linhas_validas: number
  linhas_com_erro: number
  linhas_duplicadas: number
  linhas_importadas: number
  erros: ErroValidacao[]
  duplicatas: Duplicata[]
  campos_extras: string[]
  resultado_final: any
  correcoes_usuario: Record<string, any>
  iniciado_em: string | null
  concluido_em: string | null
  criado_por: string
  created_at: string
  updated_at: string
}

export interface ErroValidacao {
  linha: number
  erros: string[]
  dados: Record<string, any>
}

export interface Duplicata {
  linha: number
  campo: string
  valor: string
  existente: {
    id: string
    nome?: string
    numero?: string
  }
  dados: Record<string, any>
}

export interface MapeamentoIA {
  mapeamento: Record<string, string | null>
  confianca: Record<string, number>
  sugestoes: string[]
}

export interface CampoSchema {
  campo: string
  tipo: 'texto' | 'texto_longo' | 'numero' | 'data' | 'data_hora' | 'email' | 'telefone' | 'documento' | 'enum'
  obrigatorio: boolean
  descricao?: string
  valores?: string[]
}

export type StepMigracao =
  | 'upload'
  | 'mapeamento'
  | 'validacao'
  | 'revisao'
  | 'confirmacao'
  | 'importando'
  | 'conclusao'

export interface MigracaoState {
  step: StepMigracao
  modulo: ModuloMigracao
  arquivo: File | null
  headers: string[]
  amostra: Record<string, any>[]
  totalLinhas: number
  mapeamento: Record<string, string | null>
  confianca: Record<string, number>
  jobId: string | null
  job: MigracaoJob | null
}

export interface MigracaoHistorico {
  id: string
  escritorio_id: string
  job_id: string | null
  modulo: ModuloMigracao
  arquivo_nome: string
  total_importados: number
  total_erros: number
  total_duplicatas: number
  detalhes: any
  executado_por: string
  executado_em: string
}
```

---

## 6. Componentes Frontend

### 6.1 Hub Principal

```typescript
// src/components/migracao/MigracaoHub.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, Scale, FileText, Calendar, DollarSign,
  CheckCircle, Lock, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useMigracaoHistorico } from '@/hooks/useMigracaoHistorico'

const modulos = [
  {
    id: 'crm',
    nome: 'CRM (Clientes)',
    descricao: 'Pessoas, clientes, prospects',
    icone: Users,
    cor: 'bg-blue-500',
    dependencias: []
  },
  {
    id: 'processos',
    nome: 'Processos',
    descricao: 'Processos judiciais e partes',
    icone: Scale,
    cor: 'bg-purple-500',
    dependencias: ['crm']
  },
  {
    id: 'consultivo',
    nome: 'Consultivo',
    descricao: 'Consultas e pareceres',
    icone: FileText,
    cor: 'bg-teal-500',
    dependencias: ['crm']
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    descricao: 'Tarefas, eventos, audiências',
    icone: Calendar,
    cor: 'bg-amber-500',
    dependencias: ['crm', 'processos']
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    descricao: 'Honorários e pagamentos',
    icone: DollarSign,
    cor: 'bg-green-500',
    dependencias: ['crm', 'processos']
  }
]

export function MigracaoHub() {
  const { historico, isLoading } = useMigracaoHistorico()

  const modulosMigrados = historico
    ?.filter(h => h.total_importados > 0)
    .map(h => h.modulo) || []

  const getStatusModulo = (modulo: typeof modulos[0]) => {
    const migrado = modulosMigrados.includes(modulo.id)
    const dependenciasOk = modulo.dependencias.every(d => modulosMigrados.includes(d))

    if (migrado) return 'migrado'
    if (!dependenciasOk) return 'bloqueado'
    return 'disponivel'
  }

  const getContagem = (moduloId: string) => {
    const h = historico?.find(h => h.modulo === moduloId)
    return h?.total_importados || 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Migração de Dados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Importe dados do seu sistema anterior para o Zyra Legal
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Ordem recomendada:</strong> Migre primeiro o CRM (clientes),
          pois os outros módulos dependem dessas informações.
        </p>
      </div>

      <div className="grid gap-4">
        {modulos.map((modulo, index) => {
          const status = getStatusModulo(modulo)
          const Icone = modulo.icone
          const contagem = getContagem(modulo.id)

          return (
            <Card
              key={modulo.id}
              className={status === 'bloqueado' ? 'opacity-60' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${modulo.cor} flex items-center justify-center`}>
                      <Icone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {index + 1}. {modulo.nome}
                        {status === 'migrado' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {contagem} registros
                          </Badge>
                        )}
                        {status === 'bloqueado' && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{modulo.descricao}</CardDescription>
                    </div>
                  </div>

                  {status !== 'bloqueado' && (
                    <Link href={`/dashboard/migracao/${modulo.id}`}>
                      <Button variant={status === 'migrado' ? 'outline' : 'default'}>
                        {status === 'migrado' ? 'Migrar Novamente' : 'Iniciar Migração'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>

              {status === 'bloqueado' && (
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-500">
                    Requer: {modulo.dependencias.map(d =>
                      modulos.find(m => m.id === d)?.nome
                    ).join(', ')}
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

### 6.2 Wizard Container

```typescript
// src/components/migracao/MigracaoWizard.tsx
'use client'

import { useState } from 'react'
import { MigracaoState, ModuloMigracao, StepMigracao } from '@/types/migracao'
import { StepUpload } from './steps/StepUpload'
import { StepMapeamento } from './steps/StepMapeamento'
import { StepValidacao } from './steps/StepValidacao'
import { StepRevisao } from './steps/StepRevisao'
import { StepConfirmacao } from './steps/StepConfirmacao'
import { StepConclusao } from './steps/StepConclusao'

interface Props {
  modulo: ModuloMigracao
}

const stepTitles: Record<StepMigracao, string> = {
  upload: 'Upload do Arquivo',
  mapeamento: 'Mapeamento de Campos',
  validacao: 'Validando Dados',
  revisao: 'Revisão de Erros',
  confirmacao: 'Confirmação',
  importando: 'Importando',
  conclusao: 'Concluído'
}

export function MigracaoWizard({ modulo }: Props) {
  const [state, setState] = useState<MigracaoState>({
    step: 'upload',
    modulo,
    arquivo: null,
    headers: [],
    amostra: [],
    totalLinhas: 0,
    mapeamento: {},
    confianca: {},
    jobId: null,
    job: null
  })

  const updateState = (updates: Partial<MigracaoState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const goToStep = (step: StepMigracao) => {
    updateState({ step })
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {(['upload', 'mapeamento', 'validacao', 'revisao', 'confirmacao', 'conclusao'] as StepMigracao[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${state.step === s ? 'bg-blue-600 text-white' :
                i < ['upload', 'mapeamento', 'validacao', 'revisao', 'confirmacao', 'conclusao'].indexOf(state.step)
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-500'}
            `}>
              {i + 1}
            </div>
            {i < 5 && (
              <div className={`w-12 h-0.5 mx-2 ${
                i < ['upload', 'mapeamento', 'validacao', 'revisao', 'confirmacao', 'conclusao'].indexOf(state.step)
                  ? 'bg-green-500' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">{stepTitles[state.step]}</h2>

      {/* Step Content */}
      {state.step === 'upload' && (
        <StepUpload state={state} updateState={updateState} goToStep={goToStep} />
      )}
      {state.step === 'mapeamento' && (
        <StepMapeamento state={state} updateState={updateState} goToStep={goToStep} />
      )}
      {state.step === 'validacao' && (
        <StepValidacao state={state} updateState={updateState} goToStep={goToStep} />
      )}
      {state.step === 'revisao' && (
        <StepRevisao state={state} updateState={updateState} goToStep={goToStep} />
      )}
      {state.step === 'confirmacao' && (
        <StepConfirmacao state={state} updateState={updateState} goToStep={goToStep} />
      )}
      {(state.step === 'importando' || state.step === 'conclusao') && (
        <StepConclusao state={state} updateState={updateState} />
      )}
    </div>
  )
}
```

### 6.3 Step Upload

```typescript
// src/components/migracao/steps/StepUpload.tsx
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { parseArquivo } from '@/lib/migracao/parser'
import { MigracaoState, StepMigracao } from '@/types/migracao'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepUpload({ state, updateState, goToStep }: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      const { headers, amostra, totalLinhas } = await parseArquivo(file)

      updateState({
        arquivo: file,
        headers,
        amostra,
        totalLinhas
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo')
    } finally {
      setIsProcessing(false)
    }
  }, [updateState])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const limparArquivo = () => {
    updateState({
      arquivo: null,
      headers: [],
      amostra: [],
      totalLinhas: 0
    })
  }

  const continuar = () => {
    goToStep('mapeamento')
  }

  return (
    <div className="space-y-6">
      {!state.arquivo ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          {isProcessing ? (
            <p className="text-slate-600">Processando arquivo...</p>
          ) : isDragActive ? (
            <p className="text-blue-600">Solte o arquivo aqui</p>
          ) : (
            <>
              <p className="text-slate-600 mb-2">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-sm text-slate-400">
                Formatos aceitos: .csv, .xlsx, .xls (máx. 10MB)
              </p>
            </>
          )}
        </div>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-10 h-10 text-green-600" />
              <div>
                <p className="font-medium">{state.arquivo.name}</p>
                <p className="text-sm text-slate-500">
                  {state.totalLinhas} linhas detectadas
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={limparArquivo}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {state.arquivo && state.amostra.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium mb-2">Preview das primeiras linhas:</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {state.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.amostra.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {state.headers.map((h, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap">
                          {row[h] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={continuar}>
              Continuar para Mapeamento
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

### 6.4 Step Mapeamento (com IA)

```typescript
// src/components/migracao/steps/StepMapeamento.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, AlertTriangle, Check } from 'lucide-react'
import { MigracaoState, StepMigracao, CampoSchema } from '@/types/migracao'
import { getSchemaCampos } from '@/lib/migracao/constants'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepMapeamento({ state, updateState, goToStep }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const campos = getSchemaCampos(state.modulo)
  const camposObrigatorios = campos.filter(c => c.obrigatorio)

  // Chamar IA para análise inicial
  useEffect(() => {
    if (Object.keys(state.mapeamento).length === 0) {
      analisarComIA()
    }
  }, [])

  const analisarComIA = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/migracao/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: state.headers,
          amostra: state.amostra.slice(0, 5),
          modulo: state.modulo
        })
      })

      if (!response.ok) throw new Error('Erro ao analisar')

      const data = await response.json()

      updateState({
        mapeamento: data.mapeamento,
        confianca: data.confianca
      })
    } catch (err: any) {
      setError(err.message)
      // Inicializar mapeamento vazio
      const mapeamentoVazio: Record<string, string | null> = {}
      state.headers.forEach(h => { mapeamentoVazio[h] = null })
      updateState({ mapeamento: mapeamentoVazio, confianca: {} })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const atualizarMapeamento = (header: string, campo: string | null) => {
    updateState({
      mapeamento: {
        ...state.mapeamento,
        [header]: campo
      }
    })
  }

  const camposMapeados = Object.values(state.mapeamento).filter(Boolean)
  const obrigatoriosFaltando = camposObrigatorios.filter(
    c => !camposMapeados.includes(c.campo)
  )

  const podeContinar = obrigatoriosFaltando.length === 0

  const continuar = async () => {
    // Fazer upload do arquivo e criar job
    const formData = new FormData()
    formData.append('arquivo', state.arquivo!)
    formData.append('modulo', state.modulo)
    formData.append('mapeamento', JSON.stringify(state.mapeamento))

    const response = await fetch('/api/migracao/criar-job', {
      method: 'POST',
      body: formData
    })

    const { jobId } = await response.json()

    updateState({ jobId })
    goToStep('validacao')
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Sparkles className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
        <p className="text-slate-600">Analisando campos com IA...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Não foi possível analisar automaticamente</p>
            <p>Mapeie os campos manualmente abaixo.</p>
          </div>
        </div>
      )}

      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center text-sm font-medium text-slate-500 pb-2 border-b">
            <span>Coluna na Planilha</span>
            <span></span>
            <span>Campo no Sistema</span>
            <span>Confiança</span>
          </div>

          {state.headers.map(header => {
            const campoAtual = state.mapeamento[header]
            const confianca = state.confianca[header]

            return (
              <div key={header} className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center">
                <div className="font-medium">{header}</div>
                <span className="text-slate-400">→</span>
                <Select
                  value={campoAtual || '__ignorar__'}
                  onValueChange={(v) => atualizarMapeamento(header, v === '__ignorar__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ignorar__">-- Ignorar / Observações --</SelectItem>
                    {campos.map(campo => (
                      <SelectItem
                        key={campo.campo}
                        value={campo.campo}
                        disabled={camposMapeados.includes(campo.campo) && campoAtual !== campo.campo}
                      >
                        {campo.campo}
                        {campo.obrigatorio && ' *'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-16">
                  {confianca !== undefined && (
                    <Badge variant={confianca >= 80 ? 'default' : confianca >= 50 ? 'secondary' : 'outline'}>
                      {confianca}%
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {obrigatoriosFaltando.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium mb-2">
            Campos obrigatórios não mapeados:
          </p>
          <div className="flex flex-wrap gap-2">
            {obrigatoriosFaltando.map(c => (
              <Badge key={c.campo} variant="destructive">
                {c.campo}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Campos não mapeados</strong> serão concatenados no campo "observações".
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => goToStep('upload')}>
          Voltar
        </Button>
        <Button onClick={continuar} disabled={!podeContinar}>
          <Check className="w-4 h-4 mr-2" />
          Confirmar e Validar
        </Button>
      </div>
    </div>
  )
}
```

### 6.5 Step Validação (Processando)

```typescript
// src/components/migracao/steps/StepValidacao.tsx
'use client'

import { useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { MigracaoState, StepMigracao } from '@/types/migracao'
import { useMigracaoJob } from '@/hooks/useMigracaoJob'
import { createClient } from '@/lib/supabase/client'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepValidacao({ state, updateState, goToStep }: Props) {
  const { job, isLoading } = useMigracaoJob(state.jobId!)

  // Disparar processamento
  useEffect(() => {
    if (state.jobId && !job) {
      dispararProcessamento()
    }
  }, [state.jobId])

  // Monitorar status
  useEffect(() => {
    if (job) {
      updateState({ job })

      if (job.status === 'aguardando_revisao') {
        if (job.linhas_com_erro > 0 || job.linhas_duplicadas > 0) {
          goToStep('revisao')
        } else {
          goToStep('confirmacao')
        }
      } else if (job.status === 'erro') {
        // Tratar erro
      }
    }
  }, [job])

  const dispararProcessamento = async () => {
    const supabase = createClient()
    await supabase.functions.invoke('migracao-processar', {
      body: { job_id: state.jobId, acao: 'processar' }
    })
  }

  const progresso = job
    ? Math.round((job.linhas_processadas / job.total_linhas) * 100)
    : 0

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />

      <div className="text-center">
        <p className="text-lg font-medium text-slate-700">
          {job?.etapa_atual === 'validando_dados'
            ? 'Validando dados...'
            : 'Processando arquivo...'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {job?.linhas_processadas || 0} de {job?.total_linhas || state.totalLinhas} linhas
        </p>
      </div>

      <div className="w-full max-w-md">
        <Progress value={progresso} className="h-2" />
      </div>

      {job && (
        <div className="text-sm text-slate-500 space-y-1">
          <p>✅ {job.linhas_validas} válidas</p>
          {job.linhas_com_erro > 0 && (
            <p>❌ {job.linhas_com_erro} com erro</p>
          )}
          {job.linhas_duplicadas > 0 && (
            <p>⚠️ {job.linhas_duplicadas} duplicatas</p>
          )}
        </div>
      )}
    </div>
  )
}
```

### 6.6 Step Revisão de Erros

```typescript
// src/components/migracao/steps/StepRevisao.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { MigracaoState, StepMigracao, ErroValidacao, Duplicata } from '@/types/migracao'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepRevisao({ state, updateState, goToStep }: Props) {
  const job = state.job!
  const [correcoes, setCorrecoes] = useState<Record<string, any>>({})

  const atualizarCorrecao = (linha: number, tipo: string, valor: any) => {
    setCorrecoes(prev => ({
      ...prev,
      [`${linha}_${tipo}`]: valor
    }))
  }

  const continuar = async () => {
    // Salvar correções no job
    const response = await fetch('/api/migracao/correcoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.jobId,
        correcoes
      })
    })

    goToStep('confirmacao')
  }

  return (
    <div className="space-y-6">
      {/* Erros */}
      {job.erros.length > 0 && (
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Erros encontrados ({job.erros.length})
          </h3>

          <div className="space-y-3">
            {job.erros.map((erro: ErroValidacao, i: number) => (
              <Card key={i} className="p-4 border-red-200 bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">Linha {erro.linha}</p>
                    <p className="text-sm text-red-600">{erro.erros.join(', ')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {erro.erros.includes('CPF inválido') && (
                    <div className="flex items-center gap-3">
                      <Label className="w-24">Corrigir CPF:</Label>
                      <Input
                        placeholder="000.000.000-00"
                        className="w-40"
                        onChange={(e) => atualizarCorrecao(erro.linha, 'cpf', e.target.value)}
                      />
                      <span className="text-sm text-slate-500">ou</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarCorrecao(erro.linha, 'cpf', '__remover__')}
                      >
                        Importar sem CPF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => atualizarCorrecao(erro.linha, 'acao', '__pular__')}
                      >
                        Pular linha
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Duplicatas */}
      {job.duplicatas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Duplicatas encontradas ({job.duplicatas.length})
          </h3>

          <div className="space-y-3">
            {job.duplicatas.map((dup: Duplicata, i: number) => (
              <Card key={i} className="p-4 border-amber-200 bg-amber-50">
                <div className="mb-3">
                  <p className="font-medium">Linha {dup.linha}</p>
                  <p className="text-sm text-amber-700">
                    {dup.campo}: {dup.valor} já existe como "{dup.existente.nome || dup.existente.numero}"
                  </p>
                </div>

                <RadioGroup
                  defaultValue="pular"
                  onValueChange={(v) => atualizarCorrecao(dup.linha, 'duplicata', v)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pular" id={`pular-${i}`} />
                    <Label htmlFor={`pular-${i}`}>Pular (não importar)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="atualizar" id={`atualizar-${i}`} />
                    <Label htmlFor={`atualizar-${i}`}>Atualizar registro existente</Label>
                  </div>
                </RadioGroup>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => goToStep('mapeamento')}>
          Voltar ao Mapeamento
        </Button>
        <Button onClick={continuar}>
          Aplicar Correções e Continuar
        </Button>
      </div>
    </div>
  )
}
```

### 6.7 Step Confirmação

```typescript
// src/components/migracao/steps/StepConfirmacao.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { MigracaoState, StepMigracao } from '@/types/migracao'
import { createClient } from '@/lib/supabase/client'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepConfirmacao({ state, updateState, goToStep }: Props) {
  const [confirmado, setConfirmado] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const job = state.job!

  const iniciarImportacao = async () => {
    setIsImporting(true)
    goToStep('importando')

    const supabase = createClient()
    await supabase.functions.invoke('migracao-processar', {
      body: { job_id: state.jobId, acao: 'importar' }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <FileSpreadsheet className="w-10 h-10 text-blue-500" />
          <div className="flex-1">
            <h3 className="font-medium text-lg">Resumo da Importação</h3>
            <p className="text-sm text-slate-500">{state.arquivo?.name}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-slate-800">{job.linhas_validas}</p>
            <p className="text-sm text-slate-500">Registros a importar</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-slate-800">{job.linhas_com_erro + job.linhas_duplicadas}</p>
            <p className="text-sm text-slate-500">Serão ignorados</p>
          </div>
        </div>

        {job.campos_extras.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Campos extras serão adicionados às observações: {job.campos_extras.join(', ')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="confirmar"
          checked={confirmado}
          onCheckedChange={(c) => setConfirmado(!!c)}
        />
        <label htmlFor="confirmar" className="text-sm">
          Confirmo que revisei os dados e desejo prosseguir com a importação
        </label>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => goToStep('revisao')}>
          Voltar
        </Button>
        <Button
          onClick={iniciarImportacao}
          disabled={!confirmado || isImporting}
        >
          {isImporting ? 'Iniciando...' : 'Iniciar Importação'}
        </Button>
      </div>
    </div>
  )
}
```

### 6.8 Step Conclusão

```typescript
// src/components/migracao/steps/StepConclusao.tsx
'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Loader2, Download, ArrowRight } from 'lucide-react'
import { MigracaoState } from '@/types/migracao'
import { useMigracaoJob } from '@/hooks/useMigracaoJob'
import Link from 'next/link'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
}

const proximoModulo: Record<string, string> = {
  crm: 'processos',
  processos: 'consultivo',
  consultivo: 'agenda',
  agenda: 'financeiro',
  financeiro: ''
}

const nomeModulo: Record<string, string> = {
  crm: 'CRM',
  processos: 'Processos',
  consultivo: 'Consultivo',
  agenda: 'Agenda',
  financeiro: 'Financeiro'
}

export function StepConclusao({ state, updateState }: Props) {
  const { job } = useMigracaoJob(state.jobId!)

  useEffect(() => {
    if (job) {
      updateState({ job })
    }
  }, [job])

  const isImporting = job?.status === 'importando'
  const isConcluido = job?.status === 'concluido'

  const progresso = job
    ? Math.round((job.linhas_importadas / job.linhas_validas) * 100)
    : 0

  const proximo = proximoModulo[state.modulo]

  if (isImporting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />

        <div className="text-center">
          <p className="text-lg font-medium text-slate-700">Importando registros...</p>
          <p className="text-sm text-slate-500 mt-1">
            {job?.linhas_importadas || 0} de {job?.linhas_validas || 0}
          </p>
        </div>

        <div className="w-full max-w-md">
          <Progress value={progresso} className="h-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">
          Migração Concluída!
        </h2>
        <p className="text-slate-500">
          {nomeModulo[state.modulo]} importado com sucesso
        </p>
      </div>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Estatísticas</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{job?.linhas_importadas || 0}</p>
            <p className="text-sm text-slate-500">Importados</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-amber-600">{job?.linhas_duplicadas || 0}</p>
            <p className="text-sm text-slate-500">Duplicatas</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-red-600">{job?.linhas_com_erro || 0}</p>
            <p className="text-sm text-slate-500">Erros</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Baixar Relatório
        </Button>

        {proximo ? (
          <Link href={`/dashboard/migracao/${proximo}`}>
            <Button>
              Migrar {nomeModulo[proximo]}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Link href="/dashboard/migracao">
            <Button>
              Voltar ao Hub
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
```

---

## 7. Hooks

### 7.1 useMigracaoJob

```typescript
// src/hooks/useMigracaoJob.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MigracaoJob } from '@/types/migracao'

export function useMigracaoJob(jobId: string) {
  const [job, setJob] = useState<MigracaoJob | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return

    const supabase = createClient()

    // Buscar inicial
    const fetchJob = async () => {
      const { data } = await supabase
        .from('migracao_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      setJob(data)
      setIsLoading(false)
    }

    fetchJob()

    // Subscribe para updates em tempo real
    const channel = supabase
      .channel(`migracao-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'migracao_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          setJob(payload.new as MigracaoJob)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  return { job, isLoading }
}
```

### 7.2 useMigracaoHistorico

```typescript
// src/hooks/useMigracaoHistorico.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MigracaoHistorico } from '@/types/migracao'

export function useMigracaoHistorico() {
  const [historico, setHistorico] = useState<MigracaoHistorico[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchHistorico = async () => {
      const { data } = await supabase
        .from('migracao_historico')
        .select('*')
        .order('executado_em', { ascending: false })

      setHistorico(data)
      setIsLoading(false)
    }

    fetchHistorico()
  }, [])

  return { historico, isLoading }
}
```

---

## 8. Utilitários

### 8.1 Parser de Arquivos

```typescript
// src/lib/migracao/parser.ts
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function parseArquivo(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    return parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file)
  }

  throw new Error('Formato não suportado')
}

async function parseCSV(file: File): Promise<{ headers: string[], amostra: any[], totalLinhas: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 100, // Limitar para performance
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          amostra: results.data.slice(0, 10),
          totalLinhas: results.data.length
        })
      },
      error: reject
    })
  })
}

async function parseExcel(file: File): Promise<{ headers: string[], amostra: any[], totalLinhas: number }> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const headers = data[0] as string[]
  const rows = data.slice(1)

  const amostra = rows.slice(0, 10).map(row => {
    const obj: Record<string, any> = {}
    headers.forEach((h, i) => {
      obj[h] = (row as any[])[i]
    })
    return obj
  })

  return {
    headers,
    amostra,
    totalLinhas: rows.length
  }
}
```

---

## 9. Checklist de Implementação

### Fase 1: Infraestrutura
- [ ] Criar migration SQL (tabelas + storage)
- [ ] Rodar migration no Supabase
- [ ] Configurar API key OpenAI no Supabase secrets
- [ ] Criar estrutura de pastas

### Fase 2: Edge Function
- [ ] Criar função `migracao-processar`
- [ ] Implementar parser CSV/Excel
- [ ] Implementar validadores (CPF, CNPJ, CNJ, etc.)
- [ ] Implementar checagem de duplicatas
- [ ] Implementar importers por módulo
- [ ] Deploy da Edge Function

### Fase 3: API Routes
- [ ] `/api/migracao/analisar` - Análise IA
- [ ] `/api/migracao/criar-job` - Upload + criar job
- [ ] `/api/migracao/correcoes` - Salvar correções

### Fase 4: Frontend - Estrutura
- [ ] Criar tipos TypeScript
- [ ] Criar hooks (useMigracaoJob, useMigracaoHistorico)
- [ ] Criar parser client-side
- [ ] Criar constantes/schemas

### Fase 5: Frontend - Componentes
- [ ] MigracaoHub (página principal)
- [ ] MigracaoWizard (container)
- [ ] StepUpload
- [ ] StepMapeamento
- [ ] StepValidacao
- [ ] StepRevisao
- [ ] StepConfirmacao
- [ ] StepConclusao

### Fase 6: Integração
- [ ] Adicionar link no menu do usuário
- [ ] Testar fluxo completo CRM
- [ ] Testar fluxo completo Processos
- [ ] Testar fluxo completo Consultivo
- [ ] Testar fluxo completo Agenda
- [ ] Testar fluxo completo Financeiro

### Fase 7: Refinamentos
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] Feedback visual
- [ ] Relatório de download
- [ ] Histórico de migrações

---

## 10. Configuração de Ambiente

### .env.local
```env
OPENAI_API_KEY=sk-...
```

### Supabase Secrets (via dashboard ou CLI)
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Próximos Passos

1. **Revisar este documento** - Algum ajuste necessário?
2. **Criar migration SQL** - Tabelas e storage
3. **Implementar Edge Function** - Core do processamento
4. **Implementar Frontend** - Wizard completo
5. **Testar com dados reais** - Planilha do escritório
