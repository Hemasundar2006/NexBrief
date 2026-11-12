import {useEffect} from 'react';
import {ArrowUpRight,Code2} from 'lucide-react';
import './motion.css';

export default function LandingMotion({onStage}) {
 useEffect(()=>{
  const root=document.querySelector('.clienter-inspired');
  const journey=root.querySelector('.journey');
  const product=root.querySelector('.dashboard-stage');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const update=()=>{frame=0;if(reduced.matches)return;
   const rect=journey.getBoundingClientRect();
   const progress=Math.max(0,Math.min(1,-rect.top/(rect.height-innerHeight)));
   root.style.setProperty('--flow-progress',progress);
   root.style.setProperty('--flow-turn',`${-12+progress*24}deg`);
   if(innerWidth>900&&rect.top<100&&rect.bottom>innerHeight)onStage(Math.min(3,Math.floor(progress*4)));
   const p=Math.max(0,Math.min(1,(innerHeight-product.getBoundingClientRect().top)/innerHeight));
   root.style.setProperty('--product-tilt',`${20*(1-p)}deg`);
  };
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('revealed')}),{threshold:.12});
  root.querySelectorAll('.feature-grid article,.compare article,.founder-panel').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);update();
  return()=>{removeEventListener('scroll',scroll);removeEventListener('resize',scroll);cancelAnimationFrame(frame);observer.disconnect()};
 },[onStage]);
 return <section className="founder-panel" id="founder"><div className="founder-portrait"><img src="/images/founder.jpeg" alt="Hemasundar Maroti, founder and developer of NexBrief" loading="lazy"/><span><Code2 size={17}/> Built by an independent maker</span></div><div className="founder-copy"><span className="maker-label">THE PERSON BEHIND NEXBRIEF</span><h2>Built with care.<br/><em>For people who create.</em></h2><p>NexBrief brings the business side of freelance work into focus—from the first conversation to the first deposit. More clarity for your clients. More space for your craft.</p><div className="founder-signature"><strong>Hemasundar Maroti</strong><span>Founder & Developer · NexBrief</span></div><a href="#workflow">See the idea in action <ArrowUpRight size={18}/></a></div></section>
}
