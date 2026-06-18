# Hush — Baby Cry Monitor · DESIGN.md

Implementation spec for an AI coding agent. Mobile-first (iOS + Android), clinical / data-forward, calm under stress. This document is the source of truth for the visual system; the HTML mockups in this project (`index.html` + `screens-*.jsx`) are the reference renders.

---

## 1. Product in one line
A baby cry-detection app for **parents + a remote caregiver/nanny**. Core surfaces: a **Today summary** home, a **live hardware-monitor feed** with 1-to-1 talk, **live cry alerts**, and **growth tracking** (cry patterns, sleep, feeding, weight/height percentiles, milestones).

## 2. Design principles
1. **Calm by default, urgent only when it matters.** Neutral indigo for the resting app; saturated red reserved exclusively for an active cry.
2. **Data-forward but lean.** Tabular numerals, monospace units/labels, one accent per surface. No decorative gradients except the two semantic hero cards (indigo = calm, red = crying).
3. **Glanceable.** Every screen answers one question in the top third.
4. **No slop.** No emoji, no stock illustration, no rounded-left-border cards. Real data or nothing.

---

## 3. Design tokens

### 3.1 Color (CSS custom properties — use these exact names)
```css
:root {
  /* surfaces */
  --bg:          #F5F5F9;   /* app background */
  --surface:     #FFFFFF;   /* cards */
  --surface-2:   #FAFAFD;   /* insets / empty cards */

  /* brand / primary (indigo-violet) */
  --primary:        #6C5CE7;
  --primary-700:    #5847D6; /* gradient end, pressed */
  --primary-soft:   #EEEBFF; /* tonal bg / pills */
  --primary-soft-2: #E2DDFB; /* percentile band, legend swatch */

  /* ink (text) */
  --ink:   #16171F;  /* primary text */
  --ink-2: #585A6B;  /* secondary text */
  --ink-3: #9B9DAE;  /* tertiary / captions / icons-off */

  /* lines */
  --line:   #ECECF3; /* hairline dividers, card border */
  --line-2: #E2E2EC; /* stronger border, dashed states */

  /* semantic */
  --calm:       #15A05A;  --calm-soft:  #E4F5EC;  /* "all calm" */
  --alert:      #E5484D;  --alert-2:    #C81E25;  /* crying — primary/deep */
  --alert-soft: #FCE9E9;
  --amber:      #E08700;  --amber-soft: #FBF0DC;  /* fussing / discomfort */

  /* domain accents */
  --sleep: #5B6CE0;  --sleep-soft: #E8EBFB;  /* sleep tracking */
  --feed:  #1FA2B0;  --feed-soft:  #E0F4F6;  /* feeding */
}
```
**Rules**
- Default app chrome uses `--ink*`, `--line*`, `--surface`. `--primary` for primary actions, active tab, links.
- `--alert*` / `--alert-2` ONLY during a live cry (alert screens + the status card in its crying state). Never use red elsewhere.
- Each tracking domain owns one accent: sleep → `--sleep`, feeding → `--feed`, cries → `--alert`, growth → `--primary`.
- `*-soft` tokens are tonal backgrounds for icon chips, pills, progress tracks.

### 3.2 Typography
- **Sans (UI):** `"Hanken Grotesk"`, weights 300–800. Fallback: `system-ui, sans-serif`.
- **Mono (data):** `"IBM Plex Mono"`, 400–600. Used for units, timestamps, axis labels, eyebrow LABELS, signal readouts. Fallback: `ui-monospace, monospace`.
- Google Fonts import:
  `https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap`

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Page title (h1) | sans | 25px | 800 | `letter-spacing: -0.03em` |
| Hero stat value | sans | 26–30px | 800 | `.num`, tabular |
| Card stat value | sans | 23px | 700 | `.num` |
| Section eyebrow | mono | 10px | 500 | `letter-spacing: 0.13em; text-transform: uppercase`; color `--ink-3` |
| Body / row title | sans | 13.5px | 600 | |
| Secondary text | sans | 12.5px | 500 | color `--ink-2` |
| Caption / unit | mono | 9–11.5px | 500 | color `--ink-3` |
| Tab label | mono | 9px | 500 | |

