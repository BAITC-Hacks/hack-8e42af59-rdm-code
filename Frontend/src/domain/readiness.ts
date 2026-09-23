import type { ReadinessBreakdown, ReadinessKey, TaskDraft } from './types'

export const readinessCriteria: Array<{ key: ReadinessKey; label: string; weight: number; fields: Array<keyof TaskDraft>; fieldId: string }> = [
  { key: 'context', label: 'Контекст и потребность', weight: 20, fields: ['context', 'need'], fieldId: 'context' },
  { key: 'data', label: 'Данные и материалы', weight: 20, fields: ['data'], fieldId: 'data' },
  { key: 'outcome', label: 'Ожидаемый результат', weight: 15, fields: ['outcome'], fieldId: 'outcome' },
  { key: 'success', label: 'Критерии успеха', weight: 15, fields: ['successCriteria'], fieldId: 'successCriteria' },
  { key: 'constraints', label: 'Ограничения', weight: 10, fields: ['constraints'], fieldId: 'constraints' },
  { key: 'users', label: 'Пользователи', weight: 10, fields: ['users'], fieldId: 'users' },
  { key: 'communication', label: 'Связь с бизнесом', weight: 10, fields: ['contact', 'interactionFormat', 'feedbackProcess'], fieldId: 'contact' },
]

const valid = (value: unknown) => typeof value === 'string' && value.trim() !== '' && value.trim().toLowerCase() !== 'не указано'

export function getReadinessLevel(score: number): ReadinessBreakdown['level'] {
  if (score >= 90) return 'Приоритетная'
  if (score >= 70) return 'Готовая'
  if (score >= 40) return 'Рабочая'
  return 'Черновик'
}

export function calculateReadiness(task: TaskDraft): ReadinessBreakdown {
  const items = readinessCriteria.map((criterion) => {
    const complete = criterion.fields.every((field) => valid(task[field]))
    const confirmed = task.confirmed[criterion.key] === true
    return { ...criterion, complete, confirmed, earned: complete && confirmed ? criterion.weight : 0 }
  })
  const score = items.reduce((sum, item) => sum + item.earned, 0)
  return { score, level: getReadinessLevel(score), items }
}

export function criterionForField(field: keyof TaskDraft): ReadinessKey | undefined {
  return readinessCriteria.find((criterion) => criterion.fields.includes(field))?.key
}
