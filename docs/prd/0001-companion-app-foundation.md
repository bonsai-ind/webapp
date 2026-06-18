# PRD: Companion App Foundation

> Scope: the buildable-now frontend foundation for the **Hush companion app** — the
> auth/session layer, multi-brand theming + domain resolution, the app shell, and the
> typed API + realtime client abstractions (mocked). The seven data screens and real
> video are deferred to later PRDs; their seams are established here.
>
> Grounded in `CONTEXT.md` and ADRs 0001–0004. Status: local, not published.

## Problem Statement

A white-label seller wants to put a branded baby-monitor app in the hands of its families.
A parent needs to sign in on their seller's branded domain, see their own babies (and only
their own), get woken when their baby cries, and let their nanny watch too. Today none of
that client exists — only the backend auth surface does, and every data/realtime/video
endpoint is unbuilt. We need a frontend foundation that:

- works against the **only API that exists** (auth) end-to-end, today;
- looks like **the seller's brand**, not ours, the moment it loads;
- isolates one family from another even though they share a seller tenant; and
- is structured so the data screens and realtime features slot in **without rework** as
  the backend lands.

## Solution

Ship the companion app as an **installable PWA** (React + Vite SPA + service worker +
Web Push — ADR-0002). The foundation delivers, from the user's perspective:

- A **branded sign-in** reached at the seller's own domain, with the seller's logo, name,
  and primary color applied before the first paint.
- A **session** that stays signed in across token expiry without the user noticing, and
  that drops cleanly to login when access is genuinely revoked.
- **Parent onboarding** by accepting a seller-issued invite, and **nanny onboarding** by
  accepting a parent-issued device share.
- An **app shell** — the four-tab navigation (Today / Monitor / Cries / Growth), header
  with baby switcher, and the design system — into which data screens drop later.
- A **realtime client** that, once the backend exists, keeps the open app live and dedups
  cry alerts against Web Push — exercised now against a mock event stream.

Behind the shell, all not-yet-real endpoints are served by a **typed mock API** whose
contracts become the spec the backend implements (build-order decision).

## User Stories

### Branding & domain resolution
1. As a seller's family, I want to reach the app at my seller's branded domain, so that the product feels like my seller's, not a third party's.
2. As a seller's family, I want the seller's logo, app name, and brand color applied before the first paint, so that I never see a flash of the wrong (default) brand.
3. As the platform operator, I want safety/semantic colors (cry red, calm green, fussing amber, sleep/feed accents) locked across every brand, so that a seller can never recolor "crying" into something unrecognizable.
4. As the platform operator, I want a seller's brand hue validated so it can't sit in the alert-red or calm-green range, so that brand color is never confused with a status color.
5. As the platform operator, I want all seller domains to serve one deploy with the brand resolved by hostname, so that onboarding a new seller is a DNS/registry change, not a new build.
6. As a seller's family, I want the gateway to accept requests from my seller's registered domain, so that the app works on my seller's URL without CORS errors.

### Authentication & session
7. As a parent, I want to sign in with my email and password, so that I can reach my babies.
8. As a parent, I want a wrong email or password to fail identically, so that no one can probe whether an account exists.
9. As a signed-in user, I want my session to survive access-token expiry silently, so that I'm not kicked to login every ~15 minutes.
10. As a signed-in user, I want a failed request to transparently refresh once and retry, so that token rotation is invisible to me.
11. As a signed-in user, I want to be sent to login only when refresh itself fails, so that real session loss is the only thing that interrupts me.
12. As a security-conscious user, I want my access token held only in memory and never in storage, so that it can't be lifted from disk.
13. As a security-conscious user, I want a reused refresh token to revoke my whole token family, so that a stolen-and-replayed token can't outlive detection.
14. As a multi-org user, I want to switch the active org and keep that choice on refresh, so that I land in the same place next time.
15. As a user, I want to sign out and have that session's token family revoked, so that the device is truly logged out.
16. As the platform operator, I want a hammer that revokes every token family for a user across all devices, so that I can respond to a compromised account.

### Onboarding (invite & device share)
17. As a seller admin, I want to invite a parent's email into my org with a preset role, so that a new family can create their account.
18. As an invited parent, I want to accept an invite and choose a password, so that my account is created (there is no public signup).
19. As an existing user invited into another org, I want accepting to just add the membership, so that I don't create a duplicate account.
20. As a parent, I want to share my device with my nanny's email, so that she can help watch without me filing a request with the seller.
21. As a nanny, I want to accept a device share and get guest access to that one device, so that I can monitor and talk but not manage or re-share it.
22. As a parent, I want device shares scoped to my single device, so that sharing with my nanny never exposes the seller's tenant or other families.

