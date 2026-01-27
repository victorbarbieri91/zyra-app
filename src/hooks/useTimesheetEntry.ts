'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  NovoTimesheetData,
  RegistroRetroativoData,
  AjusteHorariosData,
  DivisaoTimesheetItem,
} from '@/types/timer';

export interface EditarTimesheetData {
  horas: number;
  atividade: string;
  faturavel: boolean;
}

interface UseTimesheetEntryReturn {
  criarRegistro: (dados: NovoTimesheetData) => Promise<string>;
  registrarRetroativo: (dados: RegistroRetroativoData) => Promise<string>;
  ajustarHorarios: (timesheetId: string, dados: AjusteHorariosData) => Promise<void>;
  dividirRegistro: (timesheetId: string, divisoes: DivisaoTimesheetItem[]) => Promise<string[]>;
  atualizarAtividade: (timesheetId: string, atividade: string) => Promise<void>;
  editarTimesheet: (timesheetId: string, dados: EditarTimesheetData) => Promise<void>;
  deletarRegistro: (timesheetId: string) => Promise<void>;
}

export function useTimesheetEntry(escritorioId: string | null): UseTimesheetEntryReturn {
  const supabase = createClient();

  // Criar registro manual
  const criarRegistro = useCallback(async (dados: NovoTimesheetData): Promise<string> => {
    if (!escritorioId) throw new Error('Escritório não selecionado');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Validar que tem processo ou consulta
    if (!dados.processo_id && !dados.consulta_id) {
      throw new Error('Registro deve estar vinculado a um processo ou consulta');
    }

    // Validar que processo tem contrato vinculado (para faturamento correto)
    if (dados.processo_id) {
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select('contrato_id, numero_cnj')
        .eq('id', dados.processo_id)
        .single();

      if (processoError) throw processoError;

      if (!processo?.contrato_id) {
        throw new Error(
          `O processo ${processo?.numero_cnj || ''} não tem contrato vinculado. ` +
          'Vincule um contrato ao processo antes de lançar horas para garantir o faturamento correto.'
        );
      }
    }

    // faturavel é calculado automaticamente pelo trigger trg_timesheet_set_faturavel
    // baseado no contrato vinculado ao processo/consulta
    const { data, error } = await supabase
      .from('financeiro_timesheet')
      .insert({
        escritorio_id: escritorioId,
        user_id: user.id,
        processo_id: dados.processo_id || null,
        consulta_id: dados.consulta_id || null,
        tarefa_id: dados.tarefa_id || null,
        data_trabalho: dados.data_trabalho,
        horas: dados.horas,
        atividade: dados.atividade,
        // faturavel é setado automaticamente pelo trigger baseado no tipo de contrato:
        // por_hora/por_cargo = true, fixo/por_pasta/por_ato/por_etapa = false, misto = configurável
        hora_inicio: dados.hora_inicio || null,
        hora_fim: dados.hora_fim || null,
        origem: dados.origem,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }, [escritorioId, supabase]);

  // Registrar tempo retroativo (esquecido)
  const registrarRetroativo = useCallback(async (dados: RegistroRetroativoData): Promise<string> => {
    if (!escritorioId) throw new Error('Escritório não selecionado');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Validar que processo tem contrato vinculado (para faturamento correto)
    if (dados.processo_id) {
      const { data: processo, error: processoError } = await supabase
        .from('processos_processos')
        .select('contrato_id, numero_cnj')
        .eq('id', dados.processo_id)
        .single();

      if (processoError) throw processoError;

      if (!processo?.contrato_id) {
        throw new Error(
          `O processo ${processo?.numero_cnj || ''} não tem contrato vinculado. ` +
          'Vincule um contrato ao processo antes de lançar horas.'
        );
      }
    }

    // Nota: p_faturavel é passado mas será sobrescrito pelo trigger
    // trg_timesheet_set_faturavel que calcula automaticamente baseado no contrato
    const { data, error } = await supabase.rpc('registrar_tempo_retroativo', {
      p_escritorio_id: escritorioId,
      p_user_id: user.id,
      p_data_trabalho: dados.data_trabalho,
      p_hora_inicio: dados.hora_inicio,
      p_hora_fim: dados.hora_fim,
      p_atividade: dados.atividade,
      p_processo_id: dados.processo_id || null,
      p_consulta_id: dados.consulta_id || null,
      p_tarefa_id: dados.tarefa_id || null,
      p_faturavel: dados.faturavel, // Sobrescrito pelo trigger baseado no contrato
    });

    if (error) throw error;
    return data as string;
  }, [escritorioId, supabase]);

  // Ajustar horários de um registro existente
  const ajustarHorarios = useCallback(async (
    timesheetId: string,
    dados: AjusteHorariosData
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase.rpc('ajustar_horarios_timesheet', {
      p_timesheet_id: timesheetId,
      p_hora_inicio: dados.hora_inicio,
      p_hora_fim: dados.hora_fim,
      p_editado_por: user.id,
    });

    if (error) throw error;
  }, [supabase]);

  // Dividir registro em múltiplos
  const dividirRegistro = useCallback(async (
    timesheetId: string,
    divisoes: DivisaoTimesheetItem[]
  ): Promise<string[]> => {
    const { data, error } = await supabase.rpc('dividir_timesheet', {
      p_timesheet_id: timesheetId,
      p_divisoes: divisoes,
    });

    if (error) throw error;
    return data as string[];
  }, [supabase]);

  // Atualizar apenas a atividade/descrição
  const atualizarAtividade = useCallback(async (
    timesheetId: string,
    atividade: string
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('financeiro_timesheet')
      .update({
        atividade,
        editado: true,
        editado_em: new Date().toISOString(),
        editado_por: user.id,
      })
      .eq('id', timesheetId);

    if (error) throw error;
  }, [supabase]);

  // Editar timesheet durante revisão (horas, atividade, faturável)
  const editarTimesheet = useCallback(async (
    timesheetId: string,
    dados: EditarTimesheetData
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase.rpc('editar_timesheet', {
      p_timesheet_id: timesheetId,
      p_horas: dados.horas,
      p_atividade: dados.atividade,
      p_faturavel: dados.faturavel,
      p_editado_por: user.id,
    });

    if (error) throw error;
  }, [supabase]);

  // Deletar registro (apenas se não faturado)
  const deletarRegistro = useCallback(async (timesheetId: string): Promise<void> => {
    // Primeiro verificar se não está faturado
    const { data: registro, error: fetchError } = await supabase
      .from('financeiro_timesheet')
      .select('faturado')
      .eq('id', timesheetId)
      .single();

    if (fetchError) throw fetchError;

    if (registro?.faturado) {
      throw new Error('Não é possível deletar registro já faturado');
    }

    const { error } = await supabase
      .from('financeiro_timesheet')
      .delete()
      .eq('id', timesheetId);

    if (error) throw error;
  }, [supabase]);

  return {
    criarRegistro,
    registrarRetroativo,
    ajustarHorarios,
    dividirRegistro,
    atualizarAtividade,
    editarTimesheet,
    deletarRegistro,
  };
}
