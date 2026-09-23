import {getData} from '@/lib/data';
import {currentUser,apiError} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await getData(await currentUser()),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}