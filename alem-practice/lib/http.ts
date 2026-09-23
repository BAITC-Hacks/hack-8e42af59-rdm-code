import {cookies} from 'next/headers';
import {z} from 'zod';
import {SESSION_COOKIE,sessionUser} from './auth';
import {ActionError} from './actions';
export async function currentUser() { return sessionUser((await cookies()).get(SESSION_COOKIE)?.value); }
export async function requireUser() {const user=await currentUser();if(!user)throw new ActionError('Войдите в свой аккаунт, чтобы продолжить.',401);return user;}
export async function readBody(request:Request) {
  if(Number(request.headers.get('content-length'))>65536) throw new ActionError('Запрос слишком большой.',413);
  const text=await request.text();if(text.length>65536)throw new ActionError('Запрос слишком большой.',413);
  try{return JSON.parse(text);}catch{throw new ActionError('Неверный формат запроса.');}
}
export function apiError(e:unknown) {
  const status=e instanceof ActionError?e.status:e instanceof z.ZodError?400:500;
  // Never log provider payloads, phone numbers, codes, or Prisma input data.
  return Response.json({error:e instanceof ActionError?e.message:e instanceof z.ZodError?'Проверьте обязательные поля и формат данных.':'Не удалось выполнить запрос. Попробуйте ещё раз.'},{status,headers:{'Cache-Control':'no-store'}});
}
