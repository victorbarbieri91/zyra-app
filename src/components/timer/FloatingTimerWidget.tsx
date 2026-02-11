'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, History, ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { TimerDisplay } from './TimerDisplay';
import { TimerCard } from './TimerCard';
import { QuickStartPanel } from './QuickStartPanel';
import { ModalNovoTimer } from './ModalNovoTimer';
import TimesheetModal from '@/components/financeiro/TimesheetModal';

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
    descartarTimer,
  } = useTimer();

  const [timerParaSalvar, setTimerParaSalvar] = useState<{
    id: string;
    processoId?: string | null;
    consultaId?: string | null;
    tarefaId?: string | null;
    duracaoHoras: number;
    duracaoMinutos: number;
    atividade: string;
  } | null>(null);
  const [showRetroativo, setShowRetroativo] = useState(false);
  const [showNovoTimer, setShowNovoTimer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
        if (!timerParaSalvar && !showRetroativo && !showNovoTimer) {
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
  }, [widgetExpandido, timerParaSalvar, showRetroativo, showNovoTimer, setWidgetExpandido]);

  // Handler para parar timer e abrir TimesheetModal
  const handleStopTimer = async (timerId: string) => {
    const timer = timersAtivos.find((t) => t.id === timerId);
    if (!timer) return;

    // Pausar timer para congelar o tempo
    if (timer.status === 'rodando') {
      try {
        await pausarTimer(timerId);
      } catch (err) {
        console.error('Erro ao pausar timer:', err);
      }
    }

    // Calcular horas e minutos do tempo acumulado
    const totalSegundos = timer.tempo_atual;
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.round((totalSegundos % 3600) / 60);

    setTimerParaSalvar({
      id: timerId,
      processoId: timer.processo_id,
      consultaId: timer.consulta_id,
      tarefaId: timer.tarefa_id,
      duracaoHoras: h,
      duracaoMinutos: m,
      atividade: timer.descricao || timer.titulo,
    });
  };

  // Handler para descartar timer
  const handleDiscardTimer = async (timerId: string) => {
    if (confirm('Descartar este timer? O tempo não será salvo.')) {
      try {
        await descartarTimer(timerId);
        toast.success('Timer descartado');
      } catch (err: any) {
        const errorMessage = err?.message || 'Erro ao descartar timer';
        toast.error(errorMessage);
        console.error('Erro ao descartar timer:', err);
      }
    }
  };

  // Filtrar timers por busca
  const timersFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return timersAtivos;

    const termo = searchTerm.toLowerCase().trim();
    return timersAtivos.filter((timer) => {
      // Busca por nome do cliente
      if (timer.cliente_nome?.toLowerCase().includes(termo)) return true;
      // Busca por número do processo
      if (timer.processo_numero?.toLowerCase().includes(termo)) return true;
      // Busca por título da consulta
      if (timer.consulta_titulo?.toLowerCase().includes(termo)) return true;
      // Busca por título do timer
      if (timer.titulo?.toLowerCase().includes(termo)) return true;
      return false;
    });
  }, [timersAtivos, searchTerm]);


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
        className={`fixed z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-full shadow-xl transition-all ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab hover:shadow-2xl hover:scale-105'
        } bg-gradient-to-r from-[#34495e] to-[#46627f] text-white`}
        title="Controle de Horas (Alt+T)"
      >
        {timersRodando > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[#89bcbe]" />
            <TimerDisplay
              segundos={tempoTotalRodando}
              size="md"
              showSeconds
              className="text-white"
            />
            {timersRodando > 1 && (
              <span className="text-xs text-white/70">
                +{timersRodando - 1}
              </span>
            )}
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
        className="fixed z-50 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
      >
        {/* Header - arrastável */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-[#34495e]">Controle de Horas</h3>
            {timersRodando > 0 && (
              <span className="text-[10px] text-slate-400">
                {timersRodando} ativo{timersRodando > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => setWidgetExpandido(false)}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
            title="Minimizar"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setWidgetTab('timers')}
            className={`flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              widgetTab === 'timers'
                ? 'text-[#34495e] border-b border-[#34495e]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Timers{timersAtivos.length > 0 && ` (${timersAtivos.length})`}
          </button>
          <button
            onClick={() => setWidgetTab('quickstart')}
            className={`flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              widgetTab === 'quickstart'
                ? 'text-[#34495e] border-b border-[#34495e]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Início Rápido
          </button>
        </div>

        {/* Conteúdo */}
        <div className="max-h-[320px] overflow-y-auto">
          {widgetTab === 'timers' && (
            <div className="p-2.5 space-y-2">
              {/* Campo de busca */}
              {timersAtivos.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por cliente, pasta ou processo..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#34495e] focus:border-[#34495e] placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Carregando...</div>
              ) : timersAtivos.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-400">Nenhum timer ativo</p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Inicie um timer na aba Início Rápido
                  </p>
                </div>
              ) : timersFiltrados.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400">Nenhum timer encontrado</p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Tente outro termo de busca
                  </p>
                </div>
              ) : (
                timersFiltrados.map((timer) => (
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
        <div className="flex items-center gap-2 px-2.5 py-2 border-t border-slate-100">
          <button
            onClick={() => setShowNovoTimer(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-white bg-[#34495e] rounded hover:bg-[#46627f] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Novo
          </button>
          <button
            onClick={() => setShowRetroativo(true)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            title="Adicionar tempo esquecido"
          >
            <History className="w-3 h-3" />
            Retroativo
          </button>
        </div>
      </div>

      {/* Modal TimesheetModal - para salvar timer ou registro retroativo */}
      <TimesheetModal
        open={!!timerParaSalvar || showRetroativo}
        onOpenChange={(open) => {
          if (!open) {
            setTimerParaSalvar(null);
            setShowRetroativo(false);
          }
        }}
        processoId={timerParaSalvar?.processoId}
        consultaId={timerParaSalvar?.consultaId}
        tarefaId={timerParaSalvar?.tarefaId}
        defaultModoRegistro={timerParaSalvar ? 'duracao' : undefined}
        defaultDuracaoHoras={timerParaSalvar?.duracaoHoras}
        defaultDuracaoMinutos={timerParaSalvar?.duracaoMinutos}
        defaultAtividade={timerParaSalvar?.atividade}
        onSuccess={() => {
          if (timerParaSalvar) {
            descartarTimer(timerParaSalvar.id);
            setTimerParaSalvar(null);
            toast.success('Horas registradas com sucesso!');
          } else {
            setShowRetroativo(false);
            toast.success('Horas registradas com sucesso!');
          }
        }}
      />

      {/* Modal Novo Timer */}
      {showNovoTimer && <ModalNovoTimer onClose={() => setShowNovoTimer(false)} />}
    </>
  );
}
