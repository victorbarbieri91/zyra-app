/**
 * Módulo de Timezone Centralizado
 *
 * Este módulo garante que todas as datas no sistema sejam tratadas
 * no timezone de Brasília (America/Sao_Paulo), independente do timezone
 * do navegador do usuário.
 *
 * O PostgreSQL armazena datas em UTC (via timestamptz), o que é correto.
 * Este módulo garante a conversão correta entre UTC (database) e BRT (interface).
 */

import { format, parse, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'

/**
 * Timezone oficial do sistema: Brasília, Brasil
 * UTC-3 (horário padrão) ou UTC-2 (horário de verão, quando aplicável)
 */
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

/**
 * Retorna a data/hora atual no timezone de Brasília
 */
export function getNowInBrazil(): Date {
  return toZonedTime(new Date(), BRAZIL_TIMEZONE)
}

/**
 * Converte qualquer data para o timezone de Brasília
 * @param date - Data a ser convertida (Date, string ISO, ou timestamp)
 */
export function toBrazilTime(date: Date | string | number): Date {
  if (typeof date === 'string') {
    date = parseISO(date)
  } else if (typeof date === 'number') {
    date = new Date(date)
  }
  return toZonedTime(date, BRAZIL_TIMEZONE)
}

/**
 * Converte uma data do timezone de Brasília para UTC
 * Usado ao enviar datas para o banco de dados
 * @param date - Data no timezone de Brasília
 */
export function fromBrazilToUTC(date: Date): Date {
  return fromZonedTime(date, BRAZIL_TIMEZONE)
}

/**
 * Formata uma data no timezone de Brasília
 * @param date - Data a ser formatada
 * @param formatStr - Formato desejado (padrão date-fns)
 * @returns String formatada no timezone de Brasília
 *
 * @example
 * formatBrazilDate(new Date(), 'dd/MM/yyyy HH:mm') // "12/01/2025 14:30"
 * formatBrazilDate(new Date(), "dd 'de' MMMM 'de' yyyy") // "12 de janeiro de 2025"
 */
export function formatBrazilDate(
  date: Date | string | number,
  formatStr: string = 'dd/MM/yyyy'
): string {
  if (typeof date === 'string') {
    date = parseISO(date)
  } else if (typeof date === 'number') {
    date = new Date(date)
  }
  return formatInTimeZone(date, BRAZIL_TIMEZONE, formatStr, { locale: ptBR })
}

/**
 * Formata data/hora completa no padrão brasileiro com timezone de Brasília
 * @example "12/01/2025 às 14:30"
 */
export function formatBrazilDateTime(date: Date | string | number): string {
  return formatBrazilDate(date, "dd/MM/yyyy 'às' HH:mm")
}

/**
 * Formata apenas a data no padrão brasileiro com timezone de Brasília
 * @example "12/01/2025"
 */
export function formatBrazilDateOnly(date: Date | string | number): string {
  return formatBrazilDate(date, 'dd/MM/yyyy')
}

/**
 * Formata data por extenso no timezone de Brasília
 * @example "12 de janeiro de 2025"
 */
export function formatBrazilDateLong(date: Date | string | number): string {
  return formatBrazilDate(date, "dd 'de' MMMM 'de' yyyy")
}

/**
 * Formata apenas a hora no timezone de Brasília
 * @example "14:30"
 */
export function formatBrazilTime(date: Date | string | number): string {
  return formatBrazilDate(date, 'HH:mm')
}

/**
 * Faz parse de uma string de data no contexto do timezone de Brasília
 * @param dateString - String da data (ex: "2025-01-20")
 * @param formatStr - Formato da string (padrão: 'yyyy-MM-dd')
 * @returns Date object no timezone de Brasília
 *
 * IMPORTANTE: Use esta função ao invés de new Date(string) para evitar
 * problemas de conversão de timezone
 */
export function parseDateInBrazil(
  dateString: string,
  formatStr: string = 'yyyy-MM-dd'
): Date {
  // Parse a string como se fosse no timezone de Brasília
  const parsed = parse(dateString, formatStr, new Date())
  // Converte para o timezone de Brasília explicitamente
  return fromZonedTime(parsed, BRAZIL_TIMEZONE)
}

/**
 * Faz parse de uma string de data vinda do banco de dados
 *
 * IMPORTANTE: Use esta função ao invés de `new Date(string)` para datas do banco!
 *
 * Quando o banco retorna "2025-01-19" (tipo date) e você faz new Date("2025-01-19"),
 * o JavaScript interpreta como meia-noite UTC, que no horário de Brasília (UTC-3)
 * vira 21:00 do dia ANTERIOR (18/01).
 *
 * Esta função trata corretamente:
 * - Strings date: "2025-01-19" → 19/01/2025 00:00 (local)
 * - Strings timestamptz: "2025-01-19T14:30:00Z" → convertido para Brasília
 *
 * @param dateString - String da data vinda do banco (date ou timestamptz)
 * @returns Date object correto para uso em comparações e exibição
 *
 * @example
 * // ❌ ERRADO - pode mostrar dia anterior
 * new Date("2025-01-19")
 *
 * // ✅ CORRETO
 * parseDBDate("2025-01-19")
 */
export function parseDBDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) {
    return new Date() // fallback para data atual
  }

  // Se já é um objeto Date, retornar diretamente
  if (dateInput instanceof Date) {
    return dateInput
  }

  // Se é apenas YYYY-MM-DD (tipo date do banco), tratar como data local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    // Adiciona T12:00:00 para garantir que fica no mesmo dia em qualquer timezone
    return new Date(`${dateInput}T12:00:00`)
  }

  // Se já tem horário (timestamptz), converter para timezone de Brasília
  return toBrazilTime(dateInput)
}

