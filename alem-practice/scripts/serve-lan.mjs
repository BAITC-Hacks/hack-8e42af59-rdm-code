import {networkInterfaces} from 'node:os';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createConnection} from 'node:net';
try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
const mode=process.argv[2]==='dev'?'dev':'start';
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be between 1024 and 65535');
// Windows can bind 0.0.0.0 beside an existing 127.0.0.1 listener. Avoid serving two versions.
const occupied=await new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});socket.setTimeout(600);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});
if(occupied){console.error(`Порт ${port} уже занят. Остановите старый сервер или задайте другой PORT.`);process.exit(1);}
const privateIPv4=ip=>/^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip);
const interfaces=Object.entries(networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(info=>info.family==='IPv4'&&!info.internal&&privateIPv4(info.address)).map(info=>({name,address:info.address})));
const local=`http://127.0.0.1:${port}`,urls=interfaces.map(info=>`http://${info.address}:${port}`);
const origins=[local,`http://localhost:${port}`,...urls,...(process.env.APP_ORIGINS||'').split(',').filter(Boolean)];
console.log('\nAlem Practice — запуск в общей сети Wi-Fi');
console.log(`На этом компьютере: ${local}`);
for(const [index,url] of urls.entries())console.log(`На другом устройстве (${interfaces[index].name}): ${url}`);
if(!urls.length)console.log('Адрес локальной сети не найден. Подключитесь к Wi-Fi и перезапустите команду.');
console.log('Откройте подходящий адрес на устройстве в той же сети. Компьютер должен оставаться включённым.\n');
// This launcher is for local HTTP demos, not production HTTPS hosting.
const child=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),mode,'--hostname','0.0.0.0','--port',String(port)],{stdio:'inherit',env:{...process.env,APP_URL:local,APP_ORIGINS:[...new Set(origins)].join(',')}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??0;});
