import {listDrafts} from '@/lib/drafts';
import {apiError,requireUser} from '@/lib/http';
import {ActionError} from '@/lib/actions';

export async function GET(){
  try{
    const user=await requireUser();
    if(user.role!=='business')throw new ActionError('Черновики доступны аккаунту бизнеса.',403);
    return Response.json(await listDrafts(user.actorId),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
