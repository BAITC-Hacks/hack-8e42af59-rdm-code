import { create } from 'zustand'
import { criterionForField } from '../domain/readiness'
import type { LearningProject, MilestoneStatus, Proposal, Role, Task, TaskDraft, Team } from '../domain/types'
import { seedProjects, seedProposals, seedTasks, seedTeams } from '../demo-data/seed'

const STORAGE_KEY = 'praktika-demo-v1'
type Notice = { id: number; text: string; tone: 'success' | 'info' | 'danger' }
interface Persisted { version: 1; tasks: Task[]; teams: Team[]; proposals: Proposal[]; projects: LearningProject[] }
interface AppState extends Persisted {
  role: Role; currentTeamId: string; notice?: Notice
  setRole: (role: Role) => void; setNotice: (text: string, tone?: Notice['tone']) => void; clearNotice: () => void
  createTask: () => string; updateTaskField: (id: string, field: keyof TaskDraft, value: TaskDraft[keyof TaskDraft]) => void
  confirmCriterion: (id: string, key: keyof TaskDraft['confirmed'], confirmed: boolean) => void
  publishTask: (id: string) => boolean; addProposal: (proposal: Omit<Proposal,'id'|'createdAt'|'status'>) => boolean
  decideProposal: (id: string, status: 'Выбрана'|'Отклонён') => void
  updateMilestone: (projectId: string, milestoneId: string, result: string) => void
  submitMilestone: (projectId: string, milestoneId: string) => void
  reviewMilestone: (projectId: string, milestoneId: string, status: Extract<MilestoneStatus,'Подтверждён'|'Нужна доработка'>, comment: string) => void
  confirmPlan: (projectId: string) => void; resetDemo: () => void
}

const cloneSeed = (): Persisted => ({ version:1, tasks:structuredClone(seedTasks), teams:structuredClone(seedTeams), proposals:structuredClone(seedProposals), projects:structuredClone(seedProjects) })
const load = (): Persisted => {
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Persisted; if (parsed.version === 1 && Array.isArray(parsed.tasks)) return parsed } catch { /* invalid demo data falls back safely */ }
  return cloneSeed()
}
const save = (state: Pick<AppState,'version'|'tasks'|'teams'|'proposals'|'projects'>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:state.version, tasks:state.tasks, teams:state.teams, proposals:state.proposals, projects:state.projects })) } catch { /* app remains usable without storage */ }
}
const mutate = (set: (fn:(s:AppState)=>Partial<AppState>)=>void, fn:(s:AppState)=>Partial<AppState>) => set((s) => { const next=fn(s); queueMicrotask(() => save({ ...s, ...next } as AppState)); return next })

export const useAppStore = create<AppState>((set) => ({
  ...load(), role:'business', currentTeamId:'team-pixel',
  setRole:(role)=>set({role}), setNotice:(text,tone='success')=>set({notice:{id:Date.now(),text,tone}}), clearNotice:()=>set({notice:undefined}),
  createTask:()=>{ const id=`task-${Date.now()}`; mutate(set,(s)=>({tasks:[...s.tasks,{id,published:false,applications:0,updatedAt:new Date().toISOString(),draft:{title:'',industry:'',organization:'Моя демонстрационная компания',problem:'',context:'',need:'',users:'',data:'',constraints:'',outcome:'',successCriteria:'',contact:'',interactionFormat:'',feedbackProcess:'',skills:[],confirmed:{}}}]})); return id },
  updateTaskField:(id,field,value)=>mutate(set,(s)=>({tasks:s.tasks.map((task)=>{ if(task.id!==id)return task; const confirmed={...task.draft.confirmed}; const criterion=criterionForField(field); if(criterion) confirmed[criterion]=false; return {...task,updatedAt:new Date().toISOString(),draft:{...task.draft,[field]:value,confirmed}} })})),
  confirmCriterion:(id,key,confirmed)=>mutate(set,(s)=>({tasks:s.tasks.map((task)=>task.id===id?{...task,draft:{...task.draft,confirmed:{...task.draft.confirmed,[key]:confirmed}}}:task)})),
  publishTask:(id)=>{ let ok=false; mutate(set,(s)=>({tasks:s.tasks.map((task)=>{if(task.id!==id)return task; ok=Boolean(task.draft.title.trim()&&task.draft.problem.trim()); return ok?{...task,published:true,publishedSnapshot:structuredClone(task.draft)}:task})})); return ok },
  addProposal:(input)=>{let added=false;mutate(set,(s)=>{if(s.proposals.some((p)=>p.taskId===input.taskId&&p.teamId===input.teamId))return {};added=true;return{proposals:[...s.proposals,{...input,id:`proposal-${Date.now()}`,createdAt:new Date().toISOString(),status:'Отправлен'}],tasks:s.tasks.map((t)=>t.id===input.taskId?{...t,applications:t.applications+1}:t)}});return added},
  decideProposal:(id,status)=>mutate(set,(s)=>({proposals:s.proposals.map((p)=>p.id===id?{...p,status}:p)})),
  updateMilestone:(projectId,milestoneId,result)=>mutate(set,(s)=>({projects:s.projects.map((p)=>p.id===projectId?{...p,milestones:p.milestones.map((m)=>m.id===milestoneId?{...m,result,status:m.status==='Не начат'?'В работе':m.status}:m)}:p)})),
  submitMilestone:(projectId,milestoneId)=>mutate(set,(s)=>({projects:s.projects.map((p)=>p.id===projectId?{...p,milestones:p.milestones.map((m)=>m.id===milestoneId&&m.result.trim()?{...m,status:'На проверке'}:m)}:p)})),
  reviewMilestone:(projectId,milestoneId,status,comment)=>mutate(set,(s)=>{let award=false; const projects=s.projects.map((p)=>p.id===projectId?{...p,milestones:p.milestones.map((m)=>{if(m.id!==milestoneId)return m;award=status==='Подтверждён'&&!m.xpAwarded;return{...m,status,feedback:comment,xpAwarded:m.xpAwarded||award,review:{comment,reviewedAt:new Date().toISOString(),reviewer:'Наставник демопроекта'}}}),evidence: status==='Подтверждён'&&!p.evidence.some(e=>e.milestoneId===milestoneId)?[...p.evidence,{skill:p.milestones.find(m=>m.id===milestoneId)?.objective||'Практический навык',milestoneId,verifiedBy:'Наставник демопроекта',verifiedAt:new Date().toISOString(),demo:true as const}]:p.evidence}:p);return{projects,teams:award?s.teams.map((t)=>t.id===s.projects.find(p=>p.id===projectId)?.teamId?{...t,xp:t.xp+100}:t):s.teams}}),
  confirmPlan:(projectId)=>mutate(set,(s)=>({projects:s.projects.map((p)=>p.id===projectId?{...p,planStatus:'Подтверждён наставником'}:p)})),
  resetDemo:()=>{const fresh=cloneSeed();localStorage.removeItem(STORAGE_KEY);set({...fresh,notice:{id:Date.now(),text:'Демоданные восстановлены',tone:'info'}})},
}))
