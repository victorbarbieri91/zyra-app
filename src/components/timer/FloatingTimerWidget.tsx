'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, X, Plus, Zap, History } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { TimerDisplay } from './TimerDisplay';
import { TimerCard } from './TimerCard';
import { QuickStartPanel } from './QuickStartPanel';
import { ModalFinalizarTimer } from './ModalFinalizarTimer';
import { ModalRegistroRetroativo } from './ModalRegistroRetroativo';
import { ModalNovoTimer } from './ModalNovoTimer';

export function FloatingTimerWidget() {
  const {
    timersAtivos,
    timersRodando,
    tempoTotalRodando,
    loading,
    widgetExpandido,
    setWidgetExpandido,
    widgetTab,
    setWidgetTab,
    pausarTimer,
    retomarTimer,
    finalizarTimer,
    descartarTimer,
  } = useTimer();

  const [timerParaFinalizar, setTimerParaFinalizar] = useState<string | null>(null);
  const [showRetroativo, setShowRetroativo] = useState(false);
  const [showNovoTimer, setShowNovoTimer] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Estado para drag
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Handlers de drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Só inicia drag com botão esquerdo
    if (e.button !== 0) return;

    setIsDragging(true);
    setHasDragged(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartRef.current.x - e.clientX;
      const deltaY = dragStartRef.current.y - e.clientY;

      // Só considera como arraste se moveu mais de 5px
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        setHasDragged(true);
      }

      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Fechar widget ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        // Não fechar se tiver modais abertos
        if (!timerParaFinalizar && !showRetroativo && !showNovoTimer) {
          setWidgetExpandido(false);
        }
      }
    };

    if (widgetExpandido) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [widgetExpandido, timerParaFinalizar, showRetroativo, showNovoTimer, setWidgetExpandido]);

  // Handler para finalizar timer
  const handleStopTimer = (timerId: string) => {
    setTimerParaFinalizar(timerId);
  };

  // Handler para confirmar finalização
  const handleConfirmFinalizar = async (descricao: string, ajusteMinutos: number) => {
    if (timerParaFinalizar) {
      await finalizarTimer(timerParaFinalizar, { descricao, ajuste_minutos: ajusteMinutos });
      setTimerParaFinalizar(null);
    }
  };

  // Handler para descartar timer
  const handleDiscardTimer = async (timerId: string) => {
    if (confirm('Descartar este timer? O tempo não será salvo.')) {
      await descartarTimer(timerId);
    }
  };

  // Timer selecionado para finalizar
  const timerSelecionado = timerParaFinalizar
    ? timersAtivos.find((t) => t.id === timerParaFinalizar)
    : null;

  // Widget minimizado
  if (!widgetExpandido) {
    return (
      <button
        onClick={() => !hasDragged && setWidgetExpandido(true)}
        onMouseDown={handleMouseDown}
        style={{
          right: `calc(1.5rem + ${position.x}px)`,
          bottom: `calc(1.5rem + ${position.y}px)`,
        }}
        className={`fixed z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-full shadow-xl transition-shadow hover:shadow-2xl ${
          isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105'
        } ${
          timersRodando > 0
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white animate-pulse'
            : 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white'
        }`}
        title="Controle de Horas (Alt+T) • Arraste para mover"
      >
        <div className={`p-1.5 rounded-full ${timersRodando > 0 ? 'bg-white/20' : 'bg-white/10'}`}>
          <Clock className="w-4 h-4" />
        </div>
        {timersRodando > 0 ? (
          <>
            <TimerDisplay segundos={tempoTotalRodando} size="sm" showSeconds />
            <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {timersRodando}
            </span>
          </>
        ) : (
          <span className="text-sm font-semibold tracking-wide">Horas</span>
        )}
      </button>
    );
  }

  // Widget expandido
  return (
    <>
      <div
        ref={widgetRef}
        style={{
          right: `calc(1.5rem + ${position.x}px)`,
          bottom: `calc(1.5rem + ${position.y}px)`,
        }}
        className="fixed z-50 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header - arrastável */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#34495e]" />
            <h3 className="text-sm font-semibold text-[#34495e]">Controle de Horas</h3>
            {timersRodando > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                {timersRodando} ativo{timersRodando > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => setWidgetExpandido(false)}
            className="p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setWidgetTab('timers')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              widgetTab === 'timers'
                ? 'text-[#34495e] border-b-2 border-[#34495e]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Timers
              {timersAtivos.length > 0 && (
                <span className="bg-slate-200 text-slate-600 text-[10px] px-1 rounded">
                  {timersAtivos.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setWidgetTab('quickstart')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              widgetTab === 'quickstart'
                ? 'text-[#34495e] border-b-2 border-[#34495e]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Início Rápido
            </span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="max-h-[400px] overflow-y-auto">
          {widgetTab === 'timers' && (
            <div className="p-3 space-y-2">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-500">Carregando...</div>
              ) : timersAtivos.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhum timer ativo</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Inicie um timer na aba &quot;Início Rápido&quot;
                  </p>
                </div>
              ) : (
                timersAtivos.map((timer) => (
                  <TimerCard
                    key={timer.id}
                    timer={timer}
                    onPause={() => pausarTimer(timer.id)}
                    onResume={() => retomarTimer(timer.id)}
                    onStop={() => handleStopTimer(timer.id)}
                    onDiscard={() => handleDiscardTimer(timer.id)}
                  />
                ))
              )}
            </div>
          )}

          {widgetTab === 'quickstart' && <QuickStartPanel />}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-t border-slate-200">
          <button
            onClick={() => setShowNovoTimer(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#34495e] rounded-lg hover:bg-[#46627f] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Timer
          </button>
          <button
            onClick={() => setShowRetroativo(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Adicionar tempo esquecido"
          >
            <History className="w-3.5 h-3.5" />
            Retroativo
          </button>
        </div>
      </div>

      {/* Modal Finalizar Timer */}
      {timerSelecionado && (
        <ModalFinalizarTimer
          timer={timerSelecionado}
          onConfirm={handleConfirmFinalizar}
          onCancel={() => setTimerParaFinalizar(null)}
          onDiscard={() => {
            handleDiscardTimer(timerSelecionado.id);
            setTimerParaFinalizar(null);
          }}
        />
      )}

      {/* Modal Registro Retroativo */}
      {showRetroativo && (
        <ModalRegistroRetroativo onClose={() => setShowRetroativo(false)} />
      )}

      {/* Modal Novo Timer */}
      {showNovoTimer && <ModalNovoTimer onClose={() => setShowNovoTimer(false)} />}
    </>
  );
}
