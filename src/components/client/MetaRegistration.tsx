'use client';
import {useEffect} from 'react';
import {sendMetaAction} from '@/lib/meta-actions';
export default function MetaRegistration({eventId}:{eventId?:string}){
 useEffect(()=>{let active=true;const send=(id:string)=>{if(active)void sendMetaAction('CompleteRegistration',id);};if(eventId)send(eventId);
 const complete=()=>{void fetch('/api/marketing/registration',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(r.status!==200)return;const v=await r.json();if(typeof v.eventId==='string')send(v.eventId);}).catch(()=>{});};
 window.addEventListener('lt:registration-created',complete);return()=>{active=false;window.removeEventListener('lt:registration-created',complete);};
 },[eventId]);return null;
}
