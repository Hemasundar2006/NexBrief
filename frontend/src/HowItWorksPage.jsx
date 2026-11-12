import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Code2, Film, Users } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './dub-theme.css';
import './dub-light.css';
import './reaidy.css';
import './dub-reference.css';
import './landing-experience.css';

const steps = ['Inquiry', 'Qualify', 'Follow-up', 'Proposal', 'Deposit'];
const workflow = [
  {
    title: 'Catch every new inquiry.',
    detail:
      'A potential client reaches out about a project. Add the person, service, budget, and source to one lead record.',
    action: 'Add the inquiry and project details',
    system: 'NexBrief puts the lead in your pipeline with a clear next step.',
    status: 'New inquiry',
    next: 'Qualify the opportunity',
  },
  {
    title: 'Decide if it is a good fit.',
    detail:
      'Check the client’s needs, timing, budget, and service type before spending time preparing an offer.',
    action: 'Mark fit, interest, and priority',
    system: 'The lead record keeps those details beside the conversation.',
    status: 'Qualified · Interested',
    next: 'Prepare a thoughtful follow-up',
  },
  {
    title: 'Follow up with context.',
    detail:
      'Use the conversation so far to write a relevant reply, then review it and send it yourself.',
    action: 'Review and send your message',
    system: 'AI helps draft the words. You stay in control of every message.',
    status: 'Draft ready for review',
    next: 'Put the scope in a proposal',
  },
  {
    title: 'Make the offer easy to understand.',
    detail:
      'Set the scope, project value, timeline, and deposit terms in a proposal the client can review.',
    action: 'Confirm scope and project amount',
    system: 'NexBrief keeps proposal status and project details together.',
    status: 'Proposal prepared',
    next: 'Track the deposit',
  },
  {
    title: 'Track the deposit. Start with clarity.',
    detail:
      'See whether the deposit is due, paid, or still waiting before you begin the project.',
    action: 'Record deposit status',
    system: 'The payment status stays visible beside the project and next step.',
    status: 'Deposit recorded',
    next: 'Replay the workflow',
  },
];