/**
 * Prepara uma data para ser enviada ao Supabase
 * Converte de Brasília para UTC e formata como ISO string
 *
 * @param date - Data em qualquer formato
 * @returns ISO string em UTC para armazenar no banco
 *
 * @example
 * // Usuário seleciona "2025-01-20" (deve ser tratado como 2025-01-20 00:00 BRT)
 * formatDateForDB("2025-01-20") // "2025-01-20T03:00:00.000Z" (UTC)
 */
export function formatDateForDB(date: Date | string): string {
  let dateObj: Date

  if (typeof date === 'string') {
    // Se é uma string no formato YYYY-MM-DD, tratar como data no timezone de Brasília
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Adiciona T12:00:00 para evitar conversão de timezone ao meio-dia
      // (estratégia alternativa: usar parseDateInBrazil)
      dateObj = new Date(`${date}T12:00:00`)
    } else {
      // Se já tem hora, fazer parse normal
      dateObj = parseISO(date)
    }
  } else {
    dateObj = date
  }

  return dateObj.toISOString()
}

/**
 * Prepara um datetime para ser enviado ao Supabase
 * Garante que o datetime está no timezone de Brasília antes de converter para UTC
 *
 * @param date - Date object
 * @returns ISO string em UTC
 */
export function formatDateTimeForDB(date: Date): string {
  // Converte do timezone de Brasília para UTC
  const utcDate = fromZonedTime(date, BRAZIL_TIMEZONE)
  return utcDate.toISOString()
}

/**
 * Verifica se uma data é hoje (no timezone de Brasília)
 */
export function isToday(date: Date | string): boolean {
  const dateInBrazil = toBrazilTime(date)
  const todayInBrazil = getNowInBrazil()

  return (
    dateInBrazil.getDate() === todayInBrazil.getDate() &&
    dateInBrazil.getMonth() === todayInBrazil.getMonth() &&
    dateInBrazil.getFullYear() === todayInBrazil.getFullYear()
  )
}

/**
 * Retorna o início do dia no timezone de Brasília
 */
export function startOfDayInBrazil(date: Date | string): Date {
  const dateInBrazil = toBrazilTime(date)
  dateInBrazil.setHours(0, 0, 0, 0)
  return dateInBrazil
}

/**
 * Retorna o fim do dia no timezone de Brasília
 */
export function endOfDayInBrazil(date: Date | string): Date {
  const dateInBrazil = toBrazilTime(date)
  dateInBrazil.setHours(23, 59, 59, 999)
  return dateInBrazil
}

