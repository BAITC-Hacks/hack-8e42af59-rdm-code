import {z} from 'zod';
import {emptyFields,fieldKeys,fieldsSchema,hints,substantive,type Field} from '../domain';
import {SYSTEM_PROMPT} from './prompts';
const fieldEnum=z.enum(fieldKeys as [Field,...Field[]]);
export const aiInput=z.object({mode:z.enum(['questions','card']),draft:z.object({id:z.string(),text:z.string().trim().min(10).max(10000),industry:z.string().max(100)}).strict(),answers:z.array(z.object({id:z.string(),questionId:z.string(),text:z.string().max(6000)}).strict()).max(20),forceMock:z.boolean().optional()}).strict();
const questionsSchema=z.object({questions:z.array(z.object({id:z.string(),field:fieldEnum,question:z.string().min(5),reason:z.string()}).strict()).min(3).max(12),missingFields:z.array(fieldEnum)}).strict();
const cardSchema=z.object({card:fieldsSchema.extend({title:z.string().min(3).max(160)}),evidence:z.array(z.object({field:z.enum(['title',...fieldKeys]),sourceIds:z.array(z.string()).min(1)}).strict()),missingFields:z.array(fieldEnum)}).strict();
type Input=z.infer<typeof aiInput>;
export function validateOutput(mode:Input['mode'],raw:unknown,input:Input){
 if(mode==='questions'){const result=questionsSchema.parse(raw);if(new Set(result.questions.map(q=>q.id)).size!==result.questions.length)throw new Error('Повторяющиеся вопросы');return result;}
 const result=cardSchema.parse(raw);const sourceIds=new Set([input.draft.id,...input.answers.map(a=>a.id)]);
 for(const [field,value] of Object.entries(result.card)){if(!value)continue;const evidence=result.evidence.find(e=>e.field===field);if(!evidence||evidence.sourceIds.some(id=>!sourceIds.has(id)))throw new Error('В ответе отсутствуют корректные источники');}
 return result;
}
export function mockAI(input:Input){
 const fields=emptyFields();fields.context=input.draft.text;fields.need=input.draft.text;
 for(const answer of input.answers){const key=answer.questionId.replace(/^q-/,'') as Field;if(fieldKeys.includes(key)&&substantive(answer.text))fields[key]=answer.text.trim();}
 if(input.mode==='questions'){
  const topic=/кафе|продукт|закуп/iu.test(input.draft.text)?'о продажах и списаниях':/учеб|ученик|запис/iu.test(input.draft.text)?'о заявках и учебных процессах':/библиотек|книг/iu.test(input.draft.text)?'об учебных материалах':'по вашей задаче';
  const candidates:Field[]=['data','expectedResult','successCriteria','users','constraints','contact','collaboration'];
  const missing=candidates.filter(k=>!substantive(fields[k]));const selected=[...missing,...candidates.filter(k=>!missing.includes(k))].slice(0,3);
  return {questions:selected.map(k=>({id:`q-${k}`,field:k,question:k==='data'?`Какие данные ${topic} доступны команде?`:hints[k],reason:'Это поможет студентам понять объём и условия практики.'})),missingFields:fieldKeys.filter(k=>!substantive(fields[k]))};
 }
 const title=input.draft.text.split(/[.!?]/)[0].slice(0,120)||'Практическая задача';
 return {card:{...fields,title},evidence:Object.entries({...fields,title}).filter(([,v])=>v).map(([field])=>({field,sourceIds:[input.answers.find(a=>a.questionId===`q-${field}`&&substantive(a.text))?.id||input.draft.id]})),missingFields:fieldKeys.filter(k=>!substantive(fields[k]))};
}
export async function analyze(input:Input){
 if(input.forceMock||process.env.AI_MODE!=='live'||!process.env.AI_API_KEY)return {...validateOutput(input.mode,mockAI(input),input),mode:'mock'};
 const base=process.env.AI_BASE_URL,model=process.env.AI_MODEL;if(!base||!model)throw new Error('Укажите AI_BASE_URL и AI_MODEL или включите demo-режим.');
 let error:unknown;
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(`${base.replace(/\/$/,'')}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${process.env.AI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},temperature:0.2})});
   if(!response.ok){if(attempt===0&&(response.status>=500||response.status===429))continue;throw new Error('AI-сервис недоступен. Продолжите вручную или включите demo-режим.');}
   const body=await response.json();const content=body.choices?.[0]?.message?.content;if(typeof content!=='string'||!content.trim())throw new Error('AI вернул пустой ответ.');
   return {...validateOutput(input.mode,JSON.parse(content),input),mode:'live'};
  }catch(e){error=e;if(e instanceof SyntaxError||e instanceof z.ZodError)break;if(e instanceof Error&&!['TimeoutError','AbortError','TypeError'].includes(e.name))break;}
 }
 throw new Error(error instanceof Error&&!(error instanceof SyntaxError)&&!(error instanceof z.ZodError)?error.message:'AI вернул некорректный JSON. Ответы сохранены; продолжите вручную или в demo-режиме.');
}
