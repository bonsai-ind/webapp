# 04 · Silent refresh interceptor — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
Invisible token rotation. When any bearer request returns `401`, the API client calls `/auth/refresh` **exactly once** with the stored refresh token, persists the new pair, and retries the original request. If `/auth/refresh` itself returns `401` (unknown/expired/revoked/**reused** token), the client clears tokens and routes to login. Concurrent 401s must share a single in-flight refresh, not stampede it. From the user's perspective, a ~15-minute access-token expiry is never visible.

## Acceptance criteria
- [x] A 401 on a protected call triggers one refresh + one retry, transparently to the UI
- [x] Multiple concurrent 401s trigger a single refresh, then all retry
- [x] A 401 from `/auth/refresh` clears all tokens and routes to login _(client emits `onAuthChange` → unauthenticated; `<AuthGate>` now consumes that and shows the sign-in form — component-tested)_
- [x] A second use of a spent refresh token (family revoked server-side) surfaces as login, not a stuck state _(same client path: refresh 401 → `clearSession`)_
- [x] The original request's method, body, and headers are preserved on retry _(tested: a POST with body + custom header retries intact after refresh)_

## Progress
TDD'd in `src/session/session.ts` (interface `Session.authedFetch` / `onAuthChange`), tested in `src/session/session.test.ts` against MSW. Single-flight refresh coalescing via a shared in-flight promise. The retry-preservation criterion passed without new code (the retry already reuses the original `init`), so its test stands as a regression guard. All client-side criteria met; only the route-to-login UI wiring (slice 06) remains. Tests green, `tsc` clean.

## Blocked by
- 03 · Sign-in + in-memory session
