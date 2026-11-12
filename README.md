# NexBrief

NexBrief is a conversion CRM for freelance web developers and video editors. It connects lead capture, qualification, outreach drafts, follow-ups, proposals and deposit tracking.

## JavaScript project structure

```text
frontend/
  src/
    App.jsx                 CRM workspace
    LandingPage.jsx         marketing website
    api.js                  frontend API client
    landing.css             landing-page design system
  vite.config.js

backend/
  config/                   database and constants
  controllers/              request handlers and product logic
  middleware/               authentication, security and errors
  models/                   MongoDB schemas
  routes/                   API route definitions
  services/                 audit and supporting services
  app.js                    Express application
  server.js                 API process entry point

ai-service/
  ai.js                     live AI adapter with local fallback
```

The application uses JavaScript and JSX throughout. There are no TypeScript source files.

## Run locally

Copy `.env.example` to `.env`. Add `MONGODB_URI`, `AUTH_SECRET` and `AUDIT_SALT` for persistent accounts and data.

```bash
npm install
npm run dev
npm run server:dev
```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Product backend

- Account registration and login with hashed passwords
- Isolated workspaces for each freelancer
- Lead capture, batch import, qualification and follow-up dates
- Pipeline totals and activity history
- AI-assisted outreach, follow-up and proposal drafts
- Proposal, deposit and manual payment-status tracking
- Purpose-based AI and marketing consent history
- Personal-data export and verified account deletion
- Request validation, audit records and security middleware

OpenAI and payment-provider integrations remain in safe fallback mode until credentials are supplied.
