import {createHash, randomBytes, randomInt, timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {ActionError} from './actions';
import type {User} from '@prisma/client';

export const SESSION_COOKIE = 'alem_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export const authMode = () => process.env.AUTH_MODE === 'twilio' ? 'twilio' : 'mock';
export const appOrigin = () => new URL(process.env.APP_URL || 'http://127.0.0.1:3000').origin;

export function checkOrigin(request:Request) {
  if(request.headers.get('origin') !== appOrigin()) throw new ActionError('Обновите страницу и повторите запрос с сайта приложения.', 403);
}
export function checkAuthConfiguration() {
  const url = new URL(appOrigin());
  if(authMode()==='twilio' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.protocol!=='https:')
    throw new ActionError('Для публичного входа по SMS настройте HTTPS в APP_URL.',503);
  if(authMode() === 'mock') {
    if(process.env.ALLOW_MOCK_AUTH !== 'true' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname))
      throw new ActionError('Тестовый вход разрешён только локально. Для публичного сайта подключите SMS-сервис.', 503);
  } else if(!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_VERIFY_SERVICE_SID) {
    throw new ActionError('SMS-сервис ещё не настроен. Обратитесь к организатору.',503);
  }
}
export function normalizePhone(input:string) {
  const phone = input.replace(/[\s()-]/g,'');
  if(!/^\+[1-9]\d{7,14}$/.test(phone)) throw new ActionError('Введите номер в международном формате, например +7 701 123 45 67.');
  return phone;
}
// Persistent limits also work across server restarts. A global limit avoids trusting spoofable IP headers.
export async function consumeRate(key:string, limit:number, seconds:number) {
  const now = Date.now(), bucket = Math.floor(now / (seconds * 1000));
  const row = await db.rateBucket.upsert({where:{id:`${key}:${bucket}`},create:{id:`${key}:${bucket}`,expiresAt:new Date((bucket+1)*seconds*1000)},update:{count:{increment:1}}});
  if(row.count > limit) throw new ActionError('Слишком много запросов. Попробуйте позже.',429);
}
async function twilio(resource:string, body:Record<string,string>) {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID!;
  let response:Response;
  try { response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(sid)}/${resource}`, {
    method:'POST', headers:{Authorization:`Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(body), signal:AbortSignal.timeout(15000), cache:'no-store'
  }); } catch { throw new ActionError('SMS-сервис не отвечает. Попробуйте позже.',502); }
  if(!response.ok) throw new ActionError(response.status===429?'Слишком много попыток. Попробуйте позже.':'Не удалось проверить или отправить SMS. Запросите новый код.',response.status===429?429:502);
  return response.json() as Promise<{status:string}>;
}

