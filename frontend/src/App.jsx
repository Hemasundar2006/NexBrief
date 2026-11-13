import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock3, FileText, Globe2, LayoutDashboard, LockKeyhole, LogOut, Mail, MapPinned, Menu, MoreHorizontal, PackageOpen, PlugZap, Plus, Search, Settings, ShieldCheck, Sparkles, Upload, Users, WalletCards, WandSparkles, X, Zap } from 'lucide-react';
import { api, authToken } from './api';
import MainAdminShell from './MainAdminShell';
import { WorkspaceSettings } from './WorkspacePanels';
import MemberPrivacyPanel from './MemberPrivacyPanel';
import PlanCard from './PlanCard';
import { BillingPage, UsagePage } from './MemberAccountPages';
import './logo.css';
import { Dialog, LeadForm, ProposalForm } from './WorkspaceForms';
import { previewActivities, previewLeads, previewProposals, previewUser } from './workspacePreview';
import JourneyControls from './WorkflowPanel';
import { can, dateLabel, initials, isDue, isOpen, money, proposalStatuses, paymentStatuses, stages, totalsByCurrency } from './workspaceUtils';
import { scopedLeads, serviceProfile } from './serviceConfig';
import './workspace.css';
import './dragdrop.css';
import './memberPrivacy.css';
import './planCard.css';

const navGroups = [
  { id: 'overview', title: 'Overview', Icon: LayoutDashboard, caption: 'Your client work, at a glance.', links: [['Overview', 'leads:read']] },
  { id: 'journey', title: 'Client workflow', Icon: BriefcaseBusiness, caption: 'From the first inquiry to a paid deposit.', links: [['Capture leads', 'leads:read'], ['Qualify leads', 'leads:read'], ['Follow-ups', 'leads:read'], ['Sales pipeline', 'pipeline:read'], ['AI outreach', 'outreach:generate'], ['Proposals', 'proposals:read'], ['Deposits & payments', 'payments:read'], ['Service templates', 'proposals:write'], ['Analytics', 'leads:read']] },
  { id: 'settings', title: 'Account', Icon: Settings, caption: 'Plan, usage, preferences, and privacy.', links: [['Billing', null], ['Usage', null], ['Settings', 'workspace:manage'], ['Integrations', 'workspace:manage']] },
  { id: 'growth', title: 'Coming soon', Icon: MapPinned, caption: 'Outbound discovery is in development.', links: [['Outbound discovery', null]] },
];
const titleFor = { 'Capture leads': 'Leads', 'Qualify leads': 'Qualification', 'Sales pipeline': 'Pipeline', 'AI outreach': 'AI drafts', 'Deposits & payments': 'Payments', 'Outbound discovery': 'Outbound discovery' };
const stepNumbers = { 'Capture leads': '01', 'Qualify leads': '02', 'Follow-ups': '03', 'Sales pipeline': '04', 'AI outreach': '05', 'Proposals': '06', 'Deposits & payments': '07' };
const fieldNumber = ({ currency, value }) => money(value, currency);
const previewType = new URLSearchParams(window.location.search).get('preview');
const previewMode = previewType === '1' || previewType === 'admin';
const previewAdmin = previewType === 'admin';

