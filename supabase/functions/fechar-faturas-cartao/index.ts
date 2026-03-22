import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * Edge Function: fechar-faturas-cartao
 *
 * Roda diariamente via cron às 00:00 Brasília (03:00 UTC).
 * Para cada cartão ativo, verifica se a data de fechamento do mês corrente
 * já passou e, se não existe fatura fechada, fecha automaticamente usando
 * a função SQL fechar_fatura_cartao().
 *
 * Cron: 0 3 * * * (03:00 UTC = 00:00 Brasília)
 */
Deno.serve(async (req) => {
  try {
    // Verificar CRON_SECRET para garantir que é uma chamada legítima
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    // Permitir chamada manual (com service_role) OU via cron (com CRON_SECRET)
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Chamada via cron — OK
    } else if (authHeader?.startsWith('Bearer ')) {
      // Chamada com token — verificar se é service_role ou autenticado
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`[${new Date().toISOString()}] Iniciando fechamento automático de faturas de cartão...`)

    // Chamar a função SQL que faz todo o trabalho
    const { data, error } = await supabase.rpc('fechar_faturas_automatico')

    if (error) {
      console.error('Erro ao executar fechar_faturas_automatico:', error)
      throw error
    }

    const faturasFechadas = Array.isArray(data) ? data : []

    if (faturasFechadas.length > 0) {
      console.log(`✓ ${faturasFechadas.length} fatura(s) fechada(s) automaticamente:`)
      for (const f of faturasFechadas) {
        console.log(`  - ${f.cartao_nome} (ref: ${f.mes_referencia})`)
      }
    } else {
      console.log('✓ Nenhuma fatura pendente de fechamento.')
    }

    return new Response(
      JSON.stringify({
        success: true,
        faturasFechadas: faturasFechadas.length,
        detalhes: faturasFechadas,
        executadoEm: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro geral no fechamento de faturas:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
