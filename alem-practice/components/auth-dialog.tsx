'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,GraduationCap,BriefcaseBusiness,ShieldCheck,Smartphone,ArrowLeft,FlaskConical} from 'lucide-react';
import {useApp} from './provider';
import {Dialog} from './ui/dialog';
import {Button} from './ui/button';
type Challenge={challengeId:string;expiresAt:string;retryAfter:number;testCode?:string;mode:string};
export function AuthDialog(){
 const {authRole,closeAuth}=useApp();
 return <Dialog open={authRole!==null} onOpenChange={v=>{if(!v)closeAuth()}} title="Ваш следующий шаг — практика" description="Войдите по номеру телефона или создайте свой аккаунт.">{authRole!==null&&<AuthForm key={authRole} initialRole={authRole}/>}</Dialog>;
}
function AuthForm({initialRole}:{initialRole:string}){
 const {data,refresh,closeAuth,notify}=useApp(),router=useRouter();
 const [intent,setIntent]=useState(initialRole==='login'?'login':'register'),[role,setRole]=useState(initialRole==='business'?'business':'student'),[name,setName]=useState(''),[phone,setPhone]=useState(''),[code,setCode]=useState(''),[challenge,setChallenge]=useState<Challenge|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[remaining,setRemaining]=useState(0);
 useEffect(()=>{if(!challenge)return;const until=Date.now()+challenge.retryAfter*1000;const timer=setInterval(()=>setRemaining(Math.max(0,Math.ceil((until-Date.now())/1000))),1000);return()=>clearInterval(timer)},[challenge]);
 async function send(){setBusy(true);setError('');try{const r=await fetch('/api/auth/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});const body=await r.json();if(!r.ok)throw new Error(body.error);setChallenge(body);setRemaining(body.retryAfter);setCode('');}catch(e){setError(e instanceof Error?e.message:'Не удалось получить код');}finally{setBusy(false);}}
 async function submit(e:FormEvent){e.preventDefault();if(!challenge){await send();return;}setBusy(true);setError('');try{const r=await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge.challengeId,code,...(intent==='register'?{registration:{name,role}}:{})})});const body=await r.json();if(!r.ok)throw new Error(body.error);await refresh();closeAuth();notify('Добро пожаловать! Ваш профиль сохранён.');if(intent==='register')router.push('/profile');}catch(e){setError(e instanceof Error?e.message:'Не удалось войти');}finally{setBusy(false);}}
 return <form onSubmit={submit} className="auth-form">
 <div className="auth-symbol"><GraduationCap size={32}/><span>Ваши знания. Ваши возможности.</span></div>
 {!challenge?<><div className="auth-tabs"><button type="button" className={intent==='register'?'selected':''} onClick={()=>setIntent('register')}>Регистрация</button><button type="button" className={intent==='login'?'selected':''} onClick={()=>setIntent('login')}>Вход</button></div>
 {intent==='register'&&<><div className="account-roles"><button type="button" aria-pressed={role==='student'} className={role==='student'?'selected':''} onClick={()=>setRole('student')}><GraduationCap/><strong>Я студент</strong><small>Хочу учиться на практике</small></button><button type="button" aria-pressed={role==='business'} className={role==='business'?'selected':''} onClick={()=>setRole('business')}><BriefcaseBusiness/><strong>Я представляю бизнес</strong><small>Ищу решение задачи</small></button></div><label className="form-field">Ваше имя<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Как к вам обращаться?"/></label></>}
 <label className="form-field">Номер телефона<div className="phone-input"><Smartphone size={19}/><input type="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 701 123 45 67" maxLength={30}/></div><small>Международный формат с +. Номер не попадёт в публичный профиль.</small></label>
 </>:<><button className="text-button" type="button" onClick={()=>{setChallenge(null);setError('')}}><ArrowLeft size={15}/>Изменить номер</button><p className="code-caption">{challenge.mode==='mock'?'Проверяем тестовый вход для':'Код отправлен на'} <strong>{phone}</strong></p><label className="form-field">Код подтверждения<input autoFocus className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000"/></label>
 {challenge.testCode&&<div className="test-code"><FlaskConical size={20}/><div><strong>Тестовый код: {challenge.testCode}</strong><p>SMS не отправлено. Код действует 5 минут.</p><button type="button" className="text-button" onClick={()=>setCode(challenge.testCode!)}>Вставить тестовый код</button></div></div>}
 <button className="text-button resend" type="button" disabled={busy||remaining>0} onClick={send}>{remaining>0?`Новый код через ${remaining} сек.`:'Получить новый код'}</button></>}
 {error&&<div className="error-box" role="alert">{error}</div>}
 <Button type="submit" disabled={busy} className="auth-submit">{busy?'Подождите…':challenge?'Подтвердить и войти':intent==='register'?'Создать аккаунт':'Получить код'}<ArrowRight size={17}/></Button>
 <p className="auth-note"><ShieldCheck size={16}/>{data?.authMode==='mock'?'Локальная демонстрация: номер не проверяется через SMS. Используйте тестовый номер.':'Одноразовый код вместо пароля. Не передавайте его другим людям.'}</p>
 </form>
}
