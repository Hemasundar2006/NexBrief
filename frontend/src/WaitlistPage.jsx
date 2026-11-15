import LandingNav from './LandingNav.jsx';
import LandingFooter from './LandingFooter.jsx';
import WaitlistSection from './WaitlistSection.jsx';
import './landing-experience.css';
import './logo.css';

export default function WaitlistPage() {
  return <div className="reaidy-page waitlist-page">
    <LandingNav />
    <main>
      <section className="waitlist-page-intro">
        <small className="rd-kicker">NEXBRIEF FOUNDING BETA</small>
        <h1>Build a calmer way to move<br /><span>from lead to paid.</span></h1>
        <p>Join the early-access list for 14 days of Pro access and help shape the workspace around real freelance client work.</p>
      </section>
      <WaitlistSection />
    </main>
    <LandingFooter includeWaitlist={false} />
  </div>;
}