Helper classes:
```css
.label { font-family: var(--mono); font-size: 10px; font-weight: 500;
         letter-spacing: .13em; text-transform: uppercase; color: var(--ink-3); }
.num   { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.mono  { font-family: var(--mono); font-variant-numeric: tabular-nums; }
```
Always pair a large value with its unit at ~50% size in `--ink-3` (e.g. **13**`h 20m`, **7.3**`kg`).

### 3.3 Spacing, radius, shadow
- **Screen gutter:** 18px left/right (`.pad`).
- **Inter-section gap:** 18px. **Eyebrow→content gap:** 10px. **Card inner padding:** 13–18px.
- **Radii:** cards `22px`; buttons / inputs `13–16px`; icon chips `9–14px`; pills/dots `999px`; rings/avatars `50%`.
- **Card:** `background: var(--surface); border: 1px solid var(--line); border-radius: 22px;` — flat, no shadow.
- **Elevated/semantic hero shadow:** `0 14px 30px -12px rgba(108,92,231,0.6)` (indigo) / `…rgba(200,30,37,0.6)` (red).
- **Alert banner shadow:** `0 22px 48px -16px rgba(200,30,37,0.5), 0 0 0 1px rgba(229,72,77,0.18)`.
- **Hit targets ≥ 44px.** Tab bar icons 23px. Primary buttons 44–56px tall.

---

## 4. Components

- **AppHeader** — baby avatar (gradient circle, `--primary-soft`→`#D9D2FB`) + greeting (`--ink-2`, 12.5px) + baby name (17px/700) with chevron switcher; right side: **StatusPill** + bell icon button (40×40, `--surface`, `--line` border, red unread dot).
- **StatusPill** — `dot + label`, fully rounded, tonal. Tones: `calm` (green), `crying` (red), `fussing` (amber), `sleep`, `neutral`. Each = `*-soft` bg + solid fg/dot.
- **StatTile** — icon chip (30×30, domain `*-soft` bg) + big `.num` value+unit + 11.5px label. Used in 3-up rows.
- **TimelineRow** — 32×32 tonal icon chip + title (ellipsis) + optional sub-tag + mono timestamp; hairline `--line` divider, none on `last`.
- **SectionLabel** — eyebrow (`.label`, nowrap) on left, optional `--primary` action link on right (nowrap, `flex-shrink:0`).
- **Segmented** — Day/Week/Month control: `#ECECF2` track, active pill = `--surface` + subtle shadow.
- **TabBar** — 4 tabs (Today / Monitor / Cries / Growth), glassmorphic `rgba(255,255,255,0.86)` + `backdrop-filter: blur(18px) saturate(180%)`, top `--line` border, bottom safe-area pad. Active = `--primary` icon+label.
- **Charts** (all hand-rollable with SVG/divs, no library required):
  - **Bars** — rounded bars, highlighted bar uses domain color, rest use `*-soft`; mono axis labels.
  - **Ring** — SVG progress ring (`stroke-linecap: round`, track = `*-soft`), centered value + mono caption.
  - **LineChart** — primary series 2.4px solid + shaded percentile band (`--primary-soft`) + dashed reference series + ringed end-dot.
  - **Waveform** — flex row of rounded bars; `animate` prop drives a staggered `bob` keyframe for live audio.
- **Icons** — single line set, 24×24 viewBox, `currentColor`, stroke 1.7–1.8 (2.1 when active), round caps/joins. Set: home, monitor, pulse, moon, growth, bell, mic, phone, volume, drop, camera, plus, chevrons, clock, x, settings, snooze, check, baby, star, flame, arrowUp. (Source in `ui.jsx` `Icon`.)

### Buttons
- **Primary:** `--primary` (or `--alert` in cry context) bg, white text, 600–700, radius 13–16, height 44–56.
- **On-color primary** (inside a colored hero): white bg, hero color as text.
- **Secondary:** `--surface` bg, `--line-2` border, `--ink-2` text.
- **Glass** (over video/red): `rgba(255,255,255,0.12–0.16)` + blur, white text/border.

---

## 5. Screens (build order)

