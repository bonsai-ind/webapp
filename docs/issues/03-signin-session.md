# 03 · Sign-in + in-memory session — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The first real authenticated path. A sign-in screen posts to `/auth/login`; on success the **access token is held in memory only** (never in storage) and the **rotating refresh token is stored in localStorage**. The app then calls `/me` to establish identity (user, org, org role) and lands the user in the (placeholder) shell. A wrong email and a wrong password fail **identically** (no user-existence leak). This is the only slice in the foundation that talks to a live backend endpoint; tests run against the MSW mock of the same contract.

## Acceptance criteria
- [x] Successful login lands in the shell; `/me` identity is available app-wide _(`<AuthGate>` reveals the protected children on successful login — component-tested; the children are the shell placeholder until slice 06)_
- [x] Access token is in memory only — nothing token-like is ever written to localStorage/sessionStorage/IndexedDB except the refresh token _(unit-asserted: storage scan finds no access token; E2E pass still to come)_
- [x] Wrong password and unknown email produce the same error UI _(`<AuthGate>` shows one generic "email or password didn’t match" alert on any login failure and keeps the form — component-tested)_
- [x] Refresh token persists across a full page reload; access token does not _(proven: `restore()` rehydrates on boot — mints a fresh access token from the stored refresh token and reloads `/me`; with no stored token it stays logged out)_
- [x] All bearer requests send `Authorization: Bearer <access>`; no cookies are sent _(tested; `authedFetch` injects the header, no `credentials` set)_

## Progress
TDD'd the `Session` module (`createSession`) in `src/session/session.ts`, tested in `src/session/session.test.ts` against MSW: login → in-memory access + localStorage refresh, `/me` → `Identity`, `restore()` boot hydration, `authedFetch` bearer injection, `switchOrg`, `logout`.

The sign-in **UI** is now TDD'd too: `<AuthGate>` (`src/auth/AuthGate.tsx`, tested in `AuthGate.test.tsx` with React Testing Library + MSW, driving the *real* `Session`) shows the sign-in form when logged out, reveals the protected children on valid login, shows a single generic error on any failure (no user-existence leak) while keeping the form, and returns to the form when the session goes unauthenticated. The React + RTL test harness was added here (first UI slice of the scaffold). Remaining: the actual shell content (slice 06) and a full Playwright pass. Tests green, `tsc` clean.

> Resolved: `switchOrg` now refetches `/me`, so `me()` reflects the new org immediately (was a flagged gap last cycle).

## Verified against the real backend
The auth surface was exercised against the running Go backend at `http://localhost:8080` (not just MSW): `POST /auth/login` (seed `superadmin@bonsaiind.ai`) returns a real EdDSA JWT pair; `GET /me` → `{ user_id, platform_role }`; `/auth/refresh` rotates the pair; reusing a spent refresh token → `401` and revokes the whole family; CORS allows `http://localhost:5173` (ACAO + `Authorization`/`Content-Type`). In the browser, login → the app shell renders end-to-end with no mocks. `main.tsx` already defaults `baseUrl` to `http://localhost:8080`, so `npm run dev` hits the real API.

> Gap: the frontend-defined data contracts (`/babies`, `/babies/:id/summary`, `/cry-patterns`, `/growth`) do **not** exist on this backend (`/babies` → 404). The backend implements the auth + org + **device** surface instead (`/devices` claim/pair/share, `/orgs/{id}/invites`, `/auth/accept-share`). Data screens degrade to "—" (no crash); they need those endpoints built, or rewiring to the device/baby model the backend actually exposes.
>
> **Now connected to the real backend** beyond auth: `/brand` (BrandProvider, with a default-brand fallback for the current `/brand` CORS gap), `/babies` (baby-switcher — real baby shows), `/me/orgs` (org switcher), `/live` SSE (live-sync + cry-alert overlay, started on auth), `/push/*` (real VAPID). Verified in-browser against `:8080` — see `API-REQUIREMENTS.md` for the full integration status + remaining gaps (chief: `/brand` needs CORS).
>
> Hardened for this: data hooks now go through `getJson` (`src/api/get-json.ts`) which throws a typed `ApiError(status)` on any non-2xx (no `JSON.parse` crash on the backend's plain-text "404 page not found" body), and the App's QueryClient uses `shouldRetry` to **not retry 4xx**. Verified in-browser against `:8080`: a missing `/babies` endpoint produces exactly **one** 404 (no retry storm), no errors, shell renders.

## Blocked by
- 01 · Walking skeleton
