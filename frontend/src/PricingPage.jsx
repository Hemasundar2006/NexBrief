import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './dub-theme.css';
import './dub-light.css';
import './reaidy.css';
import './dub-reference.css';
import './landing-experience.css';
import { api } from './api';

const pricingPlans = [
  {
    name: 'Free',
    label: 'GET STARTED',
    description: 'A simple home for your client work.',
    price: 0,
    features: [
      'Capture and qualify new leads',
      'Track your sales pipeline',
      'Manage proposals and deposits',
    ],
  },
  {
    name: 'Pro',
    label: 'FOR GROWING FREELANCERS',
    description: 'More support for a growing freelance business.',
    price: 1,
    features: [
      'Everything in Free',
      'AI-assisted outreach drafts',
      'Import leads and keep next steps visible',
    ],
  },
  {
    name: 'Plus',
    label: 'FOR HIGH-VOLUME CLIENT WORK',
    description: 'More room for active pipelines and consistent outreach.',
    price: 1,
    featured: true,
    features: [
      'Everything in Pro',
      'Higher AI draft and discovery limits',
      'Up to 5,000 stored leads',
      'Priority workspace capacity',
    ],
  },
];

const pricingFaqs = [
  [
    'Is the Free plan really free forever?',
    'Yes. You can manage your client leads, track your pipeline, prepare proposals, and record deposits completely free without needing a credit card.',
  ],
  [
    'What payment methods are supported for paid plans?',
    'Currently, during verification mode, plans are priced at ₹1 for testing. Full checkout with UPI, cards, and netbanking will be available soon.',
  ],
  [
    'Does NexBrief take a cut of my client payments or deposits?',
    'No! NexBrief never takes a commission or percentage of your client earnings. You record your deposits directly, and 100% of your earnings belong to you.',
  ],
  [
    'Can I upgrade or downgrade anytime?',
    'Yes. You can switch plans or adjust your billing frequency anytime from your workspace Account settings.',
  ],
  [
    'Does AI send emails or messages automatically?',
    'No. NexBrief provides AI drafts for you to review and customize. You always stay in full control before sending anything to a client.',
  ],
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [faq, setFaq] = useState(-1);
  const [plans, setPlans] = useState(pricingPlans);
  useEffect(() => { api('/plans').then(result => { if (Array.isArray(result?.data)) setPlans(result.data.map(item => ({ ...item, name: item.name, price: item.monthlyAmount, yearlyPrice: item.yearlyAmount, label: item.id === 'free' ? 'GET STARTED' : item.id === 'pro' ? 'FOR GROWING FREELANCERS' : 'FOR HIGH-VOLUME CLIENT WORK', description: item.id === 'free' ? 'A simple home for your client work.' : item.id === 'pro' ? 'More support for a growing freelance business.' : 'More room for active pipelines and consistent outreach.', features: item.features || [] }))); }).catch(() => {}); }, []);

  return (
    <div className="reaidy-page">
      <LandingNav active="pricing" />

      <main>
        <section className="rd-page-hero">
          <span className="rd-eyebrow-pill">TRANSPARENT PLANS</span>
          <h1>
            Start free.<br />
            <span>Grow as you go.</span>
          </h1>
          <p>
            Choose the plan that fits how you manage client leads, follow-ups,
            proposals, and deposits.
          </p>
        </section>

        <section className="rd-pricing-section" id="pricing">
          <aside className="rd-pricing-aside">
            <small>NEXBRIEF PLANS</small>
            <h2>
              Simple pricing.<br />
              <span>No surprise fees.</span>
            </h2>
            <p>
              Keep your client work organized from day one. Upgrade only when your
              pipeline expands.
            </p>
            <div
              className="rd-billing-toggle"
              role="group"
              aria-label="Billing frequency"
            >
              <button
                type="button"
                className={!annual ? 'active' : ''}
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                className={annual ? 'active' : ''}
                aria-pressed={annual}
                onClick={() => setAnnual(true)}
              >
                Yearly <small>Save 20%</small>
              </button>
            </div>
            <p className="rd-pricing-note">
              Sandbox verification pricing is loaded from the backend. Recurring
              checkout is handled securely by Cashfree after sign-in.
            </p>
          </aside>

          <div className="rd-plan-grid">
            {plans.map((plan) => {
              const monthly = annual ? (plan.yearlyPrice ?? plan.price) : plan.price;
              return (
                <article
                  className={`rd-plan-card ${plan.featured ? 'featured' : ''}`}
                  key={plan.name}
                >
                  <small className="rd-plan-label">{plan.label}</small>
                  <h3>{plan.name}</h3>
                  <p className="rd-plan-description">{plan.description}</p>
                  <div className="rd-price">
                    <strong>
                      ₹
                      {monthly === 0
                        ? '0'
                        : Number.isInteger(monthly)
                          ? monthly
                          : monthly.toFixed(2)}
                    </strong>
                    <span>{plan.price === 0 ? 'forever' : '/ month'}</span>
                  </div>
                  <small className="rd-billing-caption">
                    {annual && plan.price
                        ? `Billed ₹${Number(monthly).toFixed(2)} per year`
                      : plan.price
                        ? 'Suggested monthly price'
                        : 'No payment required'}
                  </small>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={15} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/start-free?plan=${encodeURIComponent(String(plan.id || plan.name).toLowerCase())}&cycle=${annual ? 'YEARLY' : 'MONTHLY'}`}
                    className={plan.featured ? 'rd-primary' : 'rd-outline'}
                  >
                    Start free <ArrowRight size={15} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rd-section rd-faq">
          <div className="rd-title">
            <small className="rd-kicker">COMMON QUESTIONS</small>
            <h2>
              Frequently asked <span>questions.</span>
            </h2>
            <p>Everything you need to know about plans, billing, and access.</p>
          </div>
          {pricingFaqs.map(([q, a], i) => (
            <article key={q}>
              <button
                aria-expanded={faq === i}
                onClick={() => setFaq(faq === i ? -1 : i)}
              >
                {q}
                <ChevronDown size={17} />
              </button>
              {faq === i && <p>{a}</p>}
            </article>
          ))}
        </section>

        <section className="rd-closing">
          <div className="rd-closing-top">
            <small>NEXBRIEF · TRANSPARENCY FIRST</small>
            <span>JOIN INDEPENDENT CREATORS TODAY</span>
          </div>
          <div className="rd-closing-main">
            <div>
              <h2>
                Ready to take control of<br />
                <span>your client pipeline?</span>
              </h2>
              <p>Get started for free. No credit card required.</p>
            </div>
            <div className="rd-closing-actions">
              <a href="/start-free" className="rd-closing-primary">
                Start free <ArrowRight size={17} />
              </a>
              <a href="/features" className="rd-closing-secondary">
                Explore all features <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

