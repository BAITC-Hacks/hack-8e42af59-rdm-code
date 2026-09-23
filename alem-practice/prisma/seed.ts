import { PrismaClient } from '@prisma/client';
import seed from '../data/seed.json';
import extraTasks from '../data/extra-tasks.json';
import {calculateScore,type Fields} from '../lib/domain';
const db=new PrismaClient();
async function main(){
  for(const b of seed.businesses) await db.business.upsert({where:{id:b.id},update:{},create:{id:b.id,name:b.name,industry:b.industry,contact:b.contact}});
  for(const d of seed.drafts) await db.draft.upsert({where:{id:d.id},update:{},create:{id:d.id,businessId:d.businessId,text:d.text,industry:d.industry}});
  for(const t of [...seed.tasks,...extraTasks]){
    const {context,need,data,expectedResult,successCriteria,constraints,users,contact,collaboration}=t;
    const fields:Fields={context,need,data,expectedResult,successCriteria,constraints,users,contact,collaboration};
    await db.task.upsert({where:{id:t.id},update:{},create:{id:t.id,ownerId:t.ownerId,draftId:t.draftId,title:t.title,topic:t.topic,fields:JSON.stringify(fields),learning:JSON.stringify(t.learning),confirmedFields:JSON.stringify(t.confirmedFields),readinessScore:calculateScore(fields,t.confirmedFields),publicationStatus:t.publicationStatus,isDemo:true,createdAt:new Date(t.createdAt)}});
  }
  for(const t of seed.teams)await db.team.upsert({where:{id:t.id},update:{},create:{id:t.id,name:t.name,interests:JSON.stringify(t.interests),skills:JSON.stringify(t.skills),technologies:JSON.stringify(t.technologies),memberCount:t.memberCount,bio:t.bio}});
  for(const p of seed.proposals)await db.proposal.upsert({where:{id:p.id},update:{},create:{id:p.id,taskId:p.taskId,teamId:p.teamId,idea:p.idea,plan:JSON.stringify(p.plan),durationDays:p.durationDays,prototypeUrl:p.prototypeUrl,assumptions:p.assumptions,status:p.status,isDemo:true}});
  console.log('Готово: 5 организаций, 25 задач, 5 команд, 5 откликов. Существующие записи сохранены.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
