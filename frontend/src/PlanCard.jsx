import {ArrowRight,Sparkles} from 'lucide-react';
import './planCard.css';

const labels={free:'Free',pro:'Pro',plus:'Plus'};
const pricingHref='/?pricing=1#pricing';
export default function PlanCard({plan='free'}){const current=labels[plan]||'Free';return <section className="ws-card ws-plan-card"><div><span className="ws-eyebrow">CURRENT PLAN</span><h2>{current} workspace</h2><p>{plan==='plus'?'You have the highest usage limits for active client work.':plan==='pro'?'Your workspace has expanded outreach and lead capacity.':'Start with the core NexBrief workflow and upgrade when your pipeline grows.'}</p></div><span className={`ws-plan-badge ws-plan-${plan}`}>{current}</span>{plan!=='plus'&&<div className="ws-plan-upgrade"><span><Sparkles size={17}/><strong>Need more access?</strong><small>Plus includes 2,000 discoveries, 500 audits, 1,000 AI drafts, and storage for 5,000 leads.</small></span><div className="ws-plan-actions">{plan==='free'&&<a href={pricingHref} className="ws-button ws-secondary">Upgrade to Pro <ArrowRight size={15}/></a>}<a href={pricingHref} className="ws-button ws-primary">Upgrade to Plus <ArrowRight size={15}/></a></div></div>}</section>}
