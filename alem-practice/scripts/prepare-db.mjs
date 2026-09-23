import {existsSync,openSync,closeSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const file=resolve('prisma/dev.db');
mkdirSync(dirname(file),{recursive:true});
if(!existsSync(file))closeSync(openSync(file,'wx'));
console.log('SQLite-файл готов. Существующая база сохранена.');
