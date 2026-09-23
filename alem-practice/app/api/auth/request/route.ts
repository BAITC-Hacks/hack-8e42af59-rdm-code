import {z} from 'zod';
import {checkOrigin,requestCode} from '@/lib/auth';
import {apiError,readBody} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const {phone}=z.object({phone:z.string().max(40)}).strict().parse(await readBody(request));return Response.json(await requestCode(phone),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
