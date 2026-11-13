import {useEffect,useState} from 'react';
import {Activity,Check,Construction,CreditCard,LogOut,RefreshCw,ShieldCheck,TrendingUp,Users} from 'lucide-react';
import MainAdminPanel from './MainAdminPanel';
import {api,authToken} from './api';
import './mainAdminShell.css';
import './admin-polish.css';
import './admin-ledger.css';

function Maintenance({preview}){
  const [settings,setSettings]=useState({
    maintenanceMode:false,
    pauseRegistrations:false,
    maintenanceNotice:'NexBrief is currently undergoing scheduled maintenance. Please check back shortly.'
  });
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');

  useEffect(()=>{
    if(preview)return;
    api('/platform/settings')
      .then(res=>{
        if(res.data){
          setSettings(res.data);
          setNotice(res.data.maintenanceNotice||'');
        }
      })
      .catch(()=>{});
  },[preview]);

  const toggle = async (key) => {
    const nextVal = !settings[key];
    if(preview){
      setSettings(s => ({...s, [key]: nextVal}));
      return;
    }
    setBusy(true);
    try{
      const res = await api('/platform/settings',{
        method:'PATCH',
        body: JSON.stringify({[key]: nextVal})
      });
      if(res.data){
        setSettings(res.data);
      }
      setToast(key==='maintenanceMode'
        ? (nextVal ? 'Platform maintenance is now ENABLED.' : 'Platform maintenance is now DISABLED.')
        : (nextVal ? 'New member registrations are now PAUSED.' : 'New member registrations are now ACTIVE.'));
      setTimeout(()=>setToast(''), 4500);
    }catch(err){
      setToast(err.message||'Could not update setting.');
    }finally{
      setBusy(false);
    }
  };

  const saveNotice = async (e) => {
    e.preventDefault();
    if(preview) return;
    setBusy(true);
    try{
      const res = await api('/platform/settings',{
        method:'PATCH',
        body: JSON.stringify({maintenanceNotice: notice})
      });
      if(res.data) setSettings(res.data);
      setToast('Maintenance notice updated.');
      setTimeout(()=>setToast(''), 4500);
    }catch(err){
      setToast(err.message||'Could not save notice.');
    }finally{
      setBusy(false);
    }
  };

  return <section className="main-admin-page">
    <span className="platform-detail-kicker">PLATFORM SETTINGS</span>
    <h1>Maintenance modes</h1>
    <p>Control platform-wide availability and notices without opening any member CRM data.</p>
    {toast && <div className="main-admin-toast" role="status"><Check size={16}/> {toast}</div>}
    
    <div className="main-admin-setting">
      <span>
        <strong>Platform maintenance</strong>
        <small>Show a maintenance notice to member workspaces while you update NexBrief. Platform admin access remains active.</small>
      </span>
      <button
        type="button"
        className={`main-admin-toggle ${settings.maintenanceMode ? 'is-on' : ''}`}
        aria-pressed={settings.maintenanceMode}
        disabled={busy}
        onClick={()=>toggle('maintenanceMode')}
      >
        <i/>{settings.maintenanceMode ? 'Enabled' : 'Disabled'}
      </button>
    </div>

    <div className="main-admin-setting">
      <span>
        <strong>New registrations</strong>
        <small>Temporarily pause new member account registrations during platform updates.</small>
      </span>
      <button
        type="button"
        className={`main-admin-toggle ${settings.pauseRegistrations ? 'is-on' : ''}`}
        aria-pressed={settings.pauseRegistrations}
        disabled={busy}
        onClick={()=>toggle('pauseRegistrations')}
      >
        <i/>{settings.pauseRegistrations ? 'Paused' : 'Active'}
      </button>
    </div>

    <form className="main-admin-setting-notice" onSubmit={saveNotice}>
      <label>
        <strong>Custom maintenance notice</strong>
        <small>Message displayed to visitors and members when maintenance is active.</small>
        <textarea
          rows={3}
          value={notice}
          maxLength={500}
          disabled={busy}
          onChange={e=>setNotice(e.target.value)}
          placeholder="NexBrief is currently undergoing scheduled maintenance. Please check back shortly."
        />
      </label>
      <button type="submit" className="main-admin-btn" disabled={busy || notice === settings.maintenanceNotice}>
        Save notice
      </button>
    </form>

    <div className="main-admin-note">
      <ShieldCheck size={18}/>
      <span>These controls affect platform availability only. They do not grant access to member leads, proposals, drafts, or payments.</span>
    </div>
  </section>;
}

