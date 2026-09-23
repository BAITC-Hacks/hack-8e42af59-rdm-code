import {z} from 'zod';
import {act} from '@/lib/actions';
import {checkOrigin,consumeRate} from '@/lib/auth';
import {apiError,readBody,requireUser} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const user=await requireUser();await consumeRate(`write:${user.id}`,60,60);const body=z.object({action:z.string(),payload:z.unknown()}).strict().parse(await readBody(request));return Response.json(await act(body.action,body.payload,{role:user.role,id:user.actorId}));}catch(e){return apiError(e);}}
