import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';

// Uses a separate SQLite file and port; never touches the running app's database or SMS/AI.
const dir=resolve('tests/.tmp');mkdirSync(dir,{recursive:true});
const file=join(dir,`http-${Date.now()}.db`),port=Number(process.env.TEST_HTTP_PORT||3107),origin=`http://127.0.0.1:${port}`;
const probe=createServer();probe.listen(port,'127.0.0.1');await once(probe,'listening');await new Promise(resolve=>probe.close(resolve));
const sqlite=new DatabaseSync(file);
for(const name of readdirSync('prisma/migrations').filter(n=>n!=='migration_lock.toml').sort())sqlite.exec(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
sqlite.close();
const env={...process.env,DATABASE_URL:`file:${file.replaceAll('\\','/')}`,APP_URL:origin,APP_ORIGINS:'',TEST_HTTP_SANDBOX:'true',AI_MODE:'mock',OPENAI_API_KEY:'',AI_API_KEY:''};
let server;
async function start(){
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:'ignore',windowsHide:true});
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw new Error('Test server exited; verify build and test port.');
  try{const response=await fetch(origin+'/api/data');if(response.ok){assert.equal(server.exitCode,null);return;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw new Error('Test server did not become ready.');
}
async function stop(){if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}}
try{
 await start();
 const check=spawn(process.execPath,['scripts/smoke-http.mjs'],{env:{...env,SMOKE_URL:origin},stdio:'inherit',windowsHide:true});
 const [code]=await once(check,'exit');assert.equal(code,0);
 const before=await (await fetch(origin+'/api/data')).json();
 await stop();await start();
 const after=await (await fetch(origin+'/api/data')).json();
 assert.deepEqual(after.tasks,before.tasks);
 const stored=new DatabaseSync(file,{readOnly:true});
 assert.equal(stored.prepare('SELECT COUNT(*) AS n FROM Award').get().n,1);
 assert.equal(stored.prepare('SELECT SUM(practicePoints) AS n FROM Team').get().n,50);
 stored.close();
 console.log('HTTP restart persistence passed; temporary database only.');
}finally{await stop();rmSync(file,{force:true});}
