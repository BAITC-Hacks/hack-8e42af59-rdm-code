import {z} from 'zod';
import {db} from './db';
import {taskSchema,proposalSchema,fieldKeys,calculateScore,validField,retainConfirmations,safeUrl,type Fields} from './domain';

export class ActionError extends Error {constructor(message:string,public status=400){super(message)}}
export type Actor={role:string;id:string};
export async function act(action:string,payload:unknown,actor:Actor){
 const business=async()=>{if(actor.role!=='business'||!await db.business.findUnique({where:{id:actor.id}}))throw new ActionError('Выберите профиль бизнеса',403);};
 const team=async()=>{if(actor.role!=='student'||!await db.team.findUnique({where:{id:actor.id}}))throw new ActionError('Выберите профиль команды',403);};
 const ownTask=async(id:string)=>{await business();const t=await db.task.findUnique({where:{id}});if(!t)throw new ActionError('Задача не найдена',404);if(t.ownerId!==actor.id)throw new ActionError('Это задача другой организации',403);return t;};
 if(action==='createTask'){
  await business();const p=taskSchema.parse(payload);
  return db.$transaction(async tx=>{const draft=await tx.draft.create({data:{id:crypto.randomUUID(),businessId:actor.id,text:p.draftText||p.fields.context||p.title,industry:p.topic}});return tx.task.create({data:{ownerId:actor.id,draftId:draft.id,title:p.title,topic:p.topic,fields:JSON.stringify(p.fields),learning:JSON.stringify(p.learning)}})});
 }
 if(action==='updateTask'){
  const p=z.object({id:z.string(),task:taskSchema}).strict().parse(payload);const t=await ownTask(p.id);
  const confirmed=retainConfirmations(JSON.parse(t.fields),p.task.fields,JSON.parse(t.confirmedFields));
  return db.task.update({where:{id:p.id},data:{title:p.task.title,topic:p.task.topic,fields:JSON.stringify(p.task.fields),learning:JSON.stringify(p.task.learning),confirmedFields:JSON.stringify(confirmed),readinessScore:calculateScore(p.task.fields,confirmed)}});
 }
 if(action==='confirmTask'||action==='publishTask'){
  const {id}=z.object({id:z.string()}).strict().parse(payload);const t=await ownTask(id);const fields:Fields=JSON.parse(t.fields);
  if(action==='confirmTask'){const confirmed=fieldKeys.filter(k=>validField(k,fields[k]));return db.task.update({where:{id},data:{confirmedFields:JSON.stringify(confirmed),readinessScore:calculateScore(fields,confirmed)}})}
  if(!validField('need',fields.need)||!(JSON.parse(t.confirmedFields) as string[]).includes('need'))throw new ActionError('Заполните и подтвердите потребность перед публикацией');
  return db.task.update({where:{id},data:{publicationStatus:'published'}});
 }
 if(action==='createProposal'){
  await team();const p=proposalSchema.parse(payload);const task=await db.task.findUnique({where:{id:p.taskId}});
  if(!task||task.publicationStatus!=='published')throw new ActionError('Задача ещё не опубликована');
  return db.proposal.create({data:{...p,plan:JSON.stringify(p.plan),teamId:actor.id}});
 }
 if(action==='decideProposal'){
  const p=z.object({id:z.string(),status:z.enum(['selected','rejected','pending'])}).strict().parse(payload);
  const proposal=await db.proposal.findUnique({where:{id:p.id},include:{milestone:true}});if(!proposal)throw new ActionError('Отклик не найден',404);await ownTask(proposal.taskId);
  if(proposal.milestone?.status==='confirmed'&&p.status!=='selected')throw new ActionError('Работа уже подтверждена; решение нельзя отменить');
  return db.$transaction(async tx=>{const result=await tx.proposal.update({where:{id:p.id},data:{status:p.status}});if(p.status==='selected')await tx.milestone.upsert({where:{proposalId:p.id},update:{},create:{proposalId:p.id}});return result});
 }
 if(action==='submitMilestone'){
  await team();const p=z.object({id:z.string(),result:z.string().trim().min(10).max(4000),resultUrl:z.string().refine(safeUrl)}).strict().parse(payload);
  const m=await db.milestone.findUnique({where:{id:p.id},include:{proposal:true}});if(!m||m.proposal.teamId!==actor.id||m.proposal.status!=='selected')throw new ActionError('Этап недоступен этой команде',403);if(m.status==='confirmed')throw new ActionError('Этап уже подтверждён');
  return db.milestone.update({where:{id:p.id},data:{result:p.result,resultUrl:p.resultUrl,status:'submitted'}});
 }
 if(action==='confirmMilestone'){
  const {id}=z.object({id:z.string()}).strict().parse(payload);const m=await db.milestone.findUnique({where:{id},include:{proposal:true}});if(!m)throw new ActionError('Этап не найден',404);await ownTask(m.proposal.taskId);if(m.proposal.status!=='selected')throw new ActionError('Команда не выбрана');
  return db.$transaction(async tx=>{const current=await tx.milestone.findUniqueOrThrow({where:{id},include:{award:true}});if(current.award)return {alreadyConfirmed:true,points:current.award.points};if(current.status!=='submitted')throw new ActionError('Команда ещё не отправила результат');await tx.award.create({data:{milestoneId:id,teamId:m.proposal.teamId,points:50}});await tx.team.update({where:{id:m.proposal.teamId},data:{practicePoints:{increment:50}}});await tx.milestone.update({where:{id},data:{status:'confirmed',confirmedAt:new Date()}});return {points:50};});
 }
 throw new ActionError('Неизвестное действие',404);
}
