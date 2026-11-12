import { useState } from 'react';
import { ArrowRight, Check, Code2, Film, FileText, Sparkles, Users, ShieldCheck, Clock3, WalletCards } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './dub-theme.css';
import './dub-light.css';
import './reaidy.css';
import './dub-reference.css';
import './landing-experience.css';

export default function FeaturesPage() {
  const [video, setVideo] = useState(false);
  const client = video ? 'Studio North' : 'Bright Dental';

  return (
    <div className="reaidy-page">
      <LandingNav active="features" />

      <main>
        <section className="rd-page-hero">
          <span className="rd-eyebrow-pill">NEXBRIEF CAPABILITIES</span>
          <h1>
            Build your business<br />
            <span>with clarity.</span>
          </h1>
          <p>
            Thoughtful tools for the work that happens before the project begins.
            Capture leads, draft outreach, send proposals, and track deposits.
          </p>
          <div className="rd-audience">
            <button className={!video ? 'chosen' : ''} onClick={() => setVideo(false)}>
              WEB DEVELOPER
            </button>
            <button
              role="switch"
              aria-checked={video}
              aria-label="Video editor mode"
              className={`rd-toggle ${video ? 'switched' : ''}`}
              onClick={() => setVideo(!video)}
            >
              <span />
            </button>
            <button className={video ? 'chosen' : ''} onClick={() => setVideo(true)}>
              VIDEO EDITOR
            </button>
          </div>
        </section>

        <section className="rd-section rd-features" id="features">
          <div className="rd-cards">
            {[
              [
                Users,
                'Every lead, in one place',
                'Keep client details, interest and next actions together. Know where every conversation stands.',
              ],
              [
                Sparkles,
                'AI that gets you started',
                'Create thoughtful outreach and timely follow-ups. Review every draft and make it your own.',
              ],
              [
                FileText,
                'From proposal to paid',
                'Set clear expectations. Keep scope, acceptance and deposit status in view.',
              ],
            ].map(([Icon, title, copy], i) => (
              <article key={title}>
                <div className="rd-feature-icon">
                  <Icon />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <div className="rd-mini">
                  {i === 0 ? (
                    <>
                      {[
                        client,
                        video ? 'Daily Frame' : 'Oak & Pine',
                        video ? 'Bright Stories' : 'Northstar Fitness',
                      ].map((n, j) => (
                        <div className="rd-mini-lead" key={n}>
                          <i>{n[0]}</i>
                          <span>
                            <b>{n}</b>
                            <small>{video ? 'Video editing' : 'Website project'}</small>
                          </span>
                          <em>{j ? 'Warm' : 'Hot'}</em>
                        </div>
                      ))}
                    </>
                  ) : i === 1 ? (
                    <>
                      <small>
                        <Sparkles size={12} /> OUTREACH ASSISTANT
                      </small>
                      <p>
                        Hi Alex,
                        <br />
                        <br />
                        I’d love to learn more about your{' '}
                        {video ? 'upcoming videos' : 'website plans'} and see how I could
                        help.
                        <br />
                        <br />
                        Would a short chat this week work?
                      </p>
                      <span className="rd-ready">
                        <Check size={13} /> Ready for your review
                      </span>
                    </>
                  ) : (
                    <>
                      <b>Project proposal</b>
                      <p>{client}</p>
                      <div className="rd-money">
                        <span>Project total</span>
                        <b>{video ? '$1,800' : '$3,500'}</b>
                      </div>
                      <div className="rd-money">
                        <span>Deposit recorded</span>
                        <b>{video ? '$540' : '$1,050'}</b>
                      </div>
                      <div className="rd-meter">
                        <i />
                      </div>
                      <small>30% deposit · 70% remaining</small>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rd-audiences">
          <small>DESIGNED SPECIFICALLY FOR INDEPENDENT CREATORS</small>
          <p className="rd-audience-note">Zero bloat. Only the tools you need to close better projects.</p>
          <div>
            <span><Code2 /> Web developers</span>
            <span><Film /> Video editors</span>
            <span><Sparkles /> Independent creatives</span>
          </div>
        </section>

        <section className="rd-closing">
          <div className="rd-closing-top">
            <small>NEXBRIEF · FROM FIRST HELLO TO PAID</small>
            <span>START YOUR CLIENT PIPELINE TODAY</span>
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
              <a href="/how-it-works" className="rd-closing-secondary">
                See how it works <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

