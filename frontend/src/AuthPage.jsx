import { useEffect, useState } from 'react';
import { ArrowRight, Check, CircleHelp, AlertTriangle } from 'lucide-react';
import { authToken, clientFlowApi, api } from './api';
import './auth.css';

export default function AuthPage({ mode = 'signup' }) {
  const signup = mode === 'signup';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [platformStatus, setPlatformStatus] = useState(null);

  useEffect(() => {
    api('/status')
      .then(res => setPlatformStatus(res))
      .catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = signup
        ? await clientFlowApi.register({
            name: form.get('name'),
            email: form.get('email'),
            password: form.get('password'),
            profession: form.get('profession'),
            serviceRole: form.get('profession') === 'creative' ? 'custom-service' : form.get('profession'),
            serviceConsent: form.get('serviceConsent') === 'on',
            aiConsent: form.get('aiConsent') === 'on',
            marketingConsent: false,
          })
        : await clientFlowApi.login(form.get('email'), form.get('password'));
      authToken.set(result.data.accessToken);
      window.location.assign('/app');
    } catch (err) {
      setError(err.message || 'We couldn’t complete that request. Please try again.');
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <header className="auth-topbar"><a className="auth-brand" href="/"><b>nexbrief<span>.</span></b></a><a className="auth-back" href="/">Back to home</a></header>
    <section className="auth-layout">
      <div className="auth-story"><span className="auth-kicker">NEXBRIEF / MANAGE YOUR CLIENT WORK</span><h1>{signup ? <>Every client.<br/><span>One clear next step.</span></> : <>Welcome back<br/><span>to NexBrief.</span></>}</h1><p>{signup ? 'Keep client details, follow-ups, proposals, and payments in one place.' : 'Sign in to continue managing your client work.'}</p><div className="auth-proof"><Check size={16}/><span>Built for freelance web developers and video editors</span></div></div>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card-heading"><span>{signup ? 'CREATE AN ACCOUNT' : 'WELCOME BACK'}</span><h2>{signup ? 'Create your account' : 'Sign in'}</h2><p>{signup ? 'Set up your workspace and start adding clients.' : 'Enter your email and password.'}</p></div>
        {signup && (platformStatus?.pauseRegistrations || platformStatus?.maintenance) && (
          <div className="auth-maintenance-alert" role="alert">
            <AlertTriangle size={16}/>
            <span>{platformStatus.notice || 'New account registrations are temporarily paused for maintenance.'}</span>
          </div>
        )}
        {!signup && platformStatus?.maintenance && (
          <div className="auth-maintenance-alert" role="alert">
            <AlertTriangle size={16}/>
            <span>{platformStatus.notice || 'NexBrief is currently undergoing maintenance. Administrator sign in is still active.'}</span>
          </div>
        )}
        {signup && <label>Your name<input name="name" autoComplete="name" placeholder="Alex Morgan" minLength="2" maxLength="100" required/></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label>
        <label>Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 12 : 1} maxLength="128" placeholder={signup ? 'Use 12+ characters, a number, and a symbol' : 'Enter your password'} required/></label>
        {signup && <label>What best describes your work?<select name="profession" defaultValue="web-developer"><option value="web-developer">Freelance web developer</option><option value="video-editor">Freelance video editor</option><option value="creative">Another creative service</option></select></label>}
        {signup && <div className="auth-consents"><label><input type="checkbox" name="serviceConsent" required/><span>I agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</span></label><label><input type="checkbox" name="aiConsent"/><span>Let AI help write client messages. You can review every message before sending. (Optional)</span></label></div>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}><span>{busy ? 'Please wait…' : signup ? 'Start free' : 'Sign in'}</span><ArrowRight size={17}/></button>
        <p className="auth-switch">{signup ? 'Already have an account?' : 'New to NexBrief?'} <a href={signup ? '/sign-in' : '/start-free'}>{signup ? 'Sign in' : 'Start free'}</a></p>
      </form>
    </section>
    <footer className="auth-footer"><span><CircleHelp size={14}/> Manage each client from first contact to payment.</span><span>© 2026 NexBrief</span></footer>
  </main>;
}
