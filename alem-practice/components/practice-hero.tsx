'use client';
import Link from 'next/link';
import {ArrowUpRight,Code2,GraduationCap,Check,ChartNoAxesCombined,Palette,Sparkles,ArrowRight,Lightbulb} from 'lucide-react';
import {useApp} from './provider';
export function PracticeHero(){
 const {data,openAuth}=useApp();
 return <section className="studio-hero"><div className="hero-noise" aria-hidden="true"/><div className="studio-hero-copy"><div className="studio-kicker"><span/>ВАШЕ БУДУЩЕЕ НАЧИНАЕТСЯ С ПРАКТИКИ</div><h2>Знания — в дело.<br/><span>Идеи — в проекты.</span></h2><p>Найдите интересную задачу, соберите команду<br/>и создайте то, что станет вашим опытом.</p><div className="studio-hero-actions"><a href="#open-tasks" className="btn hero-cta">Найти свою задачу<ArrowUpRight size={18}/></a>{data?.me?<Link className="hero-secondary" href="/team">Мой прогресс<ArrowRight size={16}/></Link>:<button className="hero-secondary" onClick={()=>openAuth()}>Создать профиль<ArrowRight size={16}/></button>}</div><div className="hero-proof"><span><Check size={14}/>Понятный результат</span><span><Check size={14}/>Опыт для портфолио</span></div></div>
 <div className="learning-universe" aria-label="Образовательный путь: идея, практика, навык и проект"><svg className="universe-lines" viewBox="0 0 500 320" fill="none" aria-hidden="true"><ellipse cx="252" cy="157" rx="187" ry="115" transform="rotate(-15 252 157)"/><ellipse cx="252" cy="157" rx="187" ry="76" transform="rotate(28 252 157)"/><path d="M91 86 Q239 87 252 158 T415 241" strokeDasharray="5 8"/><path d="M122 245 Q193 126 252 158 T407 67" strokeDasharray="5 8"/></svg>
 <div className="planet planet-center"><div className="planet-core"><GraduationCap size={54}/></div><strong>Ваш следующий<br/>уровень</strong><span>LEARN BY DOING</span></div>
 <div className="universe-node node-code"><span><Code2 size={24}/></span><div><strong>Создавайте</strong><small>Код и технологии</small></div></div>
 <div className="universe-node node-design"><span><Palette size={24}/></span><div><strong>Исследуйте</strong><small>Дизайн и UX</small></div></div>
 <div className="universe-node node-data"><span><ChartNoAxesCombined size={24}/></span><div><strong>Находите смысл</strong><small>Данные и аналитика</small></div></div>
 <div className="universe-node node-idea"><span><Lightbulb size={24}/></span><div><strong>Пробуйте новое</strong><small>От идеи к решению</small></div></div>
 <div className="universe-award"><Sparkles size={16}/><span>Ваш проект — ваше достижение</span></div><i className="universe-dot dot-one"/><i className="universe-dot dot-two"/><i className="universe-dot dot-three"/></div></section>
}
