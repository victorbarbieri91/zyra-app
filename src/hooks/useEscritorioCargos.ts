'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Cargo, CargoPermissao, CargoComPermissoes, ModuloPermissao } from '@/types/escritorio';

interface NovoCargo {
  nome: string;
  nome_display: string;
  cor?: string;
}

interface UseEscritorioCargosReturn {
  cargos: Cargo[];
  cargosComPermissoes: CargoComPermissoes[];
  carregando: boolean;
  erro: string | null;
  getCargos: () => Promise<Cargo[]>;
  getCargoPermissoes: (cargoId: string) => Promise<CargoPermissao[]>;
  createCargo: (cargo: NovoCargo) => Promise<Cargo | null>;
  updateCargo: (cargoId: string, dados: Partial<NovoCargo>) => Promise<boolean>;
  updateCargoValorHora: (cargoId: string, valorHora: number | null) => Promise<boolean>;
  deleteCargo: (cargoId: string) => Promise<boolean>;
  reorderCargos: (cargosOrdenados: { id: string; nivel: number }[]) => Promise<boolean>;
  updateCargoPermissao: (
    cargoId: string,
    modulo: ModuloPermissao,
    permissoes: Partial<Omit<CargoPermissao, 'id' | 'cargo_id' | 'modulo' | 'created_at' | 'updated_at'>>
  ) => Promise<boolean>;
  recarregar: () => Promise<void>;
}

const MODULOS: ModuloPermissao[] = ['financeiro', 'relatorios', 'configuracoes'];

