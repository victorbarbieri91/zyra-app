'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MembroCompleto, MembroRemuneracao, Cargo, ConviteEscritorio } from '@/types/escritorio';

interface UseEscritorioMembrosReturn {
  membros: MembroCompleto[];
  convites: ConviteEscritorio[];
  carregando: boolean;
  erro: string | null;
  getMembros: () => Promise<MembroCompleto[]>;
  getConvites: () => Promise<ConviteEscritorio[]>;
  updateMembroCargo: (membroId: string, cargoId: string) => Promise<boolean>;
  updateMembroRemuneracao: (membroId: string, remuneracao: Partial<MembroRemuneracao>) => Promise<boolean>;
  removerMembro: (membroId: string) => Promise<boolean>;
  reenviarConvite: (conviteId: string) => Promise<boolean>;
  cancelarConvite: (conviteId: string) => Promise<boolean>;
  recarregar: () => Promise<void>;
}

export function useEscritorioMembros(escritorioId: string | undefined): UseEscritorioMembrosReturn {
  const [membros, setMembros] = useState<MembroCompleto[]>([]);
  const [convites, setConvites] = useState<ConviteEscritorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const supabase = createClient();

  const getMembros = useCallback(async (): Promise<MembroCompleto[]> => {
    if (!escritorioId) return [];

    const { data, error } = await supabase
      .from('escritorios_usuarios')
      .select(`
        id,
        user_id,
        escritorio_id,
        cargo_id,
        is_owner,
        ativo,
        ultimo_acesso,
        salario_base,
        percentual_comissao,
        meta_horas_mensal,
        valor_hora,
        created_at,
        cargo:escritorios_cargos(
          id,
          nome,
          nome_display,
          nivel,
          cor,
          descricao,
          ativo
        ),
        profile:profiles!usuarios_escritorios_user_id_fkey(
          nome_completo,
          email,
          avatar_url
        )
      `)
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar membros:', error.message || error.code || JSON.stringify(error));
      setErro('Erro ao carregar membros');
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      escritorio_id: item.escritorio_id,
      cargo_id: item.cargo_id,
      cargo: item.cargo,
      nome: item.profile?.nome_completo || 'Usuário',
      email: item.profile?.email || '',
      avatar_url: item.profile?.avatar_url,
      ativo: item.ativo,
      ultimo_acesso: item.ultimo_acesso,
      is_owner: item.is_owner,
      remuneracao: {
        salario_base: item.salario_base || 0,
        percentual_comissao: item.percentual_comissao || 0,
        meta_horas_mensal: item.meta_horas_mensal || 160,
        valor_hora: item.valor_hora || 0,
      },
      created_at: item.created_at,
    }));
  }, [escritorioId, supabase]);

  const getConvites = useCallback(async (): Promise<ConviteEscritorio[]> => {
    if (!escritorioId) return [];

    const { data, error } = await supabase
      .from('escritorios_convites')
      .select(`
        *,
        cargo:escritorios_cargos(
          id,
          nome,
          nome_display,
          nivel,
          cor
        )
      `)
      .eq('escritorio_id', escritorioId)
      .eq('aceito', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar convites:', error);
      return [];
    }

    return data || [];
  }, [escritorioId, supabase]);

  const updateMembroCargo = useCallback(async (membroId: string, cargoId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('escritorios_usuarios')
      .update({ cargo_id: cargoId })
      .eq('id', membroId)
      .eq('is_owner', false); // Não pode mudar cargo do dono

    if (error) {
      console.error('Erro ao atualizar cargo:', error);
      setErro('Erro ao atualizar cargo do membro');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const updateMembroRemuneracao = useCallback(async (
    membroId: string,
    remuneracao: Partial<MembroRemuneracao>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('escritorios_usuarios')
      .update({
        salario_base: remuneracao.salario_base,
        percentual_comissao: remuneracao.percentual_comissao,
        meta_horas_mensal: remuneracao.meta_horas_mensal,
        valor_hora: remuneracao.valor_hora,
      })
      .eq('id', membroId);

    if (error) {
      console.error('Erro ao atualizar remuneração:', error);
      setErro('Erro ao atualizar remuneração');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const removerMembro = useCallback(async (membroId: string): Promise<boolean> => {
    // Soft delete - marca como inativo
    const { error } = await supabase
      .from('escritorios_usuarios')
      .update({ ativo: false })
      .eq('id', membroId)
      .eq('is_owner', false); // Não pode remover o dono

    if (error) {
      console.error('Erro ao remover membro:', error);
      setErro('Erro ao remover membro');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const reenviarConvite = useCallback(async (conviteId: string): Promise<boolean> => {
    // Atualiza a data de expiração para +7 dias
    const novaExpiracao = new Date();
    novaExpiracao.setDate(novaExpiracao.getDate() + 7);

    const { error } = await supabase
      .from('escritorios_convites')
      .update({ expira_em: novaExpiracao.toISOString() })
      .eq('id', conviteId);

    if (error) {
      console.error('Erro ao reenviar convite:', error);
      setErro('Erro ao reenviar convite');
      return false;
    }

    // TODO: Enviar email de convite novamente

    await recarregar();
    return true;
  }, [supabase]);

  const cancelarConvite = useCallback(async (conviteId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('escritorios_convites')
      .delete()
      .eq('id', conviteId);

    if (error) {
      console.error('Erro ao cancelar convite:', error);
      setErro('Erro ao cancelar convite');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [membrosData, convitesData] = await Promise.all([
        getMembros(),
        getConvites(),
      ]);

      setMembros(membrosData);
      setConvites(convitesData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setErro('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, [getMembros, getConvites]);

  useEffect(() => {
    if (escritorioId) {
      recarregar();
    }
  }, [escritorioId]);

  return {
    membros,
    convites,
    carregando,
    erro,
    getMembros,
    getConvites,
    updateMembroCargo,
    updateMembroRemuneracao,
    removerMembro,
    reenviarConvite,
    cancelarConvite,
    recarregar,
  };
}
