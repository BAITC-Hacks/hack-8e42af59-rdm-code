import {clsx,type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
export const cn=(...inputs:ClassValue[])=>twMerge(clsx(inputs));
export function plural(count:number,forms:[string,string,string]){const n=Math.abs(count)%100;return forms[n>10&&n<20?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];}
