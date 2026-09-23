'use client';
import type {ReactNode,PointerEvent} from 'react';
export function TiltCard({children,className}:{children:ReactNode;className:string}){
 function move(e:PointerEvent<HTMLElement>){if(document.documentElement.dataset.motion==='off'||e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=e.currentTarget,r=el.getBoundingClientRect();el.style.setProperty('--rx',`${-((e.clientY-r.top)/r.height-.5)*5}deg`);el.style.setProperty('--ry',`${((e.clientX-r.left)/r.width-.5)*5}deg`);}
 return <article className={`tilt-card ${className}`} onPointerMove={move} onPointerLeave={e=>{e.currentTarget.style.setProperty('--rx','0deg');e.currentTarget.style.setProperty('--ry','0deg')}}>{children}</article>;
}
