export interface AgentHistoryMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

export interface AgentToolTraceItem {
  step: number
  tool_name: string
  args: Record<string, unknown>
  ok: boolean
  result?: Record<string, unknown>
  error?: string
  duration_ms: number
  signature: string
}

export interface AgentToolEvent {
  event: 'tool_call' | 'tool_result'
  step: number
  tool_name: string
  args?: Record<string, unknown>
  ok?: boolean
  result?: Record<string, unknown>
  error?: string
  duration_ms?: number
}

export interface RunAgentOrchestratorParams {
  apiKey: string
  model: string
  userMessage: string
  history: AgentHistoryMessage[]
  systemPrompt: string
  runtimeContext: Record<string, unknown>
  tools: AgentToolDefinition[]
  maxSteps: number
  timeoutMs: number
  onToolEvent?: (event: AgentToolEvent) => void
}

export interface RunAgentOrchestratorResult {
  finalText: string
  toolTrace: AgentToolTraceItem[]
  stopReason: 'final' | 'max_steps' | 'tool_repetition_guard_triggered' | 'error'
  hadError: boolean
  errorMessage?: string
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${stableSerialize(v)}`)
    return `{${entries.join(',')}}`
  }
  return String(value)
}

function makeSignature(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${stableSerialize(args)}`
}

function trimHistory(history: AgentHistoryMessage[], maxItems = 12): AgentHistoryMessage[] {
  return history
    .filter((item) => item.content?.trim())
    .slice(-maxItems)
    .map((item) => ({ role: item.role, content: item.content.trim() }))
}

function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
      return {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

export async function runAgentOrchestrator(params: RunAgentOrchestratorParams): Promise<RunAgentOrchestratorResult> {
  const maxSteps = Math.min(Math.max(params.maxSteps || 6, 1), 12)
  const toolTrace: AgentToolTraceItem[] = []
  const signatures = new Set<string>()
  const toolMap = new Map(params.tools.map((t) => [t.name, t]))

  const toolsPayload = params.tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }))

  const messages: Array<Record<string, unknown>> = [
    {
      role: 'system',
      content: `${params.systemPrompt}\n\nCONTEXTO_RUNTIME_JSON:\n${JSON.stringify(params.runtimeContext)}`,
    },
    ...trimHistory(params.history).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: params.userMessage },
  ]

  const startedAt = Date.now()

  for (let step = 1; step <= maxSteps; step += 1) {
    if (Date.now() - startedAt > params.timeoutMs) {
      return {
        finalText: 'Tempo limite excedido no ciclo do agente.',
        toolTrace,
        stopReason: 'error',
        hadError: true,
        errorMessage: 'agent_timeout',
      }
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.1,
        messages,
        tools: toolsPayload,
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        finalText: 'Falha ao consultar o modelo principal.',
        toolTrace,
        stopReason: 'error',
        hadError: true,
        errorMessage: errorText,
      }
    }

    const data = await response.json()
    const message = data?.choices?.[0]?.message || {}
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : []

    if (!toolCalls.length) {
      const content = typeof message.content === 'string' ? message.content.trim() : ''
      return {
        finalText: content || 'Conclui a analise, mas nao consegui gerar uma resposta textual final.',
        toolTrace,
        stopReason: 'final',
        hadError: false,
      }
    }

    messages.push({
      role: 'assistant',
      content: typeof message.content === 'string' ? message.content : '',
      tool_calls: toolCalls,
    })

    for (const call of toolCalls) {
      const functionName = call?.function?.name as string | undefined
      const rawArgs = call?.function?.arguments
      const args = parseToolArgs(rawArgs)

      if (!functionName || !toolMap.has(functionName)) {
        const errorText = `Tool inexistente: ${functionName || 'desconhecida'}`
        messages.push({ role: 'tool', tool_call_id: call?.id, content: JSON.stringify({ ok: false, error: errorText }) })
        toolTrace.push({
          step,
          tool_name: functionName || 'unknown',
          args,
          ok: false,
          error: errorText,
          duration_ms: 0,
          signature: makeSignature(functionName || 'unknown', args),
        })
        continue
      }

      const signature = makeSignature(functionName, args)
      if (signatures.has(signature)) {
        return {
          finalText: 'Detectei repeticao de ferramenta no mesmo turno e interrompi para evitar loop.',
          toolTrace,
          stopReason: 'tool_repetition_guard_triggered',
          hadError: false,
        }
      }
      signatures.add(signature)

      params.onToolEvent?.({
        event: 'tool_call',
        step,
        tool_name: functionName,
        args,
      })

      const tool = toolMap.get(functionName)!
      const startedToolAt = Date.now()

      try {
        const result = await tool.execute(args)
        const durationMs = Date.now() - startedToolAt

        toolTrace.push({
          step,
          tool_name: functionName,
          args,
          ok: true,
          result,
          duration_ms: durationMs,
          signature,
        })

        params.onToolEvent?.({
          event: 'tool_result',
          step,
          tool_name: functionName,
          ok: true,
          result,
          duration_ms: durationMs,
        })

        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ ok: true, result }) })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const durationMs = Date.now() - startedToolAt

        toolTrace.push({
          step,
          tool_name: functionName,
          args,
          ok: false,
          error: errorMessage,
          duration_ms: durationMs,
          signature,
        })

        params.onToolEvent?.({
          event: 'tool_result',
          step,
          tool_name: functionName,
          ok: false,
          error: errorMessage,
          duration_ms: durationMs,
        })

        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ ok: false, error: errorMessage }) })
      }
    }
  }

  return {
    finalText: 'Limite de etapas atingido. Posso continuar se voce quiser.',
    toolTrace,
    stopReason: 'max_steps',
    hadError: false,
  }
}
