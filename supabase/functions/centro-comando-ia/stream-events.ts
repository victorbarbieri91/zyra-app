export type StreamEventName =
  | 'status'
  | 'input_required'
  | 'action_required'
  | 'final'
  | 'error'
  | 'heartbeat'

export function createSSEStream(
  handler: (helpers: {
    sendEvent: (event: StreamEventName, data: Record<string, unknown>) => void
    close: () => void
  }) => Promise<void>,
  headers: Record<string, string>
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: StreamEventName, data: Record<string, unknown>) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      const close = () => controller.close()

      try {
        await handler({ sendEvent, close })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro interno'
        sendEvent('error', { erro: message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...headers,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
