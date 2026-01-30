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

/**
 * Formata horas decimais em formato legível (ex: 2h30min, 45min, 1h)
 * @param horasDecimais - Número decimal de horas (ex: 2.5 = 2h30min)
 * @param formato - 'curto' (2h30) ou 'longo' (2h30min)
 * @returns String formatada
 */
export function formatHoras(horasDecimais: number, formato: 'curto' | 'longo' = 'longo'): string {
  if (!horasDecimais || horasDecimais <= 0) return formato === 'curto' ? '0h' : '0min'

  const horas = Math.floor(horasDecimais)
  const minutos = Math.round((horasDecimais - horas) * 60)

  // Ajuste para caso os minutos arredondem para 60
  const horasAjustadas = minutos === 60 ? horas + 1 : horas
  const minutosAjustados = minutos === 60 ? 0 : minutos

  if (formato === 'curto') {
    if (horasAjustadas === 0) return `${minutosAjustados}min`
    if (minutosAjustados === 0) return `${horasAjustadas}h`
    return `${horasAjustadas}h${minutosAjustados.toString().padStart(2, '0')}`
  }

  // Formato longo
  if (horasAjustadas === 0) return `${minutosAjustados}min`
  if (minutosAjustados === 0) return `${horasAjustadas}h`
  return `${horasAjustadas}h${minutosAjustados}min`
}

/**
 * Formata texto para exibição em faturas - corrige CAPS LOCK e formata corretamente
 * @param texto - Texto a ser formatado
 * @returns Texto formatado em português correto (Sentence case)
 */
export function formatDescricaoFatura(texto: string | null | undefined): string {
  if (!texto) return ''

  // Remover prefixos comuns de sistema
  let textoLimpo = texto
    .replace(/^Tarefa concluída:\s*/i, '')
    .replace(/^Atividade:\s*/i, '')
    .trim()

  // Se o texto está todo em CAPS LOCK (mais de 50% maiúsculas), converter
  const letras = textoLimpo.replace(/[^a-zA-ZÀ-ÿ]/g, '')
  const maiusculas = textoLimpo.replace(/[^A-ZÀ-Ý]/g, '')
  const isCapsLock = letras.length > 3 && (maiusculas.length / letras.length) > 0.6

  if (isCapsLock) {
    // Converter para sentence case (primeira letra maiúscula, resto minúscula)
    textoLimpo = textoLimpo.toLowerCase()
  }

  // Capitalizar primeira letra de cada sentença
  textoLimpo = textoLimpo
    .split(/([.!?]\s+)/)
    .map((parte, i) => {
      if (i % 2 === 0 && parte.length > 0) {
        return parte.charAt(0).toUpperCase() + parte.slice(1)
      }
      return parte
    })
    .join('')

  // Garantir que a primeira letra está maiúscula
  if (textoLimpo.length > 0) {
    textoLimpo = textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1)
  }

  // Corrigir algumas palavras comuns que devem ficar maiúsculas
  const palavrasMaiusculas = [
    'LTDA', 'S/A', 'S.A.', 'ME', 'EPP', 'EIRELI', 'CNPJ', 'CPF', 'RG',
    'PAT', 'CLT', 'FGTS', 'INSS', 'IR', 'IRPF', 'IRPJ', 'PIS', 'COFINS',
    'ZAMP', 'TRT', 'TST', 'STF', 'STJ', 'OAB'
  ]

  palavrasMaiusculas.forEach(palavra => {
    const regex = new RegExp(`\\b${palavra.toLowerCase()}\\b`, 'gi')
    textoLimpo = textoLimpo.replace(regex, palavra)
  })

  // Limpar espaços extras
  textoLimpo = textoLimpo.replace(/\s+/g, ' ').trim()

  return textoLimpo
}