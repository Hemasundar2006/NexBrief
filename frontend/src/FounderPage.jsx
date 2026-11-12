import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './dub-theme.css';
import './dub-light.css';
import './reaidy.css';
import './dub-reference.css';
import './landing-experience.css';

export default function FounderPage() {
  return (
    <div className="reaidy-page">
      <LandingNav active="founder" />

      <main>
        <section className="rd-page-hero">
          <span className="rd-eyebrow-pill">THE PERSON BEHIND NEXBRIEF</span>
          <h1>
            Built with care.<br />
            <span>For people who create.</span>
          </h1>
          <p>
            A focused workspace for the business side of freelance work—from the
            first conversation to the first deposit.
          </p>
        </section>

        <section className="rd-founder-page">
          <div className="rd-founder-story">
            <img
              src="/images/founder.jpeg"
              loading="lazy"
              alt="Hemasundar Maroti, NexBrief founder and developer"
            />
            <div className="rd-founder-content">
              <small className="rd-kicker">FOUNDER PHILOSOPHY</small>
              <h2>
                More clarity for your clients.<br />
                <span>More space for your craft.</span>
              </h2>
              <p>
                As freelancers, we love designing websites, cutting videos, and building
                creative projects. What we don't love is context switching between five
                different tabs, lost messages across chats, and wondering whether a client
                deposit actually arrived before starting work.
              </p>
              <p>
                Generic enterprise CRMs are bloated with complicated pipelines, sales
                funnels, and cold-calling sequences designed for 50-person sales departments.
                Independent creators don't need a corporate spreadsheet—we need a clear,
                calm workspace that tracks who reached out, what the next action is, and
                when the deposit is paid.
              </p>
              <p>
                NexBrief was built from the ground up to solve that exact pain. It keeps your
                client journey streamlined into four simple moves: inquiry, follow-up,
                proposal, and deposit.
              </p>
              <div className="rd-founder-signature">
                <strong>Hemasundar Maroti</strong>
                <small>Founder & Developer · NexBrief</small>
              </div>
            </div>
          </div>
        </section>

        <section className="rd-closing">
          <div className="rd-closing-top">
            <small>NEXBRIEF · FOUNDER STORY</small>
            <span>JOIN US ON THE JOURNEY</span>
          </div>
          <div className="rd-closing-main">
            <div>
              <h2>
                Turn a good lead<br />
                into <span>paid work.</span>
              </h2>
              <p>Keep every client conversation, proposal, and deposit moving in one clear place.</p>
            </div>
            <div className="rd-closing-actions">
              <a href="/start-free" className="rd-closing-primary">
                Start free <ArrowRight size={17} />
              </a>
              <a href="/features" className="rd-closing-secondary">
                See all features <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