export default function App() {
  const [page, setPage] = useState('Overview'), [railSection, setRailSection] = useState('overview'), [drawer, setDrawer] = useState(false), [user, setUser] = useState(null), [leads, setLeads] = useState([]), [proposals, setProposals] = useState([]), [activities, setActivities] = useState([]), [drafts, setDrafts] = useState([]), [selectedLead, setSelectedLead] = useState(''), [draft, setDraft] = useState(''), [draftKind, setDraftKind] = useState('outreach'), [search, setSearch] = useState(''), [leadDate, setLeadDate] = useState(''), [leadPage, setLeadPage] = useState(1), [dialog, setDialog] = useState(null), [toast, setToast] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [maintenanceAlert, setMaintenanceAlert] = useState(null), [signoutConfirm, setSignoutConfirm] = useState(null);
  const currency = user?.workspace?.currency || 'USD';
  const serviceRole = user?.serviceRole || user?.workspace?.profession || 'custom-service';
  const profile = serviceProfile(serviceRole);
  const sidebarGroups = navGroups;
  const load = useCallback(async (initial = false) => {
    setLoading(true); setError('');
    if (previewMode) { setUser(previewAdmin ? { name: 'Hemasundar Maroti', role: 'platform-owner', platformOwner: true, permissions: [], workspace: { plan: 'free' } } : { ...previewUser, accountType: 'member', workspace: { ...previewUser.workspace, plan: 'free' } }); setLeads(previewAdmin ? [] : previewLeads); setProposals(previewAdmin ? [] : previewProposals); setActivities(previewAdmin ? [] : previewActivities); setDrafts([]); setLoading(false); return; }
    try {
      const account = initial ? await api('/auth/me') : { data: user };
      const access = account?.data || user;
      if (account?.data) setUser(account.data);
      const [leadResult, proposalResult, draftResult] = await Promise.all([can(access, 'leads:read') ? api('/leads?limit=100&page=1') : Promise.resolve({ data: [], meta: { total: 0 } }), can(access, 'proposals:read') ? api('/proposals') : Promise.resolve({ data: [] }), can(access, 'outreach:generate') ? api('/ai/drafts') : Promise.resolve({ data: [] })]);
      const leadPages = Math.ceil((leadResult.meta?.total || 0) / 100);
      const remaining = await Promise.all(Array.from({ length: Math.max(0, leadPages - 1) }, (_, index) => api(`/leads?limit=100&page=${index + 2}`)));
      const visibleLeads=scopedLeads([leadResult, ...remaining].flatMap(page => page.data || []).map(lead => ({ ...lead, id: String(lead._id || lead.id) })), access?.serviceRole || access?.workspace?.profession || 'custom-service');
      setLeads(visibleLeads);
      setProposals((proposalResult.data || []).map(item => ({ ...item, id: String(item._id || item.id), leadId: String(item.leadId) })).filter(item=>visibleLeads.some(lead=>lead.id===item.leadId)));
      setDrafts(draftResult.data || []);
    } catch (problem) { setError(problem.status === 401 ? 'Your session has expired. Sign in again to open your workspace.' : problem.message || 'Could not load your workspace. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { load(true); }, []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => {
    const handleMaintenance = (event) => {
      const msg = event?.detail?.message || 'NexBrief is currently undergoing scheduled maintenance. Please check back shortly.';
      setMaintenanceAlert(curr => curr || { message: msg, countdown: 10 });
    };
    window.addEventListener('nexbrief:maintenance', handleMaintenance);
    return () => window.removeEventListener('nexbrief:maintenance', handleMaintenance);
  }, []);
  useEffect(() => {
    if (!user || user.platformOwner || previewMode || maintenanceAlert) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await api('/status');
        if (res?.maintenance && active) {
          setMaintenanceAlert({ message: res.notice || 'NexBrief is currently undergoing scheduled maintenance. Please check back shortly.', countdown: 10 });
        }
      } catch (problem) {
        if (problem?.code === 'PLATFORM_MAINTENANCE' || String(problem?.message || '').toLowerCase().includes('maintenance')) {
          if (active) setMaintenanceAlert(curr => curr || { message: problem.message || 'NexBrief is currently undergoing scheduled maintenance. Please check back shortly.', countdown: 10 });
        }
      }
    };
    const interval = setInterval(poll, 4000);
    return () => { active = false; clearInterval(interval); };
  }, [user, previewMode, maintenanceAlert]);
  useEffect(() => {
    if (!maintenanceAlert) return;
    if (maintenanceAlert.countdown <= 0) {
      signOut();
      return;
    }
    const timer = setTimeout(() => {
      setMaintenanceAlert(prev => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          signOut();
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [maintenanceAlert]);
  useEffect(() => {
    if (!signoutConfirm) return;
    if (signoutConfirm.countdown <= 0) {
      signOut();
      return;
    }
    const timer = setTimeout(() => {
      setSignoutConfirm(prev => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          signOut();
          return { countdown: 0 };
        }
        return { countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [signoutConfirm]);
  useEffect(() => {
    if (page !== 'Pipeline' || !can(user, 'leads:write')) return;
    const cards = [...document.querySelectorAll('.ws-lead-card')];
    const columns = [...document.querySelectorAll('.ws-kanban-column')];
    const handlers = [];
    cards.forEach(card => { card.setAttribute('draggable', 'true'); const start = event => { const company = card.querySelector('h3')?.textContent?.trim(); event.dataTransfer?.setData('text/nexbrief-company', company || ''); card.classList.add('is-dragging') }; const end = () => card.classList.remove('is-dragging'); card.addEventListener('dragstart', start); card.addEventListener('dragend', end); handlers.push(() => { card.removeEventListener('dragstart', start); card.removeEventListener('dragend', end) }) });
    columns.forEach(column => { const over = event => { event.preventDefault(); column.classList.add('is-drag-over') }; const leave = () => column.classList.remove('is-drag-over'); const drop = event => { event.preventDefault(); column.classList.remove('is-drag-over'); const company = event.dataTransfer?.getData('text/nexbrief-company'); const stage = column.querySelector('header span')?.textContent?.trim(); const lead = leads.find(item => item.company === company); if (lead && stage && lead.stage !== stage) api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }).then(() => load(false)).catch(problem => setError(problem.message)) }; column.addEventListener('dragover', over); column.addEventListener('dragleave', leave); column.addEventListener('drop', drop); handlers.push(() => { column.removeEventListener('dragover', over); column.removeEventListener('dragleave', leave); column.removeEventListener('drop', drop) }) });
    return () => handlers.forEach(cleanup => cleanup());
  }, [page, user, leads, load]);
  const filtered = useMemo(() => leads.filter(lead => { const matchesSearch = `${lead.name} ${lead.company} ${lead.service} ${lead.email || ''}`.toLowerCase().includes(search.toLowerCase()); const matchesDate = !leadDate || String(lead.createdAt || '').slice(0, 10) === leadDate; return matchesSearch && matchesDate; }), [leads, search, leadDate]);
  const leadPageSize = 10;
  const leadPageCount = Math.max(1, Math.ceil(filtered.length / leadPageSize));
  const visibleLeadPage = filtered.slice((leadPage - 1) * leadPageSize, leadPage * leadPageSize);
  useEffect(() => { setLeadPage(1); }, [search, leadDate]);
  useEffect(() => { if (leadPage > leadPageCount) setLeadPage(leadPageCount); }, [leadPage, leadPageCount]);
  const due = leads.filter(isDue), openLeads = leads.filter(isOpen), won = leads.filter(lead => lead.stage === 'Won');
  const go = label => { const target = titleFor[label] || label; setPage(target); setRailSection(navGroups.find(group => group.links.some(([item]) => (titleFor[item] || item) === target))?.id || 'overview'); setDrawer(false); setSearch(''); };
  const mutate = async path => { setBusy(true); try { const result = await path(); await load(false); setDialog(null); return result; } catch (problem) { setToast(problem.message || 'Could not save this change.'); throw problem; } finally { setBusy(false); } };
  async function saveLead(data) { await mutate(async () => { if (dialog?.lead) await api(`/leads/${dialog.lead.id}`, { method: 'PATCH', body: JSON.stringify(data) }); else await api('/leads', { method: 'POST', body: JSON.stringify(data) }); }); }
  async function importLeads(event) { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 1024 * 1024) throw Error('Choose a CSV file smaller than 1 MB.'); const text = await file.text(); const rows = text.split(/\r?\n/).filter(Boolean); if (rows.length < 2) throw Error('Add a header and at least one lead row.'); const parseLine = line => { const cells = []; let value = '', quoted = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { cells.push(value.trim()); value = ''; } else value += char; } cells.push(value.trim()); return cells; }; const headers = parseLine(rows[0]).map(value => value.toLowerCase()); const records = rows.slice(1).map(row => Object.fromEntries(parseLine(row).map((value, index) => [headers[index], value]))).map(row => ({ name: row.name, company: row.company, service: row.service, value: Number(row.value) || 0, email: row.email || undefined, notes: row.notes || undefined })).filter(row => row.name && row.company && row.service); if (!records.length) throw Error('CSV needs name, company, and service columns with at least one complete row.'); await mutate(() => api('/leads/import', { method: 'POST', body: JSON.stringify({ leads: records }) })); setToast(`${records.length} leads imported.`); } catch (problem) { setToast(problem.message); } finally { event.target.value = ''; } }
  async function makeDraft(lead, kind) { if (!can(user, 'outreach:generate')) { setToast('Your workspace role does not include AI drafts.'); return; } setSelectedLead(lead.id); setDraftKind(kind); setDraft(''); go('AI outreach'); if (previewMode) { setDraft(`Hi ${lead.name.split(' ')[0]},\n\nThanks for sharing the details about ${lead.service.toLowerCase()} for ${lead.company}. I’d love to learn more about your goals and timeline. Would a short call this week work for you?\n\nBest,\nAlex`); return; } setBusy(true); try { const result = await api('/ai/drafts', { method: 'POST', body: JSON.stringify({ leadId: lead.id, kind }) }); setDraft(result.data.content); setDrafts(current => [result.data, ...current.filter(item => item._id !== result.data._id)].slice(0, 100)); if (result.data.note) setToast(result.data.note); } catch (problem) { setToast(problem.message); } finally { setBusy(false); } }
  async function saveProposal(data) { await mutate(() => api('/proposals', { method: 'POST', body: JSON.stringify(data) })); }
  async function setProposal(p, status) { await mutate(() => api(`/proposals/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })); }
  async function setPayment(p, status) { if (previewMode) { setToast('Sample data is read only. Sign in to update deposits.'); return; } await mutate(() => api('/payments/manual', { method: 'POST', body: JSON.stringify({ proposalId: p.id, status }) })); }
  async function signOut() { if (!previewMode) { try { await api('/auth/logout', { method: 'POST' }); } catch { } } authToken.clear(); window.location.assign('/sign-in'); }
  const pageTitle = titleFor[page] || page;
  const pageDescriptions = { Overview: 'The important client work, all in one place.', Leads: 'Capture and organize the people interested in your services.', Qualification: 'Review fit, interest, service needs, and project value before investing time.', 'Follow-ups': 'See the next client conversations that need your attention.', Pipeline: 'See every opportunity from first contact to decision.', Proposals: 'Keep project scope and proposal status together.', Payments: 'Record deposit progress and see which projects are ready to start.', 'AI drafts': 'Write a considered first message. Review it before sending.', 'Outbound discovery': 'Find promising businesses by location and service, then save the right prospects to your pipeline.', 'Activity': 'A record of lead, proposal, and deposit changes.', 'Billing': 'Manage your NexBrief plan and billing status.', 'Usage': 'Track plan limits and workspace consumption.', 'Settings': 'Your workspace, preferences, and account access.' };
  if (loading && !user) return <main className="ws-startup" aria-label="Loading NexBrief"><img className="nexbrief-logo-mark" src="/images/nexbrief-logo.png" alt="" aria-hidden="true" /><p>Opening your workspace…</p></main>;
  if (!user) { const isMaintenance = error && error.toLowerCase().includes('maintenance'); return <main className="ws-startup"><img className="nexbrief-logo-mark" src="/images/nexbrief-logo.png" alt="" aria-hidden="true" /><h1>{isMaintenance ? 'Under maintenance' : 'Open NexBrief'}</h1><p>{error || 'Your client workspace is ready when you are.'}</p>{isMaintenance ? <span className="ws-maintenance-subnote">We are performing scheduled improvements. Please check back shortly.</span> : <a className="ws-button ws-primary" href="/sign-in">Go to sign in <ArrowRight size={16} /></a>}</main>; }
  if (user.platformOwner) return <MainAdminShell preview={previewMode} />;
  return <div className="workspace" onKeyDown={event => { if (event.key === 'Escape') setDrawer(false); }}>
    {drawer && <button className="ws-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <aside className={`ws-sidebar ${drawer ? 'ws-sidebar-open' : ''}`} id="nexbrief-navigation">
      <div className="ws-icon-rail" aria-label="Workspace sections">
        <button type="button" className="ws-rail-brand" aria-label="NexBrief overview" onClick={() => go('Overview')}><img className="nexbrief-logo-mark" src="/images/nexbrief-logo.png" alt="" aria-hidden="true" /></button>
        <span className="ws-rail-rule" />
        {sidebarGroups.filter(group => ['overview', 'journey', 'settings', 'growth'].includes(group.id)).map(group => { const GroupIcon = group.Icon; const selected = railSection === group.id; return <button key={group.id} className={`ws-rail-button ${selected ? 'is-selected' : ''}`} aria-label={group.title} aria-pressed={selected} title={group.title} onClick={() => go(group.links[0][0])}><GroupIcon size={18} /></button>; })}
        <div className="ws-rail-bottom"><span className="ws-rail-avatar" title={user?.name || 'Your account'}>{initials(user?.name)}</span><button type="button" className="ws-rail-button" aria-label="Sign out" title="Sign out" onClick={() => setSignoutConfirm({ countdown: 10 })}><LogOut size={17} /></button></div>
      </div>
      <div className="ws-nav-panel">
        <div className="ws-nav-panel-brand"><button type="button" className="ws-brand-inline-btn" onClick={() => go('Overview')}>nexbrief<span>.</span></button><button className="ws-mobile-close" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={20} /></button></div>
        <div className="ws-panel-account"><span className="ws-avatar">{initials(user?.name)}</span><span className="ws-profile-meta"><strong>{user?.name || 'Your account'}</strong><small>{user?.workspace?.name || 'Personal workspace'}</small></span></div>
        <div className="ws-current-section"><span className="ws-eyebrow">YOUR WORKSPACE</span><h2>{railSection === 'admin' ? 'Administration' : 'Client workspace'}</h2><p>{railSection === 'admin' ? 'People, access, and accountability.' : 'From first inquiry to paid deposit.'}</p></div>
        {sidebarGroups.filter(group => group.id === 'overview' || group.id === 'growth' || group.id === 'settings' || group.links.some(([, permission]) => can(user, permission))).map(group => <nav className="ws-nav" aria-label={`${group.title} pages`} key={group.id}><span className="ws-nav-label">{group.id === 'journey' ? 'CLIENT WORKFLOW' : group.title.toUpperCase()}</span>{group.links.map(([label, permission], index) => {
          const target = titleFor[label] || label;
          const visible = label === 'Overview' || label === 'Outbound discovery' || label === 'Settings' || ['Service templates', 'Analytics', 'Integrations'].includes(label) || can(user, permission);
          if (!visible) return null;
          const step = stepNumbers[label];
          const ItemIcon = { 'Overview': LayoutDashboard, 'Capture leads': Users, 'Qualify leads': ShieldCheck, 'Follow-ups': Clock3, 'Sales pipeline': BriefcaseBusiness, 'AI outreach': Sparkles, 'Proposals': FileText, 'Deposits & payments': WalletCards, 'Service templates': PackageOpen, 'Analytics': BarChart3, 'Activity': Activity, 'Settings': Settings, 'Integrations': PlugZap, 'Outbound discovery': MapPinned }[label] || group.Icon;
          return <button key={label} className={`ws-nav-item ${page === target ? 'is-active' : ''}`} aria-current={page === target ? 'page' : undefined} onClick={() => go(label)}><ItemIcon size={17} /><span>{target}</span>{step && <span className="ws-flow-number">{step}</span>}{label === 'Capture leads' && leads.length > 0 && <span className="ws-count">{leads.length}</span>}{label === 'Outbound discovery' && <span className="ws-soon">Soon</span>}</button>;
        })}</nav>)}
        <div className="ws-sidebar-bottom"><span className="ws-sidebar-foot">NEXBRIEF CRM</span><button type="button" className="ws-mobile-signout" onClick={() => setSignoutConfirm({ countdown: 10 })}><LogOut size={17} />Sign out</button></div>
      </div>
    </aside>
    <main className="ws-main">
      <header className="ws-topbar"><button className="ws-menu-toggle" aria-label={drawer ? 'Close navigation' : 'Open navigation'} aria-expanded={drawer} aria-controls="nexbrief-navigation" onClick={() => setDrawer(!drawer)}>{drawer ? <X size={20} /> : <Menu size={20} />}</button><div className="ws-crumb"><span>Workspace</span><span className="ws-crumb-slash">/</span><strong>{pageTitle}</strong></div>{can(user, 'leads:read') && <label className="ws-top-search"><Search size={16} /><input aria-label="Search workspace leads" placeholder="Search clients and projects" value={search} onChange={event => { setPage('Leads'); setRailSection('journey'); setSearch(event.target.value); }} /></label>}<div className="ws-top-user"><span className="ws-avatar">{initials(user?.name)}</span></div></header>
      <div className={`ws-page ${page === 'Overview' ? 'ws-page-overview' : 'ws-page-detail'}`}>
        {previewMode && <div className="ws-preview-banner"><span><strong>Sample member workspace</strong> · Explore example data. Changes are disabled.</span><span className="ws-preview-actions"><a href="/app?preview=admin">Main Admin <ArrowRight size={14} /></a><a href="/sign-in">Sign in <ArrowRight size={14} /></a></span></div>}
        <div className="ws-heading"><div><span className="ws-eyebrow">{page === 'Overview' ? 'YOUR CLIENT WORKSPACE' : pageTitle.toUpperCase()}</span><h1>{page === 'Overview' ? <>Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</> : pageTitle}<span className="ws-heading-period">{page === 'Overview' ? 'Keep the next step in sight.' : ''}</span></h1><p>{pageDescriptions[page] || 'Manage the people, proposals, and details that keep your business moving.'}</p></div><div className="ws-heading-actions">{page === 'Leads' && can(user, 'leads:write') && <label className="ws-button ws-secondary ws-import"><Upload size={16} />Import CSV<input type="file" accept=".csv,text/csv" onChange={importLeads} /></label>}{['Overview', 'Leads', 'Qualification', 'Follow-ups', 'Pipeline'].includes(page) && can(user, 'leads:write') && <button className="ws-button ws-primary" onClick={() => setDialog({ lead: null })}><Plus size={17} />Add a lead</button>}{['Proposals', 'Payments'].includes(page) && can(user, 'proposals:write') && <button className="ws-button ws-primary" onClick={() => setDialog('proposal')}><Plus size={17} />New proposal</button>}</div></div>
        {error && <div className="ws-error-banner" role="alert"><span>{error}</span><button className="ws-button ws-secondary" onClick={() => load(!user)}>Try again</button>{error.toLowerCase().includes('sign in') && <a className="ws-button ws-primary" href="/sign-in">Sign in</a>}</div>}
        {can(user, 'leads:read') && <JourneyControls page={page} leads={leads} proposals={proposals} serviceRole={serviceRole} preview={previewMode} onChanged={() => load(false)} />}
        {page === 'Overview' && <>
          <section className="ws-metrics" aria-label="Client work summary"><Metric Icon={Users} label="Active leads" value={openLeads.length} note={`${leads.length} total in your pipeline`} /><Metric Icon={WalletCards} label="Open pipeline" value={totalsByCurrency(openLeads)} note="Estimated project value" /><Metric Icon={Check} label="Won projects" value={totalsByCurrency(won)} note={`${won.length} marked as won`} /><Metric Icon={Clock3} label="Follow-ups due" value={due.length} note={due.length ? 'Ready for your attention' : 'Nothing overdue right now'} /></section>
          <div className="ws-overview-grid">
            <section className="ws-card ws-pipeline-card"><SectionHeader title="Your pipeline" description="Where each opportunity stands right now." action="Open pipeline" onAction={() => go('Pipeline')} /><div className="ws-stage-strip">{stages.map((stage, index) => <button key={stage} className="ws-stage-stat" onClick={() => go('Pipeline')}><span><i className={`ws-stage-dot ws-stage-${index}`} />{stage}</span><b>{leads.filter(lead => lead.stage === stage).length}</b></button>)}</div></section>
            <section className="ws-card ws-focus-card"><SectionHeader title="Next up" description="Follow-ups with a due date." /><div className="ws-follow-list">{leads.filter(lead => isOpen(lead) && lead.nextActionAt).sort((a, b) => new Date(a.nextActionAt) - new Date(b.nextActionAt)).slice(0, 5).map(lead => <div className="ws-follow" key={lead.id}><span className={`ws-follow-line ${isDue(lead) ? 'is-due' : ''}`} /><span className="ws-follow-body"><strong>{lead.nextAction || 'Follow up with this client'}</strong><small>{lead.company} · {lead.name}</small></span><span className={`ws-due-label ${isDue(lead) ? 'is-due' : ''}`}>{dateLabel(lead.nextActionAt)}</span>{can(user, 'outreach:generate') && <button className="ws-icon" aria-label={`Draft follow-up to ${lead.name}`} onClick={() => makeDraft(lead, 'followup')}><Mail size={16} /></button>}</div>)}{!leads.some(lead => isOpen(lead) && lead.nextActionAt) && <div className="ws-empty-mini"><span className="ws-empty-icon"><Clock3 size={19} /></span><strong>Your follow-ups will show here</strong><p>Add a next step and due date to a lead to create a reminder.</p></div>}</div><button className="ws-focus-cta" onClick={() => go('Follow-ups')}>Open follow-up queue<ArrowRight size={15} /></button></section>
          </div>
          <section className="ws-card ws-recent-card"><SectionHeader title="Recent leads" description="Client conversations in motion." action="View all leads" onAction={() => go('Leads')} /><LeadList leads={leads.slice(0, 5)} onEdit={lead => setDialog({ lead })} onDraft={makeDraft} writable={can(user, 'leads:write')} canDraft={can(user, 'outreach:generate')} />{!leads.length && <Empty Icon={Users} title="Your pipeline starts with a conversation" description="Add a prospective client to keep their needs, follow-up, and project value together." action={can(user, 'leads:write') ? 'Add your first lead' : null} onAction={() => setDialog({ lead: null })} />}</section>
          <section className="ws-lower-row">{can(user, 'proposals:read') && <button className="ws-lower-card" onClick={() => go('Proposals')}><span className="ws-lower-icon"><FileText size={18} /></span><span><strong>Proposals & deposits</strong><small>{proposals.length} proposal{proposals.length === 1 ? '' : 's'} tracked</small></span><ArrowRight size={17} /></button>}{can(user, 'outreach:generate') && <button className="ws-lower-card" onClick={() => go('AI outreach')}><span className="ws-lower-icon"><WandSparkles size={18} /></span><span><strong>AI assisted drafts</strong><small>Write it, review it, send it yourself</small></span><ArrowRight size={17} /></button>}</section>
        </>}
    {page === 'Leads' && <section className="ws-card"><div className="ws-card-toolbar"><SectionHeader title="Inbound leads" description={`${filtered.length} ${filtered.length === 1 ? 'client inquiry' : 'client inquiries'}${leadDate ? ` on ${dateLabel(leadDate)}` : ''}`} /><div className="ws-lead-filters"><label className="ws-date-filter"><CalendarDays size={16} /><span className="sr-only">Filter inbound leads by date</span><input type="date" aria-label="Filter inbound leads by date" value={leadDate} onChange={event => setLeadDate(event.target.value)} />{leadDate && <button type="button" aria-label="Clear date filter" onClick={() => setLeadDate('')}><X size={14} /></button>}</label><label className="ws-search"><Search size={17} /><input aria-label="Search leads" placeholder="Search clients, companies, services…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}</label></div></div><LeadList leads={visibleLeadPage} onEdit={lead => setDialog({ lead })} onDraft={makeDraft} onArchive={async lead => { if (confirm(`Archive ${lead.company} from active leads?`)) await mutate(() => api(`/leads/${lead.id}`, { method: 'DELETE' })); }} writable={can(user, 'leads:write')} canDraft={can(user, 'outreach:generate')} showDetails />{!filtered.length && <Empty Icon={leadDate ? CalendarDays : (search ? Search : Users)} title={leadDate ? 'No inbound leads on this date' : (search ? 'No matching leads' : 'No leads yet')} description={leadDate ? 'Choose another date or clear the filter to see all inbound inquiries.' : (search ? 'Try another name, company, or service.' : 'Add a client inquiry or import your existing leads from a CSV file.')} action={!search && !leadDate && can(user, 'leads:write') ? 'Add a lead' : null} onAction={() => setDialog({ lead: null })} />}{filtered.length > 0 && <LeadPagination page={leadPage} pageCount={leadPageCount} total={filtered.length} onChange={setLeadPage} />}</section>}
        {false && page === 'Qualification' && <section className="ws-card"><SectionHeader title="Qualification desk" description="Prioritize leads by fit, interest, service, and estimated project value." /><div className="ws-qualification-list">{[...leads].sort((a, b) => (b.qualificationScore || 0) - (a.qualificationScore || 0)).map(lead => <article className="ws-qualification-row" key={lead.id}><span className={`ws-avatar ws-avatar-${lead.interest?.toLowerCase()}`}>{initials(lead.name)}</span><span className="ws-qualification-main"><strong>{lead.company}</strong><small>{lead.name} · {lead.service}</small></span><label>Interest<select disabled={!can(user, 'leads:write')} value={lead.interest} onChange={event => mutate(() => api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ interest: event.target.value }) }))}>{['Hot', 'Warm', 'Cold'].map(item => <option key={item}>{item}</option>)}</select></label><label>Fit score<select disabled={!can(user, 'leads:write')} value={lead.qualificationScore || 0} onChange={event => mutate(() => api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ qualificationScore: Number(event.target.value) }) }))}>{Array.from({ length: 101 }, (_, score) => <option value={score} key={score}>{score} / 100</option>)}</select></label><strong className="ws-lead-value">{money(lead.value, lead.currency)}</strong>{can(user, 'leads:write') && <button className="ws-icon" aria-label={`Edit ${lead.company}`} onClick={() => setDialog({ lead })}><Settings size={16} /></button>}</article>)}{!leads.length && <Empty Icon={ShieldCheck} title="No prospects to qualify yet" description="Add or import a lead to start tracking service fit, interest, and project value." action={can(user, 'leads:write') ? 'Add a lead' : null} onAction={() => setDialog({ lead: null })} />}</div></section>}
        {false && page === 'Follow-ups' && <section className="ws-card"><SectionHeader title="Follow-up queue" description="Scheduled and overdue client actions, ordered by the next due date." /><div className="ws-follow-page">{[...leads].filter(lead => isOpen(lead)).sort((a, b) => (a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity) - (b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity)).map(lead => <article className="ws-follow-page-row" key={lead.id}><span className={`ws-follow-line ${isDue(lead) ? 'is-due' : ''}`} /><span className="ws-follow-body"><strong>{lead.nextAction || 'Set a next action'}</strong><small>{lead.company} · {lead.name} · {lead.service}</small></span><span className={`ws-due-label ${isDue(lead) ? 'is-due' : ''}`}>{lead.nextActionAt ? `${isDue(lead) ? 'Overdue · ' : ''}${dateLabel(lead.nextActionAt)}` : 'No date set'}</span><button className="ws-icon" aria-label={`Edit follow-up for ${lead.name}`} onClick={() => setDialog({ lead })}><Settings size={16} /></button>{can(user, 'outreach:generate') && <button className="ws-icon" aria-label={`Draft follow-up to ${lead.name}`} onClick={() => makeDraft(lead, 'followup')}><Mail size={16} /></button>}</article>)}{!leads.some(isOpen) && <Empty Icon={Clock3} title="Your follow-up queue is clear" description="New open client opportunities will appear here." />}</div></section>}
        {page === 'Pipeline' && <div className="ws-kanban">{stages.map((stage, index) => { const items = leads.filter(lead => lead.stage === stage); return <section className="ws-kanban-column" key={stage}><header><span><i className={`ws-stage-dot ws-stage-${index}`} />{stage}</span><b>{items.length}</b></header><div className="ws-kanban-cards">{items.map(lead => <article className="ws-lead-card" key={lead.id}><div className="ws-lead-card-top"><span className={`ws-avatar ws-avatar-${lead.interest?.toLowerCase()}`}>{initials(lead.name)}</span><span className={`ws-interest ws-interest-${lead.interest?.toLowerCase()}`}>{lead.interest} interest</span>{can(user, 'leads:write') && <button className="ws-icon" aria-label={`Edit ${lead.company}`} onClick={() => setDialog({ lead })}><MoreHorizontal size={18} /></button>}</div><h3>{lead.company}</h3><p>{lead.name} · {lead.service}</p><div className="ws-lead-meta"><strong>{money(lead.value, lead.currency)}</strong>{lead.nextActionAt && <small><Clock3 size={13} />{dateLabel(lead.nextActionAt)}</small>}</div><div className="ws-card-divider" /><div className="ws-kanban-actions">{can(user, 'leads:write') && <label className="ws-stage-select-label">Move to<select aria-label={`Move ${lead.company} to stage`} value={lead.stage} onChange={event => mutate(() => api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ stage: event.target.value }) }))}>{stages.map(stageOption => <option key={stageOption}>{stageOption}</option>)}</select></label>}{can(user, 'outreach:generate') && <button className="ws-icon" aria-label={`Draft outreach to ${lead.name}`} onClick={() => makeDraft(lead, 'outreach')}><Mail size={16} /></button>}</div></article>)}{!items.length && <p className="ws-kanban-empty">No leads at this step</p>}</div></section>; })}</div>}
        {false && page === 'Proposals' && <section className="ws-card"><SectionHeader title="Proposals" description={`${proposals.length} proposals · scope, timeline, and client decision`} /><div className="ws-proposals">{proposals.map(proposal => { const lead = leads.find(item => item.id === proposal.leadId); return <article className="ws-proposal" key={proposal.id}><div className="ws-proposal-heading"><span className="ws-proposal-icon"><FileText size={19} /></span><span className="ws-proposal-title"><strong>{proposal.title}</strong><small>{lead?.company || 'Client record'}{proposal.timeline ? ` · ${proposal.timeline}` : ''}</small></span><span className="ws-proposal-amount">{money(proposal.amount, proposal.currency)}</span></div><div className="ws-proposal-data"><div><span>CLIENT</span><strong>{lead?.name || 'Unavailable'}</strong></div><div><span>DEPOSIT</span><strong>{money(proposal.deposit, proposal.currency)}</strong></div><label><span>PROPOSAL STATUS</span><select disabled={!can(user, 'proposals:write') || busy} aria-label={`Status of ${proposal.title}`} value={proposal.status} onChange={event => setProposal(proposal, event.target.value)}>{proposalStatuses.map(status => <option key={status}>{status}</option>)}</select></label></div></article> })}{!proposals.length && <Empty Icon={FileText} title="Your proposal tracker is ready" description="Create a proposal from a qualified lead, then track whether the client has reviewed or accepted it." action={can(user, 'proposals:write') ? 'Create a proposal' : null} onAction={() => setDialog('proposal')} />}</div><p className="ws-muted ws-page-note">Proposal status is tracked here. Sending proposals by email or collecting an e-signature is not connected.</p></section>}
        {false && page === 'Payments' && <section className="ws-card"><SectionHeader title="Deposits & payments" description="Update the payment record as funds are requested, received, or refunded." /><div className="ws-proposals">{proposals.map(proposal => { const lead = leads.find(item => item.id === proposal.leadId); return <article className="ws-proposal" key={proposal.id}><div className="ws-proposal-heading"><span className="ws-proposal-icon"><WalletCards size={19} /></span><span className="ws-proposal-title"><strong>{proposal.title}</strong><small>{lead?.company || 'Client record'} · {lead?.name || 'Lead unavailable'}</small></span><span className="ws-proposal-amount">{money(proposal.amount, proposal.currency)}</span></div><div className="ws-proposal-data"><div><span>DEPOSIT EXPECTED</span><strong>{money(proposal.deposit, proposal.currency)}</strong></div><div><span>PROPOSAL</span><strong>{proposal.status}</strong></div><label><span>PAYMENT STATUS</span><select disabled={!can(user, 'payments:read') || busy} aria-label={`Payment status for ${proposal.title}`} value={proposal.paymentStatus} onChange={event => setPayment(proposal, event.target.value)}>{paymentStatuses.map(status => <option key={status}>{status}</option>)}</select></label></div></article> })}{!proposals.length && <Empty Icon={WalletCards} title="Payment tracking starts with a proposal" description="Create a proposal to record the expected deposit and update payment status as the client pays." action={can(user, 'proposals:write') ? 'Create a proposal' : null} onAction={() => setDialog('proposal')} />}</div><p className="ws-muted ws-page-note">Payments are marked manually. No money is collected by NexBrief yet.</p></section>}
        {page === 'AI drafts' && <div className="ws-ai-layout"><section className="ws-card ws-ai-card"><SectionHeader title="Prepare a client message" description="A starting draft based on the lead. You decide what to send." /><div className="ws-ai-controls"><label>Choose a client<select value={selectedLead} onChange={event => setSelectedLead(event.target.value)}><option value="">Select a lead</option>{leads.map(lead => <option key={lead.id} value={lead.id}>{lead.company} · {lead.name}</option>)}</select></label><label>Message type<select value={draftKind} onChange={event => setDraftKind(event.target.value)}><option value="outreach">First outreach</option><option value="followup">Follow-up</option><option value="proposal">Proposal introduction</option></select></label><button className="ws-button ws-primary" disabled={!selectedLead || busy || !can(user, 'outreach:generate')} onClick={() => makeDraft(leads.find(lead => lead.id === selectedLead), draftKind)}>{busy ? <span className="ws-spinner" /> : <Sparkles size={16} />}Create draft</button></div><div className="ws-draft-area">{draft ? <textarea aria-label="Review and edit your draft" value={draft} onChange={event => setDraft(event.target.value)} /> : <div className="ws-draft-placeholder"><span><WandSparkles size={22} /></span><strong>Your draft appears here</strong><p>Choose a client and message type to prepare a draft.</p></div>}</div>{draft && <div className="ws-draft-footer"><span>Review and edit it before sending.</span><button className="ws-button ws-secondary" onClick={() => navigator.clipboard?.writeText(draft).then(() => setToast('Draft copied to clipboard.')).catch(() => setToast('Could not access your clipboard.'))}>Copy draft</button></div>}{drafts.length > 0 && <div className="ws-saved-drafts"><strong>Saved drafts</strong>{drafts.slice(0, 8).map(saved => { const lead = leads.find(item => item.id === String(saved.leadId)); return <button key={saved._id} onClick={() => { setDraft(saved.content); setSelectedLead(String(saved.leadId)); setDraftKind(saved.kind); }}><span><b>{lead?.company || 'Client message'}</b><small>{saved.kind} · {saved.createdAt ? dateLabel(saved.createdAt) : 'Saved draft'}</small></span><ArrowRight size={14} /></button> })}</div>}<p className="ws-muted ws-page-note">Live AI requires the latest AI consent and a configured provider. Messages are not sent automatically.</p></section><aside className="ws-card ws-ai-side"><span className="ws-ai-side-icon"><ShieldCheck size={18} /></span><span className="ws-eyebrow">YOU ARE IN CONTROL</span><h2>Drafted with context. Sent by you.</h2><p>Keep your message personal and fact checked before you send it to a client.</p><ul><li><Check size={15} />Mention a real detail</li><li><Check size={15} />Make the next step clear</li><li><Check size={15} />Review every detail</li></ul><button onClick={() => go('Settings')}>Review AI preferences<ArrowRight size={15} /></button></aside></div>}
        {page === 'Outbound discovery' && <section className="ws-discovery"><span className="ws-discovery-icon"><MapPinned size={25} /></span><span className="ws-eyebrow">COMING SOON · OUTBOUND DISCOVERY</span><h2>Find the right businesses before you send the first message.</h2><p>Choose a location, service, and business type. NexBrief will help you discover relevant prospects, review their public business details, and save the best opportunities into your CRM.</p><div className="ws-discovery-flow"><span><MapPinned size={16} />Choose location</span><ArrowRight size={15} /><span><Search size={16} />Search by service</span><ArrowRight size={15} /><span><Check size={16} />Review prospects</span><ArrowRight size={15} /><span><Users size={16} />Save to leads</span></div><div className="ws-discovery-grid"><article><strong>Location-led search</strong><p>Search a city, area, or radius for businesses that may need your service.</p></article><article><strong>Quality before outreach</strong><p>Review the business website and notes before deciding who deserves a message.</p></article><article><strong>CSV export</strong><p>Download selected prospects or move them directly into your NexBrief pipeline.</p></article></div><small><LockKeyhole size={15} />Preview only. Live business search, enrichment, and CSV export will be enabled after the provider integration is connected.</small></section>}
        {page === 'Billing' && <BillingPage user={user} />}{page === 'Usage' && <UsagePage user={user} />}{page === 'Settings' && (previewMode ? <section className="ws-card ws-preview-settings"><ShieldCheck size={25} /><h2>Your workspace settings</h2><p>Sign in to manage privacy preferences and your workspace details.</p><a className="ws-button ws-primary" href="/sign-in">Sign in <ArrowRight size={16} /></a></section> : <><WorkspaceSettings user={user} onSave={async data => { const result = await mutate(() => api('/privacy/workspace', { method: 'PATCH', body: JSON.stringify(data) })); setUser(current => ({ ...current, workspace: result?.data || { ...current.workspace, ...data } })); setToast('Workspace settings saved.'); }} onUserChange={setUser} /><PlanCard plan={user?.workspace?.plan || 'free'} /><MemberPrivacyPanel user={user} /></>)}
      </div><footer className="ws-footer"><button type="button" className="ws-footer-brand-btn" onClick={() => go('Overview')}><img className="nexbrief-logo-mark" src="/images/nexbrief-logo.png" alt="" aria-hidden="true" /><b>nexbrief.</b></button><span>Your client work, moving.</span><button onClick={() => go('Settings')}>Settings <ArrowRight size={13} /></button></footer>
    </main>
    {maintenanceAlert && <div className="ws-maintenance-modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="maintenance-popup-title">
      <div className="ws-maintenance-modal">
        <div className="ws-maintenance-icon-badge" aria-hidden="true"><LockKeyhole size={28} /></div>
        <span className="ws-maintenance-kicker">MAINTENANCE ACTIVATED</span>
        <h2 id="maintenance-popup-title">Scheduled Maintenance in Progress</h2>
        <p className="ws-maintenance-subtitle">An administrator has activated maintenance mode for NexBrief.</p>
        <div className="ws-maintenance-admin-msg">
          <span className="ws-maintenance-admin-msg-label">Notice from Admin</span>
          <p>{maintenanceAlert.message}</p>
        </div>
        <div className="ws-maintenance-countdown-box">
          <div className="ws-maintenance-countdown-circle">
            <strong>{maintenanceAlert.countdown}</strong>
            <small>sec</small>
          </div>
          <div className="ws-maintenance-countdown-text">
            <strong>Auto-logging out for data safety</strong>
            <p>Your session will securely end in {maintenanceAlert.countdown} second{maintenanceAlert.countdown === 1 ? '' : 's'}.</p>
          </div>
        </div>
        <div className="ws-maintenance-actions">
          <button className="ws-button ws-primary ws-maintenance-logout-btn" onClick={signOut}>
            <LogOut size={16} /> Securely log out now
          </button>
        </div>
      </div>
    </div>}
    {signoutConfirm && <div className="ws-maintenance-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="signout-popup-title">
      <div className="ws-maintenance-modal ws-signout-modal">
        <div className="ws-signout-icon-badge" aria-hidden="true"><LogOut size={26} /></div>
        <span className="ws-signout-kicker">CONFIRM SIGN OUT</span>
        <h2 id="signout-popup-title">Ready to sign out?</h2>
        <p className="ws-maintenance-subtitle">Are you sure you want to exit your workspace? You will be safely signed out and returned to the login page.</p>
        <div className="ws-maintenance-countdown-box ws-signout-countdown-box">
          <div className="ws-maintenance-countdown-circle ws-signout-circle">
            <strong>{signoutConfirm.countdown}</strong>
            <small>sec</small>
          </div>
          <div className="ws-maintenance-countdown-text ws-signout-countdown-text">
            <strong>Auto-signout countdown</strong>
            <p>Signing out automatically in {signoutConfirm.countdown} second{signoutConfirm.countdown === 1 ? '' : 's'}. Click Cancel to stay in your workspace.</p>
          </div>
        </div>
        <div className="ws-signout-actions">
          <button type="button" className="ws-button ws-secondary ws-signout-cancel-btn" onClick={() => setSignoutConfirm(null)}>
            Cancel & Stay
          </button>
          <button type="button" className="ws-button ws-primary ws-signout-confirm-btn" onClick={signOut}>
            <LogOut size={16} /> Confirm Sign Out
          </button>
        </div>
      </div>
    </div>}
    {dialog && <Dialog title={dialog === 'proposal' ? `${profile.label} proposal` : dialog.lead ? 'Edit lead details' : `Add a ${profile.shortLabel.toLowerCase()} lead`} onClose={() => setDialog(null)}>{dialog === 'proposal' ? <ProposalForm leads={leads} currency={currency} onSave={saveProposal} /> : <LeadForm key={dialog.lead?.id || 'new'} lead={dialog.lead} currency={currency} serviceRole={serviceRole} onSave={saveLead} />}</Dialog>}
    {toast && <div role="status" className="ws-toast">{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
function Metric({ Icon, label, value, note }) { return <article className="ws-metric"><div className="ws-metric-heading"><span>{label}</span><span className="ws-metric-icon"><Icon size={17} /></span></div><strong>{value}</strong><small>{note}</small></article> }
function SectionHeader({ title, description, action, onAction }) { return <div className="ws-section-header"><div><h2>{title}</h2><p>{description}</p></div>{action && <button onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div> }
function Empty({ Icon, title, description, action, onAction }) { return <div className="ws-empty"><span className="ws-empty-icon"><Icon size={21} /></span><strong>{title}</strong><p>{description}</p>{action && <button className="ws-button ws-primary" onClick={onAction}><Plus size={16} />{action}</button>}</div> }
function LeadList({ leads, onEdit, onDraft, onArchive, writable, canDraft, showDetails = false }) { return <div className="ws-lead-list">{leads.map((lead, index) => <article className="ws-lead-row" key={lead.id}><span className={`ws-avatar ws-avatar-${lead.interest?.toLowerCase()}`}>{initials(lead.name)}</span><span className="ws-lead-row-main"><strong>{lead.company}</strong><small>{lead.name} · {lead.service}{lead.nextAction ? ` · ${lead.nextAction}` : ''}</small>{showDetails && (lead.email || lead.website) && <small>{lead.email || lead.website}</small>}{showDetails && lead.createdAt && <small className="ws-lead-date">Inbound · {dateLabel(lead.createdAt)}</small>}</span><span className={`ws-interest ws-interest-${lead.interest?.toLowerCase()}`}><i />{lead.interest}</span><span className="ws-lead-stage">{lead.stage}</span><strong className="ws-lead-value">{fieldNumber(lead)}</strong><span className="ws-lead-actions">{writable && <button className="ws-icon" aria-label={`Edit ${lead.company}`} onClick={() => onEdit(lead)}><Settings size={16} /></button>}{canDraft && <button className="ws-icon" aria-label={`Draft a message to ${lead.name}`} onClick={() => onDraft(lead, 'followup')}><Mail size={16} /></button>}{showDetails && writable && <button className="ws-icon ws-danger" aria-label={`Archive ${lead.company}`} onClick={() => onArchive(lead)}><ArrowDown size={16} /></button>}</span></article>)}</div> }
function LeadPagination({page,pageCount,total,onChange}){return <nav className="ws-pagination" aria-label="Inbound lead pages"><span>Showing {(page-1)*10+1}–{Math.min(page*10,total)} of {total}</span><div><button type="button" disabled={page===1} onClick={()=>onChange(page-1)} aria-label="Previous page">←</button><strong>{page} / {pageCount}</strong><button type="button" disabled={page===pageCount} onClick={()=>onChange(page+1)} aria-label="Next page">→</button></div></nav>}
