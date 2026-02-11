import { describe, it, expect } from 'vitest'
import {
  BRAZIL_TIMEZONE,
  formatBrazilDate,
  formatBrazilDateTime,
  formatBrazilDateOnly,
  formatBrazilDateLong,
  formatBrazilTime,
  parseDBDate,
  formatDateForDB,
  parseTimeToMinutes,
  minutesToTime,
  formatTimeDisplay,
  calcularHorarioFim,
  formatHoras,
} from '../timezone'

// Importar formatHoras de utils para testar também
import { formatHoras as formatHorasUtil } from '../utils'

describe('timezone - constantes', () => {
  it('deve usar timezone America/Sao_Paulo', () => {
    expect(BRAZIL_TIMEZONE).toBe('America/Sao_Paulo')
  })
})

describe('timezone - formatBrazilDateOnly', () => {
  it('formata string ISO para dd/MM/yyyy', () => {
    const result = formatBrazilDateOnly('2025-06-15T15:00:00Z')
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('formata corretamente uma data conhecida', () => {
    // 15 Jun 2025 15:00 UTC = 15 Jun 2025 12:00 BRT
    const result = formatBrazilDateOnly('2025-06-15T15:00:00Z')
    expect(result).toBe('15/06/2025')
  })
})

describe('timezone - formatBrazilDateTime', () => {
  it('inclui hora no formato "dd/MM/yyyy às HH:mm"', () => {
    const result = formatBrazilDateTime('2025-06-15T15:00:00Z')
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)
  })
})

describe('timezone - formatBrazilDateLong', () => {
  it('formata por extenso com mês em português', () => {
    const result = formatBrazilDateLong('2025-01-15T12:00:00Z')
    expect(result).toContain('janeiro')
    expect(result).toContain('2025')
  })
})

describe('timezone - formatBrazilTime', () => {
  it('retorna apenas HH:mm', () => {
    const result = formatBrazilTime('2025-06-15T15:00:00Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('timezone - parseDBDate', () => {
  it('retorna data atual para null', () => {
    const result = parseDBDate(null)
    expect(result).toBeInstanceOf(Date)
  })

  it('retorna data atual para undefined', () => {
    const result = parseDBDate(undefined)
    expect(result).toBeInstanceOf(Date)
  })

  it('retorna o mesmo Date para Date input', () => {
    const input = new Date('2025-06-15T12:00:00Z')
    const result = parseDBDate(input)
    expect(result).toBe(input)
  })

  it('trata string YYYY-MM-DD sem mudar o dia', () => {
    const result = parseDBDate('2025-01-19')
    expect(result.getDate()).toBe(19)
  })

  it('trata string timestamptz', () => {
    const result = parseDBDate('2025-01-19T14:30:00Z')
    expect(result).toBeInstanceOf(Date)
  })
})

describe('timezone - formatDateForDB', () => {
  it('retorna ISO string para Date', () => {
    const date = new Date('2025-06-15T12:00:00Z')
    const result = formatDateForDB(date)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('retorna ISO string para string YYYY-MM-DD', () => {
    const result = formatDateForDB('2025-06-15')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result).toContain('2025-06-15')
  })
})

describe('timezone - parseTimeToMinutes', () => {
  it('06:00 retorna 0 minutos', () => {
    expect(parseTimeToMinutes('06:00:00')).toBe(0)
  })

  it('07:00 retorna 60 minutos', () => {
    expect(parseTimeToMinutes('07:00:00')).toBe(60)
  })

  it('14:30 retorna 510 minutos', () => {
    expect(parseTimeToMinutes('14:30:00')).toBe(510)
  })

  it('06:30 retorna 30 minutos', () => {
    expect(parseTimeToMinutes('06:30:00')).toBe(30)
  })

  it('22:00 retorna 960 minutos', () => {
    expect(parseTimeToMinutes('22:00:00')).toBe(960)
  })
})

describe('timezone - minutesToTime', () => {
  it('0 retorna 06:00:00', () => {
    expect(minutesToTime(0)).toBe('06:00:00')
  })

  it('60 retorna 07:00:00', () => {
    expect(minutesToTime(60)).toBe('07:00:00')
  })

  it('510 retorna 14:30:00', () => {
    expect(minutesToTime(510)).toBe('14:30:00')
  })

  it('parseTimeToMinutes e minutesToTime são inversos', () => {
    const times = ['06:00:00', '08:30:00', '12:00:00', '14:30:00', '18:00:00']
    times.forEach(time => {
      expect(minutesToTime(parseTimeToMinutes(time))).toBe(time)
    })
  })
})

describe('timezone - formatTimeDisplay', () => {
  it('remove segundos de time string', () => {
    expect(formatTimeDisplay('14:30:00')).toBe('14:30')
  })

  it('funciona com horário de madrugada', () => {
    expect(formatTimeDisplay('06:00:00')).toBe('06:00')
  })

  it('funciona com horário noturno', () => {
    expect(formatTimeDisplay('23:59:00')).toBe('23:59')
  })
})

describe('timezone - calcularHorarioFim', () => {
  it('soma 60 minutos a 10:00', () => {
    expect(calcularHorarioFim('10:00:00', 60)).toBe('11:00')
  })

  it('soma 90 minutos a 14:30', () => {
    expect(calcularHorarioFim('14:30:00', 90)).toBe('16:00')
  })

  it('soma 30 minutos a 09:45', () => {
    expect(calcularHorarioFim('09:45:00', 30)).toBe('10:15')
  })

  it('soma 120 minutos a 22:00', () => {
    expect(calcularHorarioFim('22:00:00', 120)).toBe('24:00')
  })

  it('soma 15 minutos a 08:00', () => {
    expect(calcularHorarioFim('08:00:00', 15)).toBe('08:15')
  })
})
