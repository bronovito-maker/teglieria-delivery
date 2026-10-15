"use client";
import {useEffect,useState} from 'react';
export function useProviderAvailability(){
 const [providers,setProviders]=useState({googleLoginEnabled:false,onlinePaymentEnabled:false});
 useEffect(()=>{let active=true;fetch('/api/config',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(c=>{if(active)setProviders({googleLoginEnabled:c.googleLoginEnabled===true,onlinePaymentEnabled:c.onlinePaymentEnabled===true});}).catch(()=>{});return()=>{active=false;};},[]);
 return providers;
}
