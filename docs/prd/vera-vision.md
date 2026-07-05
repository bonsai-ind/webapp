# PRD — Vera-Vision: Webapp (Workstream E)

> Adds a "Position status" safety surface to the companion PWA. Shared shapes live in the
> workspace-root contracts PRD (`../../docs/prd/vera-vision-contracts.md`). Respects webapp ADR 0005
> (position safety reuses the cry alert language; `--alert*` widened to "active safety event").

## Problem Statement

The companion app shows cry alerts and (with fixture data) a sleep view, but nothing about the baby's
physical safety: a caregiver can't see whether the baby's face is visible and upward, and gets no live
banner when the baby is prone or occluded.

## Solution

A "Position status" safety surface that reuses the cry alert's visual language: a live banner +
StatusPill driven by a new `safety-status` SSE frame, with prone/occlusion appearing in the
Notification Center. The existing sleep module now renders real data. Pain has no UI (reserved).

## User Stories

1. As a caregiver, I want a prominent banner when my baby is prone or occluded, so that I act immediately.
2. As a caregiver, I want a live face-visibility indicator on the monitor screen, so that I can glance and feel reassured.
3. As a caregiver, I want the prone banner to clear automatically when the baby is safe again, so that I know the situation resolved.
4. As a caregiver, I want the prone alert to look and feel like a cry alert (same red, same urgency), so that I instantly recognize it as a safety event.
5. As a caregiver, I want prone alerts in my Notification Center, so that I can review what happened and when.
6. As a caregiver, I want the sleep dashboard to show my baby's real sleep (night/naps/wakings, 24-h ribbon), so that the data is trustworthy.
7. As a color-vision-impaired user, I want the safety state conveyed with a text label, not color alone, so that I never miss it.
8. As a caregiver, I want prone alerts deduped between an open app and a locked phone, so that I'm not double-notified.
9. As a seller, I want the safety red to stay un-themeable, so that the danger color is always consistent.
10. As a developer, I want the safety surface to reuse the live-sync/StatusPill/Notification machinery, so that no new design system or realtime path is added.
11. As a caregiver, I want the safety banner to appear for any baby I can see, not just the one on screen, so that I'm alerted regardless of which view I'm on.

## Implementation Decisions

- New `src/safety` module: a `safety-status` type + reducer (mirroring cry-status), a
  `useSafetyStatus(liveSync)` hook subscribing to the `safety-status` frame, and a
  `SafetyStatusOverlay`/banner (mirroring `CryAlertOverlay`). Reuses the Locked `--alert*` token
  (widened to "active safety event" per ADR 0005) — **no new token**.
- `StatusPill` gains a prone/safety tone mapped to the alert colors, with a text label (not
  color-only). A face-visibility indicator is added to the Live Monitor screen.
- Notification Center already supports `type: "safety"` — prone alerts render as rows with no new
  harness.
- The existing `src/sleep` module (`useSleep` → `/babies/{id}/sleep`, `SleepScreen`, `Ring`) now shows
  real data; ensure it renders real-shaped periods.
- No pain UI (reserved). No new design system. The realtime layer is already generic over frame type.

## Testing Decisions

- Good test = rendered behavior given a faked SSE frame, not internals.
- Component+SSE seam (`SafetyStatusOverlay.test.tsx`, mirror `CryAlertOverlay.test.tsx`):
  `fakeFactory` → `emit({type:"safety-status", data:{state:"alert", posture:"face_down_or_absent",
  babyName}})` → assert banner + StatusPill **text** present; `emit(... state:"clear")` → banner
  hidden.
- Notification render: a `type:"safety"` notification renders a row (reuse `NotificationCenter.test`).
- Sleep: existing `SleepScreen.test` passes with real-shaped data.
- Prior art: `CryAlertOverlay.test.tsx`, `StatusPill.test.tsx`, `realtime/live-sync.test.ts`,
  `NotificationCenter.test.tsx`, `sleep/SleepScreen.test.tsx`.

## Out of Scope

- Pain timeline UI. A native app. A new design system / second danger color. Multi-night analytics
  beyond the existing sleep module.

## Further Notes

- See webapp ADR 0005 and the shared-contracts PRD. Reuses `--alert*` (now "active safety event"),
  StatusPill, Notification Center, and live-sync.
