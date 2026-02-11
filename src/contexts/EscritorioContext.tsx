'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Escritorio,
  EscritorioComRole,
  getEscritoriosDoUsuario,
  getEscritorioAtivo,
  trocarEscritorio as trocarEscritorioHelper,
} from '@/lib/supabase/escritorio-helpers';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface EscritorioContextData {
  escritorioAtivo: Escritorio | null;
  escritoriosDisponiveis: EscritorioComRole[];
  roleAtual: string | null;
  isOwner: boolean;
  carregando: boolean;
  trocarEscritorio: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
}

const EscritorioContext = createContext<EscritorioContextData>({
  escritorioAtivo: null,
  escritoriosDisponiveis: [],
  roleAtual: null,
  isOwner: false,
  carregando: true,
  trocarEscritorio: async () => {},
  recarregar: async () => {},
});

export function EscritorioProvider({ children }: { children: React.ReactNode }) {
  const [escritorioAtivo, setEscritorioAtivo] = useState<Escritorio | null>(null);
  const [escritoriosDisponiveis, setEscritoriosDisponiveis] = useState<EscritorioComRole[]>([]);
  const [roleAtual, setRoleAtual] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  // Usar useRef para manter a mesma referência do supabase client
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);

      // Carregar escritório ativo
      const ativo = await getEscritorioAtivo();
      setEscritorioAtivo(ativo);

      // Carregar escritórios disponíveis
      const disponiveis = await getEscritoriosDoUsuario();
      setEscritoriosDisponiveis(disponiveis);

      // Definir role e owner status do escritório ativo
      if (ativo && disponiveis.length > 0) {
        const escritorioAtivoComRole = disponiveis.find((e) => e.id === ativo.id);
        if (escritorioAtivoComRole) {
          setRoleAtual(escritorioAtivoComRole.role);
          setIsOwner(escritorioAtivoComRole.is_owner);
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar dados do escritorio', { module: 'escritorio', action: 'carregar' }, error instanceof Error ? error : undefined);
    } finally {
      setCarregando(false);
    }
  }, []);

  const trocarEscritorio = async (id: string) => {
    try {
      setCarregando(true);
      await trocarEscritorioHelper(id);
      await carregarDados();

      // Recarregar a página para atualizar todos os dados
      router.refresh();
    } catch (error) {
      logger.error('Erro ao trocar escritorio', { module: 'escritorio', action: 'trocar' }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      setCarregando(false);
    }
  };

  const recarregar = async () => {
    await carregarDados();
  };

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Escutar mudanças de autenticação
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') {
        carregarDados();
      } else if (event === 'SIGNED_OUT') {
        setEscritorioAtivo(null);
        setEscritoriosDisponiveis([]);
        setRoleAtual(null);
        setIsOwner(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [carregarDados, supabase]);

  return (
    <EscritorioContext.Provider
      value={{
        escritorioAtivo,
        escritoriosDisponiveis,
        roleAtual,
        isOwner,
        carregando,
        trocarEscritorio,
        recarregar,
      }}
    >
      {children}
    </EscritorioContext.Provider>
  );
}

export function useEscritorio() {
  const context = useContext(EscritorioContext);

  if (!context) {
    throw new Error('useEscritorio deve ser usado dentro de um EscritorioProvider');
  }

  return context;
}
