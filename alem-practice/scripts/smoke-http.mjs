import assert from 'node:assert/strict';
// Run only against a local mock server. Creates two clearly named test accounts and one test task.
const origin=process.env.SMOKE_URL||'http://127.0.0.1:3000';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
async function call(path,body,cookie='',method='POST',extra={}){
 const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
}
const guest=await call('/api/data',undefined,'','GET');assert.equal(guest.body.authMode,'mock','This script must not send real SMS');assert.equal(guest.body.me,null);
const forged=await call('/api/action',{action:'resetDemo',payload:{confirm:'RESET_DEMO'}},'','POST',{'x-demo-role':'business','x-demo-id':'biz-001'});assert.equal(forged.status,401);
const csrf=await call('/api/auth/request',{phone:'+15555550199'},'','POST',{Origin:'https://evil.example'});assert.equal(csrf.status,403);
const suffix=String(Date.now()).slice(-6);
async function register(role,index){const sent=await call('/api/auth/request',{phone:`+1555${suffix}${index}`});assert.equal(sent.status,200);assert(sent.body.testCode);const result=await call('/api/auth/verify',{challengeId:sent.body.challengeId,code:sent.body.testCode,registration:{name:`HTTP test ${role}`,role}});assert.equal(result.status,200);assert.match(result.cookie,/HttpOnly/i);assert.match(result.cookie,/SameSite=lax/i);return result.cookie.split(';')[0];}
const business=await register('business',1),student=await register('student',2);
const taskPayload={title:'HTTP test — учебная форма заявки',topic:'Веб-разработка',fields:{context:'Учебная проверка пользовательского сценария',need:'Создать удобную форму заявки',data:null,expectedResult:null,successCriteria:null,constraints:null,users:null,contact:null,collaboration:null},learning:{skills:['React'],prerequisites:[],portfolio:'Учебная форма',difficulty:'Начальная'}};
const task=await call('/api/action',{action:'createTask',payload:taskPayload},business);assert.equal(task.status,200);const id=task.body.id;
assert(!(await call('/api/data',undefined,student,'GET')).body.tasks.some(t=>t.id===id));
assert.equal((await call('/api/action',{action:'confirmTask',payload:{id}},student)).status,403);
assert.equal((await call('/api/action',{action:'confirmTask',payload:{id}},business)).status,200);
assert.equal((await call('/api/action',{action:'publishTask',payload:{id}},business)).status,200);
const proposal=await call('/api/action',{action:'createProposal',payload:{taskId:id,idea:'Разработаем форму с проверкой полей и понятным результатом',plan:['Описать поля','Создать прототип'],durationDays:10,prototypeUrl:'/demo/prototypes/sample'}},student);assert.equal(proposal.status,200);
assert(!(await call('/api/data',undefined,'','GET')).body.proposals.some(p=>p.id===proposal.body.id));
await call('/api/action',{action:'decideProposal',payload:{id:proposal.body.id,status:'selected'}},business);
const mine=await call('/api/data',undefined,student,'GET'),stage=mine.body.proposals.find(p=>p.id===proposal.body.id).milestone.id;
assert.equal((await call('/api/action',{action:'submitMilestone',payload:{id:stage,result:'Форма готова; обязательные поля и отправка проверены',resultUrl:'/demo/prototypes/sample'}},student)).status,200);
await call('/api/action',{action:'confirmMilestone',payload:{id:stage}},business);
await call('/api/action',{action:'confirmMilestone',payload:{id:stage}},business);
const progress=await call('/api/data',undefined,student,'GET');assert.equal(progress.body.teams.find(t=>t.id===progress.body.me.actorId).practicePoints,50);
await call('/api/auth/logout',undefined,student);assert.equal((await call('/api/action',{action:'createProposal',payload:{}},student)).status,401);
console.log('HTTP checks passed: forged headers, CSRF, cookie, registration, ownership, publication, private proposal, selection, milestone, 50 points once, revoked session.');
