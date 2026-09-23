import { describe, expect, it } from 'vitest'
import { calculateReadiness, getReadinessLevel } from './readiness'
import type { TaskDraft } from './types'

const full: TaskDraft = { title:'x', industry:'x', organization:'x', problem:'x', context:'x', need:'x', users:'x', data:'x', constraints:'x', outcome:'x', successCriteria:'x', contact:'x', interactionFormat:'x', feedbackProcess:'x', skills:[], confirmed:{ context:true,data:true,outcome:true,success:true,constraints:true,users:true,communication:true } }

describe('calculateReadiness', () => {
  it('считает все семь подтверждённых критериев', () => expect(calculateReadiness(full).score).toBe(100))
  it('не даёт баллы за заглушки', () => expect(calculateReadiness({ ...full, data:'не указано' }).score).toBe(80))
  it('учитывает подтверждение', () => expect(calculateReadiness({ ...full, confirmed:{ ...full.confirmed, success:false } }).score).toBe(85))
  it.each([[0,'Черновик'],[39,'Черновик'],[40,'Рабочая'],[69,'Рабочая'],[70,'Готовая'],[89,'Готовая'],[90,'Приоритетная'],[100,'Приоритетная']])('граница %i → %s', (score, level) => expect(getReadinessLevel(score as number)).toBe(level))
})
