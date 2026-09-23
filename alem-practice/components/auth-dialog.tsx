'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,GraduationCap,BriefcaseBusiness,LockKeyhole,Eye,EyeOff,Check,AtSign,MonitorSmartphone,Sparkles,LoaderCircle} from 'lucide-react';
import {useApp} from './provider';
import {Dialog} from './ui/dialog';
import {Button} from './ui/button';
export function AuthDialog(){
 const {authRole,closeAuth}=useApp();
 return <Dialog className="account-dialog" open={authRole!==null} onOpenChange={v=>{if(!v)closeAuth()}} title="Ваше пространство возможностей" description="Один аккаунт для практики, команды и портфолио.">{authRole!==null&&<AuthForm key={authRole} initialRole={authRole}/>}</Dialog>;
}
function AuthForm({initialRole}:{initialRole:string}){
 const {refresh,closeAuth,notify}=useApp(),router=useRouter();
 const [intent,setIntent]=useState(initialRole==='login'?'login':'register'),[role,setRole]=useState(initialRole==='business'?'business':'student');
 const [name,setName]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[caps,setCaps]=useState(false);
 const registering=intent==='register',validLogin=/^[a-z][a-z0-9_]{2,23}$/i.test(username.trim()),longEnough=password.length>=12;
 async function submit(e:FormEvent){e.preventDefault();setError('');if(registering&&password!==confirmation){setError('Пароли не совпадают. Проверьте повторный ввод.');return;}setBusy(true);try{
  const r=await fetch('/api/auth/'+intent,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,...(registering?{name,role,confirmPassword:confirmation}:{})})});
  const result=await r.json();if(!r.ok)throw new Error(result.error);
  await refresh();closeAuth();notify(registering?'Аккаунт создан. Добро пожаловать в Alem!':'С возвращением! Ваши проекты уже здесь.');
  if(registering)router.push('/profile');
 }catch(e){setError(e instanceof Error?e.message:'Не удалось войти. Попробуйте ещё раз.');}finally{setBusy(false);}}
 function switchMode(next:string){setIntent(next);setError('');setPassword('');setConfirmation('');}
 return <div className="account-layout"><aside className="account-story"><div className="story-kicker"><Sparkles size={15}/> ALEM PRACTICE</div><h3>Ваша идея.<br/>Ваши люди.<br/><span>Ваш первый<br/>большой проект.</span></h3><div className="story-visual" aria-hidden="true"><span className="story-orbit"/><div className="story-cube"><GraduationCap size={49}/></div><span className="story-mini mini-code">&lt;/&gt;</span><span className="story-mini mini-check"><Check size={20}/></span><span className="story-star">✦</span></div><div className="story-benefit"><MonitorSmartphone size={22}/><div><strong>Продолжайте с любого устройства</strong><p>Войдите в тот же аккаунт — профиль и проекты будут на месте.</p></div></div></aside><form className="account-form" onSubmit={submit}>
 <div className="account-tabs" role="group" aria-label="Способ входа"><button type="button" disabled={busy} aria-pressed={registering} className={registering?'selected':''} onClick={()=>switchMode('register')}>Регистрация</button><button type="button" disabled={busy} aria-pressed={!registering} className={!registering?'selected':''} onClick={()=>switchMode('login')}>Вход</button></div>
 <h3>{registering?'Давайте знакомиться':'Рады видеть вас снова'}</h3><p className="account-intro">{registering?'Начните с аккаунта. Дальше — интересные задачи.':'Войдите, чтобы продолжить свой проект.'}</p>
 {registering&&<><div className="account-roles"><button type="button" disabled={busy} aria-pressed={role==='student'} className={role==='student'?'selected':''} onClick={()=>setRole('student')}><GraduationCap size={19}/><strong>Студент</strong><small>Развиваю навыки</small></button><button type="button" disabled={busy} aria-pressed={role==='business'} className={role==='business'?'selected':''} onClick={()=>setRole('business')}><BriefcaseBusiness size={19}/><strong>Бизнес</strong><small>Предлагаю задачи</small></button></div><label className="form-field">Ваше имя<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Как к вам обращаться?" disabled={busy}/></label></>}
 <label className="form-field">Логин<div className="credential-input"><AtSign size={17}/><input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="your_name" disabled={busy}/>{validLogin&&<Check size={16} className="input-ok"/>}</div>{registering&&<small>3–24 символа: латинские буквы, цифры и _</small>}</label>
 <label className="form-field">Пароль<div className="credential-input"><LockKeyhole size={17}/><input name="password" type={visible?'text':'password'} autoComplete={registering?'new-password':'current-password'} required minLength={registering?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} onKeyUp={e=>setCaps(e.getModifierState('CapsLock'))} placeholder={registering?'Минимум 12 символов':'Введите ваш пароль'} disabled={busy}/><button type="button" aria-label={visible?'Скрыть пароль':'Показать пароль'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{caps&&<small className="caps-hint">Включён Caps Lock</small>}</label>
 {registering&&<><div className="password-guidance"><span className={longEnough?'done':''}><Check size={13}/>{longEnough?'Достаточная длина':'От 12 символов — можно целую фразу'}</span><span className={confirmation&&confirmation===password?'done':''}><Check size={13}/>Повторите пароль</span></div><label className="form-field">Повторите пароль<div className="credential-input"><LockKeyhole size={17}/><input name="confirmPassword" type={visible?'text':'password'} autoComplete="new-password" required maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="Ещё раз, чтобы не ошибиться" disabled={busy}/></div></label></>}
 {error&&<div className="error-box" role="alert">{error}</div>}<Button className="account-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle size={18} className="spin"/>Подождите…</>:<>{registering?'Создать аккаунт':'Войти в аккаунт'}<ArrowRight size={18}/></>}</Button>
 <p className="account-footnote"><LockKeyhole size={13}/>Пароль хранится в защищённом виде.</p>
 {!registering&&<details className="login-help"><summary>Не получается войти?</summary><p>Проверьте раскладку и Caps Lock. Логин не зависит от регистра букв. Восстановление пароля пока не подключено; используйте сохранённый пароль из менеджера паролей.</p></details>}
 </form></div>
}

