# 10 · SSE re-auth + instant revoke — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
Keep a permanently-open Live-sync stream both fresh and revocable (ADR-0004). Because the access token expires (~15 min) while SSE stays open, the server force-closes the stream at expiry; the client reconnects via `@microsoft/fetch-event-source`, **injecting a freshly-refreshed token on each (re)open** (refresh-once-then-login rules from slice 04 apply). Separately, when access is revoked mid-stream (a parent removes the nanny, or a token family is revoked), the server emits a `revoked` control event and closes; the client **clears tokens and routes to login within seconds**, cutting the live feed. Tested by driving the mock transport: expire→reconnect-with-new-token, and `revoked`→cutoff.

## Acceptance criteria
- [~] A server force-close at token expiry triggers a reconnect that carries a freshly-refreshed token _(`getToken` is now wired to `Session.getAccessToken` in `main.tsx`, so each reconnect carries the current token — TDD'd reconnect + fresh-token-per-connect. Still missing: Live-sync doesn't itself *trigger a refresh* before reconnecting, so a token already expired at reconnect isn't proactively refreshed)_
- [ ] A reconnect whose refresh fails routes to login (does not silently retry forever) _(needs `getToken`↔session wiring + backoff/give-up)_
- [ ] A `revoked` control event clears tokens and reaches login within seconds; the stream stops delivering _(needs a `revoked` event handler wired to `Session` logout)_
- [ ] A removed guest's stream stops delivering that device's events promptly (verified via mock transport)
- [x] Reconnect still performs the resync from slice 09 (no lost diffs across the re-auth) _(Last-Event-ID replay on reconnect, TDD'd)_

## Progress
The transport-level hooks this slice needs already exist from slice 09: reconnect-on-error, fresh-token-per-connect, and Last-Event-ID resync (`src/realtime/live-sync.ts`). **Reconnect backoff** is now TDD'd too: reopen is delayed by a base backoff (not a tight loop), grows exponentially per consecutive failure capped at `maxMs`, and resets to base once a connection delivers an event — so a backend outage no longer triggers a reconnect storm. What remains is integration: point `getToken` at the `Session` (so a reconnect refreshes), and add a `revoked` control-event handler that calls `Session` logout. Both wait on the app scaffold.

## Blocked by
- 09 · Live-sync stream + echo-only writes
