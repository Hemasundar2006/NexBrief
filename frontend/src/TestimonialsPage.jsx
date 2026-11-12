import { ArrowRight, Code2, Film, Sparkles } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './dub-theme.css';
import './dub-light.css';
import './reaidy.css';
import './dub-reference.css';
import './landing-experience.css';

const sampleQuotes = [
  [
    'WD',
    'Web developer',
    'Less context switching',
    'I want one place to see which website leads need a reply and which are ready for a proposal.',
  ],
  [
    'VE',
    'Video editor',
    'More creative headspace',
    'Keeping a creator’s brief, editing package and deposit together would make every handoff clearer.',
  ],
  [
    'IC',
    'Independent creative',
    'A calmer way to follow up',
    'A clear next step for each conversation helps me keep track of promising projects.',
  ],
  [
    'FD',
    'Freelance developer',
    'One clear next step',
    'I need to know which project needs a reply, a proposal, or a deposit reminder.',
  ],
  [
    'FE',
    'Freelance editor',
    'Client work, organized',
    'Keeping briefs, packages, and payment status together would simplify every handoff.',
  ],
  [
    'CF',
    'Creative freelancer',
    'Less admin between projects',
    'A lightweight pipeline helps me follow through without losing time for client work.',
  ],
  [
    'WD',
    'Web designer',
    'A better first impression',
    'A clear proposal and follow-up process helps me make the client experience feel more professional.',
  ],
  [
    'VE',
    'Short-form editor',
    'Every brief in one place',
    'I want project details, editing scope, and client replies together instead of spread across chats.',
  ],
  [
    'FP',
    'Freelance producer',
    'No more missed replies',
    'Seeing who is waiting on me would make my weekly client check-in much easier.',
  ],
  [
    'WD',
    'WordPress developer',
    'A pipeline I can trust',
    'A simple view of new inquiries and active proposals would help me plan my workload.',
  ],
  [
    'VE',
    'Post-production editor',
    'Deposits stay visible',
    'Keeping deposit status beside the project details would make it easier to know when work can start.',
  ],
  [
    'IC',
    'Independent creative',
    'A smoother client journey',
    'From the first inquiry to a signed proposal, I want each next step to be easy to find.',
  ],
];

export default function TestimonialsPage() {
  return (
    <div className="reaidy-page">
      <LandingNav active="testimonials" />

      <main>
        <section className="rd-page-hero">
          <span className="rd-eyebrow-pill">COMMUNITY PERSPECTIVES</span>
          <h1>
            More room for<br />
            <span>your best work.</span>
          </h1>
          <p>
            Hear why freelance web developers, video editors, and creative independents
            prefer a focused pipeline over generic spreadsheet chaos.
          </p>
        </section>

        <section className="rd-section rd-testimonials" id="testimonials">
          <div className="rd-title">
            <small className="rd-kicker">WHAT FREELANCERS VALUE</small>
            <h2>Clarity at every handoff.</h2>
            <p>Illustrative testimonials — sample feedback representing our core freelance personas.</p>
          </div>

          <div className="rd-quotes-marquee" aria-label="Freelancer feedback">
            <div className="rd-quotes-track">
              {Array.from({ length: 4 }, (_, column) => {
                const cards = sampleQuotes.filter((_, i) => i % 4 === column);
                return (
                  <div
                    className="rd-quotes-column"
                    key={column}
                    aria-hidden={column > 0}
                  >
                    {[...cards, ...cards].map(
                      ([initials, role, title, quote], i) => (
                        <article
                          className={i % 2 ? 'quote-reverse' : ''}
                          key={`${role}-${i}`}
                        >
                          <small>ILLUSTRATIVE PERSONA</small>
                          <div className="rd-quote-mark">“</div>
                          <h3>{title}</h3>
                          <p>{quote}</p>
                          <footer>
                            <i>{initials}</i>
                            <div>
                              <b>{role}</b>
                              <small>Sample feedback</small>
                            </div>
                          </footer>
                        </article>
                      ),
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rd-audiences">
          <small>THREE PROFESSIONS · ONE SHARED NEED</small>
          <p className="rd-audience-note">A calmer, professional way to run the business side of freelancing.</p>
          <div>
            <span><Code2 /> Web developers</span>
            <span><Film /> Video editors</span>
            <span><Sparkles /> Independent creatives</span>
          </div>
        </section>

        <section className="rd-closing">
          <div className="rd-closing-top">
            <small>NEXBRIEF · COMMUNITY</small>
            <span>DISCOVER A CALMER FREELANCE PIPELINE</span>
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

