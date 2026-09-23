import { ArrowLeft, Map } from 'lucide-react'
import { Link } from 'react-router-dom'
export function NotFound(){return <div className="page center-state"><Map size={42}/><span className="eyebrow">Ошибка 404</span><h1>Такой страницы нет</h1><p>Проверьте адрес или вернитесь в рабочий кабинет.</p><Link className="btn" to="/business"><ArrowLeft size={17}/>В кабинет</Link></div>}
