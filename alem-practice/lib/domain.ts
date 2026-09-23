import { z } from 'zod';
export const weights = {context:10,need:10,data:20,expectedResult:15,successCriteria:15,constraints:10,users:10,contact:5,collaboration:5} as const;
export type Field = keyof typeof weights;
export const fieldKeys = Object.keys(weights) as Field[];
export const labels: Record<Field,string> = {context:'Контекст задачи',need:'Что нужно изменить',data:'Данные и материалы',expectedResult:'Ожидаемый результат',successCriteria:'Критерии успеха',constraints:'Ограничения',users:'Для кого решение',contact:'Контакт',collaboration:'Формат взаимодействия'};
export const hints: Record<Field,string> = {context:'Что происходит сейчас? Опишите ситуацию.',need:'Какую проблему должна решить команда?',data:'Укажите источник, состав или пример доступных данных.',expectedResult:'Что команда должна представить: отчёт, прототип, исследование?',successCriteria:'Как проверить результат? Укажите метрику или проверяемый сценарий.',constraints:'Сроки, технологии, доступы и другие границы.',users:'Кто будет пользоваться результатом?',contact:'Email, телефон или ссылка для связи.',collaboration:'Как часто сможете давать обратную связь?'};
export type Fields = Record<Field,string|null>;
export type Learning = {skills:string[];prerequisites:string[];portfolio:string;difficulty:string};
export const emptyFields = ():Fields => Object.fromEntries(fieldKeys.map(k=>[k,null])) as Fields;
export function substantive(value:unknown) {return typeof value==='string' && value.trim().length>=3 && !/^(не знаю|потом|не указано|нет|n\/a|[-—.]+)$/iu.test(value.trim());}
export function validField(key:Field,value:unknown) {if(!substantive(value))return false;if(key==='contact')return typeof value==='string' && (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)||/https?:\/\/\S+/.test(value)||/\+?[\d ()-]{7,}/.test(value));return true;}
export const readinessLevel=(score:number)=>score<40?'draft':score<70?'working':score<90?'ready':'priority';
export const levelLabels:Record<string,string>={draft:'Черновик',working:'Рабочая',ready:'Готовая',priority:'Приоритетная'};
export function calculateScore(fields:Fields,confirmed:string[]) {return fieldKeys.reduce((s,k)=>s+(confirmed.includes(k)&&validField(k,fields[k])?weights[k]:0),0);}
export function retainConfirmations(before:Fields,after:Fields,confirmed:string[]) {return confirmed.filter((k):k is Field=>fieldKeys.includes(k as Field)&&before[k as Field]===after[k as Field]&&validField(k as Field,after[k as Field]));}
const nullableText=z.string().max(6000).nullable();
export const fieldsSchema=z.object({context:nullableText,need:nullableText,data:nullableText,expectedResult:nullableText,successCriteria:nullableText,constraints:nullableText,users:nullableText,contact:nullableText,collaboration:nullableText}).strict();
export const learningSchema=z.object({skills:z.array(z.string().max(100)).max(10),prerequisites:z.array(z.string().max(100)).max(10),portfolio:z.string().max(1000),difficulty:z.string().max(60)}).strict();
export const taskSchema=z.object({title:z.string().trim().min(3).max(160),topic:z.string().trim().min(2).max(100),fields:fieldsSchema,learning:learningSchema,draftText:z.string().max(10000).optional()}).strict();
export const safeUrl=(v:string)=>/^\/demo\/prototypes\/[a-zA-Z0-9_-]+$/.test(v)||(()=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}})();
export const proposalSchema=z.object({taskId:z.string(),idea:z.string().trim().min(10).max(3000),plan:z.array(z.string().trim().min(3).max(1000)).min(1).max(15),durationDays:z.number().int().min(1).max(365),prototypeUrl:z.string().refine(safeUrl,'Укажите http(s)-ссылку или учебный прототип'),assumptions:z.string().max(1000).optional()}).strict();
export type TaskView={id:string;ownerId:string;ownerName:string;title:string;topic:string;fields:Fields;learning:Learning;confirmedFields:Field[];readinessScore:number;readinessLevel:string;publicationStatus:string;createdAt:string;proposalCount:number};
export type BusinessView={id:string;name:string;industry:string};
export type TeamView={id:string;name:string;interests:string[];skills:string[];technologies:string[];bio:string;memberCount:number;practicePoints:number};
export type ProposalView={id:string;taskId:string;taskTitle:string;ownerId:string;teamId:string;teamName:string;idea:string;plan:string[];durationDays:number;prototypeUrl:string;assumptions:string;status:string;milestone:null|{id:string;status:string;result:string;resultUrl:string}};
export type AppData={tasks:TaskView[];businesses:BusinessView[];teams:TeamView[];proposals:ProposalView[];aiMode:string};
