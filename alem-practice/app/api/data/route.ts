import {getData} from '@/lib/data';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getData(),{headers:{'Cache-Control':'no-store'}})}
