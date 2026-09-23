'use client';
import {useState} from 'react';
import {WandSparkles} from 'lucide-react';
export function EffectsToggle(){const [enabled,setEnabled]=useState(true);return <button className="effects-toggle" type="button" aria-pressed={enabled} aria-label={enabled?'Выключить анимации':'Включить анимации'} title={enabled?'Выключить анимации':'Включить анимации'} onClick={()=>{document.documentElement.dataset.motion=enabled?'off':'on';setEnabled(!enabled)}}><WandSparkles size={16}/><span>Эффекты</span><i/></button>}
