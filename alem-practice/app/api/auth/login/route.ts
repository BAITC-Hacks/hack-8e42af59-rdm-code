import {checkOrigin,login} from '@/lib/auth';
import {apiError,readBody} from '@/lib/http';
import {authenticatedResponse} from '@/lib/auth-response';
export async function POST(request:Request){try{checkOrigin(request);return await authenticatedResponse(await login(await readBody(request)));}catch(e){return apiError(e);}}