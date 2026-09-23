import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze,aiInput,mockAI,validateOutput} from '../lib/ai';

const input=aiInput.parse({mode:'questions',draft:{id:'draft',text:'Кафе хочет сократить списания продуктов.',industry:'Кафе'},answers:[]});
const envKeys=['AI_MODE','AI_PROVIDER','OPENAI_API_KEY','OPENAI_MODEL','AI_API_KEY','AI_MODEL','AI_BASE_URL'] as const;
async function withProvider(run:()=>Promise<void>){
 const previous=Object.fromEntries(envKeys.map(k=>[k,process.env[k]])),original=globalThis.fetch;
 Object.assign(process.env,{AI_MODE:'live',AI_PROVIDER:'openai',OPENAI_API_KEY:'test-secret-never-return',OPENAI_MODEL:'gpt-4.1-mini'});
 try{await run();}finally{globalThis.fetch=original;for(const key of envKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
}
const response=(value:unknown)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('OpenAI Responses request uses strict schema, limited tokens, server credentials, and preserves old output fields',async()=>withProvider(async()=>{
 let calls=0;
 globalThis.fetch=async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');
  const body=JSON.parse(String(init?.body));assert.equal(body.text.format.strict,true);assert.equal(body.store,false);assert.equal(body.max_output_tokens,3500);assert.equal(body.text.format.schema.additionalProperties,false);
  assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-secret-never-return');assert(init?.signal);
  return response(mockAI(input));
 };
 const result=await analyze(input);assert.equal(calls,1);assert.equal(result.mode,'live');assert.equal(result.diagnostics.provider,'openai');assert('questions'in result);assert.equal(result.questions.length,3);assert(!JSON.stringify(result).includes('test-secret'));
 const card=await analyze({...input,mode:'card'}); // Stub returns questions: invalid output must fall back.
 assert.equal(card.mode,'mock');assert.equal(card.diagnostics.fallbackReason,'invalid_response');
}));

test('401, 429, refusal, invalid JSON, malformed/oversized output, timeout and network failure produce deterministic fallback',async()=>withProvider(async()=>{
 const cases:{reason:string;calls:number;fetch:typeof fetch}[]=[
  {reason:'unauthorized',calls:1,fetch:async()=>new Response('secret provider message',{status:401})},
  {reason:'rate_limited',calls:2,fetch:async()=>new Response('',{status:429})},
  {reason:'unavailable',calls:2,fetch:async()=>new Response('',{status:503})},
  {reason:'refusal',calls:1,fetch:async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]})},
  {reason:'invalid_response',calls:1,fetch:async()=>new Response('{broken')},
  {reason:'invalid_response',calls:1,fetch:async()=>response({})},
  {reason:'invalid_response',calls:1,fetch:async()=>new Response('x'.repeat(128001))},
  {reason:'timeout',calls:2,fetch:async()=>{throw new DOMException('secret','TimeoutError');}},
  {reason:'network',calls:2,fetch:async()=>{throw new TypeError('secret');}},
 ];
 for(const scenario of cases){let calls=0;globalThis.fetch=async(...args)=>{calls++;return scenario.fetch(...args);};const result=await analyze(input);assert.equal(result.mode,'mock');assert.equal(result.diagnostics.fallbackReason,scenario.reason);assert.equal(calls,scenario.calls);assert('questions'in result&&result.questions.length>=3);assert(!JSON.stringify(result).includes('secret'));}
}));

test('mock, missing key and explicit fallback never call a provider; long drafts remain valid',async()=>withProvider(async()=>{
 globalThis.fetch=async()=>{throw new Error('Unexpected paid request');};
 assert.equal((await analyze({...input,forceMock:true})).diagnostics.fallbackReason,'requested_mock');
 delete process.env.OPENAI_API_KEY;assert.equal((await analyze(input)).diagnostics.fallbackReason,'not_configured');
 process.env.AI_MODE='mock';assert.equal((await analyze(input)).diagnostics.fallbackReason,'disabled');
 const result=await analyze({...input,mode:'card',draft:{...input.draft,text:'Ұзақ сипаттама '.repeat(600)}});assert('card'in result);assert(result.card.context!.length<=6000);
}));

test('AI validation rejects duplicate questions, wrong field IDs, invented source IDs and excessive input',()=>{
 const result=mockAI(input);assert(result.questions);const questions=result.questions;
 assert.throws(()=>validateOutput('questions',{...result,questions:[questions[0],questions[0],questions[2]]},input));
 assert.throws(()=>validateOutput('questions',{...result,questions:questions.map(q=>({...q,id:'arbitrary'}))},input));
 const card=mockAI({...input,mode:'card'});assert('card'in card);
 assert.throws(()=>validateOutput('card',{...card,evidence:[{field:'title',sourceIds:['invented']}]},input));
 assert.throws(()=>aiInput.parse({...input,answers:[{id:'draft',questionId:'q-data',text:'answer'}]}));
 assert.throws(()=>aiInput.parse({...input,draft:{...input.draft,text:'a'.repeat(10001)}}));
});

test('legacy compatible Chat Completions configuration remains usable',async()=>withProvider(async()=>{
 Object.assign(process.env,{AI_PROVIDER:'compatible',AI_API_KEY:'legacy-test',AI_MODEL:'configured-model',AI_BASE_URL:'https://provider.example/v1'});
 globalThis.fetch=async(url,init)=>{assert.equal(url,'https://provider.example/v1/chat/completions');assert.equal(JSON.parse(String(init?.body)).response_format.type,'json_object');return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(mockAI(input))}}]});};
 assert.equal((await analyze(input)).mode,'live');
}));
