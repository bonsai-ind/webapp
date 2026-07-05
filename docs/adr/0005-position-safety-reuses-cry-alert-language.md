# Position safety alerts reuse the cry alert language; `--alert*` means "active safety event"

A prone/occlusion event is surfaced with the **same visual language as a cry alert**, not a new color. The Locked token `--alert*`'s meaning is **widened from "active cry" to "active safety event"** (cry OR prone/occlusion) — still Locked and un-themeable — and prone reuses the existing **StatusPill / cry banner** and the **Notification Center** envelope.

A **face-visibility indicator** is added to the live monitor screen. The existing `sleep` module renders real sleep data (no longer fixtures). **Pain has no UI** (reserved; see backend ADR 0017).

## Consequences

- No new design system and no second "danger" color — the platform keeps exactly one safety red, now covering both cry and posture.
- Prone alerts arrive on the same live-sync stream as cry and dedupe on `episodeId`, so an open app and a locked phone never double-alert.
