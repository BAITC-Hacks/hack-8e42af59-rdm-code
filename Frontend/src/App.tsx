import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { BusinessDashboard } from './features/business/BusinessDashboard'
import { TaskEditor } from './features/tasks/TaskEditor'
import { Catalog } from './features/catalog/Catalog'
import { TaskDetails } from './features/tasks/TaskDetails'
import { Proposals } from './features/business/Proposals'
import { StudentDashboard } from './features/student/StudentDashboard'
import { LearningProjectPage } from './features/learning/LearningProjectPage'
import { NotFound } from './features/system/NotFound'

export default function App(){return <Routes><Route element={<AppLayout/>}><Route index element={<Navigate to="/business" replace/>}/><Route path="/business" element={<BusinessDashboard/>}/><Route path="/tasks/new" element={<TaskEditor createOnMount/>}/><Route path="/tasks/:id/edit" element={<TaskEditor/>}/><Route path="/catalog" element={<Catalog/>}/><Route path="/tasks/:id" element={<TaskDetails/>}/><Route path="/business/tasks/:id/proposals" element={<Proposals/>}/><Route path="/student" element={<StudentDashboard/>}/><Route path="/projects/:id" element={<LearningProjectPage/>}/><Route path="*" element={<NotFound/>}/></Route></Routes>}
