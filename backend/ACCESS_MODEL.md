# NexBrief access model

## Main Admin

The Main Admin is a platform account marked with `platformOwner: true`.

- Can view registered member account details, profession, role, plan, billing status, account status, registration date, and last sign in.
- Can activate or suspend a member account.
- Cannot read member leads, proposals, drafts, payments, activities, privacy records, or exports.
- CRM permission middleware explicitly rejects platform owner accounts.

## Member

Every public registration creates one member account and one isolated workspace.

- The selected profession assigns the `web-developer`, `video-editor`, or `custom-service` role.
- The role controls CRM permissions.
- Every CRM query is scoped to the member's `workspaceId`.
- There is no team creation, team invitation, or team member management flow.

## Main Admin setup

After the intended administrator has registered, enable Main Admin access with:

`node backend/scripts/grantPlatformOwner.js admin@example.com`

This changes that account into the Main Admin experience. The account will no longer be able to open member CRM records.
