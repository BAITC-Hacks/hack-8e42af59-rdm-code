import {z} from 'zod';
import {act,ActionError} from '@/lib/actions';
export async function POST(request:Request){
 try{const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==request.headers.get('host'))return Response.json({error:'Недопустимый источник запроса'},{status:403});const body=z.object({action:z.string(),payload:z.unknown()}).strict().parse(await request.json());return Response.json(await act(body.action,body.payload,{role:request.headers.get('x-demo-role')||'',id:request.headers.get('x-demo-id')||''}));}
 catch(e){if(e instanceof z.ZodError)return Response.json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});if(e instanceof ActionError)return Response.json({error:e.message},{status:e.status});console.error(e);return Response.json({error:'Не удалось сохранить изменения. Попробуйте ещё раз.'},{status:500});}
}

