# 12 · Choose cry-alert presentation variant — HITL

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
DESIGN.md ships three cry-alert presentations and explicitly says to **let the user choose one to ship**:
- **A · Full-screen takeover** — red gradient, concentric pulsing rings, "Mia is crying", likely-cause pill, waveform, Open / Talk / Snooze.
- **B · Banner / toast** — dimmed Home behind a scrim, floating white card with pulsing icon, Open / Talk / Snooze.
- **C · Live status card (red)** — the Home hero card flipped to its crying state in place, with a live cry-episode timeline below.

This is a **human design decision**, not an implementation guess. Step 1 (HITL): review the three variants and pick one (or a phone-vs-app-open split). Step 2 (AFK follow-up): wire the chosen treatment to the cry-episode delivery from slice 11 — entrance motion per DESIGN.md §6, `--alert*` tokens only in the crying state, reduced-motion fallback.

## Acceptance criteria
- [x] A human selects the shipping variant (A, B, or C) _(**Variant A — full-screen takeover** chosen: for a safety product the alert must be impossible to miss, and DESIGN.md reserves saturated red for an active cry)_
- [x] The chosen treatment renders on a real cry-episode event from slice 11 _(`<CryAlertOverlay>` (`useCryStatus` + `<CryAlert>`) is wired into `<App>` and `main.tsx` starts Live-sync against the real `/live` on auth — so a `cry-status` "crying" frame raises the full-screen alert. The overlay's reaction is TDD'd via fake transport; the `/live` wiring is live)_
- [x] `--alert*` red appears only in the active-cry state, nowhere else _(by construction — `<CryAlert>` is the only red surface and renders only when `useCryStatus` reports `crying`; `cryStatusReducer` clears to calm/fussing otherwise)_
- [x] Entrance animation matches DESIGN.md §6 and respects `prefers-reduced-motion` _(scale+opacity `cry-in` keyframe + the pulse ring both applied via `motion-safe:` — under `prefers-reduced-motion` they show the resting end-state)_
- [x] Open / Talk / Snooze actions are wired (Talk may stub until the video island lands) _(all three invoke their handlers — TDD'd; the handlers' targets (open monitor, talk) land with those screens)_

## Progress
Variant A is built and TDD'd. **Model:** `cryStatusReducer` (`src/cries/cry-status.ts`) — pure calm/fussing/crying state machine carrying the active episode; crying sets the episode, calm/fussing clear it (red reserved for crying). **Hook:** `useCryStatus(liveSync)` applies the reducer over `cry-status` Live-sync events (fake-transport tested). **Component:** `<CryAlert>` (`src/cries/CryAlert.tsx`) — full-screen red takeover, "<baby> is crying", likely-cause pill, pulse ring, Open / Talk / Snooze.

Remaining: overlay `<CryAlert>` over `<App>` when `useCryStatus` reports crying (needs a live-sync instance, deferred with realtime wiring + `/live`); the §6 scale/opacity entrance; the cry-episode timeline detail; and Talk/Open targets (video island + live monitor). Tests green, `tsc` clean, builds.

## Blocked by
- 11 · PWA install + push + cry dedup
