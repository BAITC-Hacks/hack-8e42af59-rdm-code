import {db} from './db';
import {readinessLevel,type AppData} from './domain';
export async function getData():Promise<AppData>{
  const [tasks,businesses,teams,proposals]=await Promise.all([
    db.task.findMany({include:{owner:true,_count:{select:{proposals:true}}},orderBy:[{readinessScore:'desc'},{createdAt:'desc'}]}),
    db.business.findMany({orderBy:{id:'asc'}}),db.team.findMany({orderBy:{id:'asc'}}),
    db.proposal.findMany({include:{task:true,team:true,milestone:true},orderBy:{createdAt:'desc'}})
  ]);
  return {tasks:tasks.map(t=>({id:t.id,ownerId:t.ownerId,ownerName:t.owner.name,title:t.title,topic:t.topic,fields:JSON.parse(t.fields),learning:JSON.parse(t.learning),confirmedFields:JSON.parse(t.confirmedFields),readinessScore:t.readinessScore,readinessLevel:readinessLevel(t.readinessScore),publicationStatus:t.publicationStatus,createdAt:t.createdAt.toISOString(),proposalCount:t._count.proposals})),businesses:businesses.map(b=>({id:b.id,name:b.name,industry:b.industry})),teams:teams.map(t=>({id:t.id,name:t.name,interests:JSON.parse(t.interests),skills:JSON.parse(t.skills),technologies:JSON.parse(t.technologies),bio:t.bio,memberCount:t.memberCount,practicePoints:t.practicePoints})),proposals:proposals.map(p=>({id:p.id,taskId:p.taskId,taskTitle:p.task.title,ownerId:p.task.ownerId,teamId:p.teamId,teamName:p.team.name,idea:p.idea,plan:JSON.parse(p.plan),durationDays:p.durationDays,prototypeUrl:p.prototypeUrl,assumptions:p.assumptions,status:p.status,milestone:p.milestone?{id:p.milestone.id,status:p.milestone.status,result:p.milestone.result,resultUrl:p.milestone.resultUrl}:null})),aiMode:process.env.AI_MODE==='live'&&Boolean(process.env.AI_API_KEY)?'live':'mock'};
}

