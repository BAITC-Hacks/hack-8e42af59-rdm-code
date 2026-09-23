import {createHash,randomBytes,randomUUID,scrypt,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {Prisma,type User} from '@prisma/client';
import {db} from './db';
import {ActionError} from './actions';

export const SESSION_COOKIE='alem_session';
export const SESSION_SECONDS=60*60*24*7;
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const appOrigin=()=>new URL(process.env.APP_URL||'http://127.0.0.1:3000').origin;
export function checkOrigin(request:Request){
 const origins=[appOrigin(),...(process.env.APP_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean)];
 const primary=new URL(appOrigin());
 if(['localhost','127.0.0.1'].includes(primary.hostname))for(const hostname of ['localhost','127.0.0.1']){const alias=new URL(primary);alias.hostname=hostname;origins.push(alias.origin);}
 if(!origins.includes(request.headers.get('origin')||''))throw new ActionError('Этот адрес не настроен для входа. Откройте основной адрес сайта или добавьте его в APP_ORIGINS.',403);
}
export async function consumeRate(key:string,limit:number,seconds:number){
 const bucket=Math.floor(Date.now()/(seconds*1000)),id=digest(key)+':'+bucket;
 const row=await db.rateBucket.upsert({where:{id},create:{id,expiresAt:new Date((bucket+1)*seconds*1000)},update:{count:{increment:1}}});
 if(row.count>limit)throw new ActionError('Слишком много попыток. Подождите несколько минут и попробуйте снова.',429);
}
const usernameSchema=z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,23}$/,'Логин: 3–24 символа, латинские буквы, цифры и _. Начните с буквы.');
const passwordSchema=z.string().min(12,'Пароль должен содержать минимум 12 символов.').max(128,'Пароль слишком длинный.');
export const credentialsSchema=z.object({username:usernameSchema,password:passwordSchema,confirmPassword:z.string().max(128)}).strict().refine(p=>p.password===p.confirmPassword,{message:'Пароли не совпадают.',path:['confirmPassword']});
export const registerSchema=z.object({name:z.string().trim().min(2).max(80),role:z.enum(['student','business']),username:usernameSchema,password:passwordSchema,confirmPassword:z.string().max(128)}).strict().refine(p=>p.password===p.confirmPassword,{message:'Пароли не совпадают.',path:['confirmPassword']});
export const loginSchema=z.object({username:usernameSchema,password:z.string().min(1).max(128)}).strict();

// OWASP's scrypt option N=2^15, r=8, p=3; each account gets a random 16-byte salt.
function derive(password:string,salt:string){
 return new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return 'scrypt$32768$8$3$'+salt+'$'+(await derive(password,salt)).toString('hex');}
const dummyHash='scrypt$32768$8$3$'+'0'.repeat(32)+'$'+'0'.repeat(128);
export async function checkPassword(password:string,encoded:string){
 const [algorithm,n,r,p,salt,key]=encoded.split('$');
 if(algorithm!=='scrypt'||n!=='32768'||r!=='8'||p!=='3'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(key||''))return false;
 return timingSafeEqual(await derive(password,salt),Buffer.from(key,'hex'));
}
function uniqueError(error:unknown):never{
 if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new ActionError('Этот логин уже занят. Попробуйте другой.',409);
 throw error;
}
async function issueSession(user:User){
 const token=randomBytes(32).toString('base64url');
 await db.session.create({data:{tokenHash:digest(token),userId:user.id,expiresAt:new Date(Date.now()+SESSION_SECONDS*1000)}});
 return {token,user:ownProfile(user)};
}
async function authRate(username:string){
 await consumeRate('password-auth:global',120,900);
 await consumeRate('password-auth:'+username,10,900);
}
export async function register(input:unknown){
 const p=registerSchema.parse(input);await authRate(p.username);
 const passwordHash=await hashPassword(p.password),actorId=randomUUID();
 try{
  const user=await db.$transaction(async tx=>{
   if(p.role==='business')await tx.business.create({data:{id:actorId,name:p.name,industry:'Не указано',contact:'',isDemo:false}});
   else await tx.team.create({data:{id:actorId,name:p.name,interests:'[]',skills:'[]',technologies:'[]',memberCount:1,bio:'',isDemo:false}});
   return tx.user.create({data:{username:p.username,passwordHash,provider:'credentials',role:p.role,name:p.name,actorId}});
  });
  return await issueSession(user);
 }catch(error){uniqueError(error);}
}
export async function login(input:unknown){
 const p=loginSchema.parse(input);await authRate(p.username);
 const user=await db.user.findUnique({where:{username:p.username}});
 const valid=await checkPassword(p.password,user?.passwordHash||dummyHash);
 if(!user||!user.passwordHash||!valid)throw new ActionError('Неверный логин или пароль.',401);
 await db.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
 await db.rateBucket.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}});
 return issueSession(user);
}
// Existing sessions allow owners of legacy profiles to set their own credentials.
// An unauthenticated visitor cannot claim an old account by name or phone.
export async function setCredentials(user:User,input:unknown){
 const p=credentialsSchema.parse(input);await authRate(p.username);
 const passwordHash=await hashPassword(p.password);
 try{
  const updated=await db.$transaction(async tx=>{
   const current=await tx.user.findUniqueOrThrow({where:{id:user.id}});
   if(current.passwordHash)throw new ActionError('Для этого аккаунта логин и пароль уже заданы.',409);
   await tx.session.deleteMany({where:{userId:user.id}});
   return tx.user.update({where:{id:user.id},data:{username:p.username,passwordHash,provider:'credentials'}});
  });
  return issueSession(updated);
 }catch(error){uniqueError(error);}
}
export async function sessionUser(token?:string){
 if(!token||token.length>100)return null;
 const session=await db.session.findUnique({where:{tokenHash:digest(token)},include:{user:true}});
 if(!session||session.expiresAt<=new Date())return null;
 return session.user;
}
export async function revokeSession(token?:string){if(token)await db.session.deleteMany({where:{tokenHash:digest(token)}});}
export async function revokeAllSessions(userId:string){await db.session.deleteMany({where:{userId}});}
export function ownProfile(user:User){
 return {id:user.id,actorId:user.actorId,role:user.role,name:user.name,bio:user.bio,location:user.location,education:user.education,skills:JSON.parse(user.skills) as string[],website:user.website,publicProfile:user.publicProfile,isTest:user.provider==='mock',username:user.username};
}
