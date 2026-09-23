import {BuilderGate} from '@/components/task-builder';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <BuilderGate id={id}/>}
