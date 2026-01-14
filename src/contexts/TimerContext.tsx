'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useEscritorio } from './EscritorioContext';
import { useTimers } from '@/hooks/useTimers';
import {
  TimerAtivoComDetalhes,
  NovoTimerData,
  FinalizarTimerData,
  TimerContextData,
} from '@/types/timer';

const TimerContext = createContext<TimerContextData>({
  timersAtivos: [],
  timersRodando: 0,
  tempoTotalRodando: 0,
  loading: true,
  error: null,
  iniciarTimer: async () => '',
  pausarTimer: async () => {},
  retomarTimer: async () => {},
  finalizarTimer: async () => '',
  descartarTimer: async () => {},
  refreshTimers: async () => {},
  widgetExpandido: false,
  setWidgetExpandido: () => {},
  widgetTab: 'timers',
  setWidgetTab: () => {},
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { escritorioAtivo } = useEscritorio();
  const escritorioId = escritorioAtivo?.id || null;

  // Hook de timers
  const {
    timers,
    loading,
    error,
    iniciarTimer: iniciarTimerHook,
    pausarTimer: pausarTimerHook,
    retomarTimer: retomarTimerHook,
    finalizarTimer: finalizarTimerHook,
    descartarTimer: descartarTimerHook,
    refreshTimers,
    timersRodando,
    tempoTotalRodando,
  } = useTimers(escritorioId);

  // Estado do widget
  const [widgetExpandido, setWidgetExpandido] = useState(false);
  const [widgetTab, setWidgetTab] = useState<'timers' | 'quickstart' | 'retroativo'>('timers');

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + T: Abrir/fechar widget
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        setWidgetExpandido((prev) => !prev);
      }

      // Alt + N: Novo timer (abre widget na tab quickstart)
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        setWidgetExpandido(true);
        setWidgetTab('quickstart');
      }

      // Alt + P: Pausar/retomar primeiro timer
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        const primeiroTimer = timers[0];
        if (primeiroTimer) {
          if (primeiroTimer.status === 'rodando') {
            pausarTimerHook(primeiroTimer.id);
          } else {
            retomarTimerHook(primeiroTimer.id);
          }
        }
      }

      // Alt + S: Parar primeiro timer
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        const primeiroTimer = timers[0];
        if (primeiroTimer) {
          // Abre widget para finalizar com descrição
          setWidgetExpandido(true);
          setWidgetTab('timers');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timers, pausarTimerHook, retomarTimerHook]);

  // Wrappers para as funções do hook
  const iniciarTimer = useCallback(async (dados: NovoTimerData): Promise<string> => {
    const id = await iniciarTimerHook(dados);
    // Abrir widget automaticamente ao iniciar timer
    setWidgetExpandido(true);
    setWidgetTab('timers');
    return id;
  }, [iniciarTimerHook]);

  const pausarTimer = useCallback(async (timerId: string): Promise<void> => {
    await pausarTimerHook(timerId);
  }, [pausarTimerHook]);

  const retomarTimer = useCallback(async (timerId: string): Promise<void> => {
    await retomarTimerHook(timerId);
  }, [retomarTimerHook]);

  const finalizarTimer = useCallback(async (
    timerId: string,
    dados?: FinalizarTimerData
  ): Promise<string> => {
    const timesheetId = await finalizarTimerHook(timerId, dados);
    return timesheetId;
  }, [finalizarTimerHook]);

  const descartarTimer = useCallback(async (timerId: string): Promise<void> => {
    await descartarTimerHook(timerId);
  }, [descartarTimerHook]);

  return (
    <TimerContext.Provider
      value={{
        timersAtivos: timers,
        timersRodando,
        tempoTotalRodando,
        loading,
        error,
        iniciarTimer,
        pausarTimer,
        retomarTimer,
        finalizarTimer,
        descartarTimer,
        refreshTimers,
        widgetExpandido,
        setWidgetExpandido,
        widgetTab,
        setWidgetTab,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error('useTimer deve ser usado dentro de um TimerProvider');
  }

  return context;
}
