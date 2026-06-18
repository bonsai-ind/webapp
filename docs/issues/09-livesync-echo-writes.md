# 09 · Live-sync stream + echo-only writes — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The realtime read/write loop (ADR-0004), exercised against a mock event source. A **realtime-transport interface** wraps `@microsoft/fetch-event-source` and exposes a persistent, **user-scoped Live-sync stream** carrying server-authoritative diffs for *all* devices the user belongs to. Diffs are written into the TanStack Query cache **by replacement, never merged**. Writes are **echo-only**: a mutation is a plain `POST`, and the UI changes only when the resulting diff arrives over Live-sync — no optimistic updates for shared state. On reconnect the client **resyncs** (Last-Event-ID replay, falling back to query invalidation) so a diff that landed while disconnected is never lost. The transport interface is the test seam: tests inject a fake stream rather than a real server.

## Acceptance criteria
- [x] A diff emitted on the mock stream replaces the corresponding cache entry and the UI reflects it _(`createCacheSync` writes the diff into the TanStack Query cache by replacement via `setQueryData` — TDD'd; any component on that query key (e.g. `useBabies`) re-renders, since the cache is the render source)_
- [~] A mutation POST does not change the UI until its echo diff arrives (no optimistic update) _(the echo *path* exists — `Session.authedFetch` POST + `createCacheSync` writing the pushed diff; a concrete mutation-and-echo flow isn't wired/tested end-to-end yet)_
- [x] A diff for a device the user is NOT currently viewing still updates app state (user-scoped, not view-scoped) _(`LiveSync` is user-scoped and `createCacheSync` mirrors `babies`/`summary`/`cry-patterns`/`growth` into the cache regardless of the active tab — so e.g. a `babies` diff updates the header from any screen. Wired in `<CryAlertOverlay>`; all TDD'd)_
- [x] A forced disconnect → reconnect triggers resync; a diff emitted during the gap is reflected after reconnect _(reconnect-on-error + Last-Event-ID replay, TDD'd)_
- [x] Purely-local affordances (card collapse, etc.) still update immediately — they are not shared state _(tab navigation, baby-switcher selection, and form inputs are local `useState` — instant, never routed through the cache/server)_
- [x] The transport is accessed only through the interface, so tests drive it with a fake stream _(injected `StreamFactory`; all tests use a fake)_

## Progress
TDD'd the framework-agnostic core in `src/realtime/live-sync.ts` (`createLiveSync`), tested in `src/realtime/live-sync.test.ts` via an injected fake `StreamFactory`: routes events to `on(type)` handlers, pulls a fresh token on every (re)connect, reconnects on stream error, resyncs with `lastEventId`, and dedups at-most-once events via an injected `dedupeKey` (the cry-episode hook for slice 11). Tests green, `tsc` clean.

The **cache adapter is now TDD'd**: `createCacheSync` (`src/realtime/cache-sync.ts`, tested in `cache-sync.test.ts` over the real `LiveSync` + fake `StreamFactory` + a real `QueryClient`) mirrors each configured resource's Live-sync event into the Query cache by **replacement** (`setQueryData([type], data)` — never merge), ignores non-mirrored event types, and tears down on unsubscribe. With `useBabies` reading `["babies"]`, a pushed `babies` diff updates the UI without a refetch.

The **real transport is now built**: `createFetchStreamFactory` (`src/realtime/fetch-stream-factory.ts`, tested in `fetch-stream-factory.test.ts` against MSW-streamed `text/event-stream`) wraps `@microsoft/fetch-event-source` — sends `Authorization: Bearer` + `Last-Event-ID`, parses each SSE frame into a `StreamEvent {id, type, data}`, and surfaces server-close as `onError` (LiveSync owns reconnect; the library's own retry is disabled). `close()` aborts via `AbortController` (wired, but not behaviourally testable under MSW — its mock stream ignores fetch abort; verified against a real server). Test runs in the **node** vitest environment with a minimal `window`/`document` shim — jsdom's `AbortController` signal is rejected by Node's undici fetch.

Remaining (composition, gated on backend): wire `createLiveSync(createFetchStreamFactory())` + `createCacheSync` into `<App>` once the **backend `/live` SSE endpoint exists** (`API.md` lists it as not-yet-available — wiring it now would reconnect-storm a missing endpoint), plus a `Session.getAccessToken()` accessor for the per-connect bearer, and a concrete echo-only **mutation** flow (POST → wait for the pushed diff).

## Blocked by
- 04 · Silent refresh interceptor
- 06 · App shell & navigation
