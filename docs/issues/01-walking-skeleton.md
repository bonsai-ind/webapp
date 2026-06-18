# 01 · Walking skeleton — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The thinnest end-to-end skeleton the rest of the foundation stands on. A React + Vite + TypeScript SPA styled with Tailwind, booting to a single route that renders a placeholder shell. The **Locked design tokens** from DESIGN.md (ink/line/surface, alert/calm/amber, sleep/feed) are compiled in as CSS custom properties and are never overridable. The PWA shell is real: a web manifest and a registered service worker (no push logic yet). Test infrastructure is wired and proven by one passing test at each level: Vitest (unit), MSW (network interception), and Playwright (E2E booting the built app).

This slice delivers no user-facing feature — it proves the whole toolchain compiles, serves, mocks the network, tests, and installs as a PWA.

## Acceptance criteria
- [x] `vite build` produces an installable PWA (valid manifest + registered service worker); Lighthouse PWA install criteria pass _(`public/manifest.webmanifest` (standalone, theme `#6C5CE7`, SVG icon), `public/sw.js`, registered in `main.tsx`. Verified against the built `preview`: manifest loads and the service worker reaches `activated`, no errors. (Full Lighthouse PWA audit not run here; raster icons for broader install support are a design-asset follow-up.))_
- [x] Locked tokens are defined once as CSS custom properties; the IBM Plex Mono / Hanken Grotesk fonts load _(`index.html`)_
- [~] One Vitest unit test, one MSW-backed test, and one Playwright E2E (app boots, renders the placeholder) all pass in CI _(Vitest + MSW: 54 tests green. Browser render **verified ad hoc** via a one-off Playwright drive against `npm run dev`: brand-by-hostname → sign-in form → login → 4-tab shell → tab switch, zero console errors. A committed Playwright E2E in CI is still to be formalized; `playwright` is now a devDependency)_
- [x] MSW is the single network-mock layer, structured so per-endpoint handlers can be added/swapped later _(`src/test/server.ts`; per-feature handlers e.g. `deviceShareHandlers`)_
- [~] No business logic, auth, or real endpoints yet _(obsolete — the skeleton has since grown the full foundation; kept for history)_

## Progress
**Test harness:** `package.json`, `tsconfig.json`, `vitest.config.ts` (jsdom + React plugin), MSW (`src/test/server.ts` + `setup.ts`, unhandled requests error out), React Testing Library. 54 tests green, `tsc` clean.

**App scaffold (now real):** `index.html` with the Locked design tokens (DESIGN.md §3.1) + Google Fonts, `vite.config.ts` (React plugin), and `src/main.tsx` mounting the `<App>` composition root (`src/app/App.tsx`, TDD'd: `BrandProvider → AuthGate → AppShell`). `main.tsx` reads `window.location.hostname`, builds a real `Session`, and calls `Session.restore()` before first render so a reload keeps the user signed in. `npm run build` (`tsc && vite build`) produces a bootable bundle; `npm run dev`/`preview` available.

**Tailwind (now wired):** Tailwind v4 via `@tailwindcss/vite`; `src/index.css` (`@import "tailwindcss"` + `@theme inline`) maps the DESIGN.md tokens into Tailwind's theme. `--color-primary` references the runtime `--primary`, so BrandProvider's per-seller override flows into `bg-primary`/`text-primary` while the semantic/locked tokens stay fixed. Auth screens (`AuthGate`, `AcceptInviteScreen` via a shared `ui/forms`) and the `AppShell` TabBar are styled to DESIGN.md — verified in a real browser (login card + glassmorphic bottom TabBar with the active tab in `--primary`).

**Data fetching:** TanStack Query (`@tanstack/react-query`, the FRONTEND.md-locked REST stack) is wired — `<App>` provides a `QueryClientProvider`; first consumer is `useBabies`. Query data is read via `Session.authedFetch`.

Still outstanding: **PWA manifest + service-worker registration** (no Web Push yet — slice 11) and a **committed Playwright E2E** pass. The skeleton renders real, styled UI; the data screens slot into `<AppShell>` per their own slices.

## Blocked by
- None - can start immediately
