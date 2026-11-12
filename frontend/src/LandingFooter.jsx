import { ArrowRight } from 'lucide-react';
import './logo.css';

export default function LandingFooter() {
  return (
    <footer className="rd-footer">
      <div className="rd-footer-main">
        <div className="rd-footer-brand">
          <a className="rd-footer-logo" href="/" aria-label="NexBrief home">
            <img
              className="nexbrief-logo-mark"
              src="/images/nexbrief-logo.png"
              alt=""
              aria-hidden="true"
            />
            <b>nexbrief<span>.</span></b>
          </a>
          <p>
            A focused client workspace for freelance web developers, video editors,
            and independent creatives.
          </p>
          <small>From first inquiry to paid deposit.</small>
        </div>
        <div className="rd-footer-links">
          <div>
            <b>Product</b>
            <a href="/features">Features</a>
            <a href="/how-it-works">How it works</a>
            <a href="/pricing">Pricing</a>
          </div>
          <div>
            <b>About NexBrief</b>
            <a href="/founder">Founder</a>
            <a href="/testimonials">Testimonials</a>
            <a href="/">Home</a>
          </div>
          <div>
            <b>Account</b>
            <a href="/sign-in">Sign in</a>
            <a href="/start-free">Start free <ArrowRight size={13} /></a>
          </div>
        </div>
      </div>
      <div className="rd-footer-bottom">
        <span>© 2026 NexBrief. All rights reserved.</span>
        <span>Sample opportunities and testimonials are illustrative.</span>
      </div>
    </footer>
  );
}
