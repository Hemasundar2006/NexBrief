import {useEffect,useState} from 'react';
import {api} from './api';
import LandingPage from './LandingPage';
import App from './App';

export default function LandingEntry(){
  if(window.location.hostname.startsWith('app.'))return <AppEntry/>;
  useEffect(()=>{let active=true;const redirectIfSignedIn=()=>api('/auth/me').then(()=>{if(active)window.location.replace('/app');}).catch(()=>{});const onPageShow=event=>{if(event.persisted)redirectIfSignedIn();};redirectIfSignedIn();window.addEventListener('pageshow',onPageShow);return()=>{active=false;window.removeEventListener('pageshow',onPageShow);};},[]);
  return <LandingPage/>;
}

function AppEntry(){const [checking,setChecking]=useState(true);useEffect(()=>{let active=true;api('/auth/me').then(()=>{if(active)setChecking(false);}).catch(()=>{if(active){setChecking(false);window.location.replace('/sign-in');}});return()=>{active=false;};},[]);if(checking)return <div className="page-loading" aria-label="Checking session"/>;return <App/>;}
