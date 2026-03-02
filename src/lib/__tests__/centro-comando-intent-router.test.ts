import { describe, expect, it } from 'vitest'
import { classifyIntent } from '../../../supabase/functions/centro-comando-ia/intent-router'

describe('centro-comando intent router', () => {
  it('classifica leitura simples de tarefas de hoje', () => {
    const result = classifyIntent('quais tarefas tenho hoje?')
    expect(result.flowType).toBe('read_simple')
    expect(result.operation).toBe('list_tasks_today')
  })

  it('classifica leitura ambigua por pasta', () => {
    const result = classifyIntent('na pasta 203, quais tarefas tem nela?')
    expect(result.flowType).toBe('read_ambiguous')
    expect(result.operation).toBe('list_case_tasks')
    expect(result.processRef).toBeTruthy()
  })

  it('classifica criacao de tarefa', () => {
    const result = classifyIntent('quero criar uma tarefa para amanha')
    expect(result.flowType).toBe('create')
    expect(result.operation).toBe('create_task')
  })

  it('classifica atualizacao/reagendamento', () => {
    const result = classifyIntent('reagendar tarefa X para amanha')
    expect(result.flowType).toBe('update')
    expect(result.operation).toBe('reschedule_task')
  })

  it('classifica exclusao', () => {
    const result = classifyIntent('excluir a tarefa 123')
    expect(result.flowType).toBe('delete')
  })

  it('classifica navegacao', () => {
    const result = classifyIntent('abrir pagina de agenda')
    expect(result.flowType).toBe('navigate')
    expect(result.operation).toBe('navigate')
  })

  it('classifica unsupported quando nao reconhece a intencao', () => {
    const result = classifyIntent('conte uma piada')
    expect(result.flowType).toBe('unsupported')
    expect(result.operation).toBe('unsupported')
  })
})
