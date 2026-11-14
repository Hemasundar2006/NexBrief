import { useState } from 'react';
import { api, authToken } from './api';
import './accountSecurity.css';

export default function AccountSecurityForm({ preview = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (fields.newPassword !== fields.confirmPassword) { setError('New passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: fields.currentPassword, newPassword: fields.newPassword }) });
      authToken.clear();
      window.location.assign('/sign-in');
    } catch (problem) { setError(problem.message); setBusy(false); }
  }
  return <form className="account-security-form" onSubmit={submit}><h2>Change your password</h2><p>Your new password must have at least 12 characters, including a number and a symbol. You will be signed out on all devices.</p><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required disabled={preview || busy}/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required disabled={preview || busy}/></label><label>Enter new password again<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required disabled={preview || busy}/></label><button type="submit" disabled={preview || busy}>{busy ? 'Changing password…' : 'Change password'}</button>{error && <p role="alert" className="account-security-error">{error}</p>}</form>;
}
