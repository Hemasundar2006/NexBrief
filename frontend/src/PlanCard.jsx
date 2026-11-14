import {ArrowRight,Sparkles} from 'lucide-react';
import './planCard.css';

const labels={free:'Free',pro:'Pro',plus:'Plus'};
const pricingHref='/?pricing=1#pricing';
export default function PlanCard({plan='free'}){const current=labels[plan]||'Free';return <section className="ws-card ws-plan-card"><div><span className="ws-eyebrow">CURRENT PLAN</span><h2>{current} plan</h2><p>{plan==='plus'?'You have the highest limits available in NexBrief.':plan==='pro'?'You can save more clients and create more AI message drafts.':'Use the main client workflow for free. Upgrade only when you need higher limits.'}</p></div><span className={`ws-plan-badge ws-plan-${plan}`}>{current}</span>{plan!=='plus'&&<div className="ws-plan-upgrade"><span><Sparkles size={17}/><strong>Need higher limits?</strong><small>Plus includes 2,000 business searches, 500 website checks, 1,000 AI drafts, and 5,000 saved clients.</small></span><div className="ws-plan-actions">{plan==='free'&&<a href={pricingHref} className="ws-button ws-secondary">View Pro plan <ArrowRight size={15}/></a>}<a href={pricingHref} className="ws-button ws-primary">View Plus plan <ArrowRight size={15}/></a></div></div>}</section>}
