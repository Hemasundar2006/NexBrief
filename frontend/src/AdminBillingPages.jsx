import { useEffect, useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { api } from './api';
import './adminBillingPages.css';

function Pager({ page, pages, total, onPage }) {
  return <div className="admin-billing-pager"><span>{total} records · Page {page} of {Math.max(1, pages)}</span><div><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div></div>;
}

export function AdminBilling({ preview }) {
  const [stats, setStats] = useState({});
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (preview) { setStats({ subscriptions: 3, active: 2, collectedRevenue: 2 }); setRows([]); return; }
    api('/admin/subscription-analytics').then(result => setStats(result.data || {})).catch(problem => setError(problem.message));
  }, [preview]);
  useEffect(() => {
    if (preview) return;
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ page: String(page), limit: '25' });
      if (search.trim()) query.set('search', search.trim());
      if (status) query.set('status', status);
      api(`/admin/subscriptions?${query}`).then(result => { setRows(result.data || []); setMeta(result.pagination || { page, pages: 1, total: 0 }); setError(''); }).catch(problem => setError(problem.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [preview, page, search, status]);
  return <section className="main-admin-page"><span className="platform-detail-kicker">SUBSCRIPTIONS</span><h1>Plans and subscription payments</h1><p>See active plans, upcoming renewals, failed renewals, and money received. Private client work is not shown.</p><div className="admin-billing-summary"><article><CreditCard size={18}/><span>All subscriptions</span><strong>{stats.subscriptions || 0}</strong></article><article><span>Active subscriptions</span><strong>{stats.active || 0}</strong></article><article><span>Money received</span><strong>₹{Number(stats.collectedRevenue || 0).toLocaleString()}</strong></article><article><span>Failed renewals</span><strong>{stats.failedRenewals || 0}</strong></article></div><div className="admin-billing-filters"><input aria-label="Search subscriptions" placeholder="Search member name or email" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><select aria-label="Filter subscription status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All payment statuses</option><option value="ACTIVE">Active</option><option value="PENDING">Waiting for payment</option><option value="CANCELLED">Cancelled</option><option value="EXPIRED">Expired</option></select></div>{error && <p role="alert">{error}</p>}<div className="admin-table admin-billing-table"><div className="admin-table-head"><span>Member</span><span>Subscription ID</span><span>Plan</span><span>Payment schedule</span><span>Status</span><span>Next payment</span></div>{rows.map(row => <div className="admin-table-row" key={row._id}><strong>{row.userId?.name || 'Member'}<small>{row.userId?.email}</small></strong><span>{row.subscriptionId}</span><span className={`ws-plan-badge ws-plan-${row.planId}`}>{row.planName}</span><span>{row.billingCycle}</span><span>{row.subscriptionStatus}</span><span>{row.nextBillingDate ? new Date(row.nextBillingDate).toLocaleDateString() : '—'}</span></div>)}{!rows.length && <div className="admin-empty-row">No subscriptions match your search.</div>}</div><Pager {...meta} onPage={setPage}/><div className="main-admin-note"><ShieldCheck size={18}/><span>The total includes only payments confirmed as successful.</span></div></section>;
}

export function AdminTransactionLedger({ preview }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (preview) return;
    const query = new URLSearchParams({ page: String(page), limit: '25' });
    if (status) query.set('status', status);
    api(`/admin/transactions?${query}`).then(result => { setRows(result.data || []); setMeta(result.pagination || { page, pages: 1, total: 0 }); setError(''); }).catch(problem => setError(problem.message));
  }, [preview, page, status]);
  return <section className="main-admin-page"><span className="platform-detail-kicker">PAYMENT HISTORY</span><h2>Cashfree payments</h2><p>See first payments, renewals, failures, and refunds.</p><div className="admin-billing-filters"><select aria-label="Filter payment status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All payment statuses</option><option value="SUCCESS">Successful</option><option value="FAILED">Failed</option><option value="PENDING">Waiting</option><option value="REFUNDED">Refunded</option></select></div>{error && <p role="alert">{error}</p>}<div className="admin-table"><div className="admin-table-head"><span>Payment ID</span><span>Member</span><span>Payment type</span><span>Amount</span><span>Status</span><span>Date</span></div>{rows.map(row => <div className="admin-table-row admin-transaction-row" key={row._id}><strong>{row.cashfreePaymentId || row._id}</strong><span>{row.userId?.name || row.userId?.email || 'Member'}</span><span>{row.transactionType}</span><span>₹{row.amount}</span><span>{row.paymentStatus}</span><span>{row.paymentTimestamp ? new Date(row.paymentTimestamp).toLocaleString() : '—'}</span></div>)}{!rows.length && <div className="admin-empty-row">No payments match this filter.</div>}</div><Pager {...meta} onPage={setPage}/></section>;
}
