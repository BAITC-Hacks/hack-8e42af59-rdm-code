import {aiInput,analyze} from '@/lib/ai';
import {z} from 'zod';
export async function POST(request:Request){try{const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==request.headers.get('host'))return Response.json({error:'Недопустимый источник запроса'},{status:403});const input=aiInput.parse(await request.json());return Response.json(await analyze(input));}catch(e){return Response.json({error:e instanceof z.ZodError?'Проверьте описание и ответы.':e instanceof Error?e.message:'Ошибка AI-сервиса'},{status:422})}}

