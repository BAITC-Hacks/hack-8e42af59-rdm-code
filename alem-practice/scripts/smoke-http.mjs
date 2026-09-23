import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
// Invoked by test-http.mjs against its own temporary database only.
assert.equal(process.env.TEST_HTTP_SANDBOX,'true','Use npm run test:http; do not run against the working database.');
const origin=process.env.SMOKE_URL;
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
async function call(path,body,cookie='',method='POST',extra={}){
 const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
}
const guest=await call('/api/data',undefined,'','GET');assert.equal(guest.body.me,null);
const forged=await call('/api/action',{action:'resetDemo',payload:{confirm:'RESET_DEMO'}},'','POST',{'x-demo-role':'business','x-demo-id':'biz-001'});assert.equal(forged.status,401);
const csrf=await call('/api/auth/login',{username:'student',password:'invalid'},'','POST',{Origin:'https://evil.example'});assert.equal(csrf.status,403);
const suffix=String(Date.now()).slice(-6);
async function register(role,index){const password=randomBytes(24).toString('base64url');const result=await call('/api/auth/register',{username:`http_${suffix}_${index}`,password,confirmPassword:password,name:`HTTP test ${role}`,role});assert.equal(result.status,200);assert.match(result.cookie,/HttpOnly/i);assert.match(result.cookie,/SameSite=lax/i);return result.cookie.split(';')[0];}
const business=await register('business',1),student=await register('student',2);
const aiInput={mode:'questions',draft:{id:'draft',text:'Учебное кафе хочет уменьшить списания продуктов.',industry:'Кафе'},answers:[],forceMock:true};
assert.equal((await call('/api/ai',aiInput)).status,401);
assert.equal((await call('/api/ai',aiInput,student)).status,403);
const questions=await call('/api/ai',aiInput,business);assert.equal(questions.status,200);assert.equal(questions.body.mode,'mock');assert(questions.body.questions.length>=3);assert(questions.body.draftId);
const card=await call('/api/ai',{...aiInput,mode:'card',answers:[{id:'a1',questionId:'q-data',text:'Учебная таблица продаж CSV'}]},business);assert.equal(card.status,200);assert.equal(card.body.card.data,'Учебная таблица продаж CSV');assert.equal(card.body.draftId,questions.body.draftId);
const drafts=await call('/api/drafts',undefined,business,'GET');assert.equal(drafts.status,200);assert(Array.isArray(drafts.body));assert(drafts.body.some(d=>d.id===card.body.draftId&&d.answers.length===1));
assert.equal((await call('/api/drafts',undefined,student,'GET')).status,403);
assert.equal((await call('/api/ai',{...aiInput,draft:{...aiInput.draft,text:'x'}},business)).status,400);
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
const edited={...taskPayload,title:'Updated HTTP test task'};
assert.equal((await call('/api/action',{action:'updateTask',payload:{id,task:edited}},business)).status,200);
assert(!(await call('/api/data',undefined,'','GET')).body.tasks.some(t=>t.id===id));
assert.equal((await call('/api/action',{action:'publishTask',payload:{id}},business)).status,400);
await call('/api/action',{action:'confirmTask',payload:{id}},business);await call('/api/action',{action:'publishTask',payload:{id}},business);
await call('/api/auth/logout',undefined,student);assert.equal((await call('/api/action',{action:'createProposal',payload:{}},student)).status,401);
console.log('HTTP checks passed: forged headers, CSRF, cookie, registration, ownership, publication, private proposal, selection, milestone, 50 points once, revoked session.');