### App shell & navigation
23. As a user, I want a four-tab bar (Today / Monitor / Cries / Growth), so that I can move between the core surfaces.
24. As a parent with more than one baby, I want a baby switcher in the header, so that I can flip between my children.
25. As a user, I want a status pill and a notifications bell in the header, so that I can see at a glance whether things are calm and whether there's something unread.
26. As a user, I want the shell to honor device safe areas (top inset, bottom tab inset), so that content isn't hidden behind the status bar or home indicator.
27. As a user, I want reduced-motion respected, so that the live/pulse animations don't bother me if I've asked the OS to minimize motion.

### PWA & alerts (foundation)
28. As a parent, I want to install the app to my home screen, so that I get a real app surface and (on iOS) background push at all.
29. As a parent, I want to be guided to install + grant notification permission during onboarding, so that I actually receive cry alerts instead of silently missing them.
30. As a parent, I want a cry alert to wake my locked phone via OS push, so that I never miss my baby crying because the app was backgrounded.
31. As a parent with the app open, I want the same cry to show instantly in-app, so that I get the rich live treatment without waiting on push latency.
32. As a parent, I want the open-app alert and the push notification for the same cry to not double-buzz me, so that one crying episode is one alert.

### Realtime client (foundation, mocked)
33. As a user, I want the open app to reflect server changes live, so that lists and dashboards are always current without manual refresh.
34. As a user, I want my changes to appear once the server confirms them, so that what I see is always what the server actually holds (no phantom local state).
35. As a user, I want the app to resync after a dropped connection, so that I never miss an update that landed while I was offline.
36. As a parent, I want a cry on a device I'm *not* currently viewing to still alert me in-app, so that switching babies doesn't blind me to the others.
37. As a parent who has been removed from a device, I want my live feed cut within seconds, so that revoked access actually stops the stream (privacy).

## Implementation Decisions

### Modules
- **Session/auth module** — owns the in-memory access token, the localStorage rotating refresh token, the refresh-once-on-401 interceptor, and the `login / accept-invite / refresh / me / switch-org / logout` flows. Single source of truth for "am I authenticated and as whom."
- **Brand module** — resolves the active seller brand from the request hostname, fetches brand tokens (primary family + hero gradient + logo + name), and applies them as CSS-var overrides **before first paint**. Semantic/Locked tokens are compiled in and never overridden (ADR-0001/0004 reference DESIGN.md tokens).
- **API client** — a typed client over REST. Real auth endpoints today; every other resource is served by a **typed mock layer** behind the same interface, swappable per-endpoint as the backend ships. The mock contracts are authoritative for unbuilt endpoints.
- **Realtime client** — an interface wrapping the SSE transport, exposing: a persistent user-scoped **Live-sync** stream and an ephemeral, island-owned **Signaling** stream. Encapsulates reconnect, token re-injection, resync, and cry-episode dedup.
- **App shell** — TabBar, AppHeader + baby switcher, StatusPill, design-system component library (ported from the `ui.jsx` contracts in DESIGN.md), routing, safe-area handling.

### Architecture & contracts
- **Transport:** HTTP/2 end-to-end (mandatory — SSE), bearer tokens only, no cookies anywhere. `Authorization: Bearer <access>` on REST, SSE connect, and signaling POSTs.
- **Tenancy/access (ADR-0001):** JWT carries `org_id` + `org_role` only. Org = seller; `caregiver` = any end-user. Which baby a user sees is gated by **device membership**, checked server-side at SSE-connect and per signaling message — never inferred client-side. The client treats device membership as server-authoritative and renders only what the server returns.
- **Onboarding contracts:** parent via seller `POST /orgs/{id}/invites` → `accept-invite`. Nanny via a **new** `POST /devices/{id}/shares` (authorized by *primary* device membership, not org role) → an accept flow mirroring `accept-invite`. This endpoint does not exist yet; the mock layer defines its contract.
- **Refresh strategy:** on a `401` from a bearer route, call `/auth/refresh` exactly once, persist the new pair, retry the original. If refresh `401`s, clear tokens → login. Reuse of a spent refresh token revokes the family (server-enforced; client just lands on login).
- **Multi-brand serving (ADR-0003):** one Vercel deploy, per-seller domains, brand by hostname. Gateway CORS is a registry-backed allowlist that reflects `Origin` only for registered seller domains; `credentials` stays off.
- **Cry delivery (ADR-0004):** server **always** sends Web Push for a cry (never gated on connection state); Live-sync SSE also carries it. Client dedups by **cry-episode id** = service-worker notification tag.
- **SSE re-auth (ADR-0004):** server force-closes at access-token expiry; client reconnects via `@microsoft/fetch-event-source` injecting a freshly-refreshed token on each (re)open. Server immediately drops the connection on membership/family revocation (`revoked` control event + close) → client clears + routes to login.
- **Signaling (ADR-0004):** separate ephemeral SSE stream owned by the video island, opened per call, torn down after — not the Live-sync stream.
- **Writes (ADR-0004):** echo-only. Mutations are plain POSTs; the UI updates only when the server's diff arrives over Live-sync, written into the TanStack Query cache by **replacement, never merge**. On reconnect, resync via `Last-Event-ID` replay or query invalidation. Purely-local UI affordances (card collapse, snooze countdown) may update immediately — they are not shared state.

