import type { TaskDraft } from '../domain/types'

export interface AiAnalysis { missingFields: Array<keyof TaskDraft>; questions: Array<{ field:keyof TaskDraft; text:string }>; suggestedValues: Partial<TaskDraft> }
const wait = (ms:number) => new Promise((resolve)=>setTimeout(resolve,ms))
export async function analyzeDraft(draft: TaskDraft): Promise<AiAnalysis> {
  await wait(450)
  const questions: AiAnalysis['questions'] = []
  if (!draft.users.trim()) questions.push({field:'users',text:`Кто будет пользоваться результатом в сфере «${draft.industry || 'вашего бизнеса'}»?`})
  if (!draft.data.trim()) questions.push({field:'data',text:'Какие примеры данных или материалов вы сможете безопасно передать команде?'})
  if (!draft.successCriteria.trim()) questions.push({field:'successCriteria',text:'По каким наблюдаемым признакам вы примете работу?'})
  if (!draft.constraints.trim()) questions.push({field:'constraints',text:'Какие ограничения по данным, устройствам или срокам важно учесть?'})
  if (!draft.outcome.trim()) questions.push({field:'outcome',text:'Что команда должна показать или передать в конце проекта?'})
  return { missingFields:questions.map(q=>q.field), questions:questions.slice(0,5), suggestedValues:{} }
}
