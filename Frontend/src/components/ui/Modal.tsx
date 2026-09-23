import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const root=ref.current;const focusable=()=>Array.from(root?.querySelectorAll<HTMLElement>('button,input,textarea,a,select,[tabindex]:not([tabindex="-1"])')||[]);focusable()[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const all=focusable();if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()}},[onClose])
  return createPortal(<div className="modal-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Закрыть окно"><X/></button></div>{children}</div></div>,document.getElementById('modal-root')!)
}
