import {useEffect,useState} from 'react';
import {api} from './api';
import LandingPage from './LandingPage';

export default function LandingEntry(){
  const [checking,setChecking]=useState(true);
  useEffect(()=>{let active=true;const redirectIfSignedIn=()=>api('/auth/me').then(()=>{if(active)window.location.replace('/app');}).catch(()=>{if(active)setChecking(false);});const onPageShow=event=>{if(event.persisted)redirectIfSignedIn();};redirectIfSignedIn();window.addEventListener('pageshow',onPageShow);return()=>{active=false;window.removeEventListener('pageshow',onPageShow);};},[]);
  if(checking)return <div className="page-loading" aria-label="Checking session"/>;
  return <LandingPage/>;
}
