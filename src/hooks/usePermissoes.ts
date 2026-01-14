'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ModuloPermissao } from '@/types/escritorio';

interface PermissoesModulo {
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_exportar: boolean;
}

interface UsePermissoesReturn {
  permissoes: Record<ModuloPermissao, PermissoesModulo> | null;
  carregando: boolean;
  erro: string | null;

  // Funcoes de verificacao rapida
  podeVisualizar: (modulo: ModuloPermissao) => boolean;
  podeCriar: (modulo: ModuloPermissao) => boolean;
  podeEditar: (modulo: ModuloPermissao) => boolean;
  podeExcluir: (modulo: ModuloPermissao) => boolean;
  podeExportar: (modulo: ModuloPermissao) => boolean;

  // Recarregar permissoes
  recarregar: () => Promise<void>;
}

const permissoesVazias: PermissoesModulo = {
  pode_visualizar: false,
  pode_criar: false,
  pode_editar: false,
  pode_excluir: false,
  pode_exportar: false,
};

const defaultPermissoes: Record<ModuloPermissao, PermissoesModulo> = {
  financeiro: { ...permissoesVazias },
  relatorios: { ...permissoesVazias },
  configuracoes: { ...permissoesVazias },
};

export function usePermissoes(escritorioId: string | undefined): UsePermissoesReturn {
  const [permissoes, setPermissoes] = useState<Record<ModuloPermissao, PermissoesModulo> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const supabase = createClient();

  const carregarPermissoes = useCallback(async () => {
    if (!escritorioId) {
      setPermissoes(null);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      // Chamar a funcao RPC que retorna todas as permissoes do usuario
      const { data, error } = await supabase.rpc('get_my_permissions', {
        p_escritorio_id: escritorioId,
      });

      if (error) {
        console.error('Erro ao carregar permissoes:', error);
        setErro('Erro ao carregar permissoes');
        setPermissoes(defaultPermissoes);
        return;
      }

      // Transformar array em objeto indexado por modulo
      const permissoesMap: Record<ModuloPermissao, PermissoesModulo> = { ...defaultPermissoes };

      if (data && Array.isArray(data)) {
        data.forEach((perm: {
          modulo: ModuloPermissao;
          pode_visualizar: boolean;
          pode_criar: boolean;
          pode_editar: boolean;
          pode_excluir: boolean;
          pode_exportar: boolean;
        }) => {
          if (perm.modulo in permissoesMap) {
            permissoesMap[perm.modulo] = {
              pode_visualizar: perm.pode_visualizar,
              pode_criar: perm.pode_criar,
              pode_editar: perm.pode_editar,
              pode_excluir: perm.pode_excluir,
              pode_exportar: perm.pode_exportar,
            };
          }
        });
      }

      setPermissoes(permissoesMap);
    } catch (err) {
      console.error('Erro ao carregar permissoes:', err);
      setErro('Erro ao carregar permissoes');
      setPermissoes(defaultPermissoes);
    } finally {
      setCarregando(false);
    }
  }, [escritorioId, supabase]);

  // Funcoes de verificacao
  const podeVisualizar = useCallback(
    (modulo: ModuloPermissao): boolean => {
      return permissoes?.[modulo]?.pode_visualizar ?? false;
    },
    [permissoes]
  );

  const podeCriar = useCallback(
    (modulo: ModuloPermissao): boolean => {
      return permissoes?.[modulo]?.pode_criar ?? false;
    },
    [permissoes]
  );

  const podeEditar = useCallback(
    (modulo: ModuloPermissao): boolean => {
      return permissoes?.[modulo]?.pode_editar ?? false;
    },
    [permissoes]
  );

  const podeExcluir = useCallback(
    (modulo: ModuloPermissao): boolean => {
      return permissoes?.[modulo]?.pode_excluir ?? false;
    },
    [permissoes]
  );

  const podeExportar = useCallback(
    (modulo: ModuloPermissao): boolean => {
      return permissoes?.[modulo]?.pode_exportar ?? false;
    },
    [permissoes]
  );

  // Carregar permissoes quando escritorioId mudar
  useEffect(() => {
    carregarPermissoes();
  }, [carregarPermissoes]);

  return {
    permissoes,
    carregando,
    erro,
    podeVisualizar,
    podeCriar,
    podeEditar,
    podeExcluir,
    podeExportar,
    recarregar: carregarPermissoes,
  };
}
