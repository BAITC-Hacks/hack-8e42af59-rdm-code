'use client';
import {BookOpen,Layers3,Sparkles,ArrowUpRight,CheckCircle2,Send,Users,Flag,ArrowRight} from 'lucide-react';
import Link from 'next/link';
import type {TaskView} from '@/lib/domain';
import {useApp} from './provider';
import {plural} from '@/lib/utils';
export const topicColors=['#6952ee','#078278','#d36b23','#bc3980','#3473c6'];
export function CatalogInsights({tasks,topic,onSelect}:{tasks:TaskView[];topic:string;onSelect:(s:string)=>void}){
 const groups=[...new Set(tasks.map(t=>t.topic))].map(name=>({name,count:tasks.filter(t=>t.topic===name).length}));
 const skills=new Set(tasks.flatMap(t=>t.learning.skills)).size;
 return <section className="catalog-insights" aria-label="Каталог в цифрах"><div className="catalog-metrics"><div><span className="metric-icon purple"><BookOpen size={20}/></span><strong>{tasks.length}</strong><span>задач для практики</span></div><div><span className="metric-icon teal"><Layers3 size={20}/></span><strong>{groups.length}</strong><span>направлений</span></div><div><span className="metric-icon orange"><Sparkles size={20}/></span><strong>{skills}</strong><span>навыков в кейсах</span></div></div><div className="topic-distribution"><div className="distribution-heading"><strong>Найдите своё направление</strong><span>Нажмите на сегмент<ArrowUpRight size={13}/></span></div><div className="distribution-bar">{groups.map((g,i)=><button key={g.name} style={{width:(g.count/tasks.length*100)+'%',background:topicColors[i%5]}} aria-label={g.name+': '+g.count+' '+plural(g.count,['задача','задачи','задач'])} aria-pressed={topic===g.name} title={g.name+': '+g.count+' '+plural(g.count,['задача','задачи','задач'])} onClick={()=>onSelect(topic===g.name?'Все направления':g.name)}><span>{g.count}</span></button>)}</div><div className="distribution-legend">{groups.map((g,i)=><button key={g.name} aria-pressed={topic===g.name} onClick={()=>onSelect(topic===g.name?'Все направления':g.name)}><i style={{background:topicColors[i%5]}}/>{g.name}</button>)}</div></div></section>;
}
export function ProgressRing({value,label}:{value:number;label:string}){
 return <div className="progress-ring" role="img" aria-label={label+': '+value+'%'}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r="42"/><circle className="ring-value" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={value+' 100'}/></svg><div><strong>{value}<small>%</small></strong><span>{label}</span></div></div>;
}
export function PracticeProgress(){
 const {data,actorId}=useApp();if(!data)return null;
 const proposals=data.proposals.filter(p=>p.teamId===actorId),selected=proposals.filter(p=>p.status==='selected'),submitted=selected.filter(p=>p.milestone&&['submitted','confirmed'].includes(p.milestone.status)),done=submitted.filter(p=>p.milestone?.status==='confirmed');
 const percent=selected.length?Math.round(done.length/selected.length*100):0;
 const steps=[{Icon:Send,label:'Отклики',value:proposals.length},{Icon:Users,label:'Выбраны',value:selected.length},{Icon:Flag,label:'Результаты',value:submitted.length},{Icon:CheckCircle2,label:'Подтверждены',value:done.length}];
 return <section className="practice-dashboard"><div className="progress-summary"><ProgressRing value={percent} label="этапов готово"/><div><span className="dashboard-kicker">ВАШ ПУТЬ В ПРАКТИКЕ</span><h2>{done.length?'Каждый проект делает вас сильнее':proposals.length?'Первый шаг уже сделан':'Большое начинается с первого шага'}</h2><p>{selected.length?'Подтверждённые этапы выбранных проектов — ваш реальный прогресс.':'Выберите задачу, предложите идею и начните набирать опыт.'}</p><Link href="/catalog">Найти следующий проект<ArrowRight size={15}/></Link></div></div><div className="journey-stats">{steps.map(({Icon,label,value},i)=><div key={label} className={value?'reached':''}><span className="journey-icon"><Icon size={20}/></span><strong>{value}</strong><span>{label}</span>{i<3&&<i/>}</div>)}</div></section>;
}

