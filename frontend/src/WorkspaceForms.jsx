import {useEffect, useRef, useState} from 'react';
import {X, ArrowRight} from 'lucide-react';
import {stages, localDateInput} from './workspaceUtils';
import {serviceProfile} from './serviceConfig';

export function Dialog({title, children, onClose}) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {document.body.style.overflow = overflow; element.close(); previous?.focus();};
  }, []);
  return <dialog className="ws-dialog" ref={dialog} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===dialog.current)onClose();}}>
    <div className="ws-dialog-body"><header><div><span className="ws-eyebrow">NEXBRIEF WORKSPACE</span><h2>{title}</h2></div><button className="ws-icon" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</div>
  </dialog>;
}

export function LeadForm({lead, currency, serviceRole='custom-service', onSave}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const services=serviceProfile(serviceRole).services;
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    data.value=Number(data.value);data.qualificationScore=Number(data.qualificationScore);
    if(data.nextActionAt)data.nextActionAt=new Date(data.nextActionAt).toISOString();else delete data.nextActionAt;
    try {await onSave(data);} catch(error) {setError(error.message);} finally {setBusy(false);}
  }
  return <form className="ws-form" onSubmit={submit}>
    <div className="ws-form-grid">
      <label>Contact name<input autoFocus name="name" required minLength={2} maxLength={120} defaultValue={lead?.name} placeholder="Taylor Morgan"/></label>
      <label>Company<input name="company" required minLength={2} maxLength={160} defaultValue={lead?.company} placeholder="Company or studio"/></label>
      <label>Email<input name="email" type="email" defaultValue={lead?.email} placeholder="taylor@example.com"/></label>
      <label>Phone<input name="phone" maxLength={40} defaultValue={lead?.phone} placeholder="Optional"/></label>
      <label>Service<select name="service" required defaultValue={lead?.service||services[0]}>{services.map(service=><option key={service}>{service}</option>)}</select></label>
      <label>Source<input name="source" maxLength={80} defaultValue={lead?.source} placeholder="Referral, website, social…"/></label>
      <label>Estimated project value<input name="value" type="number" min="0" step="0.01" required defaultValue={lead?.value || 0}/></label>
      <label>Currency<select name="currency" defaultValue={lead?.currency || currency || 'USD'}>{['USD','INR','EUR','GBP','CAD','AUD'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Interest<select name="interest" defaultValue={lead?.interest || 'Warm'}>{['Hot','Warm','Cold'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Sales stage<select name="stage" defaultValue={lead?.stage || 'New lead'}>{stages.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Qualification score (0–100)<input name="qualificationScore" type="number" min="0" max="100" step="1" defaultValue={lead?.qualificationScore || 0}/></label>
      <label>Next follow-up<input name="nextActionAt" type="datetime-local" defaultValue={localDateInput(lead?.nextActionAt)}/></label>
    </div>
    <label>Website<input name="website" type="url" defaultValue={lead?.website} placeholder="https://example.com"/></label>
    <label>Next action<input name="nextAction" maxLength={240} defaultValue={lead?.nextAction || 'Qualify this lead'}/></label>
    <label>Client notes<textarea name="notes" maxLength={10000} rows={3} defaultValue={lead?.notes} placeholder="Their goals, budget, timeline, and what you discussed."/></label>
    {error&&<p className="ws-error" role="alert">{error}</p>}
    <button className="ws-button ws-primary" disabled={busy}>{busy?'Saving…':lead?'Save changes':'Save lead'}<ArrowRight size={16}/></button>
  </form>;
}

export function ProposalForm({leads, currency, onSave}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function submit(event) {
    event.preventDefault();setError('');
    const data=Object.fromEntries(new FormData(event.currentTarget));
    data.amount=Number(data.amount);data.deposit=Number(data.deposit);
    data.deliverables=data.deliverables.split('\n').map(value=>value.trim()).filter(Boolean);
    if(data.deposit>data.amount){setError('The deposit must be less than or equal to the project amount.');return;}
    setBusy(true);try{await onSave(data);}catch(error){setError(error.message);}finally{setBusy(false);}
  }
  return <form className="ws-form" onSubmit={submit}>
    <label>Client<select name="leadId" required defaultValue=""><option value="" disabled>Select a lead</option>{leads.map(lead=><option value={lead.id} key={lead.id}>{lead.company} · {lead.name}</option>)}</select></label>
    <label>Proposal title<input autoFocus required minLength={2} maxLength={200} name="title" placeholder="Website redesign & launch"/></label>
    <label>Scope summary<textarea name="summary" maxLength={10000} rows={3} placeholder="What will you create for this client?"/></label>
    <label>Deliverables<textarea name="deliverables" rows={3} placeholder="One deliverable per line"/></label>
    <div className="ws-form-grid"><label>Project amount<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Deposit amount<input name="deposit" type="number" min="0" step="0.01" defaultValue={0} required/></label><label>Currency<select name="currency" defaultValue={currency || 'USD'}>{['USD','INR','EUR','GBP','CAD','AUD'].map(value=><option key={value}>{value}</option>)}</select></label><label>Timeline<input name="timeline" required minLength={2} maxLength={500} placeholder="3 weeks from deposit"/></label></div>
    <p className="ws-muted">Saves a proposal record. Email delivery and online payment collection are not connected.</p>
    {error&&<p className="ws-error" role="alert">{error}</p>}
    <button className="ws-button ws-primary" disabled={busy || !leads.length}>{busy?'Saving…':'Create proposal'}<ArrowRight size={16}/></button>
  </form>;
}
