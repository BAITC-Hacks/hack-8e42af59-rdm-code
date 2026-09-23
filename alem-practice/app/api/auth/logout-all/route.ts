import {cookies} from 'next/headers';
import {checkOrigin,revokeAllSessions,SESSION_COOKIE} from '@/lib/auth';
import {apiError,requireUser} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);await revokeAllSessions((await requireUser()).id);(await cookies()).delete(SESSION_COOKIE);return Response.json({ok:true});}catch(e){return apiError(e);}}