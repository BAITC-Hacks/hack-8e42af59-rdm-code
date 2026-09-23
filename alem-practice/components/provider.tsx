'use client';
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import type {AppData} from '@/lib/domain';
type Context={data:AppData|null;role:string;actorId:string;setRole:(s:string)=>void;setActorId:(s:string)=>void;refresh:()=>Promise<void>;run:<T=unknown>(action:string,payload:unknown)=>Promise<T>;notify:(s:string)=>void};
const AppContext=createContext<Context|null>(null);
export function AppProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<AppData|null>(null),[role,setRoleState]=useState('student'),[actorId,setActorIdState]=useState('team-001'),[toast,setToast]=useState(''),[error,setError]=useState('');
 const refresh=useCallback(async()=>{const r=await fetch('/api/data',{cache:'no-store'});if(!r.ok)throw new Error('Не удалось загрузить данные');setData(await r.json());setError('')},[]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/data',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Не удалось загрузить данные');return r.json()}).then((result:AppData)=>{try{const preference=JSON.parse(sessionStorage.getItem('alem-demo-profile')||'null');if(preference&&['student','business'].includes(preference.role)&&(preference.role==='business'?result.businesses:result.teams).some(x=>x.id===preference.id)){setRoleState(preference.role);setActorIdState(preference.id)}}catch{}setData(result);setError('')}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast]);
 const setRole=(s:string)=>{const id=s==='business'?'biz-001':'team-001';setRoleState(s);setActorIdState(id);try{sessionStorage.setItem('alem-demo-profile',JSON.stringify({role:s,id}))}catch{}};
 const setActorId=(id:string)=>{setActorIdState(id);try{sessionStorage.setItem('alem-demo-profile',JSON.stringify({role,id}))}catch{}};
 async function run<T=unknown>(action:string,payload:unknown):Promise<T>{const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','x-demo-role':role,'x-demo-id':actorId},body:JSON.stringify({action,payload})});const result=await r.json();if(!r.ok)throw new Error(result.error||'Ошибка сохранения');await refresh();return result;}
 return <AppContext.Provider value={{data,role,actorId,setRole,setActorId,refresh,run,notify:setToast}}>{error?<div className="load-error">{error}<button onClick={()=>refresh().catch(e=>setError(e.message))}>Повторить</button></div>:children}{toast&&<div className="toast" role="status">{toast}<button aria-label="Закрыть уведомление" onClick={()=>setToast('')}>×</button></div>}</AppContext.Provider>;
}
export function useApp(){const c=useContext(AppContext);if(!c)throw new Error('Missing provider');return c}
