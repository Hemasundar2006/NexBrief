# NexBrief backend design

NexBrief is a private conversion CRM for independent web developers, video editors, and creative freelancers. It is not a marketplace. Every record belongs to one workspace, and every protected query must filter by `workspaceId` from the verified access token.

## Product modules

- Auth and workspace: register, login, refresh, logout, logout all, current user, owner/member roles.
- Lead capture/import: create, list, update, archive, source, service, qualification score, interest level, next action.
- Qualification: store fit, budget/value, timeline, service need, notes, and follow-up date.
- Sales pipeline: New lead -> Contacted -> Qualified -> Proposal sent -> Deposit requested -> Won/Lost.
- AI assistance: generate outreach, follow-up, and proposal drafts. AI output is always a draft until the freelancer approves it.
- Proposals: deliverables, amount, deposit, timeline, validity, status, and payment status.
- Payments: manual status now; Stripe webhook/event records can be connected later without changing proposal data.
- Privacy and audit: consent records, audit events, retention, and deletion/export workflows.

## JWT security model

1. Passwords are hashed with Node scrypt and are never returned.
2. Login/register returns a short-lived HS256 JWT access token (default 15 minutes).
3. The refresh token is a random opaque value stored only as a SHA-256 HMAC in MongoDB and sent in an HTTP-only cookie.
4. Refresh rotates the session: the old refresh token is revoked and a new one is issued.
5. Logout revokes the current refresh session. Logout-all revokes every session for the user.
6. Access claims contain only `sub`, `workspaceId`, `role`, `iat`, `exp`, `jti`, and `iss`.
7. Production requires a long random `JWT_ACCESS_SECRET`; development fallback secrets must never be used in production.
8. API authorization uses the workspace ID from the token, never a workspace ID supplied by the browser.

## MongoDB collections

- `users`: identity, password hash, workspace membership, role, last login, soft deletion.
- `roles`: workspace-specific access roles, permissions, built-in/custom flag, active status.
- `workspaces`: freelancer workspace settings, profession, currency, owner, retention.
- `refreshsessions`: hashed refresh sessions, expiry, revocation, rotation metadata.
- `leads`: prospect details, service, value, stage, interest, qualification, next action, tags.
- `activities`: lead timeline events and actor metadata.
- `drafts`: AI-generated outreach/follow-up/proposal drafts and approval state.
- `proposals`: commercial offer, deliverables, deposit, status, and payment status.
- `consents`: service, AI-processing, and marketing consent with policy version.
- `audits`: security and business events with one-year TTL.

## API groups

- `/api/health`
- `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`, `/me`
- `/api/admin/roles`, `/api/admin/users`, `/api/admin/audit`
- `/api/growth/usage`, `/api/growth/discoveries`, `/api/growth/businesses`, `/api/growth/audits`
- `/api/leads`
- `/api/pipeline`, `/api/drafts`, `/api/proposals`, `/api/payments`
- `/api/privacy`

All protected endpoints use `Authorization: Bearer <accessToken>`. The frontend should keep the access token in memory and call `/api/auth/refresh` after a page reload; the refresh cookie is not readable by JavaScript.

## Roles and admin controls

Every new workspace starts with one owner who receives the `admin` access role. The registration form also stores the person’s service role: `web-developer`, `video-editor`, or `custom-service`. Admins can create, edit, deactivate, and assign custom access roles. Built-in roles cannot be removed, and a custom role cannot be removed while users are assigned to it.

The Main Admin endpoint exposes registered member account metadata: name, email, profession, assigned member role, plan, billing status, account status, registration date, and last sign in. It never loads member leads, proposals, drafts, activities, payments, or exports. Every CRM query remains isolated by the authenticated member's workspace ID.

## Business discovery and audit module

The discovery module is provider-backed. If `BUSINESS_DISCOVERY_PROVIDER_URL` and `BUSINESS_DISCOVERY_PROVIDER_TOKEN` are not configured, the job fails safely and creates no business records. Discovered businesses, audits, quota reservations, usage ledgers, and outreach drafts are isolated by workspace. Discovery and audit jobs are queued and processed asynchronously in the current Node process; a durable queue worker should replace this before production scale.

Website audits only accept HTTPS public websites, reject private/internal network addresses, follow a basic robots.txt disallow check, limit response size, use timeouts, and do not bypass authentication, CAPTCHA, or anti-bot controls.

## Before production

Add HTTPS, a real email provider for verification and password reset, a distributed rate limiter such as Redis, encrypted backups, a real Stripe webhook signature check, structured logging, and automated tests for workspace isolation and refresh-token reuse.