1. **Today / Home** — `AppHeader` (status=calm) → **indigo "Listening" hero card** (pulsing live dot, "All calm / No cry detected · 1h 42m", mini waveform, "Open live monitor" glass button) → 3-up StatTiles (Sleep / Cry episodes / Feeds) → Recent activity TimelineRows.
2. **Live Monitor** — full-bleed dark night-vision feed (`#0B0C12`, radial green tint, scanline texture, inner vignette). Glass top bar (back · **LIVE** red pill · settings), center status chip ("Sleeping peacefully"), bottom glass panel: room-audio dB + animated waveform, then 3 controls: Mute · **Hold to talk** (72px indigo FAB) · Snapshot. Status bar = light/`dark`.
3. **Live cry alert — three variants (let user choose one to ship):**
   - **A · Full-screen takeover** — red gradient bg, concentric pulsing rings around a pulse icon, "Mia is crying" (31px/800, nowrap), "Started 18s ago · sounds distressed", "Likely cause" pill, waveform, actions: **Open live monitor** (white) + Talk + Snooze.
   - **B · Banner / toast** — dimmed Home behind a scrim; floating white card pinned below status bar with pulsing icon, title+`Now` pill, ellipsized detail line, waveform, Open / Talk / Snooze.
   - **C · Live status card (red)** — the Home hero card flipped to its crying state in place (red gradient, "Mia is crying" + waveform, Open monitor / Talk), with a live **cry-episode timeline** below (Cry started · Peak dB · suggested action).
4. **Cry patterns** — Segmented(Week) → 2-up hero stats (Avg/day with trend, Avg settle time) → **hourly distribution Bars** (24 cols, fussiest-window callout) → **likely-causes** ranked progress bars (Hungry/Tired/Discomfort/Other, each its own accent).
5. **Sleep** — Segmented(Day) → Ring (% of goal) + night/naps/wakings breakdown → **24h sleep ribbon** (night = `--sleep`, naps = `#A9B3EE`) with mono hour axis + legend → tonal insight card.
6. **Feeding** — header `+` FAB (`--feed`) → 2-up (Last feed / Next due) → **7-day intake Bars** (`--feed`) → today's feeds TimelineRows (bottle/breast w/ sub-tags).
7. **Growth** — header `+` → 2-up metric cards (Weight / Height + percentile) → **weight-for-age LineChart** with healthy-range band, end-dot, big value + percentile pill, mono age axis, legend → **Milestones** list (done = green check, upcoming = dashed star + due estimate).

### Device frame & safe areas
- Designed at 312×678 in mocks; ship responsive to real device widths.
- Reserve a **58px top safe area** (`.safe-top`) so content clears the status bar / Dynamic Island. Honor bottom safe-area inset on the tab bar (`padding-bottom: env(safe-area-inset-bottom)` in production).

---

## 6. Motion
- **`pulse-ring`** — expanding fading ring for live/recording indicators: `scale(.75)→scale(1.7)`, `opacity .55→0`, 1.6–2.2s ease-out infinite. Used on live dots, alert rings, banner icon.
- **`bob`** — waveform bars `scaleY(.4)↔1`, staggered per-bar delay, for active room audio only.
- Respect `prefers-reduced-motion`: drop the loops, show the resting end-state.
- Cry-alert entrance: full-screen = scale/opacity in; banner = slide down from top with the scrim fading in.

## 7. Content & copy
- Tone: plain, reassuring, specific. "All calm", "Mia is crying", "Likely cause: hungry", "Sleeping peacefully".
- Numbers always carry units; timestamps in mono `HH:MM`; relative time for live events ("18s", "2h ago", "now").
- Never alarm unnecessarily — fussing ≠ crying. Three states: **calm** / **fussing** / **crying**.

## 8. Accessibility
- Body text ≥ 12.5px; never below 24px equivalent at slide scale. AA contrast on all text (ink tokens are tuned for white/surface).
- Don't encode state by color alone — pair every status color with a label/icon (the StatusPill does both).
- Alerts must also fire OS push + sound/vibration; the in-app treatment is the foreground layer only.

---

## 9. Reference files in this project
- `index.html` — token definitions + base CSS + font import + mounts.
- `ui.jsx` — Icon set, StatusPill, Waveform, Ring, Bars, LineChart, TabBar, AppHeader, BabyAvatar.
- `screens-core.jsx` — Home, Live Monitor.
- `screens-alerts.jsx` — alert variants A / B / C.
- `screens-tracking.jsx` — Cry patterns, Sleep, Feeding, Growth.
- `app.jsx` — composition on the design canvas.

Stack note: mocks use React 18 + inline Babel for speed. Production is framework-agnostic — port tokens/CSS/components to React Native, Flutter, or SwiftUI/Compose as needed; the token table and component contracts above are the binding part.