export async function requestCode(input:string) {
  checkAuthConfiguration();
  const phone=normalizePhone(input), provider=authMode(), phoneKey=hash(`${provider}:${phone}`);
  await consumeRate('sms:global',100,3600);
  await consumeRate(`sms:phone:${phoneKey}`,5,3600);
  const latest=await db.authChallenge.findFirst({where:{phone,provider},orderBy:{createdAt:'desc'}});
  if(latest && Date.now()-latest.createdAt.getTime()<60000) throw new ActionError('Повторный код можно запросить через 60 секунд.',429);
  // Insert before provider call: concurrent sends share the per-minute quota.
  await consumeRate(`sms:cooldown:${phoneKey}`,1,60);
  const code=String(randomInt(100000,1000000));
  const challenge=await db.authChallenge.create({data:{phone,provider,codeHash:hash(code),expiresAt:new Date(Date.now()+5*60000)}});
  if(provider==='twilio') {
    try { await twilio('Verifications',{To:phone,Channel:'sms'}); }
    catch(e) { await db.authChallenge.update({where:{id:challenge.id},data:{consumedAt:new Date()}}); throw e; }
  }
  await db.authChallenge.updateMany({where:{phone,provider,id:{not:challenge.id},consumedAt:null},data:{consumedAt:new Date()}});
  await db.rateBucket.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}});
  await db.authChallenge.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}});
  await db.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
  return {challengeId:challenge.id,expiresAt:challenge.expiresAt.toISOString(),retryAfter:60,mode:provider,...(provider==='mock'?{testCode:code}:{})};
}
export const registrationSchema=z.object({name:z.string().trim().min(2).max(80),role:z.enum(['student','business'])}).strict();
export const verifySchema=z.object({challengeId:z.string().min(1).max(100),code:z.string().regex(/^\d{6}$/),registration:registrationSchema.optional()}).strict();
export async function verifyCode(input:z.infer<typeof verifySchema>) {
  checkAuthConfiguration();
  const p=verifySchema.parse(input), now=new Date();
  const challenge=await db.authChallenge.findUnique({where:{id:p.challengeId}});
  if(!challenge || challenge.provider!==authMode() || challenge.consumedAt || challenge.expiresAt<=now || challenge.attempts>=5) throw new ActionError('Код истёк или уже использован. Запросите новый.',400);
  const claimed=await db.authChallenge.updateMany({where:{id:challenge.id,consumedAt:null,attempts:{lt:5},expiresAt:{gt:now}},data:{attempts:{increment:1}}});
  if(!claimed.count) throw new ActionError('Запросите новый код.',400);
  const approved=challenge.provider==='mock'
    ? timingSafeEqual(Buffer.from(challenge.codeHash),Buffer.from(hash(p.code)))
    : (await twilio('VerificationCheck',{To:challenge.phone,Code:p.code})).status==='approved';
  if(!approved) throw new ActionError('Неверный код. Проверьте шесть цифр и попробуйте снова.');
  const token=randomBytes(32).toString('base64url');
  const user=await db.$transaction(async tx=>{
    const consumed=await tx.authChallenge.updateMany({where:{id:challenge.id,consumedAt:null,expiresAt:{gt:new Date()}},data:{consumedAt:new Date()}});
    if(!consumed.count) throw new ActionError('Код уже использован. Запросите новый.');
    let user=await tx.user.findUnique({where:{phone_provider:{phone:challenge.phone,provider:challenge.provider}}});
    if(!user) {
      if(!p.registration) throw new ActionError('Аккаунт не найден. Выберите «Регистрация» и получите новый код.');
      const {name,role}=p.registration, actorId=crypto.randomUUID();
      if(role==='business') await tx.business.create({data:{id:actorId,name,industry:'Не указано',contact:'',isDemo:false}});
      else await tx.team.create({data:{id:actorId,name,interests:'[]',skills:'[]',technologies:'[]',memberCount:1,bio:'',isDemo:false}});
      user=await tx.user.create({data:{phone:challenge.phone,provider:challenge.provider,role,actorId,name}});
    }
    await tx.session.create({data:{tokenHash:hash(token),userId:user.id,expiresAt:new Date(Date.now()+SESSION_SECONDS*1000)}});
    return user;
  });
  return {token,user:ownProfile(user)};
}
export async function sessionUser(token?:string) {
  if(!token || token.length>100) return null;
  const session=await db.session.findUnique({where:{tokenHash:hash(token)},include:{user:true}});
  if(!session || session.expiresAt<=new Date() || session.user.provider!==authMode()) return null;
  try { checkAuthConfiguration(); } catch { return null; }
  return session.user;
}
export async function revokeSession(token?:string) { if(token) await db.session.deleteMany({where:{tokenHash:hash(token)}}); }
export function ownProfile(user:User) {
  return {id:user.id,actorId:user.actorId,role:user.role,name:user.name,bio:user.bio,location:user.location,education:user.education,skills:JSON.parse(user.skills) as string[],website:user.website,publicProfile:user.publicProfile,isTest:user.provider==='mock',phone:`${user.phone.slice(0,2)} ••• ••• ${user.phone.slice(-4)}`};
}
