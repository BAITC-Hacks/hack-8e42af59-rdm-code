import type {Metadata} from 'next';
import {AppProvider} from '@/components/provider';
import {Shell} from '@/components/shell';
import './globals.css';
import './flows.css';
import './polish.css';
import './experience.css';
import './studio.css';
export const metadata:Metadata={title:'Alem Practice — знания в реальных задачах',description:'Практика для студентов на реальных задачах бизнеса. Найдите проект, развивайте навыки и создавайте портфолио.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><AppProvider><Shell>{children}</Shell></AppProvider></body></html>}

