import {cookies} from 'next/headers';
import {checkOrigin,revokeSession,SESSION_COOKIE} from '@/lib/auth';
import {apiError} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const jar=await cookies();await revokeSession(jar.get(SESSION_COOKIE)?.value);jar.delete(SESSION_COOKIE);return Response.json({ok:true});}catch(e){return apiError(e);}}
