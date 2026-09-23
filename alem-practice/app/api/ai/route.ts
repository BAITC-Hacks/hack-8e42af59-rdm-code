import {aiInput,analyze} from '@/lib/ai';
import {checkOrigin,consumeRate} from '@/lib/auth';
import {apiError,readBody,requireUser} from '@/lib/http';
import {ActionError} from '@/lib/actions';
import {saveAnalysisDraft} from '@/lib/drafts';
export async function POST(request:Request){try{checkOrigin(request);const user=await requireUser();if(user.role!=='business')throw new ActionError('Конструктор доступен аккаунту бизнеса.',403);await consumeRate(`ai:${user.id}`,20,3600);await consumeRate('ai:global',100,3600);const input=aiInput.parse(await readBody(request));const draft=await saveAnalysisDraft(user.actorId,input);return Response.json({...await analyze(input),draftId:draft.id},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
