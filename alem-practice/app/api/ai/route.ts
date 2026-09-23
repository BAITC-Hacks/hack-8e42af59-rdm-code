import {aiInput,analyze} from '@/lib/ai';
import {checkOrigin,consumeRate} from '@/lib/auth';
import {apiError,readBody,requireUser} from '@/lib/http';
import {ActionError} from '@/lib/actions';
export async function POST(request:Request){try{checkOrigin(request);const user=await requireUser();if(user.role!=='business')throw new ActionError('Конструктор доступен аккаунту бизнеса.',403);await consumeRate(`ai:${user.id}`,20,3600);return Response.json(await analyze(aiInput.parse(await readBody(request))));}catch(e){return apiError(e);}}