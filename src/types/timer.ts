/**
 * Tipos para o sistema de Timer/Timesheet
 */

// =====================================================
// Timer Ativo
// =====================================================

export type TimerStatus = 'rodando' | 'pausado';

export interface TimerAtivo {
  id: string;
  escritorio_id: string;
  user_id: string;
  processo_id?: string | null;
  consulta_id?: string | null;
  tarefa_id?: string | null;
  titulo: string;
  descricao?: string | null;
  hora_inicio: string;
  hora_pausa?: string | null;
  segundos_acumulados: number;
  status: TimerStatus;
  faturavel: boolean;
  cor?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimerAtivoComDetalhes extends TimerAtivo {
  // Dados relacionados (da view v_timers_ativos)
  processo_numero?: string | null;
  consulta_titulo?: string | null;
  tarefa_titulo?: string | null;
  user_nome?: string | null;
  cliente_nome?: string | null;
  // Computed no frontend
  tempo_atual: number; // segundos totais atuais
}

export interface NovoTimerData {
  titulo: string;
  descricao?: string;
  processo_id?: string;
  consulta_id?: string;
  tarefa_id?: string;
  faturavel?: boolean;
}

export interface FinalizarTimerData {
  descricao?: string;
  ajuste_minutos?: number;
}

// =====================================================
// Timesheet Entry
// =====================================================

export type TimesheetOrigem = 'manual' | 'timer' | 'retroativo';

export interface TimesheetEntry {
  id: string;
  escritorio_id: string;
  user_id: string;
  processo_id?: string | null;
  consulta_id?: string | null;
  tarefa_id?: string | null;
  data_trabalho: string;
  horas: number;
  atividade: string;
  faturavel: boolean;
  faturado: boolean;
  aprovado: boolean;
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  reprovado: boolean;
  justificativa_reprovacao?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  origem: TimesheetOrigem;
  editado: boolean;
  editado_em?: string | null;
  editado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovoTimesheetData {
  processo_id?: string;
  consulta_id?: string;
  tarefa_id?: string;
  ato_tipo_id?: string; // Para contratos por_ato com modo hora
  data_trabalho: string;
  horas: number;
  atividade: string;
  faturavel: boolean;
  hora_inicio?: string;
  hora_fim?: string;
  origem: TimesheetOrigem;
}

export interface RegistroRetroativoData {
  data_trabalho: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  atividade: string;
  processo_id?: string;
  consulta_id?: string;
  tarefa_id?: string;
  ato_tipo_id?: string; // Para contratos por_ato com modo hora
  faturavel: boolean;
}

export interface AjusteHorariosData {
  hora_inicio: string; // ISO timestamp
  hora_fim: string; // ISO timestamp
}

export interface DivisaoTimesheetItem {
  horas: number;
  atividade: string;
  processo_id?: string;
  consulta_id?: string;
  faturavel?: boolean;
}

// =====================================================
// Context e Estado
// =====================================================

export interface TimerContextData {
  // Estado
  timersAtivos: TimerAtivoComDetalhes[];
  timersRodando: number;
  tempoTotalRodando: number; // segundos
  loading: boolean;
  error: Error | null;

  // Ações de Timer
  iniciarTimer: (dados: NovoTimerData) => Promise<string>;
  pausarTimer: (timerId: string) => Promise<void>;
  retomarTimer: (timerId: string) => Promise<void>;
  finalizarTimer: (timerId: string, dados?: FinalizarTimerData) => Promise<string>;
  descartarTimer: (timerId: string) => Promise<void>;
  refreshTimers: () => Promise<void>;

  // Estado UI do Widget
  widgetExpandido: boolean;
  setWidgetExpandido: (expandido: boolean) => void;
  widgetTab: 'timers' | 'quickstart' | 'retroativo';
  setWidgetTab: (tab: 'timers' | 'quickstart' | 'retroativo') => void;
}

// =====================================================
// Helpers
// =====================================================

/**
 * Calcula o tempo atual de um timer em segundos
 */
export function calcularTempoAtual(timer: TimerAtivo): number {
  if (timer.status === 'pausado') {
    return timer.segundos_acumulados;
  }

  const agora = new Date();
  const inicio = new Date(timer.hora_inicio);
  const segundosDesdeInicio = Math.floor((agora.getTime() - inicio.getTime()) / 1000);

  return timer.segundos_acumulados + segundosDesdeInicio;
}

/**
 * Formata segundos para HH:MM:SS
 */
export function formatarTempo(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
}

/**
 * Formata segundos para HH:MM (sem segundos)
 */
export function formatarTempoHorasMinutos(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);

  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

/**
 * Converte segundos para horas decimais (para timesheet)
 */
export function segundosParaHorasDecimais(segundos: number): number {
  return Math.round((segundos / 3600) * 100) / 100;
}

/**
 * Cores padrão para timers
 */
export const CORES_TIMER = [
  { nome: 'Azul', valor: '#3B82F6' },
  { nome: 'Verde', valor: '#10B981' },
  { nome: 'Amarelo', valor: '#F59E0B' },
  { nome: 'Roxo', valor: '#8B5CF6' },
  { nome: 'Rosa', valor: '#EC4899' },
  { nome: 'Ciano', valor: '#06B6D4' },
] as const;
