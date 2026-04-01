import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GerarFaturaParams {
  p_escritorio_id: string;
  p_cliente_id: string;
  p_honorarios_ids?: string[] | null;
  p_timesheet_ids?: string[] | null;
  p_fechamentos_ids?: string[] | null;
  p_data_emissao?: string;
  p_data_vencimento?: string | null;
  p_observacoes?: string | null;
  p_user_id?: string | null;
  p_conta_bancaria_id?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const params: GerarFaturaParams = await req.json();
    const {
      p_escritorio_id,
      p_cliente_id,
      p_honorarios_ids,
      p_timesheet_ids,
      p_fechamentos_ids,
      p_data_emissao,
      p_data_vencimento,
      p_observacoes,
      p_user_id,
      p_conta_bancaria_id
    } = params;

    if (!p_escritorio_id || !p_cliente_id) {
      return new Response(JSON.stringify({ error: 'escritorio_id e cliente_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const hasHonorarios = p_honorarios_ids && p_honorarios_ids.length > 0;
    const hasTimesheet = p_timesheet_ids && p_timesheet_ids.length > 0;
    const hasFechamentos = p_fechamentos_ids && p_fechamentos_ids.length > 0;

    if (!hasHonorarios && !hasTimesheet && !hasFechamentos) {
      return new Response(JSON.stringify({ error: 'Fatura deve conter pelo menos um item' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const dataEmissao = p_data_emissao || new Date().toISOString().split('T')[0];
    const dataVencimento = p_data_vencimento || null;

    // Gerar numero da fatura
    const ano = new Date().getFullYear();
    const { data: contadorData } = await supabase
      .from('financeiro_faturamento_faturas')
      .select('numero_fatura')
      .eq('escritorio_id', p_escritorio_id)
      .like('numero_fatura', `FAT-${ano}-%`)
      .order('numero_fatura', { ascending: false })
      .limit(1);

    let contador = 1;
    if (contadorData && contadorData.length > 0) {
      const match = contadorData[0].numero_fatura.match(/FAT-\d{4}-(\d+)/);
      if (match) contador = parseInt(match[1]) + 1;
    }
    const numeroFatura = `FAT-${ano}-${String(contador).padStart(3, '0')}`;

    let valorTotal = 0;
    const itens: any[] = [];

    // ============================================
    // 1. Processar honorarios (receitas)
    // ============================================
    if (hasHonorarios) {
      const { data: receitas, error: receitasError } = await supabase
        .from('financeiro_receitas')
        .select(`
          id, descricao, valor, tipo, processo_id, consulta_id,
          processos_processos!left(numero_cnj, numero_pasta, autor, reu)
        `)
        .in('id', p_honorarios_ids!)
        .eq('cliente_id', p_cliente_id)
        .eq('status', 'pendente')
        .is('fatura_id', null);

      if (receitasError) throw receitasError;

      for (const r of receitas || []) {
        const processo = r.processos_processos;
        itens.push({
          tipo: 'honorario',
          receita_id: r.id,
          referencia_id: r.id,
          descricao: r.descricao,
          valor: r.valor,
          processo_id: r.processo_id,
          consulta_id: r.consulta_id,
          processo_numero: processo?.numero_cnj,
          processo_pasta: processo?.numero_pasta,
          partes_resumo: processo ? `${processo.autor} x ${processo.reu}` : null
        });
        valorTotal += parseFloat(r.valor);
      }
    }

    // ============================================
    // 2. Processar timesheet
    // ============================================
    if (hasTimesheet) {
      const { data: timesheets, error: tsError } = await supabase
        .from('financeiro_timesheet')
        .select(`
          id, atividade, processo_id, consulta_id, horas, user_id, data_trabalho
        `)
        .in('id', p_timesheet_ids!)
        .eq('aprovado', true)
        .eq('faturado', false)
        .is('fatura_id', null);

      if (tsError) throw tsError;

      // Buscar processos separadamente
      const processosIds = (timesheets || []).filter(t => t.processo_id).map(t => t.processo_id);
      let processosMap: Record<string, any> = {};

      if (processosIds.length > 0) {
        const { data: processos } = await supabase
          .from('processos_processos')
          .select('id, numero_cnj, numero_pasta, autor, reu, contrato_id')
          .in('id', processosIds);

        (processos || []).forEach(p => { processosMap[p.id] = p; });
      }

      // Buscar consultas separadamente
      const consultasIds = (timesheets || []).filter(t => t.consulta_id).map(t => t.consulta_id);
      let consultasMap: Record<string, any> = {};

      if (consultasIds.length > 0) {
        const { data: consultas } = await supabase
          .from('consultivo_consultas')
          .select('id, titulo, contrato_id')
          .in('id', consultasIds);

        (consultas || []).forEach(c => { consultasMap[c.id] = c; });
      }

      // Buscar profissionais e cargos
      const userIds = [...new Set((timesheets || []).map(t => t.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      let cargosMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', userIds);
        (profiles || []).forEach(p => { profilesMap[p.id] = p; });

        const { data: euData } = await supabase
          .from('escritorios_usuarios')
          .select('user_id, cargo_id, escritorios_cargos(nome_display)')
          .eq('escritorio_id', p_escritorio_id)
          .in('user_id', userIds);
        (euData || []).forEach((eu: any) => {
          cargosMap[eu.user_id] = eu.escritorios_cargos?.nome_display;
        });
      }

      for (const t of timesheets || []) {
        const processo = t.processo_id ? processosMap[t.processo_id] : null;
        const consulta = t.consulta_id ? consultasMap[t.consulta_id] : null;
        const contratoId = processo?.contrato_id || consulta?.contrato_id || null;

        // Buscar valor_hora efetivo
        const { data: valorHoraData } = await supabase.rpc('get_valor_hora_efetivo', {
          p_contrato_id: contratoId,
          p_user_id: t.user_id
        });

        const valorHora = valorHoraData || 400;
        const valorItem = parseFloat(t.horas) * valorHora;

        const casoTitulo = processo
          ? [processo.autor, processo.reu].filter(Boolean).join(' x ') || null
          : consulta?.titulo || null;

        itens.push({
          tipo: 'timesheet',
          timesheet_id: t.id,
          descricao: t.atividade,
          horas: parseFloat(t.horas),
          valor_hora: valorHora,
          valor: valorItem,
          processo_id: t.processo_id,
          consulta_id: t.consulta_id,
          processo_numero: processo?.numero_cnj,
          processo_pasta: processo?.numero_pasta,
          partes_resumo: casoTitulo,
          caso_titulo: casoTitulo,
          contrato_id: contratoId,
          profissional_nome: profilesMap[t.user_id]?.nome_completo || null,
          cargo_nome: cargosMap[t.user_id] || null,
          data_trabalho: t.data_trabalho,
          user_id: t.user_id
        });
        valorTotal += valorItem;
      }

    }

    // ============================================
    // 3. Processar fechamentos de pasta (ANTES dos limites contratuais)
    // ============================================
    if (hasFechamentos) {
      const { data: fechamentos, error: fechError } = await supabase
        .from('financeiro_fechamentos_pasta')
        .select('id, competencia, qtd_processos, valor_unitario, valor_total, processos, contrato_id')
        .in('id', p_fechamentos_ids!)
        .eq('cliente_id', p_cliente_id)
        .eq('status', 'aprovado')
        .is('fatura_id', null);

      if (fechError) throw fechError;

      for (const f of fechamentos || []) {
        const competenciaFormatada = new Date(f.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        itens.push({
          tipo: 'pasta',
          fechamento_id: f.id,
          descricao: `Honorarios por pasta - ${competenciaFormatada}`,
          valor: parseFloat(f.valor_total),
          competencia: f.competencia,
          qtd_processos: f.qtd_processos,
          valor_unitario: parseFloat(f.valor_unitario),
          processos: f.processos,
          contrato_id: f.contrato_id
        });
        valorTotal += parseFloat(f.valor_total);
      }
    }

    // =========================================================================
    // 4. POS-PROCESSAMENTO: Aplicar limites contratuais (min/max mensal)
    // Limites aplicados somente sobre timesheet. Pasta é cobrada separadamente.
    // MINIMO: inflar valor_hora proporcionalmente (fatura limpa, sem linha extra)
    // MAXIMO: manter ajuste_contratual negativo (desconto visivel ao cliente)
    // =========================================================================
    {
      const timesheetItens = itens.filter(i => i.tipo === 'timesheet' && i.contrato_id);
      const contratoIds = [...new Set(timesheetItens.map(i => i.contrato_id))];

      for (const cid of contratoIds) {
        const contratoItens = timesheetItens.filter(i => i.contrato_id === cid);
        const subtotal = contratoItens.reduce((sum, i) => sum + i.valor, 0);

        if (subtotal === 0) continue;

        const { data: ajustado } = await supabase.rpc('aplicar_limites_mensais', {
          p_valor_calculado: subtotal,
          p_contrato_id: cid
        });

        const valorAjustado = typeof ajustado === 'number' ? ajustado : parseFloat(ajustado);
        if (valorAjustado === subtotal) continue;

        if (valorAjustado > subtotal) {
          // MINIMO: Inflar valor_hora proporcionalmente para atingir o minimo
          const fator = valorAjustado / subtotal;
          let acumulado = 0;

          for (let i = 0; i < contratoItens.length; i++) {
            const item = contratoItens[i];
            item.valor_hora_original = item.valor_hora;

            if (i < contratoItens.length - 1) {
              item.valor_hora = Math.round(item.valor_hora * fator * 100) / 100;
              item.valor = Math.round(item.horas * item.valor_hora * 100) / 100;
              acumulado += item.valor;
            } else {
              // Ultimo item: ajuste fino para soma exata do minimo
              item.valor = Math.round((valorAjustado - acumulado) * 100) / 100;
              item.valor_hora = Math.round((item.valor / item.horas) * 100) / 100;
            }
          }
          valorTotal = valorTotal - subtotal + valorAjustado;

        } else {
          // MAXIMO: Manter ajuste_contratual negativo (cliente ve desconto)
          const ajuste = valorAjustado - subtotal;
          itens.push({
            tipo: 'ajuste_contratual',
            descricao: 'Ajuste maximo contratual',
            valor: ajuste,
            contrato_id: cid,
            subtotal_original: subtotal,
            valor_limite: valorAjustado
          });
          valorTotal += ajuste;
        }
      }
    }

    // ============================================
    // 4. Criar a fatura
    // ============================================
    const { data: fatura, error: faturaError } = await supabase
      .from('financeiro_faturamento_faturas')
      .insert({
        escritorio_id: p_escritorio_id,
        cliente_id: p_cliente_id,
        numero_fatura: numeroFatura,
        data_emissao: dataEmissao,
        data_vencimento: dataVencimento || new Date(new Date(dataEmissao).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'emitida',
        observacoes: p_observacoes,
        gerada_automaticamente: false,
        valor_total: valorTotal,
        itens: itens,
        conta_bancaria_id: p_conta_bancaria_id || null
      })
      .select('id')
      .single();

    if (faturaError) throw faturaError;
    const faturaId = fatura.id;

    // ============================================
    // 5. Atualizar honorarios
    // ============================================
    if (hasHonorarios) {
      await supabase
        .from('financeiro_receitas')
        .update({ status: 'faturado', fatura_id: faturaId, updated_at: new Date().toISOString() })
        .in('id', p_honorarios_ids!)
        .eq('cliente_id', p_cliente_id)
        .eq('status', 'pendente');
    }

    // ============================================
    // 6. Atualizar timesheet
    // ============================================
    if (hasTimesheet) {
      await supabase
        .from('financeiro_timesheet')
        .update({ faturado: true, fatura_id: faturaId, faturado_em: new Date().toISOString() })
        .in('id', p_timesheet_ids!)
        .eq('aprovado', true)
        .eq('faturado', false);
    }

    // ============================================
    // 7. Atualizar fechamentos
    // ============================================
    if (hasFechamentos) {
      await supabase
        .from('financeiro_fechamentos_pasta')
        .update({ status: 'faturado', fatura_id: faturaId, faturado_em: new Date().toISOString() })
        .in('id', p_fechamentos_ids!)
        .eq('cliente_id', p_cliente_id)
        .eq('status', 'aprovado');
    }

    // ============================================
    // 8. Notificacao
    // ============================================
    if (p_user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: p_user_id,
          tipo: 'fatura_gerada',
          titulo: 'Fatura Gerada',
          mensagem: `Fatura ${numeroFatura} gerada. Valor: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          link: '/dashboard/financeiro/faturamento',
          lida: false
        });
    }

    console.log(`Fatura ${numeroFatura} gerada. ID: ${faturaId}, Valor: R$ ${valorTotal}`);

    return new Response(JSON.stringify({
      fatura_id: faturaId,
      numero_fatura: numeroFatura,
      valor_total: valorTotal,
      qtd_itens: itens.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Erro ao gerar fatura:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