/**
 * Formata data relativa (hoje, ontem, amanhã) no timezone de Brasília
 * @example "Hoje às 14:30", "Ontem às 10:00", "12/01/2025"
 */
export function formatRelativeDate(date: Date | string): string {
  const dateInBrazil = toBrazilTime(date)
  const todayInBrazil = getNowInBrazil()

  const diffInDays = Math.floor(
    (dateInBrazil.getTime() - startOfDayInBrazil(todayInBrazil).getTime()) /
    (1000 * 60 * 60 * 24)
  )

  if (diffInDays === 0) {
    return `Hoje às ${formatBrazilTime(dateInBrazil)}`
  } else if (diffInDays === -1) {
    return `Ontem às ${formatBrazilTime(dateInBrazil)}`
  } else if (diffInDays === 1) {
    return `Amanhã às ${formatBrazilTime(dateInBrazil)}`
  } else {
    return formatBrazilDateTime(dateInBrazil)
  }
}

/**
 * Helpers para Planejamento de Horário (Visualização Dia)
 */

/**
 * Combina uma data (apenas dia) com um horário planejado
 * @param dataInicio - Data início da tarefa (timestamptz do banco, com hora 00:00)
 * @param horarioPlaneado - Horário no formato time ('14:30:00')
 * @returns Date object no timezone de Brasília com o horário combinado
 *
 * @example
 * combinarDataHorarioPlanejado('2025-01-20T00:00:00Z', '14:30:00')
 * // Retorna: Date para 20/01/2025 às 14:30 (horário de Brasília)
 */
export function combinarDataHorarioPlanejado(
  dataInicio: string | Date,
  horarioPlaneado: string
): Date {
  const data = toBrazilTime(dataInicio)
  const [hora, minuto] = horarioPlaneado.split(':').map(Number)

  data.setHours(hora, minuto, 0, 0)
  return data
}

/**
 * Converte um horário time para minutos desde 6h
 * Usado para posicionar cards na grade horária
 * @param timeStr - Horário no formato time ('14:30:00')
 * @returns Minutos desde 6h (ex: 14:30 → 510 minutos)
 *
 * @example
 * parseTimeToMinutes('14:30:00') // 510 (8.5 horas * 60)
 * parseTimeToMinutes('06:00:00') // 0
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hora, minuto] = timeStr.split(':').map(Number)
  return (hora - 6) * 60 + minuto
}

/**
 * Converte minutos desde 6h de volta para horário time
 * @param minutes - Minutos desde 6h
 * @returns Horário no formato time ('14:30:00')
 *
 * @example
 * minutesToTime(510) // '14:30:00'
 * minutesToTime(0) // '06:00:00'
 */
export function minutesToTime(minutes: number): string {
  const hora = Math.floor(minutes / 60) + 6
  const minuto = minutes % 60
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`
}

/**
 * Formata horário time para exibição (sem segundos)
 * @param timeStr - Horário no formato time ('14:30:00')
 * @returns Horário formatado ('14:30')
 *
 * @example
 * formatTimeDisplay('14:30:00') // '14:30'
 */
export function formatTimeDisplay(timeStr: string): string {
  return timeStr.slice(0, 5)
}

/**
 * Calcula o horário de fim somando a duração ao horário de início
 * @param horarioInicio - Horário no formato time ('14:30:00')
 * @param duracaoMinutos - Duração em minutos
 * @returns Horário de fim formatado ('15:30')
 *
 * @example
 * calcularHorarioFim('10:00:00', 90) // '11:30'
 * calcularHorarioFim('14:30:00', 60) // '15:30'
 */
export function calcularHorarioFim(horarioInicio: string, duracaoMinutos: number): string {
  const [hora, minuto] = horarioInicio.split(':').map(Number)

  // Converter tudo para minutos
  const minutosInicio = hora * 60 + minuto
  const minutosFim = minutosInicio + duracaoMinutos

  // Converter de volta para horas e minutos
  const horaFim = Math.floor(minutosFim / 60)
  const minutoFim = minutosFim % 60

  return `${String(horaFim).padStart(2, '0')}:${String(minutoFim).padStart(2, '0')}`
}
