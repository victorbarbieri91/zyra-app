import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatBrazilDateOnly, formatBrazilDateTime } from './timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata uma data no padrão brasileiro (dd/MM/yyyy)
 * Garante que a data é exibida no timezone de Brasília
 */
export function formatDate(date: Date | string): string {
  return formatBrazilDateOnly(date)
}

/**
 * Formata data e hora no padrão brasileiro (dd/MM/yyyy às HH:mm)
 * Garante que a data/hora é exibida no timezone de Brasília
 */
export function formatDateTime(date: Date | string): string {
  return formatBrazilDateTime(date)
}