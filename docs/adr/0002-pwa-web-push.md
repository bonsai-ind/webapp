# Companion app is an installable PWA with Web Push

The companion app is delivered as an **installable PWA** — the React + Vite SPA from `FRONTEND.md` plus a service worker and **Web Push** — rather than a native app or a plain SPA. The product's core promise is a **cry alert that wakes a backgrounded/locked phone**; a plain SPA can only alert a foregrounded tab, and native apps would contradict the locked SPA stack and add a whole toolchain. A PWA threads both: it keeps the locked stack verbatim and gains OS-level push on Android Chrome and iOS 16.4+ (home-screen install).

## Considered Options

- **Plain web SPA** (`FRONTEND.md` literal) — no background push; cry alerts die when the tab isn't focused. Fails the core promise.
- **Native apps (React Native / Flutter)** (`DESIGN.md`'s "mobile-first, port as needed") — best push/background story, but discards the locked stack and adds native CI.

## Consequences

- Web Push is the always-on channel for cry alerts (see ADR-0004); the in-app SSE treatment is the foreground layer only.
- iOS push requires the user to install the PWA to the home screen — onboarding must drive that install, or those users get no background alerts.