export default function HowItWorksPage() {
  const [video, setVideo] = useState(false);
  const [step, setStep] = useState(0);
  const [journeyStep, setJourneyStep] = useState(0);

  const client = video ? 'Studio North' : 'Bright Dental';

  return (
    <div className="reaidy-page">
      <LandingNav active="how-it-works" />

      <main>
        <section className="rd-page-hero">
          <span className="rd-eyebrow-pill">A SIMPLE CLIENT JOURNEY</span>
          <h1>
            From first inquiry<br />
            <span>to paid work.</span>
          </h1>
          <p>
            See what you do at every stage—and how NexBrief keeps the client details
            and the exact next step together.
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

        {/* 4 simple moves band */}
        <section className="rd-feature-band rd-journey-band">
          <div className="rd-band-heading">
            <small>THE NEXBRIEF JOURNEY · 4 SIMPLE MOVES</small>
            <h2>
              Your next client,<br />
              from <span>hello to paid.</span>
            </h2>
            <p>Follow one project at a time. Choose a step, then move forward when you’re ready.</p>
          </div>
          <div className="rd-journey-nav" role="group" aria-label="Client journey steps">
            {['Inquiry', 'Follow-up', 'Proposal', 'Deposit'].map((label, i) => (
              <button
                key={label}
                type="button"
                className={journeyStep === i ? 'active' : ''}
                aria-current={journeyStep === i ? 'step' : undefined}
                onClick={() => setJourneyStep(i)}
              >
                <i>0{i + 1}</i>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="rd-journey-panel" key={journeyStep}>
            <div className="rd-journey-copy">
              <small>
                STEP 0{journeyStep + 1} / 04 ·{' '}
                {['INQUIRY', 'FOLLOW-UP', 'PROPOSAL', 'DEPOSIT'][journeyStep]}
              </small>
              <h3>
                {
                  [
                    'Capture the inquiry.',
                    'Follow up with context.',
                    'Send a clear proposal.',
                    'Track the deposit.',
                  ][journeyStep]
                }
              </h3>
              <p>
                {
                  [
                    'Save who reached out, what they need, and when to follow up.',
                    'Use the conversation to shape a personal reply. Review it yourself before sending.',
                    'Set the scope, project value, timeline, and deposit terms in one offer.',
                    'See what is paid and know when the work is ready to begin.',
                  ][journeyStep]
                }
              </p>
              <div className="rd-journey-outcome">
                <i>
                  <Check size={16} />
                </i>
                <span>
                  <small>NEXBRIEF KEEPS VISIBLE</small>
                  <b>
                    {
                      [
                        'Lead details and the next action',
                        'A reviewed draft and follow-up status',
                        'Scope, value, and proposal status',
                        'Deposit status beside project details',
                      ][journeyStep]
                    }
                  </b>
                </span>
              </div>
            </div>
            <div className="rd-journey-preview">
              <div>
                <span className="rd-journey-avatar">{video ? 'SN' : 'BD'}</span>
                <span>
                  <small>{video ? 'VIDEO EDITING' : 'WEB DEVELOPMENT'}</small>
                  <b>{client}</b>
                </span>
                <i className="rd-journey-status">
                  {
                    [
                      'New inquiry',
                      'Draft ready',
                      'Proposal prepared',
                      'Deposit recorded',
                    ][journeyStep]
                  }
                </i>
              </div>
              <section>
                <span>{video ? 'MONTHLY VIDEO EDITING' : 'WEBSITE REDESIGN'}</span>
                <b>
                  {video ? '$1,800' : '$3,500'} <small>project value</small>
                </b>
              </section>
              <footer>
                <small>NEXT STEP</small>
                <b>
                  {
                    [
                      'Qualify the opportunity',
                      'Review and send your reply',
                      'Share proposal with client',
                      'Begin the project',
                    ][journeyStep]
                  }{' '}
                  <ArrowRight size={14} />
                </b>
              </footer>
            </div>
          </div>
          <div className="rd-journey-foot">
            <button
              type="button"
              disabled={journeyStep === 0}
              onClick={() => setJourneyStep(journeyStep - 1)}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span>
              <i />
              {journeyStep + 1} of 4 ·{' '}
              {['Inquiry', 'Follow-up', 'Proposal', 'Deposit'][journeyStep]}
            </span>
            <button
              type="button"
              onClick={() =>
                journeyStep < 3
                  ? setJourneyStep(journeyStep + 1)
                  : setStep(0)
              }
            >
              {journeyStep === 3 ? 'See the 5 stages' : 'Next step'}{' '}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* 5-step detailed workflow board */}
        <section className="rd-section rd-clear-workflow" id="how">
          <div className="rd-title">
            <small className="rd-kicker">STEP BY STEP</small>
            <h2>
              The 5 stages <span>in action.</span>
            </h2>
            <p>From first hello to recording your deposit in NexBrief.</p>
          </div>
          <div className="rd-flow-tabs" role="group" aria-label="Workflow stage">
            {steps.map((s, i) => (
              <button
                type="button"
                key={s}
                className={step === i ? 'active' : ''}
                aria-pressed={step === i}
                onClick={() => setStep(i)}
              >
                <i>{i + 1}</i>
                <span>{s}</span>
              </button>
            ))}
          </div>
          <div className="rd-flow-board" key={`${video}-${step}`}>
            <div className="rd-flow-story">
              <small>STEP 0{step + 1} / 05</small>
              <h3>{workflow[step].title}</h3>
              <p>{workflow[step].detail}</p>
              <div className="rd-flow-responsibilities">
                <div>
                  <i>
                    <Users size={15} />
                  </i>
                  <span>
                    <small>YOU DO</small>
                    <b>{workflow[step].action}</b>
                  </span>
                </div>
                <div>
                  <i>
                    <Check size={15} />
                  </i>
                  <span>
                    <small>NEXBRIEF KEEPS IT CLEAR</small>
                    <b>{workflow[step].system}</b>
                  </span>
                </div>
              </div>
              <button
                className="rd-primary"
                onClick={() => setStep((step + 1) % steps.length)}
              >
                {workflow[step].next} <ArrowRight size={16} />
              </button>
              <small className="rd-demo-note">
                Illustrative demo · no messages or payments are sent
              </small>
            </div>
            <div className="rd-flow-preview">
              <div className="rd-flow-preview-head">
                <b>Client record</b>
                <span>
                  WORKFLOW <i>{step + 1} / 5</i>
                </span>
              </div>
              <div className="rd-flow-person">
                <i>{video ? 'SN' : 'BD'}</i>
                <div>
                  <small>
                    {video ? 'VIDEO EDITING CLIENT' : 'WEB DEVELOPMENT CLIENT'}
                  </small>
                  <b>{client}</b>
                </div>
                <span className="rd-status-pill">{workflow[step].status}</span>
              </div>
              <div className="rd-flow-fields">
                <div>
                  <small>SERVICE</small>
                  <b>
                    {video ? 'Monthly video editing' : 'Website redesign'}
                  </b>
                </div>
                <div>
                  <small>PROJECT VALUE</small>
                  <b>{video ? '$1,800' : '$3,500'}</b>
                </div>
                <div>
                  <small>PROJECT DETAILS</small>
                  <b>
                    {video
                      ? '4 short-form videos · 2 revision rounds'
                      : '5 pages · responsive design'}
                  </b>
                </div>
                <div className="rd-flow-next">
                  <small>UP NEXT</small>
                  <b>{workflow[step].next}</b>
                  <ArrowRight size={15} />
                </div>
              </div>
              <div className="rd-flow-progress">
                <span
                  style={{
                    width: `${((step + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
              <small className="rd-flow-preview-foot">
                One client record. A clear next step at every stage.
              </small>
            </div>
          </div>
        </section>

        <section className="rd-closing">
          <div className="rd-closing-top">
            <small>NEXBRIEF · WORKSPACE</small>
            <span>READY TO SIMPLIFY YOUR CLIENT WORK?</span>
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
              <a href="/pricing" className="rd-closing-secondary">
                View plans & pricing <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

