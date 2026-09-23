import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {requestCode,verifyCode,sessionUser,revokeSession,checkOrigin,checkAuthConfiguration,normalizePhone,consumeRate} from '../lib/auth';
import {getData} from '../lib/data';
import {saveProfile} from '../lib/profile';
import {act} from '../lib/actions';
import {emptyFields} from '../lib/domain';

after(()=>db.$disconnect());
test('phone normalization, explicit local mock opt-in, and exact origin enforcement',()=>{
 assert.equal(normalizePhone('+7 (701) 123-45-67'),'+77011234567');
 assert.throws(()=>normalizePhone('77011234567'));
 assert.throws(()=>checkOrigin(new Request('http://127.0.0.1:3000/api/action',{headers:{origin:'https://evil.example'}})));
 assert.throws(()=>checkOrigin(new Request('http://127.0.0.1:3000/api/action')));
 checkOrigin(new Request('http://127.0.0.1:3000/api/action',{headers:{origin:'http://127.0.0.1:3000'}}));
 process.env.APP_URL='https://practice.example.org';assert.throws(checkAuthConfiguration);process.env.APP_URL='http://127.0.0.1:3000';
 process.env.ALLOW_MOCK_AUTH='false';assert.throws(checkAuthConfiguration);process.env.ALLOW_MOCK_AUTH='true';
});
test('one-time code, persistent session, profile privacy and logout',async()=>{
 const c=await requestCode('+15555550101');assert.match(c.testCode!,/^\d{6}$/);
 await assert.rejects(()=>verifyCode({challengeId:c.challengeId,code:'000000',registration:{name:'Тестовый студент',role:'student'}}));
 const session=await verifyCode({challengeId:c.challengeId,code:c.testCode!,registration:{name:'Тестовый студент',role:'student'}});
 const user=await sessionUser(session.token);assert(user);assert.equal(user.name,'Тестовый студент');
 assert(!JSON.stringify(session.user).includes('+15555550101'));
 await assert.rejects(()=>verifyCode({challengeId:c.challengeId,code:c.testCode!}));
 assert.equal(await sessionUser('forged-token'),null);
 let publicData=await getData();assert(!publicData.profiles.some(p=>p.id===user.id));assert(!publicData.teams.some(t=>t.id===user.actorId));
 const profile={name:'Новая версия имени',bio:'Изучаю проекты',location:'Алматы',education:'Университет',skills:['React'],website:'https://example.org',publicProfile:true,teamName:'Test Makers',memberCount:2};
 await saveProfile(user,profile);publicData=await getData();assert(publicData.profiles.some(p=>p.name===profile.name));assert(!JSON.stringify(publicData).includes(user.phone));
 await assert.rejects(()=>saveProfile(user,{...profile,website:'javascript:alert(1)'}));
 await saveProfile(user,{...profile,publicProfile:false});assert(!(await getData()).profiles.some(p=>p.id===user.id));
 process.env.AUTH_MODE='twilio';assert.equal(await sessionUser(session.token),null);process.env.AUTH_MODE='mock';
 await revokeSession(session.token);assert.equal(await sessionUser(session.token),null);
});
test('expired codes, five-attempt lockout, resend and persistent quota',async()=>{
 const c=await requestCode('+15555550102');
 await assert.rejects(()=>requestCode('+15555550102'));
 for(let i=0;i<5;i++)await assert.rejects(()=>verifyCode({challengeId:c.challengeId,code:'000000'}));
 await assert.rejects(()=>verifyCode({challengeId:c.challengeId,code:c.testCode!,registration:{name:'Locked',role:'student'}}));
 const expired=await requestCode('+15555550103');await db.authChallenge.update({where:{id:expired.challengeId},data:{expiresAt:new Date(0)}});
 await assert.rejects(()=>verifyCode({challengeId:expired.challengeId,code:expired.testCode!}));
 await consumeRate('unit-quota',1,3600);await assert.rejects(()=>consumeRate('unit-quota',1,3600));
});
test('real account ownership: private drafts and proposals are never public',async()=>{
 const c=await requestCode('+15555550104');const session=await verifyCode({challengeId:c.challengeId,code:c.testCode!,registration:{name:'Тестовый бизнес',role:'business'}});
 const owner=await sessionUser(session.token);assert(owner);
 const c2=await requestCode('+15555550105');const session2=await verifyCode({challengeId:c2.challengeId,code:c2.testCode!,registration:{name:'Тестовая команда',role:'student'}});
 const student=await sessionUser(session2.token);assert(student);
 const actor={role:owner.role,id:owner.actorId};
 const task=await act('createTask',{title:'Private auth test task',topic:'Образование',fields:{...emptyFields(),need:'Создать тестовую форму'},learning:{skills:[],prerequisites:[],portfolio:'Проект',difficulty:'Начальная'}},actor);assert('id'in task);
 assert(!(await getData()).tasks.some(t=>t.id===task.id));assert((await getData(owner)).tasks.some(t=>t.id===task.id));
 await assert.rejects(()=>act('confirmTask',{id:task.id},{role:student.role,id:student.actorId}));
 await act('confirmTask',{id:task.id},actor);await act('publishTask',{id:task.id},actor);
 const proposal=await act('createProposal',{taskId:task.id,idea:'Конфиденциальная идея команды',plan:['Проверить форму'],durationDays:7,prototypeUrl:'https://example.org'},{role:student.role,id:student.actorId});assert('id'in proposal);
 assert(!(await getData()).proposals.some(p=>p.id===proposal.id));assert((await getData(owner)).proposals.some(p=>p.id===proposal.id));assert((await getData(student)).proposals.some(p=>p.id===proposal.id));
 await assert.rejects(()=>act('resetDemo',{confirm:'RESET_DEMO'},actor));
});
test('Twilio adapter checks provider approval without exposing a test code',async()=>{
 const originalFetch=globalThis.fetch;
 process.env.AUTH_MODE='twilio';process.env.TWILIO_ACCOUNT_SID='AC_test';process.env.TWILIO_AUTH_TOKEN='test-token';process.env.TWILIO_VERIFY_SERVICE_SID='VA_test';
 const requests:{url:string;body:string}[]=[];
 globalThis.fetch=(async (url,init)=>{requests.push({url:String(url),body:String(init?.body)});return Response.json({status:String(url).endsWith('VerificationCheck')?'approved':'pending'});}) as typeof fetch;
 try{
  const c=await requestCode('+15555550106');assert.equal(c.testCode,undefined);
  const session=await verifyCode({challengeId:c.challengeId,code:'123456',registration:{name:'Provider test',role:'student'}});
  assert.equal(session.user.isTest,false);assert.equal(requests.length,2);assert(requests[0].url.endsWith('/Verifications'));assert(requests[1].body.includes('Code=123456'));
 }finally{globalThis.fetch=originalFetch;process.env.AUTH_MODE='mock';delete process.env.TWILIO_ACCOUNT_SID;delete process.env.TWILIO_AUTH_TOKEN;delete process.env.TWILIO_VERIFY_SERVICE_SID;}
});
