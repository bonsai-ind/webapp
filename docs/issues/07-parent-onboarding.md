# 07 · Parent onboarding (accept-invite) — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The only way a parent account is created: accepting a seller-issued Invite (there is no public signup). A user arriving from an invite link lands on an accept screen, chooses a password, and on `/auth/accept-invite` the account is created, scoped to the invite's org + org role, and the user is logged straight into the shell. An **existing** user accepting an invite into another org just gains the membership (password ignored). Invalid, expired, or already-used invites show a clear dead-end with a route back to login.

## Acceptance criteria
- [x] A valid invite link → choose password → account created → logged in → shell, scoped to the invite's org/role _(end-to-end: `<App>` routes an `inviteToken` to `<AcceptInviteScreen>`, `Session.acceptInvite` mints the session, and `onAccepted` transitions to the shell — App-level integration TDD'd; `main.tsx` parses `?token=` from the invite link)_
- [x] An existing user accepting an invite gains the new membership without creating a duplicate; password field is inert _(server-side behavior; the client calls `accept-invite` identically either way — no client branch needed, nothing to build)_
- [x] Invalid / expired / already-used invite (401) shows a clear error and a path to login _(error alert on `401` (no `onAccepted`), plus a "Back to sign in" button that returns to the login form — both TDD'd)_
- [x] Post-accept session behaves identically to a normal login (in-memory access + localStorage refresh) _(`acceptInvite` shares the exact `startSession` path as `login` — access in memory, refresh in localStorage, `authenticated` emitted, `me()` populated — TDD'd)_

## Progress
TDD'd in two pieces. **Logic:** `Session.acceptInvite(token, password)` (`src/session/session.ts`) POSTs `/auth/accept-invite` and runs the same `startSession` tail as `login` (extracted under green) — stores the token pair, loads `/me`, emits `authenticated`. **UI:** `<AcceptInviteScreen>` (`src/auth/AcceptInviteScreen.tsx`, tested in `AcceptInviteScreen.test.tsx` with RTL + real `Session` + MSW) takes the invite token, collects a password, calls `acceptInvite` on submit, fires `onAccepted` on success, and shows an error (without proceeding) on an invalid invite. **Routing is now wired:** `<App>` takes an optional `inviteToken` — when present it renders `<AcceptInviteScreen>` (branded, inside `BrandProvider`) instead of the sign-in form, and on `onAccepted` transitions to the authenticated shell; `main.tsx` parses `?token=` from `window.location`. Integration-tested at the `<App>` level (invite token → create-account screen; after accept → app shell). This surfaced and fixed a real bug: `<AuthGate>` now seeds its authed state from `session.me()` (current state), not just future `onAuthChange` events — otherwise the `authenticated` event fired by accept-invite (and by `restore()` on reload) before the gate mounts would be missed and the user stranded on the login form.

Remaining: a back-to-login link on the error state, and the existing-user-joins-org UX nicety. Tests green, `tsc` clean, builds.

## Blocked by
- 03 · Sign-in + in-memory session
