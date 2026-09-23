import {cookies} from 'next/headers';
import {SESSION_COOKIE,SESSION_SECONDS,appOrigin} from './auth';
export async function authenticatedResponse(result:{token:string;user:unknown}){
 (await cookies()).set(SESSION_COOKIE,result.token,{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:'),path:'/',maxAge:SESSION_SECONDS});
 return Response.json({user:result.user},{headers:{'Cache-Control':'no-store'}});
}