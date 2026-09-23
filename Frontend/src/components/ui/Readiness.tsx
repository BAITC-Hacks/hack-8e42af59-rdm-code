import { Check, Circle, Sparkles } from 'lucide-react'
import { calculateReadiness } from '../../domain/readiness'
import type { TaskDraft } from '../../domain/types'

export function ReadinessBadge({ draft, compact=false }: { draft:TaskDraft; compact?:boolean }) {
  const {score,level}=calculateReadiness(draft)
  return <div className={`readiness-badge level-${level.toLowerCase()} ${compact?'compact':''}`} aria-label={`Готовность ${score} из 100, уровень ${level}`}>
    <span className="level-mark">{score>=90?<Sparkles size={14}/>:score>=70?<Check size={14}/>:<Circle size={12}/>}</span><strong>{score}</strong><span>/100 · {level}</span>
  </div>
}

export function SegmentedProgress({ value, label='Готовность' }:{value:number;label?:string}) {
  return <div className="segmented-wrap"><div className="segmented-head"><span>{label}</span><strong>{value}/100</strong></div><div className="segmented" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>{Array.from({length:10},(_,i)=><i key={i} className={i<Math.ceil(value/10)?'filled':''}/>)}</div></div>
}
