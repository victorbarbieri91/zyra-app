
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { classifyIntent, type FlowType, type SupportedOperation } from './intent-router.ts'
import { normalizeConsultivoArea, normalizeDateInput, normalizePriority, normalizeTaskType } from './payload-normalization.ts'
import { buildActionPreview, formatDate, formatDateTime, renderMarkdownTable } from './response-renderer.ts'
import { createSSEStream } from './stream-events.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STREAM_TIMEOUT_MS = 60000
const HEARTBEAT_INTERVAL_MS = 10000
const SCHEMA_CACHE_TTL_MS = 10 * 60 * 1000

type ServiceClient = ReturnType<typeof createClient>

type TerminationReason =
  | 'final'
  | 'error'
  | 'input_required'
  | 'action_required'
  | 'stream_timeout'
  | 'stream_closed_without_terminal_event'
  | 'tool_repetition_guard_triggered'
  | 'max_iterations_reached'

interface AuthContext { userId: string; escritorioId: string }
interface CampoNecessario { campo: string; descricao: string; obrigatorio: boolean; tipo: 'texto' | 'data' | 'numero' | 'selecao'; opcoes?: string[]; valor_padrao?: string | number | null }
interface PendingInputOption { id: string; label: string; description?: string }
interface PendingInput {
  id: string
  sessao_id: string
  run_id?: string
  tipo: 'collection' | 'disambiguation'
  contexto: string
  schema: { fields: CampoNecessario[]; options?: PendingInputOption[]; meta?: Record<string, unknown> }
}
interface ToolResult { tool: string; explicacao?: string; dados?: Array<Record<string, unknown>>; total?: number; tipo?: string; caminho?: string; filtros?: Record<string, unknown> }
interface ActionRequired {
  id: string
  operation_name?: string
  tipo: 'insert' | 'update' | 'delete' | 'update_em_massa'
  tabela: string
  target_label?: string
  dados?: Record<string, unknown>
  registro_id?: string
  antes?: Record<string, unknown> | null
  depois?: Record<string, unknown> | null
  explicacao: string
  preview_human?: string
  validated_payload?: Record<string, unknown>
  requires_double_confirmation?: boolean
  requer_dupla_confirmacao?: boolean
  expires_at?: string
}
interface RequestPayload {
  mensagem?: string
  sessao_id?: string | null
  streaming?: boolean
  confirmar_acao?: boolean
  acao_id?: string
  dados_adicionais?: Record<string, unknown>
  pending_input_id?: string
  input_values?: Record<string, unknown>
  escritorio_id?: string | null
  user_id?: string | null
}
interface FlowResult {
  sucesso: boolean
  resposta?: string
  flow_type: FlowType
  termination_reason: TerminationReason
  run_id: string
  sessao_id: string | null
  tempo_execucao_ms: number
  tool_results?: ToolResult[]
  acoes_pendentes?: ActionRequired[]
  pending_input?: PendingInput | null
  erro?: string
}
interface RunContext { supabase: ServiceClient; auth: AuthContext; runId: string; sessaoId: string; mensagem: string }
interface TableInfoColumn {
  coluna: string
  tipo: string
  obrigatorio: boolean
  default: string | null
  auto: boolean
}
interface TableInfoCheck {
  coluna: string
  definicao: string
}
interface TableInfo {
  tabela: string
  colunas: TableInfoColumn[]
  constraints_check: TableInfoCheck[]
  foreign_keys: Array<{ coluna: string; tabela_ref: string; coluna_ref: string }>
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const nowIso = () => new Date().toISOString()
const asError = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Erro interno')
const successResponse = (body: Record<string, unknown>) => new Response(JSON.stringify({ sucesso: true, ...body }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const errorResponse = (message: string, status = 400) => new Response(JSON.stringify({ sucesso: false, erro: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const asText = (v: unknown) => (typeof v === 'string' && v.trim().length ? v.trim() : null)
const schemaCache = new Map<string, { info: TableInfo; expiresAt: number }>()
const isRouterV2Enabled = () => (Deno.env.get('CCIA_ROUTER_V2') || 'true').toLowerCase() !== 'false'

function extractBearerToken(req: Request) {
  const h = req.headers.get('authorization')
  return h?.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function authenticateRequest(req: Request, supabase: ServiceClient, requestedOfficeId?: string | null): Promise<AuthContext> {
  const token = extractBearerToken(req)
  if (!token) throw new Error('Token de autenticacao ausente')
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) throw new Error('Nao foi possivel validar o usuario autenticado')
  const userId = authData.user.id
  const { data: memberships, error } = await supabase.from('escritorios_usuarios').select('escritorio_id, ativo, ultimo_acesso').eq('user_id', userId).eq('ativo', true).order('ultimo_acesso', { ascending: false, nullsFirst: false })
  if (error) throw new Error(error.message)
  if (!memberships?.length) throw new Error('Usuario sem vinculo ativo com escritorio')
  const allowed = memberships.map((m) => m.escritorio_id as string)
  if (requestedOfficeId && !allowed.includes(requestedOfficeId)) throw new Error('Usuario nao possui vinculo com o escritorio informado')
  return { userId, escritorioId: requestedOfficeId || allowed[0] }
}

async function ensureSession(supabase: ServiceClient, auth: AuthContext, sessaoId?: string | null, titulo?: string) {
  if (sessaoId) return sessaoId
  const { data, error } = await supabase.from('centro_comando_sessoes').insert({ user_id: auth.userId, escritorio_id: auth.escritorioId, titulo: titulo?.slice(0, 120) || 'Centro de Comando', contexto: {}, ativo: true }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

async function saveHistorico(supabase: ServiceClient, payload: Record<string, unknown>) { await supabase.from('centro_comando_historico').insert(payload) }

async function saveExecutionStart(supabase: ServiceClient, auth: AuthContext, runId: string, sessaoId: string, flowType: FlowType) {
  await supabase.from('centro_comando_execucoes').insert({ run_id: runId, sessao_id: sessaoId, user_id: auth.userId, escritorio_id: auth.escritorioId, flow_type: flowType, termination_reason: 'final', iteration_count: 0, stream_mode: 'sse', had_input_modal: false, had_confirmation_modal: false, had_write: false, had_error: false, tool_repetition_count: 0, started_at: nowIso() })
}

async function saveExecutionEnd(supabase: ServiceClient, runId: string, payload: Record<string, unknown>) {
  await supabase.from('centro_comando_execucoes').update({ ...payload, finished_at: nowIso() }).eq('run_id', runId)
}

function pickLabel(message: string, labels: string[]) {
  for (const label of labels) {
    const match = message.match(new RegExp(`${label}\\s*[:=-]\\s*([^\\n]+)`, 'i'))
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function pickQuoted(message: string): string | null {
  const quoted = message.match(/"([^"]{2,120})"/)
  return quoted?.[1]?.trim() || null
}

function guessDate(message: string): string | null {
  if (/\bamanh[ãa]?\b/i.test(message)) return normalizeDateInput('amanha')
  if (/\bhoje\b/i.test(message)) return normalizeDateInput('hoje')
  const br = message.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/)
  if (br?.[0]) return normalizeDateInput(br[0])
  const iso = message.match(/\b\d{4}-\d{2}-\d{2}\b/)
  if (iso?.[0]) return normalizeDateInput(iso[0])
  return null
}

function normalizeTaskStatus(value?: string | null): string {
  if (!value) return 'pendente'
  const v = value.trim().toLowerCase().replace(/\s+/g, '_')
  if (['pendente', 'em_andamento', 'em_pausa', 'concluida', 'cancelada'].includes(v)) return v
  return 'pendente'
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  if (typeof value === 'object') {
    const sorted = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${stableSerialize(v)}`)
    return `{${sorted.join(',')}}`
  }
  return String(value)
}

function buildOperationSignature(operation: string, extras: Record<string, unknown>): string {
  return `${operation}:${stableSerialize(extras)}`
}

function parseAllowedValues(checkClause: string): string[] {
  const values: string[] = []
  const regex = /'([^']+)'::text/g
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(checkClause)) !== null) values.push(match[1])
  return values
}

function isTypeCompatible(type: string, value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (type.includes('uuid')) return typeof value === 'string' && uuidRegex.test(value)
  if (type === 'integer') return Number.isInteger(Number(value))
  if (type === 'numeric') return !Number.isNaN(Number(value))
  if (type.includes('date')) return typeof value === 'string'
  if (type.includes('timestamp')) return typeof value === 'string'
  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'ARRAY') return Array.isArray(value)
  return true
}

async function getTableInfo(supabase: ServiceClient, tableName: string): Promise<TableInfo> {
  const cached = schemaCache.get(tableName)
  if (cached && cached.expiresAt > Date.now()) return cached.info
  const { data, error } = await supabase.rpc('get_table_info', { tabela_nome: tableName })
  if (error || !data) throw new Error(`Nao foi possivel obter schema de ${tableName}`)
  const info = data as TableInfo
  schemaCache.set(tableName, { info, expiresAt: Date.now() + SCHEMA_CACHE_TTL_MS })
  return info
}

function validateWritePayloadBySchema(
  tableInfo: TableInfo,
  mode: 'insert' | 'update',
  payload: Record<string, unknown>,
) {
  const columns = tableInfo.colunas || []
  const columnMap = new Map(columns.map((c) => [c.coluna, c]))
  const checkMap = new Map((tableInfo.constraints_check || []).map((c) => [c.coluna, parseAllowedValues(c.definicao)]))

  const targetPayload = mode === 'update'
    ? ((payload.alteracoes || payload.depois || payload) as Record<string, unknown>)
    : payload

  const unknownFields = Object.keys(targetPayload).filter((k) => !columnMap.has(k))
  if (unknownFields.length) {
    throw new Error(`Campos invalidos para ${tableInfo.tabela}: ${unknownFields.join(', ')}`)
  }

  if (mode === 'insert') {
    const missingRequired = columns
      .filter((c) => c.obrigatorio && !c.auto && c.default === null)
      .filter((c) => !(c.coluna in targetPayload) || targetPayload[c.coluna] === null || targetPayload[c.coluna] === '')
      .map((c) => c.coluna)
    if (missingRequired.length) {
      throw new Error(`Campos obrigatorios ausentes: ${missingRequired.join(', ')}`)
    }
  }

  for (const [field, value] of Object.entries(targetPayload)) {
    const column = columnMap.get(field)
    if (!column) continue
    if (!isTypeCompatible(column.tipo, value)) {
      throw new Error(`Tipo invalido para ${field}. Esperado: ${column.tipo}`)
    }
    const allowed = checkMap.get(field)
    if (allowed?.length && value !== null && value !== undefined && value !== '') {
      if (!allowed.includes(String(value))) {
        throw new Error(`Valor invalido para ${field}. Permitidos: ${allowed.join(', ')}`)
      }
    }
  }
}

async function cleanupExpiredPendings(
  supabase: ServiceClient,
  auth: AuthContext,
  sessaoId: string,
) {
  await supabase
    .from('centro_comando_inputs_pendentes')
    .update({ status: 'expirado' })
    .eq('user_id', auth.userId)
    .eq('escritorio_id', auth.escritorioId)
    .eq('sessao_id', sessaoId)
    .eq('status', 'pendente')
    .lt('expira_em', nowIso())

  await supabase
    .from('centro_comando_acoes_pendentes')
    .update({ executado: true, erro: 'acao_expirada', executado_em: nowIso() })
    .eq('user_id', auth.userId)
    .eq('escritorio_id', auth.escritorioId)
    .eq('sessao_id', sessaoId)
    .eq('executado', false)
    .lt('expira_em', nowIso())
}

async function createPendingInput(supabase: ServiceClient, auth: AuthContext, p: { sessaoId: string; runId: string; tipo: 'collection' | 'disambiguation'; contexto: string; schema: PendingInput['schema'] }): Promise<PendingInput> {
  const { data: existing } = await supabase
    .from('centro_comando_inputs_pendentes')
    .select('*')
    .eq('sessao_id', p.sessaoId)
    .eq('user_id', auth.userId)
    .eq('escritorio_id', auth.escritorioId)
    .eq('status', 'pendente')
    .or(`expira_em.is.null,expira_em.gte.${nowIso()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      id: existing.id as string,
      sessao_id: existing.sessao_id as string,
      run_id: existing.run_id as string,
      tipo: existing.tipo as 'collection' | 'disambiguation',
      contexto: existing.contexto as string,
      schema: existing.schema as PendingInput['schema'],
    }
  }

  const { data, error } = await supabase.from('centro_comando_inputs_pendentes').insert({ sessao_id: p.sessaoId, run_id: p.runId, user_id: auth.userId, escritorio_id: auth.escritorioId, tipo: p.tipo, contexto: p.contexto, schema: p.schema, status: 'pendente', expira_em: new Date(Date.now() + 30 * 60000).toISOString() }).select('*').single()
  if (error) throw new Error(error.message)
  return { id: data.id as string, sessao_id: data.sessao_id as string, run_id: data.run_id as string, tipo: data.tipo as 'collection' | 'disambiguation', contexto: data.contexto as string, schema: data.schema as PendingInput['schema'] }
}

async function loadPendingInput(supabase: ServiceClient, auth: AuthContext, id: string): Promise<PendingInput> {
  const { data, error } = await supabase.from('centro_comando_inputs_pendentes').select('*').eq('id', id).eq('user_id', auth.userId).eq('escritorio_id', auth.escritorioId).eq('status', 'pendente').single()
  if (error || !data) throw new Error('Formulario pendente nao encontrado')
  return { id: data.id as string, sessao_id: data.sessao_id as string, run_id: data.run_id as string, tipo: data.tipo as 'collection' | 'disambiguation', contexto: data.contexto as string, schema: data.schema as PendingInput['schema'] }
}

async function markPendingInputAnswered(supabase: ServiceClient, id: string, values: Record<string, unknown>) {
  await supabase.from('centro_comando_inputs_pendentes').update({ status: 'respondido', respondido_em: nowIso(), values }).eq('id', id)
}
async function createAction(supabase: ServiceClient, auth: AuthContext, p: { sessaoId: string; runId: string; operationName: string; tipo: 'insert' | 'update' | 'delete'; tabela: string; explicacao: string; targetLabel?: string; dados: Record<string, unknown>; registroId?: string; antes?: Record<string, unknown> | null; depois?: Record<string, unknown> | null; preview?: string; resolved?: Record<string, unknown>; double?: boolean }): Promise<ActionRequired> {
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString()
  if (p.tipo === 'insert' || p.tipo === 'update') {
    const tableInfo = await getTableInfo(supabase, p.tabela)
    validateWritePayloadBySchema(tableInfo, p.tipo, p.dados)
  }

  const { data, error } = await supabase.from('centro_comando_acoes_pendentes').insert({
    sessao_id: p.sessaoId,
    user_id: auth.userId,
    escritorio_id: auth.escritorioId,
    tipo_acao: p.tipo,
    tabela: p.tabela,
    dados: { ...p.dados, registro_id: p.registroId, antes: p.antes, depois: p.depois },
    explicacao: p.explicacao,
    confirmado: false,
    executado: false,
    expira_em: expiresAt,
    run_id: p.runId,
    operation_name: p.operationName,
    target_label: p.targetLabel,
    resolved_entities: p.resolved || {},
    validated_payload: p.dados,
    preview_human: p.preview || p.explicacao,
    idempotency_key: `${auth.userId}:${p.operationName}:${p.tabela}:${p.registroId || ''}:${JSON.stringify(p.dados)}`,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return { id: data.id, operation_name: p.operationName, tipo: p.tipo, tabela: p.tabela, target_label: p.targetLabel, dados: p.dados, registro_id: p.registroId, antes: p.antes || null, depois: p.depois || null, explicacao: p.explicacao, preview_human: data.preview_human, validated_payload: p.dados, requires_double_confirmation: !!p.double, requer_dupla_confirmacao: !!p.double, expires_at: expiresAt } as ActionRequired
}

async function executeConfirmedAction(supabase: ServiceClient, auth: AuthContext, acaoId: string, extras: Record<string, unknown>) {
  const { data, error } = await supabase.from('centro_comando_acoes_pendentes').select('*').eq('id', acaoId).eq('user_id', auth.userId).eq('escritorio_id', auth.escritorioId).eq('executado', false).single()
  if (error || !data) throw new Error('Acao pendente nao encontrada')
  if (data.expira_em && new Date(data.expira_em as string).getTime() < Date.now()) throw new Error('Acao pendente expirada')
  const tipo = data.tipo_acao as 'insert' | 'update' | 'delete'
  const payload = ((data.validated_payload || data.dados || {}) as Record<string, unknown>) || {}
  let result: unknown = null

  if (tipo === 'insert') {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('execute_safe_insert', { tabela: data.tabela, dados: payload, escritorio_param: auth.escritorioId })
    if (rpcErr) throw new Error(rpcErr.message)
    result = rpcData
  }
  if (tipo === 'update') {
    const registroId = String(payload.registro_id || (data.dados as any)?.registro_id || '')
    const alteracoes = (payload.alteracoes || payload.depois || payload) as Record<string, unknown>
    if (!registroId || !uuidRegex.test(registroId)) throw new Error('Registro invalido para alteracao')
    const { data: rpcData, error: rpcErr } = await supabase.rpc('execute_safe_update', { tabela: data.tabela, registro_id: registroId, alteracoes, escritorio_param: auth.escritorioId })
    if (rpcErr) throw new Error(rpcErr.message)
    result = rpcData
  }
  if (tipo === 'delete') {
    if (!extras.dupla_confirmacao) throw new Error('Dupla confirmacao obrigatoria para exclusao')
    const registroId = String(payload.registro_id || (data.dados as any)?.registro_id || '')
    if (!registroId || !uuidRegex.test(registroId)) throw new Error('Registro invalido para exclusao')
    const { data: rpcData, error: rpcErr } = await supabase.rpc('execute_safe_delete', { tabela: data.tabela, registro_id: registroId, escritorio_param: auth.escritorioId, confirmacao_dupla: true })
    if (rpcErr) throw new Error(rpcErr.message)
    result = rpcData
  }

  await supabase.from('centro_comando_acoes_pendentes').update({ confirmado: true, executado: true, confirmado_em: nowIso(), executado_em: nowIso(), resultado: result, erro: null }).eq('id', acaoId)
}

async function resolveProcessRef(supabase: ServiceClient, escritorioId: string, processRef: string) {
  const ref = processRef.replace(/[%_]/g, '').trim()
  if (!ref) return []
  const padded = /^\d{1,5}$/.test(ref) ? `PROC-${ref.padStart(4, '0')}` : ref
  const { data, error } = await supabase.from('processos_processos').select('id, numero_pasta, numero_cnj, autor, reu').eq('escritorio_id', escritorioId).or(`numero_cnj.ilike.%${ref}%,numero_pasta.ilike.%${ref}%,numero_pasta.ilike.%${padded}%`).limit(8)
  if (error) throw new Error(error.message)
  return data || []
}

async function resolveClientByName(supabase: ServiceClient, escritorioId: string, name: string) {
  const ref = name.replace(/[%_]/g, '').trim()
  if (!ref) return []
  const { data, error } = await supabase.from('crm_pessoas').select('id, nome_completo, email, telefone').eq('escritorio_id', escritorioId).ilike('nome_completo', `%${ref}%`).limit(8)
  if (error) throw new Error(error.message)
  return data || []
}

async function resolveTaskByRef(supabase: ServiceClient, escritorioId: string, taskRef: string) {
  const ref = taskRef.trim()
  if (!ref) return []
  let query = supabase.from('agenda_tarefas').select('id, titulo, data_inicio, status, processo_id, consultivo_id').eq('escritorio_id', escritorioId).order('data_inicio', { ascending: true }).limit(8)
  query = uuidRegex.test(ref) ? query.eq('id', ref) : query.ilike('titulo', `%${ref.replace(/[%_]/g, '')}%`)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

function optionFromRow(row: Record<string, unknown>, label: string, description?: string): PendingInputOption {
  return { id: String(row.id), label, description }
}

function firstDayOfMonth(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10) }
function lastDayOfMonth(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) }

async function readOperations(ctx: RunContext, operation: SupportedOperation, extras: Record<string, unknown>): Promise<Partial<FlowResult>> {
  if (operation === 'count_pending_publications') {
    const { count, error } = await ctx.supabase.from('publicacoes_publicacoes').select('id', { count: 'exact', head: true }).eq('escritorio_id', ctx.auth.escritorioId).eq('status', 'pendente')
    if (error) throw new Error(error.message)
    return { resposta: `Existem **${count || 0}** publicacoes pendentes neste escritorio.`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Contagem de publicacoes pendentes', total: count || 0 }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  if (operation === 'list_pending_publications') {
    const { data, error } = await ctx.supabase.from('publicacoes_publicacoes').select('id, data_publicacao, numero_processo, tribunal, urgente').eq('escritorio_id', ctx.auth.escritorioId).eq('status', 'pendente').order('data_publicacao', { ascending: false }).limit(20)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: 'Nao encontrei publicacoes pendentes.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Lista de publicacoes pendentes', total: 0, dados: [] }], flow_type: 'read_simple', termination_reason: 'final' }
    const table = rows.map((r) => ({ Data: formatDate(String(r.data_publicacao || '')), Processo: r.numero_processo, Tribunal: r.tribunal, Urgente: r.urgente ? 'Sim' : 'Nao' }))
    return { resposta: `Encontrei ${rows.length} publicacoes pendentes.\n\n${renderMarkdownTable(['Data', 'Processo', 'Tribunal', 'Urgente'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Lista de publicacoes pendentes', total: rows.length, dados: rows as any[] }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  if (operation === 'list_tasks_today') {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await ctx.supabase.from('agenda_tarefas').select('id, titulo, tipo, prioridade, status, data_inicio, prazo_data_limite').eq('escritorio_id', ctx.auth.escritorioId).eq('responsavel_id', ctx.auth.userId).eq('data_inicio', today).order('prioridade', { ascending: false }).limit(30)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: 'Voce nao tem tarefas para hoje.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Tarefas de hoje', total: 0, dados: [] }], flow_type: 'read_simple', termination_reason: 'final' }
    const table = rows.map((r) => ({ Titulo: r.titulo, Tipo: r.tipo, Prioridade: r.prioridade, Status: r.status, Prazo: formatDate(String(r.prazo_data_limite || '')) }))
    return { resposta: `Voce tem ${rows.length} tarefas para hoje.\n\n${renderMarkdownTable(['Titulo', 'Tipo', 'Prioridade', 'Status', 'Prazo'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Tarefas de hoje', total: rows.length, dados: rows as any[] }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  if (operation === 'list_hearings_week') {
    const start = new Date(); const end = new Date(start); end.setDate(start.getDate() + 7)
    const { data, error } = await ctx.supabase.from('agenda_audiencias').select('id, titulo, data_hora, tipo_audiencia, modalidade, status').eq('escritorio_id', ctx.auth.escritorioId).eq('responsavel_id', ctx.auth.userId).gte('data_hora', start.toISOString()).lte('data_hora', end.toISOString()).order('data_hora', { ascending: true }).limit(30)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: 'Nao encontrei audiencias para os proximos 7 dias.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Audiencias da semana', total: 0, dados: [] }], flow_type: 'read_simple', termination_reason: 'final' }
    const table = rows.map((r) => ({ Titulo: r.titulo, Data: formatDateTime(String(r.data_hora || '')), Tipo: r.tipo_audiencia, Modalidade: r.modalidade, Status: r.status }))
    return { resposta: `Encontrei ${rows.length} audiencias para os proximos 7 dias.\n\n${renderMarkdownTable(['Titulo', 'Data', 'Tipo', 'Modalidade', 'Status'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Audiencias da semana', total: rows.length, dados: rows as any[] }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  if (operation === 'list_timesheet_month') {
    const { data, error } = await ctx.supabase.from('financeiro_timesheet').select('id, data_trabalho, horas, atividade, faturavel, faturado').eq('escritorio_id', ctx.auth.escritorioId).eq('user_id', ctx.auth.userId).gte('data_trabalho', firstDayOfMonth()).lte('data_trabalho', lastDayOfMonth()).order('data_trabalho', { ascending: false }).limit(50)
    if (error) throw new Error(error.message)
    const rows = data || []
    const totalHoras = rows.reduce((sum, r) => sum + Number(r.horas || 0), 0)
    if (!rows.length) return { resposta: 'Nao encontrei lancamentos de horas neste mes.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Timesheet do mes', total: 0, dados: [] }], flow_type: 'read_simple', termination_reason: 'final' }
    const table = rows.slice(0, 15).map((r) => ({ Data: formatDate(String(r.data_trabalho || '')), Horas: Number(r.horas || 0).toFixed(2), Atividade: r.atividade, Faturavel: r.faturavel ? 'Sim' : 'Nao', Faturado: r.faturado ? 'Sim' : 'Nao' }))
    return { resposta: `Voce registrou **${totalHoras.toFixed(2)}h** neste mes.\n\n${renderMarkdownTable(['Data', 'Horas', 'Atividade', 'Faturavel', 'Faturado'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Timesheet do mes', total: rows.length, dados: rows as any[] }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  if (operation === 'navigate') {
    const normalized = ctx.mensagem.toLowerCase()
    let path = '/dashboard'
    if (normalized.includes('agenda')) path = '/dashboard/agenda'
    if (normalized.includes('process')) path = '/dashboard/processos'
    if (normalized.includes('finance')) path = '/dashboard/financeiro'
    if (normalized.includes('cliente') || normalized.includes('crm')) path = '/dashboard/crm'
    if (normalized.includes('consultiv')) path = '/dashboard/consultivo'
    if (normalized.includes('publica')) path = '/dashboard/publicacoes'
    return { resposta: `Posso te levar para ${path}.`, tool_results: [{ tool: 'navegar_pagina', tipo: 'navegacao', explicacao: `Ir para ${path}`, caminho: path }], flow_type: 'navigate', termination_reason: 'final' }
  }

  if (operation === 'check_consultivo_by_client') {
    const clientName = asText(extras.client_name) || classifyIntent(ctx.mensagem).clientName
    const clientId = asText(extras.cliente_id)
    if (!clientName && !clientId) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, { sessaoId: ctx.sessaoId, runId: ctx.runId, tipo: 'collection', contexto: 'Informe o nome do cliente para verificar pasta consultiva.', schema: { fields: [{ campo: 'client_name', descricao: 'Nome do cliente', obrigatorio: true, tipo: 'texto' }], meta: { operation: 'check_consultivo_by_client' } } })
      return { resposta: 'Preciso do nome do cliente para continuar.', pending_input: pending, flow_type: 'read_simple', termination_reason: 'input_required' }
    }
    let finalClientId = clientId
    let finalClientLabel = clientName || ''
    if (!finalClientId && clientName) {
      const clients = await resolveClientByName(ctx.supabase, ctx.auth.escritorioId, clientName)
      if (!clients.length) return { resposta: `Nao encontrei cliente com nome \"${clientName}\".`, flow_type: 'read_simple', termination_reason: 'final' }
      if (clients.length > 1) {
        const pending = await createPendingInput(ctx.supabase, ctx.auth, { sessaoId: ctx.sessaoId, runId: ctx.runId, tipo: 'disambiguation', contexto: `Encontrei mais de um cliente para \"${clientName}\". Escolha o correto.`, schema: { fields: [{ campo: 'selected_option', descricao: 'Selecione o cliente', obrigatorio: true, tipo: 'selecao' }], options: clients.map((c: any) => optionFromRow(c, String(c.nome_completo), `${c.email || '-'} | ${c.telefone || '-'}`)), meta: { operation: 'check_consultivo_by_client' } } })
        return { resposta: 'Preciso que voce escolha o cliente correto.', pending_input: pending, flow_type: 'read_simple', termination_reason: 'input_required' }
      }
      finalClientId = String(clients[0].id)
      finalClientLabel = String(clients[0].nome_completo || clientName)
    }
    const { data, error } = await ctx.supabase.from('consultivo_consultas').select('id, numero, titulo, area, prioridade, status, prazo, created_at').eq('escritorio_id', ctx.auth.escritorioId).eq('cliente_id', finalClientId).order('created_at', { ascending: false }).limit(20)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: `Nao encontrei pasta consultiva aberta para ${finalClientLabel || 'este cliente'}.`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Consulta de pasta consultiva por cliente', total: 0, dados: [] }], flow_type: 'read_simple', termination_reason: 'final' }
    const table = rows.map((r) => ({ Numero: r.numero, Titulo: r.titulo, Area: r.area, Prioridade: r.prioridade, Status: r.status, Prazo: formatDate(String(r.prazo || '')) }))
    return { resposta: `Encontrei ${rows.length} pasta(s) consultiva(s) para ${finalClientLabel || 'o cliente'}.\n\n${renderMarkdownTable(['Numero', 'Titulo', 'Area', 'Prioridade', 'Status', 'Prazo'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Consulta de pasta consultiva por cliente', total: rows.length, dados: rows as any[] }], flow_type: 'read_simple', termination_reason: 'final' }
  }

  return { resposta: 'Ainda nao consigo executar esse pedido de forma segura neste fluxo.', flow_type: 'unsupported', termination_reason: 'final' }
}
async function disambiguateProcess(ctx: RunContext, operation: SupportedOperation, processRef: string, processos: Array<Record<string, unknown>>): Promise<Partial<FlowResult>> {
  const pending = await createPendingInput(ctx.supabase, ctx.auth, {
    sessaoId: ctx.sessaoId,
    runId: ctx.runId,
    tipo: 'disambiguation',
    contexto: `Encontrei mais de um processo para \"${processRef}\". Escolha qual deseja usar.`,
    schema: {
      fields: [{ campo: 'selected_option', descricao: 'Selecione o processo correto', obrigatorio: true, tipo: 'selecao' }],
      options: processos.map((p) => optionFromRow(p, String(p.numero_pasta || p.numero_cnj || p.id), `${p.autor || '-'} x ${p.reu || '-'}`)),
      meta: { operation },
    },
  })
  return { resposta: 'Preciso que voce escolha qual processo deseja consultar.', pending_input: pending, flow_type: 'read_ambiguous', termination_reason: 'input_required' }
}

async function readCaseOperation(ctx: RunContext, operation: SupportedOperation, extras: Record<string, unknown>): Promise<Partial<FlowResult>> {
  let processId = asText(extras.processo_id)
  const processRef = asText(extras.process_ref) || classifyIntent(ctx.mensagem).processRef

  if (!processId) {
    if (!processRef) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, {
        sessaoId: ctx.sessaoId,
        runId: ctx.runId,
        tipo: 'collection',
        contexto: 'Informe o numero da pasta ou CNJ para continuar.',
        schema: { fields: [{ campo: 'process_ref', descricao: 'Numero da pasta ou CNJ', obrigatorio: true, tipo: 'texto' }], meta: { operation } },
      })
      return { resposta: 'Preciso do processo para continuar.', pending_input: pending, flow_type: 'read_ambiguous', termination_reason: 'input_required' }
    }
    const processos = await resolveProcessRef(ctx.supabase, ctx.auth.escritorioId, processRef)
    if (!processos.length) return { resposta: `Nao encontrei processo para \"${processRef}\".`, flow_type: 'read_ambiguous', termination_reason: 'final' }
    if (processos.length > 1) return await disambiguateProcess(ctx, operation, processRef, processos as any[])
    processId = String(processos[0].id)
  }

  if (operation === 'list_case_tasks') {
    const { data, error } = await ctx.supabase.from('agenda_tarefas').select('id, titulo, tipo, prioridade, status, data_inicio, prazo_data_limite').eq('escritorio_id', ctx.auth.escritorioId).eq('processo_id', processId).order('data_inicio', { ascending: true }).limit(30)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: 'Nao encontrei tarefas para este processo.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Tarefas por processo', total: 0, dados: [] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
    const table = rows.map((r) => ({ Titulo: r.titulo, Tipo: r.tipo, Prioridade: r.prioridade, Status: r.status, Inicio: formatDate(String(r.data_inicio || '')) }))
    return { resposta: `Encontrei ${rows.length} tarefas para o processo.\n\n${renderMarkdownTable(['Titulo', 'Tipo', 'Prioridade', 'Status', 'Inicio'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Tarefas por processo', total: rows.length, dados: rows as any[] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
  }

  if (operation === 'list_case_hearings') {
    const { data, error } = await ctx.supabase.from('agenda_audiencias').select('id, titulo, data_hora, tipo_audiencia, modalidade, status').eq('escritorio_id', ctx.auth.escritorioId).eq('processo_id', processId).order('data_hora', { ascending: true }).limit(30)
    if (error) throw new Error(error.message)
    const rows = data || []
    if (!rows.length) return { resposta: 'Nao encontrei audiencias para este processo.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Audiencias por processo', total: 0, dados: [] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
    const table = rows.map((r) => ({ Titulo: r.titulo, Data: formatDateTime(String(r.data_hora || '')), Tipo: r.tipo_audiencia, Modalidade: r.modalidade, Status: r.status }))
    return { resposta: `Encontrei ${rows.length} audiencias para o processo.\n\n${renderMarkdownTable(['Titulo', 'Data', 'Tipo', 'Modalidade', 'Status'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Audiencias por processo', total: rows.length, dados: rows as any[] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
  }

  const { data, error } = await ctx.supabase.from('v_agenda_consolidada').select('id, tipo_entidade, titulo, data_inicio, data_fim, status, prioridade, responsavel_nome').eq('escritorio_id', ctx.auth.escritorioId).eq('processo_id', processId).order('data_inicio', { ascending: true }).limit(40)
  if (error) throw new Error(error.message)
  const rows = data || []
  if (!rows.length) return { resposta: 'Nao encontrei itens de agenda para este processo.', tool_results: [{ tool: 'consultar_dados', explicacao: 'Agenda consolidada por processo', total: 0, dados: [] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
  const table = rows.map((r) => ({ Tipo: r.tipo_entidade, Titulo: r.titulo, Inicio: formatDateTime(String(r.data_inicio || '')), Fim: formatDateTime(String(r.data_fim || '')), Status: r.status, Responsavel: r.responsavel_nome }))
  return { resposta: `Encontrei ${rows.length} itens na agenda deste processo.\n\n${renderMarkdownTable(['Tipo', 'Titulo', 'Inicio', 'Fim', 'Status', 'Responsavel'], table)}`, tool_results: [{ tool: 'consultar_dados', explicacao: 'Agenda consolidada por processo', total: rows.length, dados: rows as any[] }], flow_type: 'read_ambiguous', termination_reason: 'final' }
}

async function createOrUpdateOperation(ctx: RunContext, operation: SupportedOperation, extras: Record<string, unknown>): Promise<Partial<FlowResult>> {
  if (operation === 'create_task') {
    const titulo = asText(extras.titulo) || asText(extras.task_title) || pickLabel(ctx.mensagem, ['titulo', 'tarefa']) || pickQuoted(ctx.mensagem)
    const descricao = asText(extras.descricao)
    const prioridade = normalizePriority(asText(extras.prioridade) || (/urgente|prioridade alta/i.test(ctx.mensagem) ? 'alta' : 'media'))
    const tipo = normalizeTaskType(asText(extras.tipo))
    const status = normalizeTaskStatus(asText(extras.status))
    const dataInicio = normalizeDateInput(asText(extras.data_inicio)) || normalizeDateInput(asText(extras.data)) || guessDate(ctx.mensagem)
    let processoId = asText(extras.processo_id)
    const processRef = asText(extras.process_ref) || classifyIntent(ctx.mensagem).processRef

    if (!processoId && processRef) {
      const processos = await resolveProcessRef(ctx.supabase, ctx.auth.escritorioId, processRef)
      if (processos.length > 1) {
        const pending = await createPendingInput(ctx.supabase, ctx.auth, {
          sessaoId: ctx.sessaoId,
          runId: ctx.runId,
          tipo: 'disambiguation',
          contexto: `Encontrei mais de um processo para \"${processRef}\". Escolha o correto para criar a tarefa.`,
          schema: {
            fields: [{ campo: 'selected_option', descricao: 'Selecione o processo', obrigatorio: true, tipo: 'selecao' }],
            options: processos.map((p) => optionFromRow(p, String(p.numero_pasta || p.numero_cnj || p.id), `${p.autor || '-'} x ${p.reu || '-'}`)),
            meta: { operation: 'create_task', draft: { ...extras, titulo, descricao, prioridade, tipo, status, data_inicio: dataInicio } },
          },
        })
        return { resposta: 'Preciso que voce escolha o processo correto antes de preparar a tarefa.', pending_input: pending, flow_type: 'create', termination_reason: 'input_required' }
      }
      if (processos.length === 1) processoId = String(processos[0].id)
    }

    if (!titulo || !dataInicio) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, {
        sessaoId: ctx.sessaoId,
        runId: ctx.runId,
        tipo: 'collection',
        contexto: 'Para criar a tarefa, preciso de alguns dados obrigatorios.',
        schema: {
          fields: [
            { campo: 'titulo', descricao: 'Titulo da tarefa', obrigatorio: true, tipo: 'texto', valor_padrao: titulo || '' },
            { campo: 'data_inicio', descricao: 'Data de inicio', obrigatorio: true, tipo: 'data', valor_padrao: dataInicio || '' },
            { campo: 'tipo', descricao: 'Tipo', obrigatorio: false, tipo: 'selecao', opcoes: ['prazo_processual', 'acompanhamento', 'follow_up', 'administrativo', 'outro', 'fixa'], valor_padrao: tipo },
            { campo: 'prioridade', descricao: 'Prioridade', obrigatorio: false, tipo: 'selecao', opcoes: ['alta', 'media', 'baixa'], valor_padrao: prioridade },
            { campo: 'descricao', descricao: 'Descricao', obrigatorio: false, tipo: 'texto', valor_padrao: descricao || '' },
          ],
          meta: { operation: 'create_task', draft: { ...extras, processo_id: processoId || null, status } },
        },
      })
      return { resposta: 'Preciso de mais informacoes para preparar a criacao da tarefa.', pending_input: pending, flow_type: 'create', termination_reason: 'input_required' }
    }

    const dados: Record<string, unknown> = { escritorio_id: ctx.auth.escritorioId, titulo, descricao, tipo, prioridade, status, data_inicio: dataInicio, responsavel_id: ctx.auth.userId, criado_por: ctx.auth.userId }
    if (processoId) dados.processo_id = processoId
    const action = await createAction(ctx.supabase, ctx.auth, {
      sessaoId: ctx.sessaoId,
      runId: ctx.runId,
      operationName: 'create_task',
      tipo: 'insert',
      tabela: 'agenda_tarefas',
      targetLabel: `Tarefa: ${titulo}`,
      explicacao: 'Revise os dados para confirmar a criacao da tarefa.',
      dados,
      depois: dados,
      preview: buildActionPreview(`Criar tarefa: ${titulo}`, [`Data: ${formatDate(dataInicio)}`, `Tipo: ${tipo}`, `Prioridade: ${prioridade}`, processoId ? 'Processo vinculado' : '']),
      resolved: { processo_id: processoId, responsavel_id: ctx.auth.userId },
    })
    return { resposta: 'A tarefa foi preparada e aguarda sua confirmacao.', acoes_pendentes: [action], flow_type: 'create', termination_reason: 'action_required' }
  }
  if (operation === 'create_consultivo') {
    const titulo = asText(extras.titulo) || asText(extras.consultivo_titulo) || pickLabel(ctx.mensagem, ['titulo', 'consulta']) || pickQuoted(ctx.mensagem)
    const descricao = asText(extras.descricao)
    const prioridade = normalizePriority(asText(extras.prioridade) || 'media')
    const area = normalizeConsultivoArea(asText(extras.area))
    const clientName = asText(extras.client_name) || asText(extras.nome_cliente) || classifyIntent(ctx.mensagem).clientName || null
    let clienteId = asText(extras.cliente_id)
    let clienteNome = ''

    if (!clienteId && clientName) {
      const clients = await resolveClientByName(ctx.supabase, ctx.auth.escritorioId, clientName)
      if (!clients.length) return { resposta: `Nao encontrei cliente com nome \"${clientName}\".`, flow_type: 'create', termination_reason: 'final' }
      if (clients.length > 1) {
        const pending = await createPendingInput(ctx.supabase, ctx.auth, {
          sessaoId: ctx.sessaoId,
          runId: ctx.runId,
          tipo: 'disambiguation',
          contexto: `Encontrei mais de um cliente para \"${clientName}\". Escolha o correto.`,
          schema: {
            fields: [{ campo: 'selected_option', descricao: 'Selecione o cliente', obrigatorio: true, tipo: 'selecao' }],
            options: clients.map((c: any) => optionFromRow(c, String(c.nome_completo), `${c.email || '-'} | ${c.telefone || '-'}`)),
            meta: { operation: 'create_consultivo', draft: { ...extras, titulo, descricao, prioridade, area } },
          },
        })
        return { resposta: 'Preciso que voce escolha o cliente correto antes de preparar a pasta consultiva.', pending_input: pending, flow_type: 'create', termination_reason: 'input_required' }
      }
      clienteId = String(clients[0].id)
      clienteNome = String(clients[0].nome_completo || '')
    }

    if (!titulo || !area || !clienteId) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, {
        sessaoId: ctx.sessaoId,
        runId: ctx.runId,
        tipo: 'collection',
        contexto: 'Para abrir a pasta consultiva, preciso dos campos obrigatorios.',
        schema: {
          fields: [
            { campo: 'titulo', descricao: 'Titulo da consulta', obrigatorio: true, tipo: 'texto', valor_padrao: titulo || '' },
            { campo: 'client_name', descricao: 'Nome do cliente', obrigatorio: !clienteId, tipo: 'texto', valor_padrao: clientName || '' },
            { campo: 'area', descricao: 'Area', obrigatorio: true, tipo: 'selecao', opcoes: ['civel', 'trabalhista', 'tributaria', 'societaria', 'empresarial', 'contratual', 'familia', 'criminal', 'previdenciaria', 'consumidor', 'ambiental', 'imobiliario', 'propriedade_intelectual', 'compliance', 'outra'], valor_padrao: area || '' },
            { campo: 'prioridade', descricao: 'Prioridade', obrigatorio: false, tipo: 'selecao', opcoes: ['alta', 'media', 'baixa'], valor_padrao: prioridade },
            { campo: 'descricao', descricao: 'Descricao', obrigatorio: false, tipo: 'texto', valor_padrao: descricao || '' },
          ],
          meta: { operation: 'create_consultivo', draft: { ...extras, cliente_id: clienteId || null } },
        },
      })
      return { resposta: 'Preciso de mais informacoes para preparar a pasta consultiva.', pending_input: pending, flow_type: 'create', termination_reason: 'input_required' }
    }

    const dados: Record<string, unknown> = { escritorio_id: ctx.auth.escritorioId, titulo, descricao, prioridade, area, cliente_id: clienteId, responsavel_id: ctx.auth.userId, created_by: ctx.auth.userId, status: 'ativo' }
    const action = await createAction(ctx.supabase, ctx.auth, {
      sessaoId: ctx.sessaoId,
      runId: ctx.runId,
      operationName: 'create_consultivo',
      tipo: 'insert',
      tabela: 'consultivo_consultas',
      targetLabel: `Pasta consultiva: ${titulo}`,
      explicacao: 'Revise os dados para confirmar a criacao da pasta consultiva.',
      dados,
      depois: dados,
      preview: buildActionPreview(`Abrir pasta consultiva: ${titulo}`, [`Cliente: ${clienteNome || clienteId}`, `Area: ${area}`, `Prioridade: ${prioridade}`]),
      resolved: { cliente_id: clienteId, responsavel_id: ctx.auth.userId },
    })
    return { resposta: 'A pasta consultiva foi preparada e aguarda sua confirmacao.', acoes_pendentes: [action], flow_type: 'create', termination_reason: 'action_required' }
  }

  if (operation === 'reschedule_task') {
    const taskRef = asText(extras.tarefa_ref) || asText(extras.task_ref) || pickLabel(ctx.mensagem, ['tarefa', 'id']) || pickQuoted(ctx.mensagem)
    const newDate = normalizeDateInput(asText(extras.nova_data)) || normalizeDateInput(asText(extras.data_inicio)) || guessDate(ctx.mensagem)
    if (!taskRef || !newDate) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, { sessaoId: ctx.sessaoId, runId: ctx.runId, tipo: 'collection', contexto: 'Para reagendar, preciso da tarefa e da nova data.', schema: { fields: [{ campo: 'tarefa_ref', descricao: 'Titulo ou ID da tarefa', obrigatorio: true, tipo: 'texto', valor_padrao: taskRef || '' }, { campo: 'nova_data', descricao: 'Nova data', obrigatorio: true, tipo: 'data', valor_padrao: newDate || '' }], meta: { operation: 'reschedule_task', draft: { ...extras } } } })
      return { resposta: 'Preciso de mais dados para reagendar a tarefa.', pending_input: pending, flow_type: 'update', termination_reason: 'input_required' }
    }

    const tasks = await resolveTaskByRef(ctx.supabase, ctx.auth.escritorioId, taskRef)
    if (!tasks.length) return { resposta: `Nao encontrei tarefa para \"${taskRef}\".`, flow_type: 'update', termination_reason: 'final' }
    if (tasks.length > 1) {
      const pending = await createPendingInput(ctx.supabase, ctx.auth, {
        sessaoId: ctx.sessaoId,
        runId: ctx.runId,
        tipo: 'disambiguation',
        contexto: `Encontrei mais de uma tarefa para \"${taskRef}\". Escolha qual deseja reagendar.`,
        schema: {
          fields: [{ campo: 'selected_option', descricao: 'Selecione a tarefa', obrigatorio: true, tipo: 'selecao' }],
          options: tasks.map((t: any) => optionFromRow(t, String(t.titulo), `${formatDate(String(t.data_inicio || ''))} | ${t.status || '-'}`)),
          meta: { operation: 'reschedule_task', draft: { ...extras, nova_data: newDate } },
        },
      })
      return { resposta: 'Preciso que voce escolha a tarefa correta.', pending_input: pending, flow_type: 'update', termination_reason: 'input_required' }
    }

    const task = tasks[0] as any
    const alteracoes = { data_inicio: newDate }
    const action = await createAction(ctx.supabase, ctx.auth, {
      sessaoId: ctx.sessaoId,
      runId: ctx.runId,
      operationName: 'reschedule_task',
      tipo: 'update',
      tabela: 'agenda_tarefas',
      targetLabel: `Tarefa: ${task.titulo}`,
      explicacao: 'Revise os dados para confirmar o reagendamento.',
      dados: { registro_id: task.id, alteracoes },
      registroId: String(task.id),
      antes: { data_inicio: task.data_inicio, titulo: task.titulo, status: task.status },
      depois: { data_inicio: newDate, titulo: task.titulo, status: task.status },
      preview: buildActionPreview(`Reagendar tarefa: ${task.titulo}`, [`Data atual: ${formatDate(String(task.data_inicio || ''))}`, `Nova data: ${formatDate(newDate)}`]),
      resolved: { tarefa_id: task.id },
    })
    return { resposta: 'O reagendamento foi preparado e aguarda sua confirmacao.', acoes_pendentes: [action], flow_type: 'update', termination_reason: 'action_required' }
  }

  return { resposta: 'Ainda nao consigo executar esse pedido de escrita com seguranca.', flow_type: 'unsupported', termination_reason: 'final' }
}

async function runOperation(ctx: RunContext, operation: SupportedOperation, flowType: FlowType, extras: Record<string, unknown>): Promise<Partial<FlowResult>> {
  if (['count_pending_publications', 'list_pending_publications', 'list_tasks_today', 'list_hearings_week', 'list_timesheet_month', 'check_consultivo_by_client', 'navigate'].includes(operation)) {
    return await readOperations(ctx, operation, extras)
  }
  if (['list_case_tasks', 'list_case_hearings', 'list_case_agenda'].includes(operation)) return await readCaseOperation(ctx, operation, extras)
  if (['create_task', 'create_consultivo', 'reschedule_task'].includes(operation)) return await createOrUpdateOperation(ctx, operation, extras)
  if (flowType === 'delete') return { resposta: 'Exclusoes pelo Centro de Comando ainda nao estao habilitadas nesta versao.', flow_type: 'delete', termination_reason: 'final' }
  return { resposta: 'Ainda nao consigo executar esse pedido de forma segura neste fluxo.', flow_type: flowType, termination_reason: 'final' }
}
async function continueFromPending(ctx: RunContext, pendingInputId: string, inputValues: Record<string, unknown>): Promise<Partial<FlowResult>> {
  const pending = await loadPendingInput(ctx.supabase, ctx.auth, pendingInputId)
  const meta = ((pending.schema?.meta || {}) as Record<string, unknown>)
  const operation = asText(meta.operation) as SupportedOperation | null
  if (!operation) throw new Error('Formulario pendente sem operacao vinculada')
  const merged = { ...((meta.draft as Record<string, unknown>) || {}), ...(inputValues || {}) }
  if (pending.tipo === 'disambiguation' && merged.selected_option) {
    const selected = String(merged.selected_option)
    if (['list_case_tasks', 'list_case_hearings', 'list_case_agenda', 'create_task'].includes(operation)) merged.processo_id = selected
    if (['check_consultivo_by_client', 'create_consultivo'].includes(operation)) merged.cliente_id = selected
    if (operation === 'reschedule_task') merged.tarefa_ref = selected
  }
  await markPendingInputAnswered(ctx.supabase, pendingInputId, inputValues || {})
  return await runOperation(ctx, operation, classifyIntent(ctx.mensagem).flowType, merged)
}

async function executeFlow(req: Request, payload: RequestPayload, supabase: ServiceClient, auth: AuthContext, runId: string, sessaoId: string): Promise<FlowResult> {
  const startedAt = Date.now()
  const mensagem = (payload.mensagem || '').trim()
  const hinted = mensagem ? classifyIntent(mensagem) : null
  const flowType = hinted?.flowType || 'unknown'
  const operationSignatures = new Set<string>()
  await saveExecutionStart(supabase, auth, runId, sessaoId, flowType)
  await cleanupExpiredPendings(supabase, auth, sessaoId)

  if (payload.user_id) console.warn(`[centro-comando-ia] deprecated_client_identity_payload run_id=${runId}`)

  if (mensagem && !payload.confirmar_acao && !payload.pending_input_id) {
    await saveHistorico(supabase, { sessao_id: sessaoId, user_id: auth.userId, escritorio_id: auth.escritorioId, role: 'user', content: mensagem, run_id: runId, flow_type: flowType, termination_reason: 'final', iteration_count: 0, stream_mode: 'sse', had_input_modal: false, had_confirmation_modal: false, had_write: false, had_error: false })
  }

  let result: FlowResult
  let hadInput = false
  let hadConfirmation = false
  let hadWrite = false

  try {
    let partial: Partial<FlowResult>
    const ctx: RunContext = { supabase, auth, runId, sessaoId, mensagem }

    if (payload.confirmar_acao) {
      if (!payload.acao_id) throw new Error('acao_id ausente para confirmar_acao')
      await executeConfirmedAction(supabase, auth, payload.acao_id, payload.dados_adicionais || {})
      partial = { resposta: 'Acao executada com sucesso.', flow_type: 'update', termination_reason: 'final' }
      hadWrite = true
    } else if (payload.pending_input_id) {
      const signature = buildOperationSignature(`pending:${payload.pending_input_id}`, payload.input_values || {})
      if (operationSignatures.has(signature)) {
        partial = {
          resposta: 'Detectei repeticao do mesmo envio de formulario no mesmo turno. Encerrando para evitar loop.',
          flow_type: flowType,
          termination_reason: 'tool_repetition_guard_triggered',
        }
      } else {
        operationSignatures.add(signature)
        partial = await continueFromPending(ctx, payload.pending_input_id, payload.input_values || {})
      }
    } else {
      if (!mensagem) throw new Error('Mensagem ausente')
      const operation = hinted?.operation || 'unsupported'
      const signature = buildOperationSignature(operation, {})
      if (operationSignatures.has(signature)) {
        partial = {
          resposta: 'Detectei repeticao da mesma operacao no mesmo turno. Encerrando para evitar loop.',
          flow_type: hinted?.flowType || 'unknown',
          termination_reason: 'tool_repetition_guard_triggered',
        }
      } else {
        operationSignatures.add(signature)
        if (!isRouterV2Enabled() && !['read_simple', 'read_ambiguous', 'navigate'].includes(hinted?.flowType || 'unknown')) {
          partial = {
            resposta: 'O fluxo de escrita do router v2 esta desativado no momento. Posso seguir com consultas e navegacao.',
            flow_type: hinted?.flowType || 'unknown',
            termination_reason: 'final',
          }
        } else {
          partial = await runOperation(ctx, operation, hinted?.flowType || 'unknown', {})
        }
      }
    }

    hadInput = !!partial.pending_input
    hadConfirmation = !!partial.acoes_pendentes?.length
    hadWrite = hadWrite || hadConfirmation

    result = {
      sucesso: true,
      resposta: partial.resposta,
      tool_results: partial.tool_results,
      acoes_pendentes: partial.acoes_pendentes,
      pending_input: partial.pending_input || null,
      flow_type: (partial.flow_type || flowType) as FlowType,
      termination_reason: (partial.termination_reason || 'final') as TerminationReason,
      run_id: runId,
      sessao_id: sessaoId,
      tempo_execucao_ms: Date.now() - startedAt,
    }

    if (result.resposta) {
      await saveHistorico(supabase, {
        sessao_id: sessaoId,
        user_id: auth.userId,
        escritorio_id: auth.escritorioId,
        role: 'assistant',
        content: result.resposta,
        tool_results: result.tool_results || [],
        erro: null,
        run_id: runId,
        flow_type: result.flow_type,
        termination_reason: result.termination_reason,
        iteration_count: 1,
        stream_mode: 'sse',
        had_input_modal: hadInput,
        had_confirmation_modal: hadConfirmation,
        had_write: hadWrite,
        had_error: false,
        tempo_execucao_ms: result.tempo_execucao_ms,
      })
    }

    await saveExecutionEnd(supabase, runId, { flow_type: result.flow_type, termination_reason: result.termination_reason, iteration_count: 1, had_input_modal: hadInput, had_confirmation_modal: hadConfirmation, had_write: hadWrite, had_error: false, tool_repetition_count: operationSignatures.size > 1 ? operationSignatures.size - 1 : 0, tempo_execucao_ms: result.tempo_execucao_ms, error_message: null })
    return result
  } catch (error) {
    const message = asError(error)
    const termination = message === 'stream_timeout' ? 'stream_timeout' : 'error'
    result = { sucesso: false, flow_type: flowType, termination_reason: termination, run_id: runId, sessao_id: sessaoId, tempo_execucao_ms: Date.now() - startedAt, erro: message }

    await saveHistorico(supabase, { sessao_id: sessaoId, user_id: auth.userId, escritorio_id: auth.escritorioId, role: 'assistant', content: 'Nao foi possivel concluir a solicitacao.', erro: message, run_id: runId, flow_type: result.flow_type, termination_reason: result.termination_reason, iteration_count: 1, stream_mode: 'sse', had_input_modal: false, had_confirmation_modal: false, had_write: hadWrite, had_error: true, tempo_execucao_ms: result.tempo_execucao_ms })
    await saveExecutionEnd(supabase, runId, { flow_type: result.flow_type, termination_reason: result.termination_reason, iteration_count: 1, had_input_modal: false, had_confirmation_modal: false, had_write: hadWrite, had_error: true, tool_repetition_count: operationSignatures.size > 1 ? operationSignatures.size - 1 : 0, tempo_execucao_ms: result.tempo_execucao_ms, error_message: message })
    return result
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stream_timeout')), timeoutMs)
    promise.then((value) => { clearTimeout(timer); resolve(value) }).catch((error) => { clearTimeout(timer); reject(error) })
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('Metodo nao permitido', 405)

  let payload: RequestPayload
  try { payload = (await req.json()) as RequestPayload } catch { return errorResponse('Payload invalido', 400) }

  let supabase: ServiceClient
  try { supabase = getServiceClient() } catch (error) { return errorResponse(asError(error), 500) }

  let auth: AuthContext
  try { auth = await authenticateRequest(req, supabase, payload.escritorio_id || null) } catch (error) { return errorResponse(asError(error), 401) }

  const sessaoId = await ensureSession(supabase, auth, payload.sessao_id || null, payload.mensagem || 'Centro de Comando')
  const runId = crypto.randomUUID()

  if (payload.streaming) {
    return createSSEStream(async ({ sendEvent, close }) => {
      let heartbeatInterval: number | null = null
      let terminalEventSent = false
      try {
        sendEvent('status', { type: 'status', message: 'Processando solicitacao...', run_id: runId, flow_type: classifyIntent((payload.mensagem || '').trim()).flowType, sessao_id: sessaoId })
        heartbeatInterval = setInterval(() => sendEvent('heartbeat', { run_id: runId, at: nowIso() }), HEARTBEAT_INTERVAL_MS)
        const result = await withTimeout(executeFlow(req, payload, supabase, auth, runId, sessaoId), STREAM_TIMEOUT_MS)

        if (result.pending_input) sendEvent('input_required', { run_id: result.run_id, sessao_id: result.sessao_id, flow_type: result.flow_type, pending_input: result.pending_input })
        if (result.acoes_pendentes?.length) sendEvent('action_required', { run_id: result.run_id, sessao_id: result.sessao_id, flow_type: result.flow_type, acoes_pendentes: result.acoes_pendentes, acao: result.acoes_pendentes[0] })

        if (result.sucesso) {
          sendEvent('final', result as unknown as Record<string, unknown>)
          terminalEventSent = true
        } else {
          sendEvent('error', { run_id: result.run_id, sessao_id: result.sessao_id, flow_type: result.flow_type, termination_reason: result.termination_reason, erro: result.erro || 'Erro interno' })
          terminalEventSent = true
        }
      } catch (error) {
        sendEvent('error', { run_id: runId, sessao_id: sessaoId, flow_type: 'unknown', termination_reason: asError(error) === 'stream_timeout' ? 'stream_timeout' : 'error', erro: asError(error) === 'stream_timeout' ? 'Tempo limite excedido para processar a solicitacao.' : asError(error) })
        terminalEventSent = true
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        if (!terminalEventSent) {
          await saveExecutionEnd(supabase, runId, {
            flow_type: 'unknown',
            termination_reason: 'stream_closed_without_terminal_event',
            iteration_count: 0,
            had_input_modal: false,
            had_confirmation_modal: false,
            had_write: false,
            had_error: true,
            tool_repetition_count: 0,
            tempo_execucao_ms: STREAM_TIMEOUT_MS,
            error_message: 'stream_closed_without_terminal_event',
          })
        }
        close()
      }
    }, corsHeaders)
  }

  const result = await executeFlow(req, payload, supabase, auth, runId, sessaoId)
  if (!result.sucesso) return errorResponse(result.erro || 'Erro interno', 500)
  return successResponse(result as unknown as Record<string, unknown>)
})
