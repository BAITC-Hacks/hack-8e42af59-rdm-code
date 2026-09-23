import {z} from 'zod';
import {emptyFields,fieldKeys,fieldsSchema,hints,substantive,type Field} from '../domain';
import {SYSTEM_PROMPT} from './prompts';
import {aiConfig} from './config';
const fieldEnum=z.enum(fieldKeys as [Field,...Field[]]);
export const aiInput=z.object({mode:z.enum(['questions','card']),draft:z.object({id:z.string().min(1).max(100),text:z.string().trim().min(10).max(10000),industry:z.string().max(100)}).strict(),answers:z.array(z.object({id:z.string().min(1).max(100),questionId:z.enum(fieldKeys.map(k=>`q-${k}`) as [string,...string[]]),text:z.string().max(6000)}).strict()).max(20),forceMock:z.boolean().optional()}).strict().superRefine((v,ctx)=>{
 if(new Set([v.draft.id,...v.answers.map(a=>a.id)]).size!==v.answers.length+1 || new Set(v.answers.map(a=>a.questionId)).size!==v.answers.length)ctx.addIssue({code:'custom',message:'Повторяющиеся идентификаторы ответов'});
 if(v.draft.text.length+v.answers.reduce((sum,a)=>sum+a.text.length,0)>20000)ctx.addIssue({code:'custom',message:'Сократите описание и ответы до 20000 символов'});
});
const questionsSchema=z.object({questions:z.array(z.object({id:z.string().max(100),field:fieldEnum,question:z.string().trim().min(5).max(600),reason:z.string().trim().min(3).max(600)}).strict()).min(3).max(9),missingFields:z.array(fieldEnum).max(9)}).strict();
const cardSchema=z.object({card:fieldsSchema.extend({title:z.string().trim().min(3).max(160)}),evidence:z.array(z.object({field:z.enum(['title',...fieldKeys]),sourceIds:z.array(z.string().min(1).max(100)).min(1).max(21)}).strict()).max(10),missingFields:z.array(fieldEnum).max(9)}).strict();
type Input=z.infer<typeof aiInput>;
export function validateOutput(mode:Input['mode'],raw:unknown,input:Input){
 if(mode==='questions'){const result=questionsSchema.parse(raw);if(new Set(result.questions.map(q=>q.field)).size!==result.questions.length||new Set(result.questions.map(q=>q.question.toLowerCase().replace(/[\s\p{P}]+/gu,''))).size!==result.questions.length||result.questions.some(q=>q.id!==`q-${q.field}`))throw new Error('Повторяющиеся или неверно связанные вопросы');return result;}
 const result=cardSchema.parse(raw);const sourceIds=new Set([input.draft.id,...input.answers.filter(a=>substantive(a.text)).map(a=>a.id)]);
 if(new Set(result.evidence.map(e=>e.field)).size!==result.evidence.length)throw new Error('Повторяющиеся источники поля');
 for(const [field,value] of Object.entries(result.card)){if(!value)continue;const evidence=result.evidence.find(e=>e.field===field);if(!evidence||evidence.sourceIds.some(id=>!sourceIds.has(id)))throw new Error('В ответе отсутствуют корректные источники');}
 return {...result,missingFields:fieldKeys.filter(k=>!substantive(result.card[k]))};
}
export function mockAI(input:Input){
 const fields=emptyFields();fields.context=input.draft.text.slice(0,6000);fields.need=input.draft.text.slice(0,6000);
 for(const answer of input.answers){const key=answer.questionId.replace(/^q-/,'') as Field;if(fieldKeys.includes(key)&&substantive(answer.text))fields[key]=answer.text.trim();}
 if(input.mode==='questions'){
  const topic=/кафе|продукт|закуп/iu.test(input.draft.text)?'о продажах и списаниях':/учеб|ученик|запис/iu.test(input.draft.text)?'о заявках и учебных процессах':/библиотек|книг/iu.test(input.draft.text)?'об учебных материалах':'по вашей задаче';
  const candidates:Field[]=['data','expectedResult','successCriteria','users','constraints','contact','collaboration'];
  const missing=candidates.filter(k=>!substantive(fields[k]));const selected=[...missing,...candidates.filter(k=>!missing.includes(k))].slice(0,3);
  return {questions:selected.map(k=>({id:`q-${k}`,field:k,question:k==='data'?`Какие данные ${topic} доступны команде?`:hints[k],reason:'Это поможет студентам понять объём и условия практики.'})),missingFields:fieldKeys.filter(k=>!substantive(fields[k]))};
 }
 const first=input.draft.text.split(/[.!?]/)[0].trim().slice(0,120);const title=first.length>=3?first:input.draft.text.slice(0,120);
 return {card:{...fields,title},evidence:Object.entries({...fields,title}).filter(([,v])=>v).map(([field])=>({field,sourceIds:[input.answers.find(a=>a.questionId===`q-${field}`&&substantive(a.text))?.id||input.draft.id]})),missingFields:fieldKeys.filter(k=>!substantive(fields[k]))};
}
type Failure='disabled'|'requested_mock'|'not_configured'|'unauthorized'|'rate_limited'|'unavailable'|'timeout'|'network'|'refusal'|'invalid_response';
class ProviderError extends Error {constructor(public reason:Failure,public retry=false){super(reason)}}
export async function analyze(raw:Input,options:{maxAttempts?:1|2}={}){
 const input=aiInput.parse(raw),config=aiConfig();
 const fallback=(reason:Failure)=>({...validateOutput(input.mode,mockAI(input),input),mode:'mock' as const,diagnostics:{provider:'deterministic',fallbackReason:reason,model:null}});
 if(input.forceMock)return fallback('requested_mock');
 if(!config.enabled)return fallback('disabled');
 if(!config.key||!config.base||!config.model)return fallback('not_configured');
 const schema=z.toJSONSchema(input.mode==='questions'?questionsSchema:cardSchema);delete schema.$schema;
 const openai=config.provider==='openai';
 const payload=openai?{model:config.model,store:false,instructions:SYSTEM_PROMPT,input:JSON.stringify(input),max_output_tokens:3500,text:{format:{type:'json_schema',name:`practice_${input.mode}`,strict:true,schema}}}:{model:config.model,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},max_tokens:3500,temperature:0.2};
 let reason:Failure='unavailable';
 const maxAttempts=options.maxAttempts||2;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  try{
   const response=await fetch(`${config.base.replace(/\/$/,'')}/${openai?'responses':'chat/completions'}`,{method:'POST',signal:AbortSignal.timeout(12000),cache:'no-store',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(!response.ok){await response.body?.cancel();throw new ProviderError(response.status===401||response.status===403?'unauthorized':response.status===429?'rate_limited':'unavailable',response.status===429||response.status>=500);}
   // Limit provider response size before parsing; never log raw provider errors or payloads.
   const reader=response.body?.getReader();if(!reader)throw new ProviderError('invalid_response');
   const chunks:Uint8Array[]=[];let bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>128000){await reader.cancel();throw new ProviderError('invalid_response');}chunks.push(value);}}finally{reader.releaseLock();}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   let content:unknown;
   if(openai){
    const parts=z.array(z.object({type:z.string(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()})).parse(body.output);
    if(parts.some(p=>p.content?.some(c=>c.type==='refusal')))throw new ProviderError('refusal');
    if(body.status!=='completed')throw new ProviderError('invalid_response');
    content=parts.flatMap(p=>p.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('');
   }else{
    if(body.choices?.[0]?.message?.refusal)throw new ProviderError('refusal');
    if(body.choices?.[0]?.finish_reason!=='stop')throw new ProviderError('invalid_response');
    content=body.choices?.[0]?.message?.content;
   }
   if(typeof content!=='string'||!content.trim()||content.length>64000)throw new ProviderError('invalid_response');
   return {...validateOutput(input.mode,JSON.parse(content),input),mode:'live' as const,diagnostics:{provider:config.provider,fallbackReason:null,model:config.model}};
  }catch(e){
   reason=e instanceof ProviderError?e.reason:e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'timeout':e instanceof TypeError?'network':'invalid_response';
   const retry=e instanceof ProviderError?e.retry:reason==='timeout'||reason==='network';
   if(!retry||attempt===maxAttempts-1)break;
   await new Promise(resolve=>setTimeout(resolve,250));
  }
 }
 return fallback(reason);
}
