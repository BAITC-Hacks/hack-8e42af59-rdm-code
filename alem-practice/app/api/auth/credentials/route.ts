import {checkOrigin,setCredentials} from '@/lib/auth';
import {apiError,readBody,requireUser} from '@/lib/http';
import {authenticatedResponse} from '@/lib/auth-response';
export async function POST(request:Request){try{checkOrigin(request);return await authenticatedResponse(await setCredentials(await requireUser(),await readBody(request)));}catch(e){return apiError(e);}}