'use client';
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import type {AppData} from '@/lib/domain';
type Context={data:AppData|null;role:string;actorId:string;setRole:(s:string)=>void;openAuth:(role?:string)=>void;authRole:string|null;closeAuth:()=>void;refresh:()=>Promise<void>;logout:()=>Promise<void>;run:<T=unknown>(action:string,payload:unknown)=>Promise<T>;notify:(s:string)=>void};
const AppContext=createContext<Context|null>(null);
export function AppProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<AppData|null>(null),[toast,setToast]=useState(''),[error,setError]=useState(''),[authRole,setAuthRole]=useState<string|null>(null);
 const refresh=useCallback(async()=>{const r=await fetch('/api/data',{cache:'no-store'});if(!r.ok)throw new Error('Не удалось загрузить данные');setData(await r.json());setError('')},[]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/data',{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Не удалось загрузить данные');return r.json()}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast]);
 function openAuth(role='student'){if(data?.me){setToast('Роль закреплена за вашим аккаунтом. Для другого аккаунта сначала выйдите.');return;}setAuthRole(role);}
 async function run<T=unknown>(action:string,payload:unknown):Promise<T>{const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});const result=await r.json();if(!r.ok){if(r.status===401)setAuthRole('student');throw new Error(result.error||'Ошибка сохранения');}await refresh();return result;}
 async function logout(){const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw new Error('Не удалось выйти');setData(null);await refresh();setToast('Вы вышли из аккаунта');}
 return <AppContext.Provider value={{data,role:data?.me?.role||'guest',actorId:data?.me?.actorId||'',setRole:openAuth,openAuth,authRole,closeAuth:()=>setAuthRole(null),refresh,logout,run,notify:setToast}}>{error?<div className="load-error">{error}<button onClick={()=>refresh().catch(e=>setError(e.message))}>Повторить</button></div>:children}{toast&&<div className="toast" role="status">{toast}<button aria-label="Закрыть уведомление" onClick={()=>setToast('')}>×</button></div>}</AppContext.Provider>;
}
export function useApp(){const c=useContext(AppContext);if(!c)throw new Error('Missing provider');return c}
