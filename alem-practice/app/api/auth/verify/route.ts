import {cookies} from 'next/headers';
import {checkOrigin,verifyCode,verifySchema,SESSION_COOKIE,SESSION_SECONDS,appOrigin} from '@/lib/auth';
import {apiError,readBody} from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);const {token,user}=await verifyCode(verifySchema.parse(await readBody(request)));(await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:'),path:'/',maxAge:SESSION_SECONDS});return Response.json({user},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
