import { describe, expect, it } from 'vitest'
import {
  normalizeConsultivoArea,
  normalizeDateInput,
  normalizePriority,
  normalizeTaskType,
} from '../../../supabase/functions/centro-comando-ia/payload-normalization'

describe('centro-comando payload normalization', () => {
  it('normaliza tipo de tarefa', () => {
    expect(normalizeTaskType('Prazo Processual')).toBe('prazo_processual')
    expect(normalizeTaskType('follow-up')).toBe('follow_up')
    expect(normalizeTaskType('desconhecido')).toBe('outro')
  })

  it('normaliza prioridade', () => {
    expect(normalizePriority('urgente')).toBe('alta')
    expect(normalizePriority('baixa')).toBe('baixa')
    expect(normalizePriority('algo')).toBe('media')
  })

  it('normaliza area consultiva valida e invalida', () => {
    expect(normalizeConsultivoArea('Propriedade Intelectual')).toBe('propriedade_intelectual')
    expect(normalizeConsultivoArea('inexistente')).toBeNull()
  })

  it('normaliza datas relativas e br', () => {
    const hoje = normalizeDateInput('hoje')
    const amanha = normalizeDateInput('amanha')
    const br = normalizeDateInput('12/03/2026')

    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(amanha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(br).toBe('2026-03-12')
  })

  it('retorna null para data invalida', () => {
    expect(normalizeDateInput('ontem de tarde')).toBeNull()
  })
})
