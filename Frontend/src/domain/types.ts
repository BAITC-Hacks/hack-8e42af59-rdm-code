export type Role = 'business' | 'student' | 'mentor'
export type ReadinessKey = 'context' | 'data' | 'outcome' | 'success' | 'constraints' | 'users' | 'communication'
export type ReadinessLevel = 'Черновик' | 'Рабочая' | 'Готовая' | 'Приоритетная'

export interface TaskDraft {
  title: string
  industry: string
  organization: string
  problem: string
  context: string
  need: string
  users: string
  data: string
  constraints: string
  outcome: string
  successCriteria: string
  contact: string
  interactionFormat: string
  feedbackProcess: string
  skills: string[]
  confirmed: Partial<Record<ReadinessKey, boolean>>
}

export interface Task {
  id: string
  draft: TaskDraft
  published: boolean
  publishedSnapshot?: TaskDraft
  applications: number
  dueDate?: string
  priority?: boolean
  updatedAt: string
}

export interface ReadinessItem { key: ReadinessKey; label: string; weight: number; earned: number; confirmed: boolean; complete: boolean; fieldId: string }
export interface ReadinessBreakdown { score: number; level: ReadinessLevel; items: ReadinessItem[] }
export interface Team { id: string; name: string; members: string[]; skills: string[]; xp: number }
export type ProposalStatus = 'Отправлен' | 'Выбрана' | 'Отклонён'
export interface Proposal { id: string; taskId: string; teamId: string; idea: string; plan: string; duration: string; prototypeUrl?: string; status: ProposalStatus; createdAt: string }
export type MilestoneStatus = 'Не начат' | 'В работе' | 'На проверке' | 'Нужна доработка' | 'Подтверждён'
export interface Review { comment: string; reviewedAt: string; reviewer: string }
export interface Milestone { id: string; title: string; objective: string; material: string; assignment: string; result: string; feedback: string; status: MilestoneStatus; xpAwarded: boolean; review?: Review }
export interface SkillEvidence { skill: string; milestoneId: string; verifiedBy: string; verifiedAt: string; demo: true }
export interface LearningProject { id: string; taskId: string; teamId: string; planStatus: 'Требует подтверждения наставника' | 'Подтверждён наставником'; milestones: Milestone[]; evidence: SkillEvidence[] }
