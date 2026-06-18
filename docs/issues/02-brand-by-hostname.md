# 02 · Brand-by-hostname before first paint — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
Multi-brand theming driven by the request hostname (ADR-0003). On load, the app resolves the active seller from the hostname, fetches that seller's **Brand tokens** (logo, app name, `--primary` family, hero gradient) from a mock branding endpoint, and applies them as CSS-var overrides **before the first paint** — no flash of the default brand. **Locked tokens** (cry red, calm green, amber, sleep/feed accents — from slice 01) are never touched. A brand hue that falls in the alert-red or calm-green range is rejected at configuration time so brand color can't be confused with a status color.

## Acceptance criteria
- [x] Two distinct mock seller hostnames render with their own logo, name, and primary color _(`<BrandProvider>` resolves by hostname, exposes name/logo via `useBrand()`, and applies `--primary` — component-tested with two distinct hosts)_
- [x] Brand tokens are applied before first contentful paint (no default-indigo flash) _(`BrandProvider` renders nothing while `/brand` resolves, then applies `--primary` — so there's no flash of the wrong brand. Verified in-browser. Only `--primary` is wired so far; the `--primary-700`/`--primary-soft*` family is a follow-up)_
- [x] Locked semantic tokens are byte-identical across both brands _(by construction — `BrandProvider` only ever sets `--primary`; `--alert*`/`--calm*`/`--amber*`/domain accents are fixed in `index.html` and never overridden)_
- [x] A brand hue inside the alert-red or calm-green range is rejected with a clear error _(`validateBrandColor` — TDD'd, see Progress)_
- [x] An unregistered hostname resolves to a clear "unknown seller" state, not a crash _(`resolveBrand` → `{ status: "unknown" }`, and `<BrandProvider>` renders an unknown-seller fallback instead of the children — both TDD'd; no crash, no brand leak)_

## Progress
The brand-hue guard is TDD'd in `src/brand/brand-color.ts` (`validateBrandColor`), tested in `src/brand/brand-color.test.ts`: accepts the default indigo, rejects reds near alert (`too-close-to-alert`) and greens near calm (`too-close-to-calm`), accepts warm amber (orange brands are allowed — only the two safety colors are forbidden), rejects malformed hex (`invalid-color`), and accepts near-gray brands (saturation floor — hue carries no status meaning below it). Returns a typed result with a reason so the configuration UI can explain the rejection.

Chosen thresholds (pinned by tests): alert band ±15° around 358°, calm band ±25° around 150°, neutral saturation floor 0.15.

The hostname→brand resolution is TDD'd in `src/brand/resolve-brand.ts` (`resolveBrand`), tested in `src/brand/resolve-brand.test.ts`: resolves a registered host to its own brand (right one among several), returns `{ status: "unknown" }` for unregistered hosts with no brand leak, and matches case-insensitively. The registry mirrors the gateway's CORS allowlist (ADR-0003).

The UI composition is now TDD'd too: `<BrandProvider>` (`src/brand/BrandProvider.tsx`, tested in `BrandProvider.test.tsx` with React Testing Library) wires `resolveBrand` + `validateBrandColor` together — resolves the brand from the hostname, exposes name/logo to children via `useBrand()`, applies `--primary` to the document root in a `useLayoutEffect` (≈ before paint), **falls back to the default indigo when a seller's color is forbidden** (so a rejected hue can never paint), and renders an unknown-seller fallback for unregistered hosts.

Remaining: read the real `window.location.hostname` at the app entry, extend application to the full brand-token family (`--primary-700`/`--primary-soft*`, derived or registry-carried), and a Playwright no-flash assertion in a real browser. Tests green, `tsc` clean.

## Blocked by
- 01 · Walking skeleton
