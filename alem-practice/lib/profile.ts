import {z} from 'zod';
import type {User} from '@prisma/client';
import {db} from './db';
import {ownProfile} from './auth';
export const profileSchema=z.object({
 name:z.string().trim().min(2).max(80),bio:z.string().trim().max(1000),location:z.string().trim().max(80),education:z.string().trim().max(120),
 skills:z.array(z.string().trim().min(1).max(40)).max(12),website:z.union([z.literal(''),z.url().refine(v=>/^https?:\/\//.test(v))]),
 publicProfile:z.boolean(),teamName:z.string().trim().min(2).max(80),memberCount:z.number().int().min(1).max(30),interests:z.array(z.string().trim().min(1).max(60)).max(10).default([])
}).strict();
export async function saveProfile(user:User,input:unknown){
 const {teamName,memberCount,interests,...p}=profileSchema.parse(input);
 return db.$transaction(async tx=>{
  const updated=await tx.user.update({where:{id:user.id},data:{...p,skills:JSON.stringify(p.skills)}});
  if(user.role==='student')await tx.team.update({where:{id:user.actorId},data:{name:teamName,memberCount,bio:p.bio,skills:JSON.stringify(p.skills),technologies:JSON.stringify(p.skills),interests:JSON.stringify(interests)}});
  else await tx.business.update({where:{id:user.actorId},data:{name:teamName,industry:p.education||'Не указано'}});
  return ownProfile(updated);
 });
}
