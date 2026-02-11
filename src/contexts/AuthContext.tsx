'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  signOut: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        logger.error('Erro ao verificar autenticacao', { module: 'auth', action: 'verificacao' });

        // Se houver erro de sessao, limpar e redirecionar
        if (error.message.includes('session') || error.name === 'AuthSessionMissingError') {
          await supabase.auth.signOut();
          setUser(null);
          router.replace('/login');
          return;
        }
      }

      if (!user) {
        // Nao autenticado - redirecionar para login
        router.replace('/login');
        return;
      }

      setUser(user);
      Sentry.setUser({ id: user.id, email: user.email || undefined });
    } catch (err) {
      logger.error('Erro inesperado na verificacao de auth', { module: 'auth', action: 'verificacao' }, err instanceof Error ? err : undefined);
      // Em caso de erro inesperado, redirecionar para login
      router.replace('/login');
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, [supabase, router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      Sentry.setUser(null);
      router.replace('/login');
    } catch (error) {
      logger.error('Erro ao fazer logout', { module: 'auth', action: 'logout' }, error instanceof Error ? error : undefined);
      // Mesmo com erro, redirecionar
      router.replace('/login');
    }
  };

  // Verificar autenticacao ao montar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Escutar mudancas de autenticacao
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          router.replace('/login');
        } else if (session?.user) {
          setUser(session.user);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  // Mostrar loading enquanto verifica autenticacao
  if (loading || !authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3A8A]" />
          <p className="text-sm text-slate-500">Verificando autenticacao...</p>
        </div>
      </div>
    );
  }

  // Se nao tem usuario apos verificacao, nao renderizar nada (ja esta redirecionando)
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3A8A]" />
          <p className="text-sm text-slate-500">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
