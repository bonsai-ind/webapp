# Realtime architecture: delivery, SSE auth, signaling, writes

Four realtime decisions, several of which deviate from `FRONTEND.md` as literally written. They are grouped because they interlock.

## Dual-channel cry delivery

A cry is delivered over **both** channels: the server **always** sends a Web Push (never gated on whether an SSE connection is open) so a locked phone is woken, **and** the Live-sync SSE carries the same event so an open app reacts instantly. The client **dedups by cry-episode id** (service-worker notification tag). We rejected "server checks for an open connection and sends only push if none" — that races (the app backgrounds between check and send) and would silently drop a safety alert.

## SSE re-auth and revocation

SSE holds a connection open permanently, but the access token lives ~15 min and access can be revoked mid-stream (a parent removes the nanny). So: the server **force-closes at token expiry** and the client **reconnects with a freshly-refreshed token** (401 → refresh once → else login), bounding staleness to one token lifetime; **and** the server **immediately drops the connection on membership/family revocation** (a `revoked` control event + close), cutting a removed user's feed in seconds. Validating only at connect (`FRONTEND.md` literal) was rejected — a connection would outlive its token and revocation would never reach an open stream.

## Separate signaling stream

Video signaling rides a **separate, ephemeral SSE stream owned by the video island** (opened per call, torn down after), *not* the shared Live-sync stream — deliberately deviating from `FRONTEND.md`'s "rides the existing channel." This delivers the isolation `FRONTEND.md` also asks for (the UI must not depend on the WebRTC lifecycle); HTTP/2 multiplexing makes the extra stream nearly free.

## Echo-only writes

Mutations are plain `POST`s; the UI updates **only when the server's diff echoes back** over Live-sync (written to the TanStack Query cache by replacement, never merged) — the literal embodiment of "server-authoritative, last-write-wins, clients never merge locally." No optimistic updates for shared state. On SSE reconnect the client **resyncs** (Last-Event-ID replay or refetch) so a dropped echo can't leave the UI stale.
