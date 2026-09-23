import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());

// Explicit opt-in: this script makes at most ONE paid request, never retries it.
async function main(){
 if(!process.argv.includes('--live'))throw new Error('Use npm run ai:check -- --live only after approving one paid request.');
 const {aiConfig}=await import('../lib/ai/config');
 const config=aiConfig();
 if(!config.enabled||config.provider!=='openai'||!config.key)throw new Error('Set AI_MODE=live, AI_PROVIDER=openai and local OPENAI_API_KEY first.');
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async(...args)=>{if(++calls>1)throw new Error('Live check is limited to one request.');return originalFetch(...args);};
 try{
  const {analyze}=await import('../lib/ai');
  const result=await analyze({mode:'questions',draft:{id:'check',text:'Учебное кафе хочет уменьшить списания. Есть синтетическая таблица продаж.',industry:'Кафе'},answers:[]},{maxAttempts:1});
  console.log(JSON.stringify({mode:result.mode,diagnostics:result.diagnostics,questions:'questions'in result?result.questions.length:0,requests:Math.min(calls,1)}));
  if(result.mode!=='live'||result.diagnostics.provider!=='openai')process.exitCode=1;
 }finally{globalThis.fetch=originalFetch;}
}
main().catch(()=>{console.error('Live check not completed. Check local AI configuration; no credentials were printed.');process.exitCode=1;});
