'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AaspAssociado {
  id: string;
  escritorio_id: string;
  nome: string;
  oab_numero: string;
  oab_uf: string;
  aasp_chave: string;
  ativo: boolean;
  ultima_sync: string | null;
  publicacoes_sync_count: number;
  created_at: string;
  updated_at: string;
}

export interface NovoAssociado {
  nome: string;
  oab_numero: string;
  oab_uf: string;
  aasp_chave: string;
}

interface UseAaspAssociadosReturn {
  associados: AaspAssociado[];
  carregando: boolean;
  erro: string | null;
  adicionarAssociado: (dados: NovoAssociado) => Promise<AaspAssociado | null>;
  atualizarAssociado: (id: string, dados: Partial<NovoAssociado>) => Promise<boolean>;
  removerAssociado: (id: string) => Promise<boolean>;
  toggleAtivo: (id: string, ativo: boolean) => Promise<boolean>;
  testarConexao: (chave: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  recarregar: () => Promise<void>;
}

export function useAaspAssociados(escritorioId: string | undefined): UseAaspAssociadosReturn {
  const [associados, setAssociados] = useState<AaspAssociado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const supabase = createClient();

  const getAssociados = useCallback(async (): Promise<AaspAssociado[]> => {
    if (!escritorioId) return [];

    const { data, error } = await supabase
      .from('publicacoes_associados')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar associados AASP:', error);
      setErro('Erro ao carregar associados');
      return [];
    }

    return data || [];
  }, [escritorioId, supabase]);

  const adicionarAssociado = useCallback(async (dados: NovoAssociado): Promise<AaspAssociado | null> => {
    if (!escritorioId) {
      setErro('Escritório não identificado');
      return null;
    }

    const { data, error } = await supabase
      .from('publicacoes_associados')
      .insert({
        escritorio_id: escritorioId,
        nome: dados.nome,
        oab_numero: dados.oab_numero,
        oab_uf: dados.oab_uf.toUpperCase(),
        aasp_chave: dados.aasp_chave,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar associado:', error);
      if (error.code === '23505') {
        setErro('Este advogado já está cadastrado');
      } else {
        setErro('Erro ao adicionar associado');
      }
      return null;
    }

    await recarregar();
    return data;
  }, [escritorioId, supabase]);

  const atualizarAssociado = useCallback(async (id: string, dados: Partial<NovoAssociado>): Promise<boolean> => {
    const updateData: any = {};

    if (dados.nome !== undefined) updateData.nome = dados.nome;
    if (dados.oab_numero !== undefined) updateData.oab_numero = dados.oab_numero;
    if (dados.oab_uf !== undefined) updateData.oab_uf = dados.oab_uf.toUpperCase();
    if (dados.aasp_chave !== undefined) updateData.aasp_chave = dados.aasp_chave;

    const { error } = await supabase
      .from('publicacoes_associados')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar associado:', error);
      setErro('Erro ao atualizar associado');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const removerAssociado = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('publicacoes_associados')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover associado:', error);
      setErro('Erro ao remover associado');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const toggleAtivo = useCallback(async (id: string, ativo: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('publicacoes_associados')
      .update({ ativo })
      .eq('id', id);

    if (error) {
      console.error('Erro ao alterar status:', error);
      setErro('Erro ao alterar status do associado');
      return false;
    }

    await recarregar();
    return true;
  }, [supabase]);

  const testarConexao = useCallback(async (chave: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    try {
      // Chama a Edge Function para testar a conexão
      const { data, error } = await supabase.functions.invoke('aasp-sync', {
        body: {
          action: 'test',
          chave
        }
      });

      if (error) {
        // Verificar se é erro de Edge Function não deployada
        if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
          return {
            sucesso: false,
            mensagem: 'Edge Function não está deployada. Execute: npx supabase functions deploy aasp-sync'
          };
        }
        return {
          sucesso: false,
          mensagem: error.message || 'Erro ao testar conexão'
        };
      }

      return {
        sucesso: data?.sucesso ?? false,
        mensagem: data?.mensagem || 'Teste concluído'
      };
    } catch (err: any) {
      // Verificar se é erro de CORS/rede
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        return {
          sucesso: false,
          mensagem: 'Edge Function não disponível. Execute: npx supabase functions deploy aasp-sync'
        };
      }
      return {
        sucesso: false,
        mensagem: err.message || 'Erro de conexão'
      };
    }
  }, [supabase]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const data = await getAssociados();
      setAssociados(data);
    } catch (err) {
      console.error('Erro ao carregar associados:', err);
      setErro('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, [getAssociados]);

  useEffect(() => {
    if (escritorioId) {
      recarregar();
    }
  }, [escritorioId]);

  return {
    associados,
    carregando,
    erro,
    adicionarAssociado,
    atualizarAssociado,
    removerAssociado,
    toggleAtivo,
    testarConexao,
    recarregar,
  };
}
