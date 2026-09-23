import type {User} from '@prisma/client';
import {db} from './db';
import {readinessLevel,readinessDetails,calculateScore,type AppData} from './domain';
import {aiConfigurationStatus} from './ai/config';
import {ownProfile} from './auth';
export async function getData(user:User|null=null):Promise<AppData>{
 const actorId=user?.actorId||'', isBusiness=user?.role==='business';
 const [tasks,proposals,profiles]=await Promise.all([
  db.task.findMany({where:{OR:[{publicationStatus:'published'},...(isBusiness?[{ownerId:actorId}]:[])]},include:{owner:true,_count:{select:{proposals:true}}},orderBy:[{readinessScore:'desc'},{createdAt:'desc'},{id:'asc'}]}),
  db.proposal.findMany({where:user?(isBusiness?{task:{ownerId:actorId}}:{teamId:actorId}):{isDemo:true},include:{task:true,team:true,milestone:true},orderBy:{createdAt:'desc'}}),
  db.user.findMany({where:{publicProfile:true,provider:process.env.SHOW_LEGACY_PROFILES==='true'?undefined:'credentials'},orderBy:{createdAt:'desc'}})
 ]);
 const teamIds=[actorId,...profiles.map(p=>p.actorId),...proposals.map(p=>p.teamId)];
 const [businesses,teams]=await Promise.all([
  db.business.findMany({where:{OR:[{id:actorId},{tasks:{some:{publicationStatus:'published'}}}]}}),
  db.team.findMany({where:{OR:[{isDemo:true},{id:{in:teamIds}}]}})
 ]);
 return {
  tasks:tasks.map(t=>({id:t.id,isDemo:t.isDemo||t.owner.isDemo,ownerId:t.ownerId,ownerName:t.owner.name,title:t.title,topic:t.topic,fields:JSON.parse(t.fields),learning:JSON.parse(t.learning),confirmedFields:JSON.parse(t.confirmedFields),readinessScore:calculateScore(JSON.parse(t.fields),JSON.parse(t.confirmedFields)),readinessLevel:readinessLevel(calculateScore(JSON.parse(t.fields),JSON.parse(t.confirmedFields))),readiness:readinessDetails(JSON.parse(t.fields),JSON.parse(t.confirmedFields)),publicationStatus:t.publicationStatus,createdAt:t.createdAt.toISOString(),proposalCount:t._count.proposals})).sort((a,b)=>b.readinessScore-a.readinessScore||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)),
  businesses:businesses.map(b=>({id:b.id,name:b.name,industry:b.industry})),
  teams:teams.map(t=>({id:t.id,isDemo:t.isDemo,name:t.name,interests:JSON.parse(t.interests),skills:JSON.parse(t.skills),technologies:JSON.parse(t.technologies),bio:t.bio,memberCount:t.memberCount,practicePoints:t.practicePoints})),
  proposals:proposals.map(p=>({id:p.id,taskId:p.taskId,taskTitle:p.task.title,ownerId:p.task.ownerId,teamId:p.teamId,teamName:p.team.name,idea:p.idea,plan:JSON.parse(p.plan),durationDays:p.durationDays,prototypeUrl:p.prototypeUrl,assumptions:p.assumptions,status:p.status,milestone:p.milestone?{id:p.milestone.id,status:p.milestone.status,result:p.milestone.result,resultUrl:p.milestone.resultUrl}:null})),
  profiles:profiles.map(p=>({id:p.id,actorId:p.actorId,name:p.name,role:p.role,bio:p.bio,location:p.location,education:p.education,skills:JSON.parse(p.skills),website:p.website,isTest:p.provider==='mock'})),
  me:user?ownProfile(user):null,aiMode:aiConfigurationStatus().configured?'live':'mock',aiConfiguration:aiConfigurationStatus()
 };
}
