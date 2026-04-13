// ============================================
// CLASSIFICADOR DE PROCESSO NOVO
// ============================================
// Função "fire and forget" chamada após o save de um processo novo
// (tanto pelo wizard automático quanto pelo manual). Dispara a edge
// function `datajud-sync-diario` passando `processo_id` específico,
// que tenta classificar o processo imediatamente:
//   - Se DataJud achar → marca `indexado` e baixa movimentações
//   - Se não achar → marca `em_carencia` e enfileira CREATE Escavador
//
// Esta função NUNCA bloqueia o cadastro. Erros são logados e ignorados.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lohakxdxgwgpkbmfmzzl.supabase.co'

/**
 * Dispara classificação inicial de um processo recém-cadastrado.
 *
 * Não aguarda resposta — chamada fire-and-forget. A próxima execução
 * do cron diário também pegaria o processo, mas chamar aqui acelera
 * a primeira classificação para alguns segundos após o cadastro.
 *
 * @param processoId UUID do processo no banco
 */
export function classificarProcessoNovo(processoId: string): void {
  if (!processoId) return

  // Roda em background sem aguardar
  fetch(`${SUPABASE_URL}/functions/v1/datajud-sync-diario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processo_id: processoId,
      ativar_escavador: true
    })
  }).catch((err) => {
    console.warn('[classificarProcessoNovo] Falha não-crítica:', err)
  })
}
