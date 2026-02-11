import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatHoras, formatDescricaoFatura } from '../utils'

describe('utils - cn (className merge)', () => {
  it('merge classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolve conflitos Tailwind (último vence)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('ignora valores falsy', () => {
    expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar')
  })

  it('suporta condicionais', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
  })

  it('retorna string vazia para nenhuma classe', () => {
    expect(cn()).toBe('')
  })
})

describe('utils - formatCurrency', () => {
  it('formata valor inteiro em reais', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('1.000')
    expect(result).toContain('R$')
  })

  it('formata valor com centavos', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234')
    expect(result).toContain('56')
  })

  it('formata zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('R$')
  })

  it('formata valor negativo', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
  })

  it('formata centavos apenas', () => {
    const result = formatCurrency(0.99)
    expect(result).toContain('0,99')
  })
})

describe('utils - formatHoras', () => {
  describe('formato longo (padrão)', () => {
    it('formata 0 como "0min"', () => {
      expect(formatHoras(0)).toBe('0min')
    })

    it('formata null/undefined como "0min"', () => {
      expect(formatHoras(0)).toBe('0min')
    })

    it('formata horas inteiras sem minutos', () => {
      expect(formatHoras(2)).toBe('2h')
    })

    it('formata horas com minutos', () => {
      expect(formatHoras(2.5)).toBe('2h30min')
    })

    it('formata apenas minutos (menos de 1h)', () => {
      expect(formatHoras(0.5)).toBe('30min')
    })

    it('formata 0.25h como 15min', () => {
      expect(formatHoras(0.25)).toBe('15min')
    })

    it('formata valor grande', () => {
      expect(formatHoras(10)).toBe('10h')
    })
  })

  describe('formato curto', () => {
    it('formata 0 como "0h"', () => {
      expect(formatHoras(0, 'curto')).toBe('0h')
    })

    it('formata horas inteiras', () => {
      expect(formatHoras(3, 'curto')).toBe('3h')
    })

    it('formata horas com minutos', () => {
      expect(formatHoras(1.5, 'curto')).toBe('1h30')
    })

    it('formata apenas minutos', () => {
      expect(formatHoras(0.75, 'curto')).toBe('45min')
    })
  })
})

describe('utils - formatDescricaoFatura', () => {
  it('retorna string vazia para null', () => {
    expect(formatDescricaoFatura(null)).toBe('')
  })

  it('retorna string vazia para undefined', () => {
    expect(formatDescricaoFatura(undefined)).toBe('')
  })

  it('retorna string vazia para string vazia', () => {
    expect(formatDescricaoFatura('')).toBe('')
  })

  it('remove prefixo "Tarefa concluída:"', () => {
    const result = formatDescricaoFatura('Tarefa concluída: Revisar contrato')
    expect(result).not.toContain('Tarefa concluída')
    expect(result).toContain('Revisar contrato')
  })

  it('remove prefixo "Atividade:"', () => {
    const result = formatDescricaoFatura('Atividade: Audiência de instrução')
    expect(result).not.toContain('Atividade')
  })

  it('converte CAPS LOCK para sentence case', () => {
    const result = formatDescricaoFatura('REVISÃO DE CONTRATO SOCIAL')
    expect(result).toBe('Revisão de contrato social')
  })

  it('mantém siglas em maiúsculas', () => {
    const result = formatDescricaoFatura('REUNIÃO COM CLIENTE SOBRE CNPJ E CPF')
    expect(result).toContain('CNPJ')
    expect(result).toContain('CPF')
  })

  it('mantém siglas de tribunais', () => {
    const result = formatDescricaoFatura('PETIÇÃO PARA O TRT E TST')
    expect(result).toContain('TRT')
    expect(result).toContain('TST')
  })

  it('não altera texto normal', () => {
    const result = formatDescricaoFatura('Reunião com cliente sobre contrato')
    expect(result).toBe('Reunião com cliente sobre contrato')
  })

  it('capitaliza primeira letra', () => {
    const result = formatDescricaoFatura('reunião com cliente')
    expect(result.charAt(0)).toBe('R')
  })

  it('limpa espaços extras', () => {
    const result = formatDescricaoFatura('Texto   com   espaços   extras')
    expect(result).not.toContain('  ')
  })
})
