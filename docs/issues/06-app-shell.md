# 06 · App shell & navigation — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The chrome every data screen drops into, plus the reusable design-system components. The shell provides the four-tab bar (Today / Monitor / Cries / Growth), the AppHeader with baby switcher (against mock babies), StatusPill, and the notifications bell. It honors device safe areas (top inset, bottom tab inset) and `prefers-reduced-motion` (loops drop to their resting end-state). This slice ports the component library contracts from DESIGN.md's `ui.jsx` — StatusPill, Waveform, Ring, Bars, LineChart, TabBar, AppHeader, BabyAvatar, StatTile, TimelineRow, SectionLabel, Segmented — as the shared kit; screens are still placeholders.

## Acceptance criteria
- [x] Four tabs navigate between placeholder routes; active tab uses `--primary` _(navigation component-tested; styled to DESIGN.md as a glassmorphic bottom TabBar with the active tab in `--primary` (`text-primary`) and others `--ink-3` — verified in-browser, active color confirmed via computed style)_
- [x] Baby switcher flips the active baby (mock data); header reflects the selection _(`<AppHeader>` switcher menu lists the babies from `useBabies` and selecting one updates the active baby in the header — TDD'd end-to-end (real `Session` + TanStack Query + MSW `/babies`), verified in-browser. Empty/loading shows a neutral placeholder, no crash)_
- [x] StatusPill renders all tones (calm/crying/fussing/sleep/neutral) with both color and label (never color alone) _(`<StatusPill>` — all five tones with `*-soft` bg + solid fg/dot; always renders a text label, TDD'd for the a11y "not color alone" requirement)_
- [x] Safe-area insets respected top and bottom; tab bar clears the home indicator _(header `pt-[max(18px,env(safe-area-inset-top))]`; TabBar `pb-[env(safe-area-inset-bottom)]`; `viewport-fit=cover` set)_
- [x] With `prefers-reduced-motion`, pulse/bob animations show their resting state _(the only animations rendered — the cry-alert pulse ring (`animate-ping`) and the `cry-in` entrance — are both behind `motion-safe:`, so reduced-motion shows the resting end-state)_
- [~] The component library renders against tokens and passes light render/contract tests _(built + tested: `StatusPill`, `StatTile`, `Bars`, `LineChart`, `MonitorView`, `AppHeader`, and `ui/forms` (`AuthCard`/`Field`/`ErrorNote`/button classes). Genuinely unbuilt (no built screen needs them yet): Waveform, Ring, Segmented, TimelineRow)_

## Progress
The tab navigation core is TDD'd in `src/shell/AppShell.tsx` (`AppShell.test.tsx`, ARIA `tablist`/`tab`/`tabpanel`): four tabs, Today active by default, click switches panel + active state, active exposed via `aria-selected`.

**Styling + chrome (now done):** styled to DESIGN.md and verified in a real browser — `<AppHeader>` (gradient avatar, greeting, baby name + switcher chevron, `<StatusPill>`, notifications bell) above the content, and a glassmorphic bottom TabBar with the active tab in `--primary`. `<StatusPill>` (`src/ui/StatusPill.tsx`) covers all five tones with a label (a11y-tested). Safe-area insets honored top and bottom.

**Data layer (now started):** `useBabies` (`src/babies/useBabies.ts`, TanStack Query — the locked data-fetching stack) loads the user's babies from a new `GET /babies` mock contract via `Session.authedFetch`; `<App>` provides the `QueryClientProvider`. This is the first "layer 3" data flow and the baby switcher's data source. `GET /babies` doesn't exist in `API.md` yet — like the share endpoint, this defines the contract the backend implements.

**Data screens wired (3 of 4 tabs):** **Today** → `<TodayScreen>` (3-up StatTiles + the EnablePush card, from `GET /babies/:id/summary`); **Cries** → `<CriesScreen>` (Avg/day + "Fussiest around HH:00" via pure `fussiestWindow` + hourly `<Bars>`, from `/cry-patterns`); **Growth** → `<GrowthScreen>` (weight + percentile card, weight-for-age `<LineChart>` with ringed end-dot, milestones list with done/upcoming, from `/growth`). All TDD'd (real `Session` + Query + MSW), verified in-browser, gated on the active baby. The per-baby query is factored into `useBabyResource`, which the typed hooks delegate to. `ui.jsx` primitives built: `StatTile`, `Bars`, `LineChart`, `StatusPill`.

All four tabs now have screens — the **Monitor** tab renders `<MonitorScreen>` (the 1-to-1 video island: device lookup → TURN → `RTCPeerConnection` + signaling over `/devices/:id/call/signal` → DESIGN.md night-vision feed + Hold-to-talk), verified in-browser. Remaining: `prefers-reduced-motion` handling; remaining primitives (Ring / Waveform / TimelineRow / Segmented); and the Sleep/Feeding screens (not top-level tabs — sub-screens) + the Today hero "Listening" card/timeline. Tests green, `tsc` clean, builds.

## Blocked by
- 03 · Sign-in + in-memory session
