# Issue 03 — Position: webapp safety surface

> Repo touched: **webapp**. The caregiver-facing half of the safety path.
> Refs: `docs/prd/vera-vision-contracts.md`, `webapp/docs/prd/vera-vision.md`, ADR 0005.

## Status — 2026-07-02 · verified green (core surface landed; shell mount remains)

**Verified 2026-07-02:** `npx tsc --noEmit` clean; `npm run build` clean; full suite **193 tests** pass, incl. `src/safety` **6 tests**.



Landed in `src/safety/` (6 tests green; full suite 193 green; `tsc` + `npm run build` clean):
- `safety-status.ts` — the pure `safetyStatusReducer` (alert/clear/unknown) + `postureText`.
- `useSafetyStatus(liveSync)` — subscribes to the `safety-status` frame, applies the reducer.
- `SafetyOverlay` — a full-bleed banner reusing the Locked `--alert*` red (per ADR 0005, no new
  token), showing "<baby> may be unsafe" + human posture copy; hides on `clear`.

Wire shapes matched: frame `{ state, posture, episodeId, babyId, babyName }`, `posture` ∈
`face_up | face_down_or_absent | occluded | unknown`, Notification `type: "safety"`.

**Mounted (2026-07-03):** `SafetyOverlay` now renders in `AppShell` beside `CryAlertOverlay`, wired to
the shared `liveSync` + `goToMonitor`. Covered by `AppShell.test.tsx` ("mounts the safety overlay: a
safety-status alert shows the banner" — drives the real shell + live-sync dispatch). Full webapp suite
194 green, `npm run build` clean.

Remaining (optional polish): a `StatusPill` prone/safety tone in the header; a face-visibility
indicator on the Live Monitor. The Notification Center already renders any `type` generically, so a
`type:"safety"` row needs no new component.

## What to build

A "Position status" safety surface reusing the cry alert's visual language. New `src/safety` module:

- a `safety-status` type + reducer (mirroring cry-status),
- a `useSafetyStatus(liveSync)` hook subscribing to the `safety-status` frame,
- a `SafetyStatusOverlay`/banner mirroring `CryAlertOverlay`.

Reuse the Locked `--alert*` token (now meaning "active safety event" per ADR 0005) — **no new token**.
`StatusPill` gains a prone/safety tone rendered with a **text label** (not color alone). Add a
face-visibility indicator to the Live Monitor screen. Prone alerts render in the Notification Center
(`type:"safety"`, already supported).

`safety-status` frame (decision, from the contracts PRD):

```jsonc
{ "type":"safety-status",
  "data":{ "state":"alert"|"clear", "posture":"face_down_or_absent"|"occluded"|"face_up",
           "babyId":"bby_…", "babyName":"string", "episodeId":"string" } }
```

## Acceptance criteria

- [x] Emitting a faked `safety-status` `alert` frame shows the banner; a `clear` frame hides it (`SafetyOverlay.test.tsx`, mirrors `CryAlertOverlay.test.tsx`). *(StatusPill prone tone: not yet added.)*
- [x] The safety state is conveyed by a text label, not color alone (banner heading + `postureText` copy).
- [ ] A `type:"safety"` Notification renders a row in the Notification Center. *(NotificationCenter already renders any type generically — no new component; an explicit spec/wiring is pending.)*
- [x] No new design-system token; `--alert*` is reused. Typecheck + `npm run build` + full suite (193) pass.

## Blocked by

- Issue 02.
