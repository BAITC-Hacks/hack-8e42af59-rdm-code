import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {createConnection} from 'node:net';
// Separate database and server: this scenario never edits the presenter's accounts.
const directory=resolve('tests/.tmp');mkdirSync(directory,{recursive:true});
const file=join(directory,`http-${Date.now()}.db`),port=Number(process.env.SMOKE_PORT||3001),origin=`http://127.0.0.1:${port}`;
assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid SMOKE_PORT');
const occupied=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});socket.setTimeout(600);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});
assert(!occupied,`Port ${port} is already in use. Choose another SMOKE_PORT; no existing server will be tested.`);
const sqlite=new DatabaseSync(file);
for(const name of readdirSync('prisma/migrations').filter(n=>n!=='migration_lock.toml').sort())sqlite.exec(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
sqlite.close();
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,APP_URL:origin,APP_ORIGINS:'',AI_MODE:'mock',OPENAI_API_KEY:'',AI_API_KEY:'',DATABASE_URL:`file:${file.replaceAll('\\','/')}`}});
let serverLog='';server.stdout.on('data',b=>{serverLog+=b;});server.stderr.on('data',b=>{serverLog+=b;});
async function call(path,body,cookie='',method='POST',extra={}){
 const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data=raw;}
 return {status:response.status,body:data,cookie:response.headers.get('set-cookie')};
}
try{
 let ready=false;
 for(let attempt=0;attempt<50;attempt++){
  if(server.exitCode!==null)throw new Error('Test server exited: '+serverLog);
  try{await fetch(origin+'/api/data',{signal:AbortSignal.timeout(1000)});ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}
 }
 assert(ready,'Test server did not start');
 const guest=await call('/api/data',undefined,'','GET');assert.equal(guest.body.me,null);
 assert.equal((await call('/api/auth/request',{phone:'+15555550199'})).status,404);
 assert.equal((await call('/api/auth/verify',{code:'123456'})).status,404);
 const forged=await call('/api/action',{action:'resetDemo',payload:{confirm:'RESET_DEMO'}},'','POST',{'x-demo-role':'business','x-demo-id':'biz-001'});assert.equal(forged.status,401);
 const csrf=await call('/api/auth/login',{username:'student',password:'test'},'','POST',{Origin:'https://evil.example'});assert.equal(csrf.status,403);
 const password=randomBytes(24).toString('base64url');
 async function register(role){const result=await call('/api/auth/register',{name:`HTTP test ${role}`,role,username:`http_${role}`,password,confirmPassword:password});assert.equal(result.status,200,JSON.stringify(result.body));assert.match(result.cookie,/HttpOnly/i);assert.match(result.cookie,/SameSite=lax/i);assert(!('passwordHash' in result.body.user));return result.cookie.split(';')[0];}
 const business=await register('business'),student=await register('student');
 assert.equal((await call('/api/auth/register',{name:'Duplicate',role:'student',username:'HTTP_STUDENT',password,confirmPassword:password})).status,409);
 const second=await call('/api/auth/login',{username:'http_student',password});assert.equal(second.status,200);const device2=second.cookie.split(';')[0];assert.notEqual(student,device2);
 const profile={name:'Saved across devices',bio:'Learning',location:'Алматы',education:'University',skills:['React'],website:'',publicProfile:false,teamName:'Shared practice team',memberCount:2};
 assert.equal((await call('/api/profile',profile,student,'PATCH')).status,200);
 const secondData=await call('/api/data',undefined,device2,'GET');assert.equal(secondData.body.me.name,profile.name);
 const taskPayload={title:'HTTP test — учебная форма заявки',topic:'Веб-разработка',fields:{context:'Учебная проверка пользовательского сценария',need:'Создать удобную форму заявки',data:null,expectedResult:null,successCriteria:null,constraints:null,users:null,contact:null,collaboration:null},learning:{skills:['React'],prerequisites:[],portfolio:'Учебная форма',difficulty:'Начальная'}};
 const task=await call('/api/action',{action:'createTask',payload:taskPayload},business);assert.equal(task.status,200);const id=task.body.id;
 assert(!(await call('/api/data',undefined,student,'GET')).body.tasks.some(t=>t.id===id));
 assert.equal((await call('/api/action',{action:'confirmTask',payload:{id}},student)).status,403);
 assert.equal((await call('/api/action',{action:'confirmTask',payload:{id}},business)).status,200);
 assert.equal((await call('/api/action',{action:'publishTask',payload:{id}},business)).status,200);
 const proposal=await call('/api/action',{action:'createProposal',payload:{taskId:id,idea:'Разработаем форму с проверкой полей и понятным результатом',plan:['Описать поля','Создать прототип'],durationDays:10,prototypeUrl:'/demo/prototypes/sample'}},student);assert.equal(proposal.status,200);
 assert(!(await call('/api/data',undefined,'','GET')).body.proposals.some(p=>p.id===proposal.body.id));
 assert.equal((await call('/api/action',{action:'decideProposal',payload:{id:proposal.body.id,status:'selected'}},business)).status,200);
 const mine=await call('/api/data',undefined,student,'GET'),stage=mine.body.proposals.find(p=>p.id===proposal.body.id).milestone.id;
 assert.equal((await call('/api/action',{action:'submitMilestone',payload:{id:stage,result:'Форма готова; обязательные поля и отправка проверены',resultUrl:'/demo/prototypes/sample'}},student)).status,200);
 assert.equal((await call('/api/action',{action:'confirmMilestone',payload:{id:stage}},business)).status,200);
 assert.equal((await call('/api/action',{action:'confirmMilestone',payload:{id:stage}},business)).status,200);
 const progress=await call('/api/data',undefined,device2,'GET');assert.equal(progress.body.teams.find(t=>t.id===progress.body.me.actorId).practicePoints,50);
 await call('/api/auth/logout',undefined,student);assert.equal((await call('/api/data',undefined,student,'GET')).body.me,null);
 assert((await call('/api/data',undefined,device2,'GET')).body.me);
 assert.equal((await call('/api/auth/credentials',{username:'claimed',password,confirmPassword:password})).status,401);
 await call('/api/auth/logout-all',undefined,device2);assert.equal((await call('/api/data',undefined,device2,'GET')).body.me,null);
 console.log('HTTP checks passed: credentials, removed SMS endpoints, CSRF, cookies, 2 independent devices, shared profile, ownership, publication, private proposal, full milestone flow, 50 points once, logout and logout-all.');
}finally{
 if(server.exitCode===null){const closed=once(server,'close');server.kill();await closed;}
 for(const suffix of ['', '-journal','-wal','-shm'])rmSync(file+suffix,{force:true});
}