function OwnerActivity({preview}){
  const [activities,setActivities]=useState([]);
  const [loading,setLoading]=useState(!preview);

  useEffect(()=>{
    if(preview){
      setActivities([]);
      return;
    }
    api('/platform/activity')
      .then(res=>{
        setActivities(res.data||[]);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[preview]);

  return <section className="main-admin-page">
    <span className="platform-detail-kicker">OWNER ACTIVITY</span>
    <h1>Platform activity</h1>
    <p>Administrative events recorded for platform status, maintenance modes, and member account updates.</p>
    {activities.length > 0 ? (
      <div className="admin-table">
        <div className="admin-table-head">
          <span>Action</span>
          <span>Target</span>
          <span>Details</span>
          <span>Date</span>
        </div>
        {activities.map(item => (
          <div className="admin-table-row" key={item._id||item.id}>
            <strong>{item.action}</strong>
            <span>{item.entityType}: {item.entityId}</span>
            <span>{item.metadata ? Object.entries(item.metadata).map(([k,v])=>`${k}=${v}`).join(', ') : '—'}</span>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
    ) : (
      <div className="main-admin-empty">
        <Activity size={22}/>
        <strong>{loading ? 'Loading platform activity…' : 'No platform events recorded yet'}</strong>
        <span>Member CRM activity stays inside each member workspace. Platform maintenance toggles and member status updates appear here.</span>
      </div>
    )}
  </section>;
}

const limits={free:[20,5,10,20],pro:[500,100,200,1000],plus:[2000,500,1000,5000]};
function AdminUsage({preview}){const [members,setMembers]=useState(preview?[{name:'Alex Morgan',workspace:{plan:'free'}},{name:'Casey Rivera',workspace:{plan:'pro'}},{name:'Jordan Lee',workspace:{plan:'plus'}}]:[]);useEffect(()=>{if(!preview)api('/platform/overview').then(result=>setMembers(result.data||[])).catch(()=>{})},[preview]);return <section className="main-admin-page"><span className="platform-detail-kicker">USAGE OVERSIGHT</span><h1>Usage across NexBrief.</h1><p>Review plan limits and account-level consumption. Private leads, messages, proposals, and payments are never loaded here.</p><div className="admin-usage-summary"><article><TrendingUp size={18}/><span>Accounts tracked</span><strong>{members.length||'—'}</strong></article><article><span>Plus accounts</span><strong>{members.filter(item=>(item.workspace?.plan||'free')==='plus').length||'0'}</strong></article><article><span>Plan limits</span><strong>4</strong><small>tracked categories</small></article></div><div className="admin-table"><div className="admin-table-head"><span>Member</span><span>Plan</span><span>Discoveries</span><span>AI drafts</span><span>Stored leads</span></div>{members.map(member=>{const plan=member.workspace?.plan||'free';const [discoveries,audits,outreach,stored]=limits[plan]||limits.free;return <div className="admin-table-row" key={member.id||member.name}><strong>{member.name}</strong><span className={`ws-plan-badge ws-plan-${plan}`}>{plan}</span><span>0 / {discoveries.toLocaleString()}</span><span>0 / {outreach.toLocaleString()}</span><span>0 / {stored.toLocaleString()}</span></div>})}</div><div className="main-admin-note"><ShieldCheck size={18}/><span>Usage totals are metadata only. Detailed CRM content remains private to each member workspace.</span></div></section>}
function AdminBilling({preview}){const [stats,setStats]=useState({});const [rows,setRows]=useState([]);useEffect(()=>{if(preview){setStats({subscriptions:3,active:2,failedRenewals:0,collectedRevenue:2});setRows([]);return}Promise.all([api('/admin/subscription-analytics'),api('/admin/subscriptions')]).then(([analytics,subscriptions])=>{setStats(analytics.data||{});setRows(subscriptions.data||[])}).catch(()=>{})},[preview]);return <section className="main-admin-page"><span className="platform-detail-kicker">BILLING OVERSIGHT</span><h1>Verified subscriptions.</h1><p>Monitor Cashfree authorization, renewals, and collected revenue. Member CRM content stays private.</p><div className="admin-billing-summary"><article><CreditCard size={18}/><span>Total subscriptions</span><strong>{stats.subscriptions||0}</strong></article><article><span>Active</span><strong>{stats.active||0}</strong></article><article><span>Collected revenue</span><strong>₹{Number(stats.collectedRevenue||0).toLocaleString()}</strong></article><article><span>Failed renewals</span><strong>{stats.failedRenewals||0}</strong></article></div><div className="admin-table admin-billing-table"><div className="admin-table-head"><span>Customer</span><span>Subscription</span><span>Plan</span><span>Cycle</span><span>Status</span><span>Next billing</span></div>{rows.map(row=><div className="admin-table-row" key={row._id}><strong>{row.userId?.name||'Member'}<small>{row.userId?.email}</small></strong><span>{row.subscriptionId}</span><span className={`ws-plan-badge ws-plan-${row.planId}`}>{row.planName}</span><span>{row.billingCycle}</span><span>{row.subscriptionStatus}</span><span>{row.nextBillingDate?new Date(row.nextBillingDate).toLocaleDateString():'—'}</span></div>)}{!rows.length&&<div className="admin-empty-row">No Cashfree subscriptions yet.</div>}</div><div className="main-admin-note"><ShieldCheck size={18}/><span>Revenue is calculated only from verified Cashfree transactions. Admin cannot mark payments successful manually.</span></div></section>}
function AdminTransactionLedger({preview}){const [rows,setRows]=useState([]);useEffect(()=>{if(!preview)api('/admin/transactions').then(result=>setRows(result.data||[])).catch(()=>{})},[preview]);return <section className="main-admin-page"><span className="platform-detail-kicker">TRANSACTION LEDGER</span><h2>Cashfree payment records</h2><p>Initial authorizations and recurring renewals, with verified status only.</p><div className="admin-table"><div className="admin-table-head"><span>Payment</span><span>Member</span><span>Type</span><span>Amount</span><span>Status</span><span>Date</span></div>{rows.map(row=><div className="admin-table-row admin-transaction-row" key={row._id}><strong>{row.cashfreePaymentId||row._id}</strong><span>{row.userId?.name||row.userId?.email||'Member'}</span><span>{row.transactionType}</span><span>₹{row.amount}</span><span>{row.paymentStatus}</span><span>{row.paymentTimestamp?new Date(row.paymentTimestamp).toLocaleString():'—'}</span></div>)}{!rows.length&&<div className="admin-empty-row">No Cashfree transactions have been verified yet.</div>}</div></section>}

export default function MainAdminShell({preview=false}){
  const [view,setView]=useState('members');
  async function adminSignOut(){
    if(!preview){
      try{ await api('/auth/logout',{method:'POST'}); }catch{}
    }
    authToken.clear();
    window.location.assign('/sign-in');
  }
  return <div className="main-admin-shell"><aside className="main-admin-nav"><div className="main-admin-nav-brand"><img className="nexbrief-logo-mark" src="/images/nexbrief-logo.png" alt="" aria-hidden="true" /><b>nexbrief.</b></div><span className="main-admin-nav-label">MAIN ADMIN</span><button className={view==='members'?'is-active':''} onClick={()=>setView('members')}><Users size={17}/>Member accounts</button><button className={view==='usage'?'is-active':''} onClick={()=>setView('usage')}><TrendingUp size={17}/>Usage & limits</button><button className={view==='billing'?'is-active':''} onClick={()=>setView('billing')}><CreditCard size={17}/>Billing & transactions</button><button className={view==='maintenance'?'is-active':''} onClick={()=>setView('maintenance')}><Construction size={17}/>Maintenance modes</button><button className={view==='activity'?'is-active':''} onClick={()=>setView('activity')}><Activity size={17}/>Owner activity</button><div className="main-admin-nav-actions"><button type="button" className="main-admin-signout-btn" onClick={adminSignOut} title="Sign out of Main Admin"><LogOut size={16}/><span>Sign out</span></button></div><div className="main-admin-nav-footer"><ShieldCheck size={15}/>Account-level access only</div></aside><div className="main-admin-view">{view==='members'?<MainAdminPanel preview={preview}/>:view==='usage'?<AdminUsage preview={preview}/>:view==='billing'?<><AdminBilling preview={preview}/><AdminTransactionLedger preview={preview}/></>:view==='maintenance'?<Maintenance preview={preview}/>:<OwnerActivity preview={preview}/>}</div></div>}
