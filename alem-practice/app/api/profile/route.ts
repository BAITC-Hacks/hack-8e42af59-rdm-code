import {checkOrigin} from '@/lib/auth';
import {apiError,readBody,requireUser} from '@/lib/http';
import {saveProfile} from '@/lib/profile';
export async function PATCH(request:Request){try{checkOrigin(request);return Response.json({user:await saveProfile(await requireUser(),await readBody(request))});}catch(e){return apiError(e);}}