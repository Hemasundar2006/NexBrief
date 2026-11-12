import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import './logo.css';

export default function LandingNav({ active = '' }) {
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menu]);

  const links = [
    { label: 'Features', href: '/features', id: 'features' },
    { label: 'How it works', href: '/how-it-works', id: 'how-it-works' },
    { label: 'Pricing', href: '/pricing', id: 'pricing' },
    { label: 'Testimonials', href: '/testimonials', id: 'testimonials' },
    { label: 'Founder', href: '/founder', id: 'founder' },
  ];

  return (
    <header className="rd-nav">
      <a className="rd-logo" href="/" aria-label="NexBrief home">
        <img
          className="nexbrief-logo-mark"
          src="/images/nexbrief-logo.png"
          alt=""
          aria-hidden="true"
        />
        <b>nexbrief<span>.</span></b>
      </a>
      <nav className={menu ? 'opened' : ''}>
        {links.map(({ label, href, id }) => (
          <a
            key={id}
            href={href}
            className={active === id ? 'rd-nav-active' : ''}
            onClick={() => setMenu(false)}
          >
            {label}
          </a>
        ))}
        <div className="rd-mobile-auth-links">
          <a href="/sign-in">Sign in</a>
          <a href="/start-free">Start free <ArrowRight size={14} /></a>
        </div>
      </nav>
      <a className="rd-signin" href="/sign-in">Sign in</a>
      <a className="rd-white rd-cta-glow" href="/start-free">
        <span>Start free</span>
        <ArrowRight size={15} />
      </a>
      <button
        className="rd-menu"
        aria-label="Toggle navigation"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        {menu ? <X size={20} /> : <Menu size={20} />}
      </button>
    </header>
  );
}
