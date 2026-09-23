import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, BriefcaseBusiness, ChevronDown, GraduationCap, LayoutGrid, Menu, Plus, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { brand } from '../config/brand'
import { useAppStore } from '../store/useAppStore'

const roleLabels={business:'Бизнес',student:'Студент',mentor:'Наставник'} as const
export function AppLayout(){
  const [open,setOpen]=useState(false);const [roleOpen,setRoleOpen]=useState(false);const location=useLocation();const navigate=useNavigate()
  const {role,setRole,createTask,notice,clearNotice,resetDemo}=useAppStore()
  const chooseRole=(next:typeof role)=>{setRole(next);setRoleOpen(false);navigate(next==='business'?'/business':next==='student'?'/student':'/projects/project-workshop')}
  const makeTask=()=>{const id=createTask();navigate(`/tasks/${id}/edit`)}
  const nav=role==='business'?[['/business','Мастерская задач',BriefcaseBusiness],['/catalog','Каталог',LayoutGrid]]:role==='student'?[['/student','Моя практика',GraduationCap],['/catalog','Каталог',LayoutGrid],['/projects/project-workshop','Учебный проект',BookOpen]]:[['/projects/project-workshop','Проверка проекта',ShieldCheck],['/catalog','Каталог',LayoutGrid]]
  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}><div className="brand"><Link to="/business"><span className="brand-mark"><i/><i/><i/></span><span><strong>{brand.name}</strong><small>{brand.descriptor}</small></span></Link><button className="icon-btn close-nav" aria-label="Закрыть меню" onClick={()=>setOpen(false)}><X/></button></div>
      <nav aria-label="Основная навигация">{nav.map(([to,label,Icon])=><NavLink key={to as string} to={to as string} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label as string}</span></NavLink>)}</nav>
      <div className="side-bottom"><div className="demo-label">ДЕМО-РЕЖИМ</div><p>Данные локальны. Защиты ролей нет.</p><button className="text-btn" onClick={()=>{if(confirm('Сбросить все изменения и восстановить исходные демоданные?'))resetDemo()}}><RotateCcw size={15}/>Сбросить данные</button></div>
    </aside>
    <div className="main-area"><header className="topbar"><button className="icon-btn menu-btn" aria-label="Открыть меню" onClick={()=>setOpen(true)}><Menu/></button><div className="crumb">{location.pathname.startsWith('/business')?'Кабинет бизнеса':location.pathname.startsWith('/student')?'Кабинет студента':location.pathname.startsWith('/projects')?'Учебное пространство':'PRAKTIKA'}</div><div className="top-actions">{role==='business'&&<button className="btn small desktop-create" onClick={makeTask}><Plus size={17}/>Создать задачу</button>}<div className="role-switch"><button className="role-button" onClick={()=>setRoleOpen(!roleOpen)} aria-expanded={roleOpen}>Роль: <strong>{roleLabels[role]}</strong><ChevronDown size={16}/></button>{roleOpen&&<div className="role-menu">{(Object.keys(roleLabels) as Array<typeof role>).map((item)=><button key={item} onClick={()=>chooseRole(item)}><span>{roleLabels[item]}</span><small>{item==='business'?'Мастерская «Точка ремонта»':item==='student'?'Команда «Пиксель»':'Елена, наставник'}</small></button>)}</div>}</div></div></header>
      <main><Outlet/></main>
    </div>{open&&<button className="nav-scrim" onClick={()=>setOpen(false)} aria-label="Закрыть меню"/>}
    {notice&&<div className={`toast ${notice.tone}`} role="status"><span>{notice.text}</span><button onClick={clearNotice} aria-label="Закрыть уведомление"><X size={16}/></button></div>}
  </div>
}