export function useEscritorioCargos(escritorioId: string | undefined): UseEscritorioCargosReturn {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargosComPermissoes, setCargosComPermissoes] = useState<CargoComPermissoes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const supabase = createClient();

  const getCargos = useCallback(async (): Promise<Cargo[]> => {
    if (!escritorioId) return [];

    const { data, error } = await supabase
      .from('escritorios_cargos')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true)
      .order('nivel', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cargos:', error);
      setErro('Erro ao carregar cargos');
      return [];
    }

    return data || [];
  }, [escritorioId, supabase]);

  const getCargoPermissoes = useCallback(async (cargoId: string): Promise<CargoPermissao[]> => {
    const { data, error } = await supabase
      .from('escritorios_cargos_permissoes')
      .select('*')
      .eq('cargo_id', cargoId)
      .order('modulo');

    if (error) {
      console.error('Erro ao buscar permissões do cargo:', error);
      return [];
    }

    return data || [];
  }, [supabase]);

  const getCargosComPermissoes = useCallback(async (): Promise<CargoComPermissoes[]> => {
    if (!escritorioId) return [];

    const { data: cargosData, error: cargosError } = await supabase
      .from('escritorios_cargos')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true)
      .order('nivel', { ascending: true });

    if (cargosError) {
      console.error('Erro ao buscar cargos:', cargosError);
      return [];
    }

    if (!cargosData || cargosData.length === 0) return [];

    const cargoIds = cargosData.map((c: Record<string, any>) => c.id);

    const { data: permissoesData, error: permissoesError } = await supabase
      .from('escritorios_cargos_permissoes')
      .select('*')
      .in('cargo_id', cargoIds);

    if (permissoesError) {
      console.error('Erro ao buscar permissões:', permissoesError);
      return [];
    }

    const permissoesPorCargo = ((permissoesData || []) as CargoPermissao[]).reduce((acc: Record<string, CargoPermissao[]>, perm: CargoPermissao) => {
      if (!acc[perm.cargo_id]) {
        acc[perm.cargo_id] = [];
      }
      acc[perm.cargo_id].push(perm);
      return acc;
    }, {} as Record<string, CargoPermissao[]>);

    return cargosData.map((cargo: Record<string, any>) => ({
      ...cargo,
      permissoes: permissoesPorCargo[cargo.id] || [],
    }));
  }, [escritorioId, supabase]);

  const createCargo = useCallback(async (novoCargo: NovoCargo): Promise<Cargo | null> => {
    if (!escritorioId) return null;

    // Buscar o maior nível atual
    const { data: maxNivel } = await supabase
      .from('escritorios_cargos')
      .select('nivel')
      .eq('escritorio_id', escritorioId)
      .eq('ativo', true)
      .order('nivel', { ascending: false })
      .limit(1)
      .single();

    const proximoNivel = (maxNivel?.nivel || 0) + 1;

    // Criar o cargo
    const { data: cargo, error: cargoError } = await supabase
      .from('escritorios_cargos')
      .insert({
        escritorio_id: escritorioId,
        nome: novoCargo.nome.toLowerCase().replace(/\s+/g, '_'),
        nome_display: novoCargo.nome_display,
        nivel: proximoNivel,
        cor: novoCargo.cor || '#64748b',
        ativo: true,
      })
      .select()
      .single();

    if (cargoError) {
      console.error('Erro ao criar cargo:', cargoError);
      setErro('Erro ao criar cargo');
      return null;
    }

    // Criar permissões padrão para o novo cargo
    const permissoesDefault = MODULOS.map((modulo) => ({
      cargo_id: cargo.id,
      modulo,
      pode_visualizar: false,
      pode_criar: false,
      pode_editar: false,
      pode_excluir: false,
      pode_exportar: false,
    }));

    const { error: permError } = await supabase
      .from('escritorios_cargos_permissoes')
      .insert(permissoesDefault);

    if (permError) {
      console.error('Erro ao criar permissões:', permError);
    }

    return cargo;
  }, [escritorioId, supabase]);

  const updateCargo = useCallback(async (
    cargoId: string,
    dados: Partial<NovoCargo>
  ): Promise<boolean> => {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dados.nome_display) {
      updateData.nome_display = dados.nome_display;
    }
    if (dados.cor) {
      updateData.cor = dados.cor;
    }

    const { error } = await supabase
      .from('escritorios_cargos')
      .update(updateData)
      .eq('id', cargoId);

    if (error) {
      console.error('Erro ao atualizar cargo:', error);
      setErro('Erro ao atualizar cargo');
      return false;
    }

    return true;
  }, [supabase]);

  const updateCargoValorHora = useCallback(async (
    cargoId: string,
    valorHora: number | null
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('escritorios_cargos')
      .update({
        valor_hora_padrao: valorHora,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cargoId);

    if (error) {
      console.error('Erro ao atualizar valor hora:', error);
      setErro('Erro ao atualizar valor hora');
      return false;
    }

    // Atualizar estado local
    setCargos(prev => prev.map(c =>
      c.id === cargoId ? { ...c, valor_hora_padrao: valorHora } : c
    ));
    setCargosComPermissoes(prev => prev.map(c =>
      c.id === cargoId ? { ...c, valor_hora_padrao: valorHora } : c
    ));

    return true;
  }, [supabase]);

  const deleteCargo = useCallback(async (cargoId: string): Promise<boolean> => {
    // Verificar se há membros com esse cargo
    const { data: membros } = await supabase
      .from('escritorios_usuarios')
      .select('id')
      .eq('cargo_id', cargoId)
      .eq('ativo', true)
      .limit(1);

    if (membros && membros.length > 0) {
      setErro('Não é possível excluir cargo com membros vinculados');
      return false;
    }

    // Soft delete - apenas desativa
    const { error } = await supabase
      .from('escritorios_cargos')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', cargoId);

    if (error) {
      console.error('Erro ao excluir cargo:', error);
      setErro('Erro ao excluir cargo');
      return false;
    }

    return true;
  }, [supabase]);

  const reorderCargos = useCallback(async (
    cargosOrdenados: { id: string; nivel: number }[]
  ): Promise<boolean> => {
    try {
      // Atualizar cada cargo com seu novo nível
      const promises = cargosOrdenados.map(({ id, nivel }) =>
        supabase
          .from('escritorios_cargos')
          .update({ nivel, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Erro ao reordenar cargos:', error);
      setErro('Erro ao reordenar cargos');
      return false;
    }
  }, [supabase]);

  const updateCargoPermissao = useCallback(async (
    cargoId: string,
    modulo: ModuloPermissao,
    permissoes: Partial<Omit<CargoPermissao, 'id' | 'cargo_id' | 'modulo' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('escritorios_cargos_permissoes')
      .update({
        ...permissoes,
        updated_at: new Date().toISOString(),
      })
      .eq('cargo_id', cargoId)
      .eq('modulo', modulo);

    if (error) {
      console.error('Erro ao atualizar permissão:', error);
      setErro('Erro ao atualizar permissão');
      return false;
    }

    return true;
  }, [supabase]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [cargosSimples, cargosCompletos] = await Promise.all([
        getCargos(),
        getCargosComPermissoes(),
      ]);

      setCargos(cargosSimples);
      setCargosComPermissoes(cargosCompletos);
    } catch (err) {
      console.error('Erro ao carregar cargos:', err);
      setErro('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, [getCargos, getCargosComPermissoes]);

  useEffect(() => {
    if (escritorioId) {
      recarregar();
    }
  }, [escritorioId]);

  return {
    cargos,
    cargosComPermissoes,
    carregando,
    erro,
    getCargos,
    getCargoPermissoes,
    createCargo,
    updateCargo,
    updateCargoValorHora,
    deleteCargo,
    reorderCargos,
    updateCargoPermissao,
    recarregar,
  };
}
