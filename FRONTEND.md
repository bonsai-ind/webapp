# Frontend Architecture

The Bonsai frontend is a **React + Vite SPA** deployed to Vercel, talking to the existing Go backend (chi + Postgres + GCP Pub/Sub) over REST and Server-Sent Events. It supports lighter realtime live-sync (dashboards, lists, chat, presence) plus 1-to-1 peer-to-peer video.

This document records the locked stack decisions and the constraints that must be honored at build time.

## Stack

| Layer | Decision |
|-------|----------|
| Frontend framework | React + Vite SPA |
| Frontend hosting | Vercel |
| Backend | Go 1.25 + chi (existing) on Cloud Run / GKE |
| Database | Postgres + sqlx (existing) |
| Data fetching | TanStack Query (REST), bearer token |
| Live-sync transport | fetch-based SSE (`@microsoft/fetch-event-source`) with `Authorization` header |
| Realtime model | Server-authoritative broadcast, last-write-wins |
| Fan-out | GCP Pub/Sub, per-pod ephemeral subscription |
| Wire transport | HTTP/2 end-to-end |
| Auth | Access token in-memory + rotating refresh token in localStorage |
| Video | 1-to-1 peer-to-peer WebRTC, isolated React island |
| NAT traversal | Self-hosted coturn (TURN) |
| Signaling | offer/answer/ICE over fetch-SSE (down) + POST (up) |
| CSS | Tailwind (Vite plugin) |
| Build / Deploy | Vite on Vercel; Go binary on GCP |

## Realtime: live-sync

- **Model:** server-authoritative. The Go server holds the source of truth and pushes diffs to clients. Conflict resolution is last-write-wins. Clients never merge state locally.
- **Transport down:** SSE via `@microsoft/fetch-event-source` (NOT native `EventSource`) so the `Authorization: Bearer` header can be sent. The library also handles auto-reconnect.
- **Transport up:** plain `POST` to REST endpoints.
- **Cross-instance fan-out:** each Go pod holds its local SSE connections in an in-memory map. An event is published to GCP Pub/Sub; **every pod has its own ephemeral subscription**, receives every message, and pushes only to the sockets it owns.
- **Presence:** heartbeat with TTL (Postgres or Redis), expired entries dropped.

## Video: 1-to-1

- Browser `RTCPeerConnection`, peer-to-peer media (lowest latency, no SFU hop).
- Lives in an **isolated React island** — the rest of the UI does not depend on the WebRTC lifecycle.
- **Signaling:** offer / answer / ICE candidates ride the existing channel — fetch-SSE down, POST up. The server only relays to the two authorized peers in the room, never broadcasts.
- **TURN:** self-hosted **coturn**. Required — roughly 15-20% of calls need relay behind symmetric NAT; P2P alone fails for those.

## Auth

No cookies anywhere — the SPA (Vercel) and API live on different domains, and 2026 browsers (Safari ITP, Chrome) block third-party cookies. Auth is bearer-token throughout.

- **Access token:** held in memory (a JS variable), ~15 min lifetime. Sent as `Authorization: Bearer` on REST, fetch-SSE, and signaling POSTs.
- **Refresh token:** rotating, stored in localStorage. Each use mints a new token and invalidates the old one. **Reuse detection** — if an already-used refresh token is presented, the whole token family is revoked (track family id + last-used in Postgres).
- **Connection auth:** access token validated at SSE connect and on every signaling message. Video signaling additionally verifies both peers are authorized for the room before relaying.
- Without an httpOnly cookie, **XSS hardening is the only token defense** — strict CSP, no inline scripts, rely on React auto-escaping, never `dangerouslySetInnerHTML` with user data.

## Build-time constraints (do not forget)

- **HTTP/2 is mandatory.** SSE holds one connection open permanently; HTTP/1.1 caps 6 connections per domain per browser, so SSE breaks at ~6 tabs. The GCP LB must negotiate H2 through to the Go server.
- **No cookies — bearer everywhere.** CSP hardening is the only token defense.
- **coturn is required**, not optional — symmetric-NAT calls fail without relay.
- **Per-pod Pub/Sub subscription.** A shared subscription means only one pod receives each message → broken broadcast. Each pod must own its subscription.
- **CORS:** Go allows the Vercel origin and the `Authorization` header. `credentials` is NOT needed (no cookies).

## Deployment

- **Frontend:** Vite build → Vercel CDN. Custom domain for the app.
- **Backend:** single Go binary on Cloud Run / GKE, separate domain (e.g. `api.<domain>`).
- **coturn:** self-hosted alongside backend on GCP.
- **Postgres:** existing managed instance.
