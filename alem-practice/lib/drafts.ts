import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {aiInput} from './ai';
import {transaction} from './transaction';

export async function saveAnalysisDraft(businessId:string,input:z.infer<typeof aiInput>) {
  const sourceKey=createHash('sha256').update(JSON.stringify([businessId,input.draft.text,input.draft.industry])).digest('hex');
  return transaction(async tx=>{
    const existing=await tx.draft.findUnique({where:{sourceKey}});
    if(existing){
      // A questions retry without answers must not erase answers already saved by the card step.
      return input.answers.length?tx.draft.update({where:{id:existing.id},data:{answers:JSON.stringify(input.answers)}}):existing;
    }
    return tx.draft.create({data:{id:crypto.randomUUID(),businessId,text:input.draft.text,industry:input.draft.industry,sourceKey,answers:JSON.stringify(input.answers)}});
  });
}

export async function listDrafts(businessId:string) {
  const drafts=await db.draft.findMany({where:{businessId},orderBy:[{createdAt:'desc'},{id:'asc'}],take:100});
  return drafts.map(d=>({id:d.id,text:d.text,industry:d.industry,answers:JSON.parse(d.answers),createdAt:d.createdAt.toISOString()}));
}
