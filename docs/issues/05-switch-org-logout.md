# 05 · Switch-org + logout — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
Active-org control and clean sign-out. `/auth/switch-org` mints a new access token scoped to the target org and persists the choice on the refresh-token family, so later refreshes keep it; the refresh token itself is unchanged. `/auth/logout` revokes that session's refresh-token family. The client also handles the case where its own family is revoked out from under it (e.g. the platform-admin hammer): the next bearer/refresh failure lands cleanly on login. A user who belongs to only one org never sees a switcher.

## Acceptance criteria
- [x] Switching org yields a new access token scoped to the target org; `/me` reflects the new active org _(`Session.switchOrg` — TDD'd: swaps the access token and refetches `/me`)_
- [x] The org choice survives a subsequent refresh (persisted on the family) _(`switchOrg` sends the refresh token; persistence is server-side on the family — the client keeps the same refresh token, verified unchanged)_
- [x] Switching to an org the user doesn't belong to is handled (403) without breaking the session _(TDD'd: a `403` from switch-org rejects but leaves `me()` + the access token intact — no logout. Confirmed against the real backend: superadmin → `403` for a non-member org)_
- [x] Logout revokes the family and routes to login; the in-memory access token is dropped _(`Session.logout` — TDD'd: POSTs logout, clears tokens, emits `unauthenticated`; `<AuthGate>` routes to the form)_
- [x] If the family is revoked externally, the client reaches login on its next failed call rather than hanging _(refresh `401` → `clearSession` → `onAuthChange` unauthenticated → `<AuthGate>` shows login — TDD'd)_
- [x] Single-org users see no org switcher _(`<SwitchOrgMenu>` renders nothing for ≤1 org — component-tested)_

## Progress
The switch-org/logout **logic** lives in `Session` (`switchOrg`, `logout`) and is TDD'd in `session.test.ts`. The **UI** is now TDD'd too: `<SwitchOrgMenu>` (`src/auth/SwitchOrgMenu.tsx`, tested with RTL + real `Session` + MSW) lists the user's orgs, calls `Session.switchOrg` on selection, fires `onSwitched` after, and renders nothing for a single-org user. The org list is a prop — the "list my memberships" endpoint isn't in `API.md`'s implemented surface yet, so its source is a noted dependency. `<SwitchOrgMenu>` is styled to DESIGN.md (a tonal card menu, one row per org). Remaining: a 403-on-unauthorized-switch test, and the membership-list endpoint. Tests green, `tsc` clean.

## Blocked by
- 03 · Sign-in + in-memory session
