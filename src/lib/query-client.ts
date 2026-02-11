// ============================================
// React Query - Configuracao do QueryClient
// ============================================

import { QueryClient } from '@tanstack/react-query'

/**
 * Cria uma instancia do QueryClient com configuracoes otimizadas
 * para o Zyra Legal.
 *
 * Estrategia de cache:
 * - staleTime: 2 min (dados ficam "frescos" por 2 min)
 * - gcTime: 10 min (dados ficam em cache por 10 min apos inativos)
 * - refetchOnWindowFocus: true (atualiza ao voltar para a aba)
 * - retry: 1 (uma tentativa extra em caso de erro)
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados ficam "frescos" por 2 minutos (nao refetcha nesse periodo)
        staleTime: 2 * 60 * 1000,
        // Dados ficam em cache por 10 minutos apos o ultimo subscriber sair
        gcTime: 10 * 60 * 1000,
        // Refetcha quando o usuario volta para a aba (dados podem ter mudado)
        refetchOnWindowFocus: true,
        // Uma tentativa extra em caso de erro de rede
        retry: 1,
        // Nao refetcha ao reconectar (evita flood apos reconexao)
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry em mutations pode causar problemas (duplicar inserts)
        retry: false,
      },
    },
  })
}

// Singleton para o lado do cliente
let clientQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: sempre cria novo (nao compartilha entre requests)
    return createQueryClient()
  }

  // Browser: reutiliza o mesmo client
  if (!clientQueryClient) {
    clientQueryClient = createQueryClient()
  }
  return clientQueryClient
}