### Theming rules (ADR-0001/DESIGN.md)
- **Brand tokens (per-seller, themeable):** `--primary`, `--primary-700`, `--primary-soft`, `--primary-soft-2`, hero gradient, logo, app/baby name.
- **Locked tokens (identical across brands):** `--alert*` / `--alert-2`, `--calm*`, `--amber*`, `--sleep*`, `--feed*`, and all ink/line/surface tokens. Red is used **only** during an active cry.
- Brand hue validated out of the alert-red and calm-green ranges at the point a seller's brand is configured.

## Testing Decisions

A good test here asserts **external, user-observable behavior** — "a 401 triggers exactly one refresh then a retry," "a removed user's stream closes," "the seller's brand paints before content," "one cry episode produces one alert" — never internals like which function holds the token or how the cache is keyed. Tests bind at the highest seam that still gives control over inputs.

**Seams (proposed — no test infra exists yet):**
1. **Network boundary via MSW (preferred, highest practical seam).** The typed mock API layer *is* the MSW handler set, so the same fixtures serve local dev, tests, and the documented backend contract. Component/flow tests drive real app code against intercepted HTTP. This is where most auth, onboarding, and theming tests live.
2. **Realtime-transport interface.** A thin interface over `@microsoft/fetch-event-source` lets tests inject a fake event stream: emit a cry event, force a disconnect, replay via `Last-Event-ID`, emit a `revoked` event. This is the seam for dedup, reconnect/resync, all-device cry visibility, and revocation-cutoff tests — none of which need a real server.
3. **Playwright E2E** for the few cross-cutting flows: sign-in → token in memory (assert nothing token-like in storage), refresh-on-401 round trip, brand-by-hostname before-first-paint, install/permission prompts. Web Push *delivery* itself is not E2E-tested (OS/browser-dependent) — the dedup logic is unit-tested at seam 2 instead.

**Modules under test:** session/auth (seam 1), brand resolution + token application (seams 1 & 3), onboarding flows (seam 1), realtime client (seam 2). The app shell is covered incidentally by the E2E flows; the design-system components get light render/contract tests, not pixel tests.

**Prior art:** none — this is greenfield. These choices (MSW as the contract+test+dev fixture, a transport interface for SSE) should be set up as the reference pattern that later screen PRDs follow.

## Out of Scope

- **The seven data screens** (Today, Live Monitor, Cry patterns, Sleep, Feeding, Growth) — they depend on domain endpoints that don't exist. This PRD builds the shell + mock contracts they slot into; the screens are separate PRDs.
- **Real video / WebRTC** (RTCPeerConnection, coturn, real signaling relay) — only the *signaling-stream interface* and the island boundary are established here. _Update: the **call-signaling orchestrator** (`src/video/start-call.ts`, `startCall`) is now TDD'd — the framework-agnostic offer/answer/ICE handshake (FRONTEND.md, ADR-0004) over injected peer + signaling fakes: caller offers and applies the answer, ICE flows both ways (end-of-candidates guarded), callee answers an offer. Still out of scope: the real `RTCPeerConnection` + `getUserMedia` adapter, the signaling-over-ephemeral-SSE channel, coturn/TURN, and the React video island/Monitor screen._
- **Backend work** — the device-membership table, the `POST /devices/{id}/shares` endpoint, dynamic CORS allowlist, Web Push dispatch, Pub/Sub fan-out, cry detection. The mock contracts here are the spec for that work, not the work itself.
- **Device provisioning / pairing** — how a physical device first binds to a parent (pairing code vs seller pre-bind) is unresolved; deferred to the device API PRD.
- **Seller admin & superadmin consoles** — this PRD is the parent/nanny companion app only.

## Further Notes

- **iOS push risk (from ADR-0002):** background cry alerts on iOS require the user to install the PWA to the home screen. A parent who skips install gets *no* background alerts — the core promise silently fails for them. Onboarding (stories 28–30) must treat install + permission as a guided, hard-to-skip step; this is the most likely reason ADR-0002 (PWA vs native) gets revisited.
- **Doc drift:** `API.md` ("Org owns babies/devices/memberships," single `FRONTEND_ORIGIN`) and `FRONTEND.md` ("validated at SSE connect," signaling "rides the existing channel") still read the pre-grilling way. ADRs 0001/0003/0004 are the current source of truth where they conflict; the backend owner should reconcile the docs.
- The mock API layer is a deliverable, not scaffolding to throw away — it is the contract the backend implements and the fixture set the tests run against.
