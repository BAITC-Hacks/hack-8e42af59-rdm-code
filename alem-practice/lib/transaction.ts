import {Prisma} from '@prisma/client';
import {db} from './db';

// SQLite serializes writers. Retry only database conflicts, never arbitrary business errors.
export async function transaction<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
  for(let attempt=0;;attempt++) {
    try {return await db.$transaction(work,{maxWait:5000,timeout:10000});}
    catch(error) {
      if(attempt>=2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2034','P1008','P2028','P2002'].includes(error.code))throw error;
      await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));
    }
  }
}
