import './legal.css';

const documents = {
  '/privacy': {
    label: 'PRIVACY', title: 'Privacy Policy', intro: 'How NexBrief handles account, workspace, and client information.', sections: [
      ['Information we use', 'We use account details, workspace settings, leads, proposals, usage information, and payment status to provide NexBrief. Payment credentials are handled by the payment provider and are not stored by NexBrief.'],
      ['How we use it', 'We use this information to operate the workspace, enforce plan limits, provide requested AI drafting, maintain security, and send communications you have enabled.'],
      ['Your controls', 'You can manage optional AI and marketing consent, export available workspace data, sign out all sessions, and request account support from the NexBrief team.'],
      ['Retention and security', 'We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, and maintain security. Access controls, signed sessions, rate limits, and audit records protect the service.'],
      ['Contact', 'For privacy questions or data requests, contact the NexBrief support address shown in your account or website footer.']
    ]
  },
  '/terms': {
    label: 'LEGAL', title: 'Terms of Service', intro: 'The basic terms for using the NexBrief client workspace.', sections: [
      ['Using NexBrief', 'You may use NexBrief to manage your own freelance client work. Keep your login details private and do not use the service for unlawful, deceptive, abusive, or unauthorized activity.'],
      ['Your content', 'You retain responsibility for the leads, files, messages, proposals, and other information you place in NexBrief. You must have the right to use and process information you submit.'],
      ['Plans and limits', 'Free and paid plans include the features and usage limits shown in the current pricing and billing screens. Paid access depends on verified payment and may change after cancellation or failed renewal according to the displayed billing status.'],
      ['Third-party services', 'Cashfree and other connected services have their own terms. NexBrief does not store card numbers, CVV values, UPI PINs, or mandate credentials.'],
      ['Changes and support', 'We may improve the service and update these terms. We will communicate material account or billing changes through the service or the contact details associated with your account.']
    ]
  },
  '/refund-policy': {
    label: 'BILLING', title: 'Refund and Cancellation Policy', intro: 'How NexBrief handles plan cancellation and payment issues.', sections: [
      ['Cancellation', 'You can request cancellation from the Billing screen. NexBrief sends the cancellation request to Cashfree and shows the status after provider confirmation.'],
      ['Access after cancellation', 'If the current payment period is still valid, access may remain available until the paid-through date shown in your workspace. Future recurring charges are stopped after confirmed cancellation.'],
      ['Failed payments', 'Failed renewals are recorded as failed. Access may continue during a displayed grace period where applicable and may return to the Free plan after paid access expires.'],
      ['Refund requests', 'Refund eligibility depends on the payment status, applicable law, and the circumstances of the request. Contact NexBrief support with your account email and payment reference. Do not send card or UPI credentials.'],
      ['Payment provider', 'Cashfree processes recurring payment authorization and collection. Provider payment records and verified webhook events determine the billing status shown by NexBrief.']
    ]
  }
};

export default function LegalPage({ path = window.location.pathname }) {
  const document = documents[path] || documents['/privacy'];
  return <main className="legal-page"><a className="legal-back" href="/">← Back to NexBrief</a><span className="legal-kicker">NEXBRIEF · {document.label}</span><h1>{document.title}</h1><p className="legal-intro">{document.intro}</p><p className="legal-date">Last updated: November 2026</p><div className="legal-sections">{document.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div><a className="legal-cta" href="/sign-in">Open NexBrief <span>→</span></a></main>;
}
